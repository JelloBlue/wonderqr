import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const urlParams = new URLSearchParams(window.location.search);
const qrCode = (urlParams.get('qr') || '').trim();
let currentBusiness = null;
let selectedRating = 0;

async function init() {
  if (!qrCode) { setText('biz-name','Invalid Link'); setText('biz-subtitle','No QR code specified in URL.'); return; }
  const { data, error } = await supabase.rpc('get_public_business_by_qr', { p_qr_code: qrCode });
  if (error) { console.error('QR/business lookup failed:',error); setText('biz-name','Unable to load QR code'); setText('biz-subtitle','Please try again in a moment.'); return; }
  const business = Array.isArray(data) ? data[0] : data;
  if (!business) { setText('biz-name','WonderQR'); setText('biz-subtitle','This QR code is not activated yet. Please check back after activation.'); return; }
  if (business.active !== true) { setText('biz-name','WonderQR'); setText('biz-subtitle','This QR code is not currently active.'); return; }
  currentBusiness = business;
  setText('biz-name',currentBusiness.business_name || '');
  setupSocialLinks(); setupStars(); setupAdminButton();
}

function setText(id,text){const el=document.getElementById(id);if(el)el.innerText=text;}

function setupSocialLinks(){
  const socialBlock=document.getElementById('social-block');let hasSocial=false;
  if(currentBusiness.whatsapp_number){const e=document.getElementById('link-wa');if(e){e.href=`https://wa.me/${currentBusiness.whatsapp_number}`;e.classList.remove('hidden');hasSocial=true;}}
  if(currentBusiness.instagram_url){const e=document.getElementById('link-insta');if(e){e.href=currentBusiness.instagram_url;e.classList.remove('hidden');hasSocial=true;}}
  if(currentBusiness.youtube_url){const e=document.getElementById('link-yt');if(e){e.href=currentBusiness.youtube_url;e.classList.remove('hidden');hasSocial=true;}}
  if(hasSocial&&socialBlock)socialBlock.classList.remove('hidden');
}

function setupAdminButton(){
  if(document.getElementById('owner-admin-access'))return;
  const button=document.createElement('button');button.id='owner-admin-access';button.type='button';button.textContent='Admin';
  button.style.cssText='margin-top:18px;padding:8px 18px;border:1px solid #d1d5db;border-radius:20px;background:#fff;color:#374151;font-size:.78rem;font-weight:600;cursor:pointer;';
  button.addEventListener('click',openOwnerAdmin);
  const card=document.querySelector('.card-container');const social=document.getElementById('social-block');
  if(social&&social.parentNode)social.parentNode.insertBefore(button,social);else if(card)card.appendChild(button);
}

async function openOwnerAdmin(){
  const pin=window.prompt('Enter 4-digit Admin PIN');if(pin===null)return;
  if(!/^\d{4}$/.test(pin)){alert('Please enter exactly 4 digits.');return;}
  try{
    const response=await fetch(`${SUPABASE_URL}/functions/v1/verify_admin_pin`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY},body:JSON.stringify({business_id:currentBusiness.id,pin})});
    const result=await response.json();
    if(!response.ok||!result.ok||!result.owner_token){alert('Incorrect Admin PIN.');return;}
    window.location.href=`${window.location.origin}/wonderqr/admin.html?token=${encodeURIComponent(result.owner_token)}`;
  }catch(error){console.error('Admin PIN verification failed:',error);alert('Unable to verify PIN. Please try again.');}
}

function setupStars(){
  const stars=document.querySelectorAll('#star-container .star');stars.forEach(star=>star.addEventListener('click',()=>{
    const rating=parseInt(star.getAttribute('data-rating'),10);if(!rating||!currentBusiness)return;selectedRating=rating;
    stars.forEach(s=>s.classList.toggle('selected',parseInt(s.getAttribute('data-rating'),10)<=rating));
    if(rating>=4){setText('biz-subtitle','Redirecting to Google Reviews...');redirectToGoogle();}else document.getElementById('feedback-form-container')?.classList.remove('hidden');
  }));
}

function redirectToGoogle(){if(currentBusiness?.google_review_url)window.location.href=currentBusiness.google_review_url;else setText('biz-subtitle','Google Review link is not configured for this business.');}

const feedbackForm=document.getElementById('feedback-form');
if(feedbackForm)feedbackForm.addEventListener('submit',async e=>{
  e.preventDefault();if(!currentBusiness||selectedRating<1||selectedRating>3){alert('Please select 1, 2, or 3 stars before submitting feedback.');return;}
  const messageEl=document.getElementById('fb-comments');const message=messageEl?messageEl.value.trim():'';if(!message){alert('Please enter your feedback.');return;}
  const submitButton=feedbackForm.querySelector('button[type="submit"]');if(submitButton){submitButton.disabled=true;submitButton.textContent='Sending...';}
  const {error}=await supabase.from('feedback').insert([{business_id:currentBusiness.id,rating:selectedRating,message}]);
  if(error){console.error('Feedback submission failed:',error);alert('Failed to send feedback: '+error.message);if(submitButton){submitButton.disabled=false;submitButton.textContent='Submit Feedback';}return;}
  document.getElementById('feedback-form-container')?.classList.add('hidden');document.getElementById('thank-you-msg')?.classList.remove('hidden');
});

init();
