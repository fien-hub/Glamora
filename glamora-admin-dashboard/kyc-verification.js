(() => {
  let supabaseClient = null;
  let allDocs = [];
  let activeFilter = 'all';
  let pendingRejectDocId = null;
  let pendingRejectProviderId = null;

  const $ = (id) => document.getElementById(id);

  // ── Persist credentials ──────────────────────────────────────────────────
  const CREDS_KEY = 'glamora_kyc_creds';
  function saveCreds() {
    localStorage.setItem(CREDS_KEY, JSON.stringify({
      spUrl: $('spUrl').value.trim(),
      spKey: $('spKey').value.trim(),
    }));
    $('loginStatus').textContent = '✅ Credentials saved';
  }
  function loadCreds() {
    try {
      const c = JSON.parse(localStorage.getItem(CREDS_KEY) || '{}');
      if (c.spUrl) $('spUrl').value = c.spUrl;
      if (c.spKey) $('spKey').value = c.spKey;
    } catch {}
  }

  // ── Init Supabase ─────────────────────────────────────────────────────────
  function initSupabase() {
    const url = $('spUrl').value.trim();
    const key = $('spKey').value.trim();
    if (!url || !key) {
      $('loginStatus').textContent = '⚠️ Enter Supabase URL and Service Key';
      return false;
    }
    supabaseClient = supabase.createClient(url, key);
    return true;
  }

  // ── Load all documents ────────────────────────────────────────────────────
  async function loadDocuments() {
    if (!initSupabase()) return;
    $('loginStatus').textContent = '⏳ Loading documents...';

    try {
      const { data: docs, error } = await supabaseClient
        .from('verification_documents')
        .select(`
          id,
          document_type,
          document_url,
          document_number,
          expiry_date,
          status,
          rejection_reason,
          uploaded_at,
          reviewed_at,
          notes,
          provider_id
        `)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Fetch provider names
      const providerIds = [...new Set(docs.map(d => d.provider_id))];
      let providerMap = {};
      if (providerIds.length) {
        const { data: providers } = await supabaseClient
          .from('profiles')
          .select('id, full_name, email')
          .in('id', providerIds);
        (providers || []).forEach(p => { providerMap[p.id] = p; });
      }

      allDocs = docs.map(d => ({ ...d, provider: providerMap[d.provider_id] || null }));

      renderStats();
      renderCards();
      $('filterBar').style.display = 'flex';
      $('loginStatus').textContent = `✅ Loaded ${docs.length} document(s)`;
    } catch (err) {
      $('loginStatus').textContent = `❌ Error: ${err.message}`;
    }
  }

  // ── Render stats pills ────────────────────────────────────────────────────
  function renderStats() {
    const counts = { all: allDocs.length, pending: 0, under_review: 0, approved: 0, rejected: 0 };
    allDocs.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++; });
    const row = $('statsRow');
    row.style.display = 'flex';
    row.innerHTML = [
      ['All', counts.all, '#1F2937'],
      ['Pending', counts.pending, '#D97706'],
      ['Under Review', counts.under_review, '#2563EB'],
      ['Approved', counts.approved, '#059669'],
      ['Rejected', counts.rejected, '#DC2626'],
    ].map(([label, count, color]) =>
      `<div class="stat-pill" style="color:${color}">${label}: <strong>${count}</strong></div>`
    ).join('');
  }

  // ── Render cards ──────────────────────────────────────────────────────────
  function renderCards() {
    const filtered = activeFilter === 'all'
      ? allDocs
      : allDocs.filter(d => d.status === activeFilter);

    const container = $('docCards');
    const empty = $('emptyState');

    if (!filtered.length) {
      container.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    container.innerHTML = filtered.map(doc => {
      const providerName = doc.provider?.full_name || doc.provider?.email || doc.provider_id.slice(0, 8) + '…';
      const docType = (doc.document_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const uploadedAt = doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : '—';
      const reviewedAt = doc.reviewed_at ? new Date(doc.reviewed_at).toLocaleString() : '—';

      const canAct = doc.status === 'pending' || doc.status === 'under_review';

      return `
        <div class="doc-card" data-id="${doc.id}">
          <div class="doc-card-header">
            <span style="font-weight:600;font-size:14px">${docType}</span>
            <span class="badge-status badge-${doc.status}">${doc.status.replace('_', ' ')}</span>
          </div>
          <div class="doc-card-body">
            <div id="img-${doc.id}" class="doc-img-placeholder">
              <span>Click "View Doc" to load image</span>
            </div>
            <div class="doc-meta">
              <div class="doc-meta-row"><span>Provider</span><span>${providerName}</span></div>
              <div class="doc-meta-row"><span>Doc #</span><span>${doc.document_number || '—'}</span></div>
              <div class="doc-meta-row"><span>Expires</span><span>${doc.expiry_date || '—'}</span></div>
              <div class="doc-meta-row"><span>Uploaded</span><span>${uploadedAt}</span></div>
              <div class="doc-meta-row"><span>Reviewed</span><span>${reviewedAt}</span></div>
              ${doc.rejection_reason ? `<div class="doc-meta-row"><span>Reason</span><span style="color:#DC2626">${doc.rejection_reason}</span></div>` : ''}
              ${doc.notes ? `<div class="doc-meta-row"><span>Notes</span><span>${doc.notes}</span></div>` : ''}
            </div>
            <div class="doc-actions">
              <button class="btn-view" onclick="viewDoc('${doc.id}', '${doc.document_url}')">View Doc</button>
              ${canAct ? `
                <button class="btn-approve" onclick="approveDoc('${doc.id}', '${doc.provider_id}')">✓ Approve</button>
                <button class="btn-reject" onclick="openRejectModal('${doc.id}', '${doc.provider_id}')">✗ Reject</button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── View document (generate signed URL) ──────────────────────────────────
  window.viewDoc = async (docId, filePath) => {
    try {
      const { data, error } = await supabaseClient.storage
        .from('verification-documents')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      // Show in lightbox
      $('lightboxImg').src = data.signedUrl;
      $('lightbox').classList.add('open');

      // Also show thumbnail in card
      const placeholder = $(`img-${docId}`);
      if (placeholder) {
        placeholder.outerHTML = `<img id="img-${docId}" class="doc-img" src="${data.signedUrl}" onclick="openLightbox('${data.signedUrl}')" alt="Document" />`;
      }
    } catch (err) {
      alert('Failed to load document: ' + err.message);
    }
  };

  window.openLightbox = (url) => {
    $('lightboxImg').src = url;
    $('lightbox').classList.add('open');
  };

  // ── Approve ───────────────────────────────────────────────────────────────
  window.approveDoc = async (docId, providerId) => {
    if (!confirm('Approve this document?')) return;
    try {
      const now = new Date().toISOString();

      // Update document status
      const { error: docErr } = await supabaseClient
        .from('verification_documents')
        .update({ status: 'approved', reviewed_at: now })
        .eq('id', docId);
      if (docErr) throw docErr;

      // Update provider_profiles
      const { error: ppErr } = await supabaseClient
        .from('provider_profiles')
        .update({
          identity_verification_status: 'approved',
          identity_verified_at: now,
          is_verified: true,
        })
        .eq('id', providerId);
      if (ppErr) throw ppErr;

      // Refresh local data
      const doc = allDocs.find(d => d.id === docId);
      if (doc) { doc.status = 'approved'; doc.reviewed_at = now; }
      renderStats();
      renderCards();
      $('loginStatus').textContent = '✅ Document approved';
    } catch (err) {
      alert('Error approving: ' + err.message);
    }
  };

  // ── Reject modal ──────────────────────────────────────────────────────────
  window.openRejectModal = (docId, providerId) => {
    pendingRejectDocId = docId;
    pendingRejectProviderId = providerId;
    $('rejectReason').value = '';
    $('rejectModal').classList.add('open');
  };

  async function confirmReject() {
    const reason = $('rejectReason').value.trim();
    if (!reason) { alert('Please enter a rejection reason'); return; }
    try {
      const now = new Date().toISOString();

      const { error: docErr } = await supabaseClient
        .from('verification_documents')
        .update({ status: 'rejected', rejection_reason: reason, reviewed_at: now })
        .eq('id', pendingRejectDocId);
      if (docErr) throw docErr;

      const { error: ppErr } = await supabaseClient
        .from('provider_profiles')
        .update({
          identity_verification_status: 'rejected',
          identity_verification_notes: reason,
        })
        .eq('id', pendingRejectProviderId);
      if (ppErr) throw ppErr;

      const doc = allDocs.find(d => d.id === pendingRejectDocId);
      if (doc) { doc.status = 'rejected'; doc.rejection_reason = reason; doc.reviewed_at = now; }

      $('rejectModal').classList.remove('open');
      renderStats();
      renderCards();
      $('loginStatus').textContent = '✅ Document rejected';
    } catch (err) {
      alert('Error rejecting: ' + err.message);
    }
  }

  // ── Filter buttons ────────────────────────────────────────────────────────
  document.getElementById('filterBar').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    document.querySelectorAll('#filterBar button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCards();
  });

  // ── Wire up buttons ───────────────────────────────────────────────────────
  $('loadBtn').addEventListener('click', loadDocuments);
  $('saveCredsBtn').addEventListener('click', saveCreds);
  $('rejectCancelBtn').addEventListener('click', () => $('rejectModal').classList.remove('open'));
  $('rejectConfirmBtn').addEventListener('click', confirmReject);
  $('lightboxClose').addEventListener('click', () => $('lightbox').classList.remove('open'));
  $('lightbox').addEventListener('click', (e) => { if (e.target === $('lightbox')) $('lightbox').classList.remove('open'); });

  // ── Auto-load saved credentials ───────────────────────────────────────────
  loadCreds();
})();
