import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const urlParams = new URLSearchParams(window.location.search);
const repToken = urlParams.get('rep_token');

if (!repToken) {
  document.getElementById('rep-name-display').innerText = "Access Denied: Invalid Rep Token.";
} else {
  const salesSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { 'x-rep-token': repToken } }
  });

  async function verifyRep() {
    const { data, error } = await salesSupabase
      .from('sales_reps')
      .select('id, rep_name')
      .eq('access_token', repToken)
      .eq('active', true)
      .single();

    if (error || !data) {
      document.getElementById('rep-name-display').innerText = "Access Denied: Sales token inactive.";
      return;
    }

    document.getElementById('rep-name-display').innerText = `Sales Agent: ${data.rep_name}`;
    document.getElementById('onboard-form').classList.remove('hidden');
    window.currentRepId = data.id;
  }

  document.getElementById('onboard-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const qrCode = document.getElementById('qr-code-input').value.trim();
    const bizName = document.getElementById('biz-name-input').value.trim();
    const googleUrl = document.getElementById('google-url-input').value.trim();
    const ownerName = document.getElementById('owner-name-input').value.trim();
    
    const whatsapp = document.getElementById('whatsapp-input').value.trim() || null;
    const phone = document.getElementById('phone-input').value.trim() || null;
    const instagram = document.getElementById('instagram-input').value.trim() || null;
    const youtube = document.getElementById('youtube-input').value.trim() || null;

    const { data: qrData, error: qrErr } = await salesSupabase
      .from('qr_codes')
      .select('id')
      .eq('code', qrCode)
      .eq('status', 'available')
      .single();

    if (qrErr || !qrData) {
      alert("QR Code not available or already assigned!");
      return;
    }

    const { data: bizData, error: bizErr } = await salesSupabase
      .from('businesses')
      .insert([{
        qr_code_id: qrData.id,
        business_name: bizName,
        google_review_url: googleUrl,
        owner_name: ownerName,
        whatsapp_number: whatsapp,
        phone_number: phone,
        instagram_url: instagram,
        youtube_url: youtube,
        sales_rep_id: window.currentRepId
      }])
      .select('auth_token')
      .single();

    if (bizErr) {
      alert("Failed to create business profile.");
      return;
    }

    await salesSupabase
      .from('qr_codes')
      .update({ status: 'assigned' })
      .eq('id', qrData.id);

    // Build absolute URLs including GitHub Pages subfolder (/wonderqr/)
    const baseUrl = `${window.location.origin}/wonderqr`;
    const customerUrl = `${baseUrl}/?qr=${encodeURIComponent(qrCode)}`;
    const ownerDashboardUrl = `${baseUrl}/admin.html?token=${bizData.auth_token}`;

    // Populate both output fields on the success screen
    document.getElementById('customer-link-output').value = customerUrl;
    document.getElementById('owner-link-output').value = ownerDashboardUrl;

    // Toggle visibility
    document.getElementById('onboard-form').classList.add('hidden');
    document.getElementById('success-screen').classList.remove('hidden');
  });

  verifyRep();
}
