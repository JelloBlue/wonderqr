import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const urlParams = new URLSearchParams(window.location.search);
let token = urlParams.get('token');

if (token) {
  localStorage.setItem('admin_auth_token', token);
} else {
  token = localStorage.getItem('admin_auth_token');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadDashboard() {
  const subtitleEl = document.getElementById('dashboard-subtitle');

  if (!token) {
    if (subtitleEl) subtitleEl.innerText = "Access Denied: Missing auth token.";
    return;
  }

  // 1. Fetch business details safely
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('auth_token', token)
    .maybeSingle();

  if (bizError || !business) {
    console.error("Auth lookup failed:", bizError);
    if (subtitleEl) subtitleEl.innerText = "Unauthorized: Invalid business token.";
    localStorage.removeItem('admin_auth_token');
    return;
  }

  const bizTitleEl = document.getElementById('business-title');
  if (bizTitleEl) bizTitleEl.innerText = business.business_name || "Private Feedback";

  // Determine identifier to embed into QR URL
  const qrIdentifier = business.slug || business.id;

  // 2. Generate Review Board with QR
  generateStandee(qrIdentifier);

  // 3. Load Feedback
  loadFeedback(business.id);
}

function generateStandee(identifier) {
  const canvas = document.getElementById('standee-canvas');
  const ctx = canvas.getContext('2d');
  const hiddenQrDiv = document.getElementById('qrcode-hidden');
  const downloadBtn = document.getElementById('download-standee-btn');

  if (!canvas || !hiddenQrDiv) return;

  // Target landing page URL for customers
  const targetUrl = `https://jelloblue.github.io/wonderqr/index.html?biz=${identifier}`;

  // Clear previous QR
  hiddenQrDiv.innerHTML = "";

  // 1. Generate QR Code into hidden container
  new QRCode(hiddenQrDiv, {
    text: targetUrl,
    width: 600,
    height: 600,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  // 2. Load background image template (Using .png extension)
  const bgImage = new Image();
  bgImage.src = 'Scan To Review.png';

  bgImage.onload = () => {
    canvas.width = bgImage.naturalWidth || 1200;
    canvas.height = bgImage.naturalHeight || 1800;

    // Draw background
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // 3. Render QR Code inside the green box
    setTimeout(() => {
      const qrImg = hiddenQrDiv.querySelector('img');
      if (qrImg && qrImg.src) {
        const qrOverlay = new Image();
        qrOverlay.src = qrImg.src;
        qrOverlay.onload = () => {
          const qrSize = canvas.width * 0.35;
          const qrX = (canvas.width - qrSize) / 2;
          const qrY = canvas.height * 0.465;

          ctx.drawImage(qrOverlay, qrX, qrY, qrSize, qrSize);
        };
      }
    }, 400);
  };

  // 4. Handle Download
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.download = `Review-Board-4x6.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    };
  }
}

async function loadFeedback(businessId) {
  const subtitleEl = document.getElementById('dashboard-subtitle');
  const listContainer = document.getElementById('feedback-list');

  const { data: feedbackData } = await supabase
    .from('feedback')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  const feedbacks = feedbackData || [];
  if (subtitleEl) subtitleEl.innerText = `Total Reviews: ${feedbacks.length}`;

  if (feedbacks.length === 0) {
    if (listContainer) listContainer.innerHTML = "<p>No negative feedback reported yet!</p>";
    return;
  }

  if (listContainer) {
    listContainer.innerHTML = feedbacks.map(item => `
      <div class="feedback-card">
        <div class="feedback-stars">${'★'.repeat(item.rating || 0)}${'☆'.repeat(5 - (item.rating || 0))}</div>
        <div class="feedback-date">${new Date(item.created_at).toLocaleDateString()}</div>
        <div class="feedback-msg">${item.message ? item.message : '<em>No written message provided</em>'}</div>
        ${item.customer_phone ? `<div class="feedback-contact"><strong>Contact:</strong> ${item.customer_phone}</div>` : ''}
      </div>
    `).join('');
  }
}

loadDashboard();
