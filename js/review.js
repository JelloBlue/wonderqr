import { supabase } from './config.js';

let selectedRating = 0;
let currentBusiness = null;

const urlParams = new URLSearchParams(window.location.search);
const qrCode = urlParams.get('qr');

async function init() {
  if (!qrCode) {
    document.getElementById('loading').innerText = "Invalid QR code link.";
    return;
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('id, business_name, google_review_url, instagram_url, youtube_url, whatsapp_number, phone_number, qr_codes!inner(code)')
    .eq('qr_codes.code', qrCode)
    .single();

  if (error || !data) {
    document.getElementById('loading').innerText = "Business not found or link inactive.";
    return;
  }

  currentBusiness = data;
  document.getElementById('business-name').innerText = data.business_name;

  // Setup Social Buttons
  let hasSocials = false;
  if (data.whatsapp_number) {
    const btn = document.getElementById('btn-whatsapp');
    btn.href = `https://wa.me/${data.whatsapp_number.replace(/[^0-9]/g, '')}`;
    btn.classList.remove('hidden');
    hasSocials = true;
  }

  if (data.phone_number) {
    const btn = document.getElementById('btn-call');
    btn.href = `tel:${data.phone_number}`;
    btn.classList.remove('hidden');
    hasSocials = true;
  }

  if (data.instagram_url) {
    const btn = document.getElementById('btn-instagram');
    btn.href = data.instagram_url;
    btn.classList.remove('hidden');
    hasSocials = true;
  }

  if (data.youtube_url) {
    const btn = document.getElementById('btn-youtube');
    btn.href = data.youtube_url;
    btn.classList.remove('hidden');
    hasSocials = true;
  }

  if (hasSocials) {
    document.getElementById('social-links').classList.remove('hidden');
  }

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('review-app').classList.remove('hidden');
}

const stars = document.querySelectorAll('.star');
stars.forEach(star => {
  star.addEventListener('click', (e) => {
    selectedRating = parseInt(e.target.getAttribute('data-rating'));
    updateStars(selectedRating);

    if (selectedRating >= 4) {
      window.location.href = currentBusiness.google_review_url;
    } else {
      document.getElementById('feedback-form').classList.remove('hidden');
    }
  });
});

function updateStars(rating) {
  stars.forEach(star => {
    const r = parseInt(star.getAttribute('data-rating'));
    star.classList.toggle('active', r <= rating);
  });
}

document.getElementById('submit-btn').addEventListener('click', async () => {
  const message = document.getElementById('feedback-message').value;

  const { error } = await supabase
    .from('feedback')
    .insert([{ business_id: currentBusiness.id, rating: selectedRating, message }]);

  if (!error) {
    document.getElementById('review-app').classList.add('hidden');
    document.getElementById('thank-you').classList.remove('hidden');
  } else {
    alert("Could not submit feedback. Please try again.");
  }
});

init();
