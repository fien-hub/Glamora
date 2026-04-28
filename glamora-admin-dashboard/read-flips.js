(() => {
  const qs = (id) => document.getElementById(id);
  const backendUrlEl = qs('backendUrl');
  const sinceEl = qs('since');
  const sinceDaysEl = qs('sinceDays');
  const receiverIdEl = qs('receiverId');
  const messageIdEl = qs('messageId');
  const tokenEl = qs('adminToken');
  const spUrlEl = qs('spUrl');
  const spAnonEl = qs('spAnon');
  const emailEl = qs('email');
  const passwordEl = qs('password');
  const loadBtn = qs('loadBtn');
  const loginBtn = qs('loginBtn');
  const logoutBtn = qs('logoutBtn');
  const exportBtn = qs('exportBtn');
  const metaEl = document.getElementById('meta');
  const statusEl = document.getElementById('status');
  const tbody = document.querySelector('#results tbody');
  const loginStatus = document.getElementById('loginStatus');

  // Load persisted settings
  backendUrlEl.value = localStorage.getItem('admin_backend_url') || 'http://localhost:3000';
  sinceEl.value = localStorage.getItem('admin_since') || '7 days';
  sinceDaysEl.value = localStorage.getItem('admin_since_days') || '';
  tokenEl.value = localStorage.getItem('admin_token') || '';
  receiverIdEl.value = localStorage.getItem('admin_receiver_id') || '';
  messageIdEl.value = localStorage.getItem('admin_message_id') || '';
  spUrlEl.value = localStorage.getItem('admin_sp_url') || '';
  spAnonEl.value = localStorage.getItem('admin_sp_anon') || '';
  emailEl.value = localStorage.getItem('admin_email') || '';

  function persist() {
    localStorage.setItem('admin_backend_url', backendUrlEl.value.trim());
    localStorage.setItem('admin_since', sinceEl.value.trim());
    localStorage.setItem('admin_since_days', sinceDaysEl.value.trim());
    localStorage.setItem('admin_token', tokenEl.value.trim());
    localStorage.setItem('admin_receiver_id', receiverIdEl.value.trim());
    localStorage.setItem('admin_message_id', messageIdEl.value.trim());
    localStorage.setItem('admin_sp_url', spUrlEl.value.trim());
    localStorage.setItem('admin_sp_anon', spAnonEl.value.trim());
    localStorage.setItem('admin_email', emailEl.value.trim());
  }

  let supa = null;
  let lastRows = [];

  function ensureSupabase() {
    const url = (spUrlEl.value || '').trim();
    const key = (spAnonEl.value || '').trim();
    if (!url || !key || !window.supabase) return null;
    if (!supa) supa = window.supabase.createClient(url, key);
    return supa;
  }

  async function refreshLoginStatus() {
    try {
      const client = ensureSupabase();
      if (!client) {
        loginStatus.textContent = 'Supabase URL/key not set';
        return;
      }
      const { data } = await client.auth.getUser();
      if (data?.user) {
        loginStatus.textContent = `Logged in as ${data.user.email}`;
        const sess = await client.auth.getSession();
        const t = sess?.data?.session?.access_token || '';
        if (t) tokenEl.value = t;
      } else {
        loginStatus.textContent = 'Not logged in';
      }
    } catch (e) {
      loginStatus.textContent = 'Login status error';
    }
  }

  async function load() {
    persist();
    const base = backendUrlEl.value.trim().replace(/\/$/, '');
    const url = new URL(base + '/api/admin/read-flips');
    const since = sinceEl.value.trim();
    const sinceDays = sinceDaysEl.value.trim();
    const receiverId = receiverIdEl.value.trim();
    const messageId = messageIdEl.value.trim();
    if (since) url.searchParams.set('since', since);
    if (sinceDays) url.searchParams.set('sinceDays', sinceDays);
    if (receiverId) url.searchParams.set('receiverId', receiverId);
    if (messageId) url.searchParams.set('messageId', messageId);

    statusEl.textContent = 'Loading...';
    tbody.innerHTML = '';
    metaEl.textContent = '';

    try {
      const resp = await fetch(url.toString(), {
        headers: {
          'Authorization': 'Bearer ' + tokenEl.value.trim(),
        },
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json?.error || 'Request failed');
      }

      const rows = Array.isArray(json.data) ? json.data : [];
      lastRows = rows;
      metaEl.textContent = `${rows.length} rows • interval: ${json.interval}`;
      statusEl.textContent = '';

      for (const r of rows) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="mono">${r.changed_at ?? ''}</td>
          <td class="mono">${r.receiver_id ?? ''}</td>
          <td class="mono">${r.message_id ?? ''}</td>
          <td>${r.old_is_read} → ${r.new_is_read}</td>
          <td class="mono">${r.changed_by ?? ''}</td>
          <td class="mono">${r.sender_id ?? ''}</td>
          <td>${(r.message || '').slice(0, 80)}</td>
        `;
        tbody.appendChild(tr);
      }
    } catch (e) {
      statusEl.textContent = 'Error: ' + e.message;
    }
  }

  async function login() {
    persist();
    const client = ensureSupabase();
    if (!client) {
      alert('Set Supabase URL and anon key first');
      return;
    }
    try {
      statusEl.textContent = 'Logging in...';
      const { error } = await client.auth.signInWithPassword({
        email: emailEl.value.trim(),
        password: passwordEl.value,
      });
      if (error) throw error;
      const sess = await client.auth.getSession();
      const t = sess?.data?.session?.access_token || '';
      if (t) tokenEl.value = t;
      await refreshLoginStatus();
      statusEl.textContent = '';
    } catch (e) {
      statusEl.textContent = 'Login error: ' + (e?.message || 'Unknown');
    }
  }

  async function logout() {
    const client = ensureSupabase();
    if (!client) return;
    await client.auth.signOut();
    tokenEl.value = '';
    await refreshLoginStatus();
  }

  function exportCSV() {
    if (!lastRows || lastRows.length === 0) {
      alert('No data to export');
      return;
    }
    const cols = ['changed_at','receiver_id','message_id','old_is_read','new_is_read','changed_by','sender_id','message'];
    const header = cols.join(',');
    const esc = (v) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };
    const lines = lastRows.map(r => cols.map(c => esc(r[c])).join(','));
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `read-flips-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  loadBtn.addEventListener('click', load);
  loginBtn.addEventListener('click', login);
  logoutBtn.addEventListener('click', logout);
  exportBtn.addEventListener('click', exportCSV);
  refreshLoginStatus();
})();
