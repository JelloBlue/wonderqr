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

  async function loadDashboard() {
    // 1. Fetch Metrics Data
    const { count: bizCount } = await supabase.from('businesses').select('*', { count: 'exact', head: true });
    const { count: repsCount } = await supabase.from('sales_reps').select('*', { count: 'exact', head: true });
    const { count: qrCount } = await supabase.from('qr_codes').select('*', { count: 'exact', head: true }).eq('status', 'assigned');
    const { count: fbCount } = await supabase.from('feedback').select('*', { count: 'exact', head: true });

    document.getElementById('stat-biz').innerText = bizCount || 0;
    document.getElementById('stat-reps').innerText = repsCount || 0;
    document.getElementById('stat-qr').innerText = qrCount || 0;
    document.getElementById('stat-fb').innerText = fbCount || 0;

    // 2. Fetch Businesses & Sales Reps Info
    const { data: businesses } = await supabase
      .from('businesses')
      .select('*, qr_codes(code), sales_reps(rep_name)')
      .order('created_at', { ascending: false });

    const tbody = document.getElementById('businesses-tbody');
    tbody.innerHTML = '';

    (businesses || []).forEach(b => {
      const ownerUrl = `${window.location.origin}/wonderqr/admin.html?token=${b.auth_token}`;
      tbody.innerHTML += `
        <tr>
          <td><strong>${b.business_name}</strong></td>
          <td>${b.owner_name}</td>
          <td><code>${b.qr_codes?.code || 'N/A'}</code></td>
          <td>${b.sales_reps?.rep_name || 'Unassigned'}</td>
          <td><button onclick="navigator.clipboard.writeText('${ownerUrl}'); alert('Owner URL copied!');" style="padding: 4px 8px; font-size: 0.75rem;">Copy Link</button></td>
        </tr>
      `;
    });
  }

  // 3. Generate New Sales Rep Tokens directly from Dashboard
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
