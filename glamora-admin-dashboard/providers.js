(() => {
  const $ = (id) => document.getElementById(id);
  const backendUrlEl = $('backendUrl');
  const tokenEl = $('adminToken');
  const spUrlEl = $('spUrl');
  const spAnonEl = $('spAnon');
  const emailEl = $('email');
  const passwordEl = $('password');
  const loginBtn = $('loginBtn');
  const logoutBtn = $('logoutBtn');
  const loginStatus = $('loginStatus');
  const qEl = $('q');
  const verifiedEl = $('verified');
  const searchBtn = $('searchBtn');
  const statusEl = $('status');
  const tbody = document.querySelector('#results tbody');

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
      } else { loginStatus.textContent = 'Not logged in'; }
    } catch { loginStatus.textContent = 'Login status error'; }
  }

  function baseUrl() { return backendUrlEl.value.trim().replace(/\/$/, ''); }

  async function search() {
    persist();
    statusEl.textContent = 'Loading...';
    tbody.innerHTML = '';
    try {
      const url = new URL(baseUrl() + '/api/admin/providers');
      if (qEl.value.trim()) url.searchParams.set('q', qEl.value.trim());
      if (verifiedEl.value) url.searchParams.set('verified', verifiedEl.value);
      const resp = await fetch(url.toString(), { headers: { Authorization: 'Bearer ' + tokenEl.value.trim() } });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Request failed');
      const rows = Array.isArray(json.providers) ? json.providers : [];
      statusEl.textContent = `${rows.length} providers`;
      for (const p of rows) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.profile?.full_name || '(no name)'} <span class="mono" style="opacity:0.6">${(p.id||'').slice(0,8)}...</span></td>
          <td>${p.profile?.email || ''}</td>
          <td>${p.business_name || ''}</td>
          <td>${p.is_verified ? 'Yes' : 'No'}</td>
          <td>
            <button class="btn" data-verify="${p.id}" data-v="${!p.is_verified}">${p.is_verified ? 'Unverify' : 'Verify'}</button>
            <button class="btn" style="background:#DC2626" data-suspend="${p.id}">Suspend</button>
          </td>`;
        tbody.appendChild(tr);
      }
    } catch (e) { statusEl.textContent = 'Error: ' + (e?.message || 'Unknown'); }
  }

  async function verify(id, v) {
    try {
      const url = baseUrl() + `/api/admin/providers/${id}/verify`;
      const resp = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + tokenEl.value.trim(), 'Content-Type':'application/json' }, body: JSON.stringify({ verified: !!v }) });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Request failed');
      await search();
    } catch (e) { alert('Verify error: ' + (e?.message || 'Unknown')); }
  }

  async function suspend(id) {
    if (!confirm('Suspend this provider (disable all their services)?')) return;
    try {
      const url = baseUrl() + `/api/admin/providers/${id}/suspend`;
      const resp = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + tokenEl.value.trim() } });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Request failed');
      await search();
    } catch (e) { alert('Suspend error: ' + (e?.message || 'Unknown')); }
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
    const vBtn = e.target.closest('[data-verify]');
    const sBtn = e.target.closest('[data-suspend]');
    if (vBtn) verify(vBtn.getAttribute('data-verify'), vBtn.getAttribute('data-v') === 'true');
    if (sBtn) suspend(sBtn.getAttribute('data-suspend'));
  });

  searchBtn.addEventListener('click', search);
  loginBtn.addEventListener('click', login);
  logoutBtn.addEventListener('click', logout);
  refreshLoginStatus();
})();
