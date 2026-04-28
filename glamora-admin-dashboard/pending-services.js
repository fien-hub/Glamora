(() => {
  const $ = (id) => document.getElementById(id);
  const backendUrlEl = $('backendUrl');
  const tokenEl = $('adminToken');
  const spUrlEl = $('spUrl');
  const spAnonEl = $('spAnon');
  const emailEl = $('email');
  const passwordEl = $('password');
  const loadBtn = $('loadBtn');
  const loginBtn = $('loginBtn');
  const logoutBtn = $('logoutBtn');
  const loginStatus = $('loginStatus');
  const metaEl = $('meta');
  const statusEl = $('status');
  const tbody = document.querySelector('#results tbody');

  // Restore saved values
  backendUrlEl.value = localStorage.getItem('admin_backend_url') || 'http://localhost:3000';
  tokenEl.value = localStorage.getItem('admin_token') || '';
  spUrlEl.value = localStorage.getItem('admin_sp_url') || '';
  spAnonEl.value = localStorage.getItem('admin_sp_anon') || '';
  emailEl.value = localStorage.getItem('admin_email') || '';

  function persist() {
    localStorage.setItem('admin_backend_url', backendUrlEl.value.trim());
    localStorage.setItem('admin_token', tokenEl.value.trim());
    localStorage.setItem('admin_sp_url', spUrlEl.value.trim());
    localStorage.setItem('admin_sp_anon', spAnonEl.value.trim());
    localStorage.setItem('admin_email', emailEl.value.trim());
  }

  let supa = null;
  function supabaseClient() {
    const url = (spUrlEl.value || '').trim();
    const key = (spAnonEl.value || '').trim();
    if (!url || !key || !window.supabase) return null;
    if (!supa) supa = window.supabase.createClient(url, key);
    return supa;
  }

  async function refreshLoginStatus() {
    try {
      const client = supabaseClient();
      if (!client) { loginStatus.textContent = 'Supabase URL/key not set'; return; }
      const { data } = await client.auth.getUser();
      if (data?.user) {
        loginStatus.textContent = `Logged in as ${data.user.email}`;
        const sess = await client.auth.getSession();
        const t = sess?.data?.session?.access_token || '';
        if (t) tokenEl.value = t;
      } else {
        loginStatus.textContent = 'Not logged in';
      }
    } catch { loginStatus.textContent = 'Login status error'; }
  }

  function baseUrl() { return backendUrlEl.value.trim().replace(/\/$/, ''); }

  function renderRow(r) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">${r.created_at ?? ''}</td>
      <td><strong>${r.custom_service_name || ''}</strong><div class="subtitle">${(r.description || '').slice(0, 100)}</div></td>
      <td>${r.provider_profiles?.business_name || r.profiles?.full_name || ''}<div class="subtitle">${r.profiles?.email || ''}</div></td>
      <td>$${Number(r.price || r.base_price || 0).toFixed(2)}</td>
      <td>${r.duration_minutes || ''} min</td>
      <td>
        <button class="btn" data-approve="${r.id}">Approve</button>
        <button class="btn" style="background:#DC2626" data-reject="${r.id}">Reject</button>
      </td>`;
    return tr;
  }

  async function load() {
    persist();
    statusEl.textContent = 'Loading...';
    metaEl.textContent = '';
    tbody.innerHTML = '';
    try {
      const url = new URL(baseUrl() + '/api/admin/custom-services');
      url.searchParams.set('status', 'pending');
      const resp = await fetch(url.toString(), { headers: { Authorization: 'Bearer ' + tokenEl.value.trim() } });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Request failed');
      const rows = Array.isArray(json.services) ? json.services : [];
      metaEl.textContent = `${rows.length} pending services`;
      statusEl.textContent = '';
      rows.forEach((r) => tbody.appendChild(renderRow(r)));
    } catch (e) {
      statusEl.textContent = 'Error: ' + (e?.message || 'Unknown');
    }
  }

  async function approve(id) {
    try {
      statusEl.textContent = 'Approving...';
      const url = baseUrl() + `/api/admin/custom-services/${id}/approve`;
      const resp = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + tokenEl.value.trim() } });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Request failed');
      await load();
    } catch (e) { statusEl.textContent = 'Approve error: ' + (e?.message || 'Unknown'); }
  }

  async function reject(id) {
    const reason = prompt('Rejection reason (optional):') || '';
    try {
      statusEl.textContent = 'Rejecting...';
      const url = baseUrl() + `/api/admin/custom-services/${id}/reject`;
      const resp = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + tokenEl.value.trim(), 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Request failed');
      await load();
    } catch (e) { statusEl.textContent = 'Reject error: ' + (e?.message || 'Unknown'); }
  }

  async function login() {
    persist();
    const client = supabaseClient();
    if (!client) { alert('Set Supabase URL and anon key first'); return; }
    try {
      statusEl.textContent = 'Logging in...';
      const { error } = await client.auth.signInWithPassword({ email: emailEl.value.trim(), password: passwordEl.value });
      if (error) throw error;
      const sess = await client.auth.getSession();
      const t = sess?.data?.session?.access_token || '';
      if (t) tokenEl.value = t;
      await refreshLoginStatus();
      statusEl.textContent = '';
    } catch (e) { statusEl.textContent = 'Login error: ' + (e?.message || 'Unknown'); }
  }

  async function logout() {
    const client = supabaseClient();
    if (!client) return;
    await client.auth.signOut();
    tokenEl.value = '';
    await refreshLoginStatus();
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-approve]');
    const r = e.target.closest('[data-reject]');
    if (a) approve(a.getAttribute('data-approve'));
    if (r) reject(r.getAttribute('data-reject'));
  });

  loadBtn.addEventListener('click', load);
  loginBtn.addEventListener('click', login);
  logoutBtn.addEventListener('click', logout);
  refreshLoginStatus();
})();
