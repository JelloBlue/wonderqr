import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const qrCode = urlParams.get('qr');

let currentBusiness = null;
let selectedRating = 0;

async function init() {
  if (!qrCode) {
    const bizNameEl = document.getElementById('biz-name');
    const bizSubEl = document.getElementById('biz-subtitle');
    if (bizNameEl) bizNameEl.innerText = "Invalid Link";
    if (bizSubEl) bizSubEl.innerText = "No QR code specified in URL.";
    return;
  }

  // 1. Fetch QR Code details
  const { data: qrData, error: qrErr } = await supabase
    .from('qr_codes')
    .select('id')
    .ilike('code', qrCode)
    .single();

  if (qrErr || !qrData) {
    const bizNameEl = document.getElementById('biz-name');
    if (bizNameEl) bizNameEl.innerText = "QR Code Not Found";
    return;
  }

  // 2. Fetch Business assigned to this QR code
  const { data: bizData, error: bizErr } = await supabase
    .from('businesses')
    .select('*')
    .eq('qr_code_id', qrData.id)
    .single();

  if (bizErr || !bizData) {
    const bizNameEl = document.getElementById('biz-name');
    if (bizNameEl) bizNameEl.innerText = "Business Not Registered";
    return;
  }

  currentBusiness = bizData;
  const bizNameEl = document.getElementById('biz-name');
  if (bizNameEl) bizNameEl.innerText = currentBusiness.business_name;

  // 3. Setup Social Media Buttons
  setupSocialLinks();

  // 4. Attach Click Events to Stars
  setupStars();
}

function setupSocialLinks() {
  const socialBlock = document.getElementById('social-block');
  let hasSocial = false;

  if (currentBusiness.whatsapp_number) {
    const waLink = document.getElementById('link-wa');
    if (waLink) {
      waLink.href = `https://wa.me/${currentBusiness.whatsapp_number}`;
      waLink.classList.remove('hidden');
      hasSocial = true;
    }
  }
  if (currentBusiness.instagram_url) {
    const instaLink = document.getElementById('link-insta');
    if (instaLink) {
      instaLink.href = currentBusiness.instagram_url;
      instaLink.classList.remove('hidden');
      hasSocial = true;
    }
  }
  if (currentBusiness.youtube_url) {
    const ytLink = document.getElementById('link-yt');
    if (ytLink) {
      ytLink.href = currentBusiness.youtube_url;
      ytLink.classList.remove('hidden');
      hasSocial = true;
    }
  }

  if (hasSocial && socialBlock) {
    socialBlock.classList.remove('hidden');
  }
}

function setupStars() {
  const stars = document.querySelectorAll('#star-container .star');

  stars.forEach(star => {
    star.addEventListener('click', async () => {
      const rating = parseInt(star.getAttribute('data-rating'), 10);
      selectedRating = rating;

      // Update UI selection state
      stars.forEach(s => {
        const r = parseInt(s.getAttribute('data-rating'), 10);
        if (r <= rating) {
          s.classList.add('selected');
        } else {
          s.classList.remove('selected');
        }
      });

      if (rating >= 4) {
        // High Ratings (4 & 5 Stars): Track in DB then redirect outward
        const bizSubEl = document.getElementById('biz-subtitle');
        if (bizSubEl) bizSubEl.innerText = "Redirecting to Google Reviews...";
        await logRatingAndRedirect(rating);
      } else {
        // Low Ratings (1 to 3 Stars): Open internal private feedback form
        const fbContainer = document.getElementById('feedback-form-container');
        if (fbContainer) fbContainer.classList.remove('hidden');
      }
    });
  });
}

async function logRatingAndRedirect(ratingValue) {
  try {
    // Record rating click event in feedback table
    await supabase.from('feedback').insert([{
      business_id: currentBusiness.id,
      rating: ratingValue,
      comments: 'Redirected to Google Review'
    }]);
  } catch (err) {
    console.error("Error logging rating count:", err);
  } finally {
    // Redirect customer to Google Review link
    if (currentBusiness.google_review_url) {
      window.location.href = currentBusiness.google_review_url;
    } else {
      alert("Google Review link is not configured for this business.");
    }
  }
}

// Handle Form Submission for 1, 2, and 3-Star Feedback
const feedbackForm = document.getElementById('feedback-form');
if (feedbackForm) {
  feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const comments = document.getElementById('fb-comments').value.trim();
    const customerName = document.getElementById('fb-name') ? document.getElementById('fb-name').value.trim() : null;
    const customerPhone = document.getElementById('fb-phone') ? document.getElementById('fb-phone').value.trim() : null;

    const { error } = await supabase.from('feedback').insert([{
      business_id: currentBusiness.id,
      rating: selectedRating,
      comments: comments,
      customer_name: customerName,
      customer_phone: customerPhone
    }]);

    if (error) {
      alert("Failed to send feedback: " + error.message);
    } else {
      const fbContainer = document.getElementById('feedback-form-container');
      const thankYou = document.getElementById('thank-you-msg');
      if (fbContainer) fbContainer.classList.add('hidden');
      if (thankYou) thankYou.classList.remove('hidden');
    }
  });
}

init();
