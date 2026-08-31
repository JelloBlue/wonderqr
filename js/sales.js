import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const urlParams = new URLSearchParams(window.location.search);
const repToken = urlParams.get('rep_token');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    headers: repToken ? { 'x-rep-token': repToken } : {}
  }
});

let currentRep = null;
let generatedCustomerUrl = '';
let generatedOwnerUrl = '';
let currentBizName = '';

async function init() {
  const agentInfo = document.getElementById('agent-info');
  if (!repToken) {
    agentInfo.innerText = 'Error: Missing sales token link.';
    document.getElementById('onboard-form').style.display = 'none';
    return;
  }

  const { data: rep, error } = await supabase
    .from('sales_reps')
    .select('id, rep_name, access_token, active')
    .eq('access_token', repToken)
    .eq('active', true)
    .single();

  if (error || !rep) {
    console.error('Sales rep authentication failed:', error);
    agentInfo.innerText = 'Invalid or inactive Sales Representative token.';
    document.getElementById('onboard-form').style.display = 'none';
    return;
  }

  currentRep = rep;
  agentInfo.innerText = `Sales Agent: ${rep.rep_name}`;
}

window.copyCustomerUrl = function() {
  if (!generatedCustomerUrl) return;
  navigator.clipboard.writeText(generatedCustomerUrl);
  alert('Customer Review Link copied!');
};

window.copyOwnerUrl = function() {
  if (!generatedOwnerUrl) return;
  navigator.clipboard.writeText(generatedOwnerUrl);
  alert('Owner Dashboard Link copied!');
};

window.shareCustomerUrl = function() {
  if (!generatedCustomerUrl) return;
  const text = encodeURIComponent(`Here is your Customer Review QR Link: ${generatedCustomerUrl}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
};

window.shareOwnerUrl = function() {
  if (!generatedOwnerUrl) return;
  const text = encodeURIComponent(`Here is your Private Business Owner Dashboard Link: ${generatedOwnerUrl}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
};

window.generateCustomerQr = function() {
  if (!generatedCustomerUrl) return;
  const modal = document.getElementById('qr-modal');
  const container = document.getElementById('qr-canvas-container');
  const titleEl = document.getElementById('qr-modal-title');
  const urlEl = document.getElementById('qr-modal-url');
  const downloadBtn = document.getElementById('download-qr-btn');

  titleEl.innerText = `${currentBizName || 'Customer'} QR Code`;
  urlEl.innerText = generatedCustomerUrl;
  container.innerHTML = '';

  new QRCode(container, {
    text: generatedCustomerUrl,
    width: 200,
    height: 200,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });

  setTimeout(() => {
    const img = container.querySelector('img');
    const canvas = container.querySelector('canvas');
    if (img?.src) downloadBtn.href = img.src;
    else if (canvas) downloadBtn.href = canvas.toDataURL('image/png');
  }, 150);

  modal.classList.remove('hidden');
  modal.style.display = 'flex';
};

document.getElementById('close-qr-modal-btn')?.addEventListener('click', () => {
  const modal = document.getElementById('qr-modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
});

document.getElementById('onboard-another-btn')?.addEventListener('click', () => {
  document.getElementById('onboard-form').reset();
  document.getElementById('onboard-form').classList.remove('hidden');
  document.getElementById('success-container').classList.add('hidden');
});

document.getElementById('onboard-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentRep) return alert('Sales Rep not authenticated!');

  const qrCode = document.getElementById('qr-code').value.trim();
  const bizName = document.getElementById('biz-name').value.trim();
  const googleUrl = document.getElementById('google-url').value.trim();
  const ownerName = document.getElementById('owner-name').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim() || null;
  const phone = document.getElementById('phone').value.trim() || null;
  const instaUrl = document.getElementById('instagram-url').value.trim() || null;
  const ytUrl = document.getElementById('youtube-url').value.trim() || null;

  const { data: qrData, error: qrErr } = await supabase
    .from('qr_codes')
    .select('id, code, status')
    .eq('code', qrCode)
    .eq('status', 'available')
    .single();

  if (qrErr || !qrData) {
    return alert(`Standee Code "${qrCode}" is not available in the system.`);
  }

  const { data: newBiz, error: bizErr } = await supabase
    .from('businesses')
    .insert([{
      qr_code_id: qrData.id,
      business_name: bizName,
      google_review_url: googleUrl,
      owner_name: ownerName,
      sales_rep_id: currentRep.id,
      whatsapp_number: whatsapp,
      phone_number: phone,
      instagram_url: instaUrl,
      youtube_url: ytUrl
    }])
    .select('id, auth_token')
    .single();

  if (bizErr) {
    console.error('Business onboarding failed:', bizErr);
    return alert('Failed to onboard business: ' + bizErr.message);
  }

  const { error: qrUpdateErr } = await supabase
    .from('qr_codes')
    .update({ status: 'assigned' })
    .eq('id', qrData.id)
    .eq('status', 'available');

  if (qrUpdateErr) {
    console.error('QR status update failed:', qrUpdateErr);
    alert('Business was created, but the QR status could not be updated. Please contact Admin.');
  }

  const baseUrl = `${window.location.origin}/wonderqr`;
  generatedCustomerUrl = `${baseUrl}/?qr=${encodeURIComponent(qrCode)}`;
  generatedOwnerUrl = `${baseUrl}/admin.html?token=${newBiz.auth_token}`;
  currentBizName = bizName;

  document.getElementById('created-customer-url').value = generatedCustomerUrl;
  document.getElementById('created-owner-url').value = generatedOwnerUrl;
  document.getElementById('onboard-form').classList.add('hidden');
  document.getElementById('success-container').classList.remove('hidden');
});

init();
