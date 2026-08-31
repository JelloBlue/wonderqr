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

// ===============================
// LOAD DASHBOARD
// ===============================
async function loadDashboard() {
  const subtitleEl = document.getElementById('dashboard-subtitle');

  if (!token) {
    if (subtitleEl) subtitleEl.innerText = 'Access Denied: Missing auth token.';
    return;
  }

  // Fetch business details
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('auth_token', token)
    .maybeSingle();

  if (bizError || !business) {
    console.error('Auth lookup failed:', bizError);
    if (subtitleEl) subtitleEl.innerText = 'Unauthorized: Invalid business token.';
    localStorage.removeItem('admin_auth_token');
    return;
  }

  const bizTitleEl = document.getElementById('business-title');
  if (bizTitleEl) bizTitleEl.innerText = business.business_name || 'Private Feedback';

  // Explicit QR identifier (qr_code -> slug -> id fallback)
  const qrIdentifier = business.qr_code || business.slug || business.id;

  // Generate Review Board
  await generateStandee(qrIdentifier);

  // Load Feedback List
  await loadFeedback(business.id);
}

// ===============================
// GENERATE STANDEE (4x6 Canvas)
// ===============================
async function generateStandee(identifier) {
  const canvas = document.getElementById('standee-canvas');
  const hiddenQrDiv = document.getElementById('qrcode-hidden');
  const downloadBtn = document.getElementById('download-standee-btn');

  // Guard clause BEFORE getting canvas context
  if (!canvas || !hiddenQrDiv) {
    console.error('Standee canvas elements not found in DOM.');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Canvas context unavailable.');
    return;
  }

  const targetUrl = `https://jelloblue.github.io/wonderqr/index.html?biz=${encodeURIComponent(identifier)}`;
  hiddenQrDiv.innerHTML = '';

  // Generate QR Code
  new QRCode(hiddenQrDiv, {
    text: targetUrl,
    width: 600,
    height: 600,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });

  // Load Background Template
  const bgImage = new Image();
  bgImage.src = 'Scan To Review.png';

  bgImage.onload = () => {
    canvas.width = bgImage.naturalWidth || 1200;
    canvas.height = bgImage.naturalHeight || 1800;

    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // Render QR Code overlay cleanly
    setTimeout(() => {
      let qrSource = null;
      const qrCanvas = hiddenQrDiv.querySelector('canvas');
      const qrImg = hiddenQrDiv.querySelector('img');

      if (qrCanvas) {
        qrSource = qrCanvas.toDataURL('image/png');
      } else if (qrImg && qrImg.src) {
        qrSource = qrImg.src;
      }

      if (!qrSource) {
        console.error('QR image payload missing.');
        return;
      }

      const qrOverlay = new Image();
      qrOverlay.onload = () => {
        const qrSize = canvas.width * 0.35;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = canvas.height * 0.465;

        ctx.drawImage(qrOverlay, qrX, qrY, qrSize, qrSize);
      };
      qrOverlay.src = qrSource;
    }, 400);
  };

  bgImage.onerror = () => {
    console.error('Failed to load Scan To Review.png');
  };

  // Printable Download Handler
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      try {
        const link = document.createElement('a');
        link.download = `Review-Board-${identifier}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      } catch (err) {
        console.error('Standee download failed:', err);
      }
    };
  }
}

// ===============================
// LOAD FEEDBACK
// ===============================
async function loadFeedback(businessId) {
  const subtitleEl = document.getElementById('dashboard-subtitle');
  const listContainer = document.getElementById('feedback-list');

  const { data: feedbackData, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Feedback query failed:', error);
    if (listContainer) {
      listContainer.innerHTML = '<p>Unable to load feedback. Please try again.</p>';
    }
    return;
  }

  const feedbacks = feedbackData || [];

  if (subtitleEl) {
    subtitleEl.innerText = `Total Reviews: ${feedbacks.length}`;
  }

  if (feedbacks.length === 0) {
    if (listContainer) {
      listContainer.innerHTML = '<p>No negative feedback reported yet!</p>';
    }
    return;
  }

  if (listContainer) {
    listContainer.innerHTML = feedbacks.map(item => {
      const rating = Math.min(5, Math.max(0, Number(item.rating) || 0));
      const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      const date = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown date';
      const message = item.message ? item.message : '<em>No written message provided</em>';
      const contact = item.customer_phone
        ? `<div class="feedback-contact"><strong>Contact:</strong> ${item.customer_phone}</div>`
        : '';

      return `
        <div class="feedback-card">
          <div class="feedback-stars">${stars}</div>
          <div class="feedback-date">${date}</div>
          <div class="feedback-msg">${message}</div>
          ${contact}
        </div>
      `;
    }).join('');
  }
}

loadDashboard();
