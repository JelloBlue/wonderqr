import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const urlParams = new URLSearchParams(window.location.search);
const repToken = urlParams.get('rep_token');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentRep = null;
let generatedCustomerUrl = '';
let generatedOwnerUrl = '';
let currentBizName = '';

// Check Rep Token
async function init() {
  const agentInfo = document.getElementById('agent-info');
  if (!repToken) {
    agentInfo.innerText = "Error: Missing sales token link.";
    document.getElementById('onboard-form').style.display = 'none';
    return;
  }

  const { data: rep, error } = await supabase
    .from('sales_reps')
    .select('*')
    .eq('access_token', repToken)
    .single();

  if (error || !rep || rep.active === false) {
    agentInfo.innerText = "Invalid or inactive Sales Representative token.";
    document.getElementById('onboard-form').style.display = 'none';
  } else {
    currentRep = rep;
    agentInfo.innerText = `Sales Agent: ${rep.rep_name}`;
  }
}

// Global Helper Functions for Actions
window.copyCustomerUrl = function() {
  if (!generatedCustomerUrl) return;
  navigator.clipboard.writeText(generatedCustomerUrl);
  alert("Customer Review Link copied!");
};

window.copyOwnerUrl = function() {
  if (!generatedOwnerUrl) return;
  navigator.clipboard.writeText(generatedOwnerUrl);
  alert("Owner Dashboard Link copied!");
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
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });

  setTimeout(() => {
    const img = container.querySelector('img');
    const canvas = container.querySelector('canvas');
    if (img && img.src) {
      downloadBtn.href = img.src;
    } else if (canvas) {
      downloadBtn.href = canvas.toDataURL("image/png");
    }
  }, 150);

  modal.classList.remove('hidden');
  modal.style.display = 'flex';
};

// Event Listeners
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

// Form Submission
document.getElementById('onboard-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentRep) return alert("Sales Rep not authenticated!");

  const qrCode = document.getElementById('qr-code').value.trim();
  const bizName = document.getElementById('biz-name').value.trim();
  const googleUrl = document.getElementById('google-url').value.trim();
  const ownerName = document.getElementById('owner-name').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim() || null;
  const phone = document.getElementById('phone').value.trim() || null;
  const instaUrl = document.getElementById('instagram-url').value.trim() || null;
  const ytUrl = document.getElementById('youtube-url').value.trim() || null;

  // Check QR Code
  const { data: qrData, error: qrErr } = await supabase
    .from('qr_codes')
    .select('id')
    .ilike('code', qrCode)
    .single();

  if (qrErr || !qrData) {
    return alert(`Standee Code "${qrCode}" not found in system database.`);
  }

  // Insert Business
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
    .select()
    .single();

  if (bizErr) {
    return alert("Failed to onboard business: " + bizErr.message);
  }

  // Update QR Code status to assigned
  await supabase.from('qr_codes').update({ status: 'assigned' }).eq('id', qrData.id);

  // Build Links
  const baseUrl = `${window.location.origin}/wonderqr`;
  generatedCustomerUrl = `${baseUrl}/?qr=${encodeURIComponent(qrCode)}`;
  generatedOwnerUrl = `${baseUrl}/admin.html?token=${newBiz.auth_token}`;
  currentBizName = bizName;

  document.getElementById('created-customer-url').value = generatedCustomerUrl;
  document.getElementById('created-owner-url').value = generatedOwnerUrl;

  // Toggle View
  document.getElementById('onboard-form').classList.add('hidden');
  document.getElementById('success-container').classList.remove('hidden');
});

init();
