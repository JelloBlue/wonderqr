import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const urlParams = new URLSearchParams(window.location.search);
const adminPass = urlParams.get('key');

const MASTER_KEY = '131211';

if (adminPass !== MASTER_KEY) {
  document.getElementById('auth-status').innerText = "Access Denied: Invalid Master Key.";
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  document.getElementById('auth-status').innerText = "System Overview";
  document.getElementById('admin-content').classList.remove('hidden');

  // Initialize window array to store businesses globally
  window.loadedBusinesses = [];

  window.copyText = function(text, label) {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  function setupListener(id, event, callback) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, callback);
  }

  setupListener('open-add-modal-btn', 'click', () => {
    document.getElementById('add-biz-form').reset();
    const addModal = document.getElementById('add-modal');
    addModal.classList.remove('hidden');
    addModal.style.display = 'flex';
  });

  setupListener('close-add-modal-btn', 'click', () => {
    const addModal = document.getElementById('add-modal');
    addModal.classList.add('hidden');
    addModal.style.display = 'none';
  });

  setupListener('close-edit-modal-btn', 'click', () => {
    const editModal = document.getElementById('edit-modal');
    editModal.classList.add('hidden');
    editModal.style.display = 'none';
  });

  async function loadDashboard() {
    // 1. Fetch Overview Metrics
    const { count: bizCount } = await supabase.from('businesses').select('*', { count: 'exact', head: true });
    const { count: repsCount } = await supabase.from('sales_reps').select('*', { count: 'exact', head: true });
    const { count: fbCount } = await supabase.from('feedback').select('*', { count: 'exact', head: true });

    let { count: qrCount } = await supabase
      .from('qr_codes')
      .select('*', { count: 'exact', head: true })
      .ilike('status', 'assigned');

    if (!qrCount || qrCount === 0) {
      const { count: assignedBizQr } = await supabase
        .from('businesses')
        .select('qr_code_id', { count: 'exact', head: true })
        .not('qr_code_id', 'is', null);
      qrCount = assignedBizQr || 0;
    }

    document.getElementById('stat-biz').innerText = bizCount || 0;
    document.getElementById('stat-reps').innerText = repsCount || 0;
    document.getElementById('stat-qr').innerText = qrCount || 0;
    document.getElementById('stat-fb').innerText = fbCount || 0;

    // 2. Fetch Data Tables
    const { data: salesReps } = await supabase.from('sales_reps').select('*').order('created_at', { ascending: false });
    const { data: qrCodes } = await supabase.from('qr_codes').select('id, code');
    const { data: businesses, error } = await supabase.from('businesses').select('*').order('created_at', { ascending: false });

    if (error) console.error("Error fetching businesses:", error);

    // Save fetched array globally so openEditModal in superadmin.html can find business items
    window.loadedBusinesses = businesses || [];

    // Populate Sales Rep Dropdown
    const repSelect = document.getElementById('add-rep-select');
    if (repSelect) {
      repSelect.innerHTML = '<option value="">Direct Admin (No Rep)</option>';
      (salesReps || []).filter(r => r.active !== false).forEach(r => {
        repSelect.innerHTML += `<option value="${r.id}">${r.rep_name}</option>`;
      });
    }

    // Render Sales Reps Table
    const repsTbody = document.getElementById('reps-tbody');
    if (repsTbody) {
      repsTbody.innerHTML = '';
      const baseUrl = `${window.location.origin}/wonderqr`;

      (salesReps || []).forEach(r => {
        const repPortalUrl = `${baseUrl}/sales.html?rep_token=${r.access_token}`;
        const statusClass = r.active !== false ? 'badge-active' : 'badge-inactive';
        const statusText = r.active !== false ? 'Active' : 'Inactive';

        repsTbody.innerHTML += `
          <tr>
            <td><strong>${r.rep_name}</strong></td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td><code>${r.access_token || 'N/A'}</code></td>
            <td>
              <button class="action-btn btn-copy" onclick="copyText('${repPortalUrl}', 'Sales Rep Portal Link')">Copy Rep Link</button>
            </td>
          </tr>
        `;
      });
    }

    // Render Businesses Table
    const repMap = new Map((salesReps || []).map(r => [r.id, r.rep_name]));
    const qrMap = new Map((qrCodes || []).map(q => [q.id, q.code]));

    const tbody = document.getElementById('businesses-tbody');
    tbody.innerHTML = '';

    const baseUrl = `${window.location.origin}/wonderqr`;

    window.loadedBusinesses.forEach(b => {
      const qrCode = qrMap.get(b.qr_code_id) || '';
      const customerUrl = `${baseUrl}/?qr=${encodeURIComponent(qrCode)}`;
      const ownerUrl = `${baseUrl}/admin.html?token=${b.auth_token}`;
      const repName = repMap.get(b.sales_rep_id) || 'Direct Admin';

      tbody.innerHTML += `
        <tr>
          <td><strong>${b.business_name}</strong></td>
          <td>${b.owner_name}</td>
          <td><code>${qrCode || 'N/A'}</code></td>
          <td>${repName}</td>
          <td>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              <button class="action-btn btn-copy" onclick="copyText('${customerUrl}', 'Customer Review Link')">Copy Customer Link</button>
              <button class="action-btn btn-copy" style="background-color: #6366f1;" onclick="copyText('${ownerUrl}', 'Owner Dashboard Link')">Copy Owner Link</button>
              <button class="action-btn btn-edit" onclick="openEditModal('${b.id}')">Edit</button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  // 3. Form Handlers
  setupListener('add-biz-form', 'submit', async (e) => {
    e.preventDefault();

    const qrCode = document.getElementById('add-qr-code').value.trim();
    const bizName = document.getElementById('add-biz-name').value.trim();
    const googleUrl = document.getElementById('add-google-url').value.trim();
    const ownerName = document.getElementById('add-owner-name').value.trim();
    const repId = document.getElementById('add-rep-select').value || null;
    const whatsapp = document.getElementById('add-whatsapp').value.trim() || null;
    const phone = document.getElementById('add-phone').value.trim() || null;

    const { data: qrData, error: qrErr } = await supabase
      .from('qr_codes')
      .select('id')
      .ilike('code', qrCode)
      .single();

    if (qrErr || !qrData) {
      alert("QR Code not found!");
      return;
    }

    const { error: bizErr } = await supabase
      .from('businesses')
      .insert([{
        qr_code_id: qrData.id,
        business_name: bizName,
        google_review_url: googleUrl,
        owner_name: ownerName,
        sales_rep_id: repId,
        whatsapp_number: whatsapp,
        phone_number: phone
      }]);

    if (bizErr) {
      alert("Failed to onboard business: " + bizErr.message);
      return;
    }

    await supabase
      .from('qr_codes')
      .update({ status: 'assigned' })
      .eq('id', qrData.id);

    alert("Business Onboarded Successfully!");
    const addModal = document.getElementById('add-modal');
    addModal.classList.add('hidden');
    addModal.style.display = 'none';
    loadDashboard();
  });

  setupListener('edit-biz-form', 'submit', async (e) => {
    e.preventDefault();
    const bizId = document.getElementById('edit-biz-id').value;

    const updatedData = {
      business_name: document.getElementById('edit-biz-name').value.trim(),
      owner_name: document.getElementById('edit-owner-name').value.trim(),
      google_review_url: document.getElementById('edit-google-url').value.trim(),
      whatsapp_number: document.getElementById('edit-whatsapp').value.trim() || null,
      phone_number: document.getElementById('edit-phone').value.trim() || null
    };

    const { error } = await supabase.from('businesses').update(updatedData).eq('id', bizId);

    if (error) {
      alert("Failed to update business: " + error.message);
    } else {
      alert("Business updated successfully!");
      const editModal = document.getElementById('edit-modal');
      editModal.classList.add('hidden');
      editModal.style.display = 'none';
      loadDashboard();
    }
  });

  setupListener('create-rep-btn', 'click', async () => {
    const name = document.getElementById('new-rep-name').value.trim();
    if (!name) return alert("Enter rep name");

    const newToken = crypto.randomUUID();
    const { error } = await supabase.from('sales_reps').insert([{ rep_name: name, access_token: newToken, active: true }]);

    if (error) {
      alert("Failed to create rep token: " + error.message);
    } else {
      const repUrl = `${window.location.origin}/wonderqr/sales.html?rep_token=${newToken}`;
      prompt("Sales Rep Token Created! Copy their portal URL:", repUrl);
      document.getElementById('new-rep-name').value = '';
      loadDashboard();
    }
  });

  loadDashboard();
}
