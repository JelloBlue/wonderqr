import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const urlParams = new URLSearchParams(window.location.search);
const qrCode = urlParams.get('qr');
let currentBusiness = null;
let selectedRating = 0;

async function init() {
  if (!qrCode) {
    setText('biz-name', 'Invalid Link');
    setText('biz-subtitle', 'No QR code specified in URL.');
    return;
  }

  const { data: qrData, error: qrErr } = await supabase
    .from('qr_codes')
    .select('id, code, status')
    .eq('code', qrCode)
    .eq('status', 'assigned')
    .single();

  if (qrErr || !qrData) {
    console.error('QR lookup failed:', qrErr);
    setText('biz-name', 'QR Code Not Found');
    setText('biz-subtitle', 'Please scan a valid WonderQR code.');
    return;
  }

  const { data: bizData, error: bizErr } = await supabase
    .from('public_businesses')
    .select('id, qr_code_id, business_name, google_review_url, instagram_url, youtube_url, whatsapp_number, phone_number, owner_name, active')
    .eq('qr_code_id', qrData.id)
    .eq('active', true)
    .single();

  if (bizErr || !bizData) {
    console.error('Business lookup failed:', bizErr);
    setText('biz-name', 'Business Not Registered');
    setText('biz-subtitle', 'This QR code is not currently active.');
    return;
  }

  currentBusiness = bizData;
  setText('biz-name', currentBusiness.business_name || '');
  setupSocialLinks();
  setupStars();
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function setupSocialLinks() {
  const socialBlock = document.getElementById('social-block');
  let hasSocial = false;
  if (currentBusiness.whatsapp_number) {
    const waLink = document.getElementById('link-wa');
    if (waLink) { waLink.href = `https://wa.me/${currentBusiness.whatsapp_number}`; waLink.classList.remove('hidden'); hasSocial = true; }
  }
  if (currentBusiness.instagram_url) {
    const instaLink = document.getElementById('link-insta');
    if (instaLink) { instaLink.href = currentBusiness.instagram_url; instaLink.classList.remove('hidden'); hasSocial = true; }
  }
  if (currentBusiness.youtube_url) {
    const ytLink = document.getElementById('link-yt');
    if (ytLink) { ytLink.href = currentBusiness.youtube_url; ytLink.classList.remove('hidden'); hasSocial = true; }
  }
  if (hasSocial && socialBlock) socialBlock.classList.remove('hidden');
}

function setupStars() {
  const stars = document.querySelectorAll('#star-container .star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.getAttribute('data-rating'), 10);
      if (!rating || !currentBusiness) return;
      selectedRating = rating;
      stars.forEach(s => {
        const r = parseInt(s.getAttribute('data-rating'), 10);
        s.classList.toggle('selected', r <= rating);
      });
      if (rating >= 4) {
        setText('biz-subtitle', 'Redirecting to Google Reviews...');
        redirectToGoogle();
      } else {
        document.getElementById('feedback-form-container')?.classList.remove('hidden');
      }
    });
  });
}

function redirectToGoogle() {
  if (currentBusiness?.google_review_url) window.location.href = currentBusiness.google_review_url;
  else setText('biz-subtitle', 'Google Review link is not configured for this business.');
}

const feedbackForm = document.getElementById('feedback-form');
if (feedbackForm) {
  feedbackForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentBusiness || selectedRating < 1 || selectedRating > 3) {
      alert('Please select 1, 2, or 3 stars before submitting feedback.');
      return;
    }
    const messageEl = document.getElementById('fb-comments');
    const message = messageEl ? messageEl.value.trim() : '';
    if (!message) { alert('Please enter your feedback.'); return; }

    const submitButton = feedbackForm.querySelector('button[type="submit"]');
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Sending...'; }

    const { error } = await supabase.from('feedback').insert([{ business_id: currentBusiness.id, rating: selectedRating, message }]);
    if (error) {
      console.error('Feedback submission failed:', error);
      alert('Failed to send feedback: ' + error.message);
      if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Submit Feedback'; }
      return;
    }

    document.getElementById('feedback-form-container')?.classList.add('hidden');
    document.getElementById('thank-you-msg')?.classList.remove('hidden');
  });
}

init();
