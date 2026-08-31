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

// Owner token is required by the current Supabase RLS policy when reading feedback.
const ownerSupabase = token
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { 'x-owner-token': token } }
    })
  : supabase;

const businessTitleEl = document.getElementById('business-title');
const subtitleEl = document.getElementById('dashboard-subtitle');
const statusEl = document.getElementById('status-message');
const canvas = document.getElementById('standee-canvas');
const hiddenQrDiv = document.getElementById('qrcode-hidden');
const downloadBtn = document.getElementById('download-standee-btn');
const feedbackList = document.getElementById('feedback-list');

function setStatus(message, type = 'loading') {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

async function loadDashboard() {
  try {
    if (!token) {
      setStatus('Access denied. No admin token was provided.', 'error');
      if (subtitleEl) subtitleEl.textContent = 'Open the Admin page using your business token.';
      return;
    }

    setStatus('Authenticating...', 'loading');

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select(`*, qr_codes ( id, code, status )`)
      .eq('auth_token', token)
      .maybeSingle();

    if (businessError) {
      console.error('Business lookup error:', businessError);
      setStatus(`Database error: ${businessError.message}`, 'error');
      return;
    }

    if (!business) {
      localStorage.removeItem('admin_auth_token');
      setStatus('Unauthorized. Invalid business token.', 'error');
      if (subtitleEl) subtitleEl.textContent = 'The supplied admin token is not valid.';
      return;
    }

    if (businessTitleEl) {
      businessTitleEl.textContent = business.business_name || 'WonderQR Business';
    }

    const qrRelation = Array.isArray(business.qr_codes)
      ? business.qr_codes[0]
      : business.qr_codes;

    const qrCode = qrRelation?.code || null;

    if (!qrCode) {
      setStatus('Business found, but no QR code is assigned.', 'error');
      if (subtitleEl) subtitleEl.textContent = 'Please assign a QR code to this business.';
    } else {
      setStatus(`Connected • QR Code: ${qrCode}`, 'success');
      if (subtitleEl) subtitleEl.textContent = `QR Code: ${qrCode}`;
      await generateStandee(qrCode);
    }

    await loadFeedback(business.id);
  } catch (error) {
    console.error('Dashboard error:', error);
    setStatus(`Unexpected error: ${error.message}`, 'error');
  }
}

async function generateStandee(qrCode) {
  if (!canvas || !hiddenQrDiv) return;

  if (typeof QRCode === 'undefined') {
    setStatus('QR generator library failed to load.', 'error');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // review.js reads ?qr=..., so the generated QR must use the same parameter.
  const targetUrl = `${window.location.origin}/wonderqr/index.html?qr=${encodeURIComponent(qrCode)}`;

  console.log('Customer QR URL:', targetUrl);

  hiddenQrDiv.innerHTML = '';

  new QRCode(hiddenQrDiv, {
    text: targetUrl,
    width: 600,
    height: 600,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });

  const bgImage = new Image();
  bgImage.onload = async () => {
    canvas.width = bgImage.naturalWidth || 1200;
    canvas.height = bgImage.naturalHeight || 1800;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    await wait(500);

    let qrSource = null;
    const qrCanvas = hiddenQrDiv.querySelector('canvas');
    const qrImg = hiddenQrDiv.querySelector('img');

    if (qrCanvas) {
      qrSource = qrCanvas.toDataURL('image/png');
    } else if (qrImg?.src) {
      qrSource = qrImg.src;
    }

    if (!qrSource) {
      setStatus('QR image could not be generated.', 'error');
      return;
    }

    const qrOverlay = new Image();
    qrOverlay.onload = () => {
      const qrSize = canvas.width * 0.35;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = canvas.height * 0.465;
      ctx.drawImage(qrOverlay, qrX, qrY, qrSize, qrSize);

      if (downloadBtn) downloadBtn.disabled = false;
      setStatus(`Review board ready • ${qrCode}`, 'success');
    };
    qrOverlay.onerror = () => setStatus('QR overlay failed to load.', 'error');
    qrOverlay.src = qrSource;
  };

  bgImage.onerror = () => {
    setStatus('Could not load Scan To Review.png.', 'error');
  };
  bgImage.src = 'Scan To Review.png';

  if (downloadBtn) {
    downloadBtn.onclick = () => {
      try {
        const link = document.createElement('a');
        link.download = `Review-Board-${qrCode}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        console.error('Download failed:', error);
        alert('Unable to download the review board.');
      }
    };
  }
}

async function loadFeedback(businessId) {
  if (!feedbackList) return;

  feedbackList.innerHTML = '<div class="empty-message">Loading feedback...</div>';

  const { data: feedbackData, error } = await ownerSupabase
    .from('feedback')
    .select('id, business_id, rating, message, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Feedback query failed:', error);
    feedbackList.innerHTML = `<div class="empty-message">Unable to load feedback.<br><small>${escapeHtml(error.message)}</small></div>`;
    return;
  }

  const feedbacks = feedbackData || [];

  if (subtitleEl && !subtitleEl.textContent.includes('QR Code:')) {
    subtitleEl.textContent = `Total Feedback: ${feedbacks.length}`;
  }

  if (feedbacks.length === 0) {
    feedbackList.innerHTML = '<div class="empty-message">No negative feedback reported yet.</div>';
    return;
  }

  feedbackList.innerHTML = feedbacks.map(item => {
    const rating = Math.min(3, Math.max(1, Number(item.rating) || 1));
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const date = item.created_at
      ? new Date(item.created_at).toLocaleString()
      : 'Unknown date';
    const message = item.message?.trim()
      ? escapeHtml(item.message)
      : '<em>No written message provided</em>';

    return `
      <div class="feedback-card">
        <div class="feedback-stars">${stars}</div>
        <div class="feedback-date">${escapeHtml(date)}</div>
        <div class="feedback-msg">${message}</div>
      </div>
    `;
  }).join('');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

loadDashboard();
