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

  let loadedBusinesses = [];

  window.copyText = function(text, label) {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  window.openEditModal = function(bizId) {
    const biz = loadedBusinesses.find(b => b.id === bizId);
    if (!biz) return;

    document.getElementById('edit-biz-id').value = biz.id;
    document.getElementById('edit-biz-name').value = biz.business_name || '';
    document.getElementById('edit-owner-name').value = biz.owner_name || '';
    document.getElementById('edit-google-url').value = biz.google_review_url || '';
    document.getElementById('edit-whatsapp').value = biz.whatsapp_number || '';
    document.getElementById('edit-phone').value = biz.phone_number || '';

    document.getElementById('edit-modal').classList.remove('hidden');
  };

  document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('edit-modal').classList.add('hidden');
  });

  async function loadDashboard() {
    // 1. Metrics
    const { count: bizCount } = await supabase.from('businesses').select('*', { count: 'exact', head: true });
    const { count: repsCount } = await supabase.from('sales_reps').select('*', { count: 'exact', head: true });
    const { count: qrCount } = await supabase.from('qr_codes').select('*', { count: 'exact', head: true }).eq('status', 'assigned');
    const { count: fbCount } = await supabase.from('feedback').select('*', { count: 'exact', head: true });

    document.getElementById('stat-biz').innerText = bizCount || 0;
    document.getElementById('stat-reps').innerText = repsCount || 0;
    document.getElementById('stat-qr').innerText = qrCount || 0;
    document.getElementById('stat-fb').innerText = fbCount || 0;

    // 2. Query Businesses + QR Codes + Sales Reps
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select(`
        *,
        qr_codes:qr_code_id ( code ),
        sales_reps:sales_rep_id ( rep_name )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading dashboard data:", error);
    }

    loadedBusinesses = businesses || [];
    const tbody = document.getElementById('businesses-tbody');
    tbody.innerHTML = '';

    const baseUrl = `${window.location.origin}/wonderqr`;

    loadedBusinesses.forEach(b => {
      const qrCode = b.qr_codes?.code || '';
      const customerUrl = `${baseUrl}/?qr=${encodeURIComponent(qrCode)}`;
      const ownerUrl = `${baseUrl}/admin.html?token=${b.auth_token}`;
      const repName = b.sales_reps?.rep_name || 'Unassigned';

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

  // 3. Handle Business Update Submit
  document.getElementById('edit-biz-form').addEventListener('submit', async (e) => {
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
      document.getElementById('edit-modal').classList.add('hidden');
      loadDashboard();
    }
  });

  // 4. Generate Sales Rep Tokens
  document.getElementById('create-rep-btn').addEventListener('click', async () => {
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
