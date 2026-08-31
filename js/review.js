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
  setupSocialLinks(); setupStars(); setupAdminButton(); setupJelloBlue();
}
function setText(id,text){const el=document.getElementById(id);if(el)el.innerText=text;}
function setupSocialLinks(){const socialBlock=document.getElementById('social-block');let hasSocial=false;if(currentBusiness.whatsapp_number){const e=document.getElementById('link-wa');if(e){e.href=`https://wa.me/${currentBusiness.whatsapp_number}`;e.classList.remove('hidden');hasSocial=true;}}if(currentBusiness.instagram_url){const e=document.getElementById('link-insta');if(e){e.href=currentBusiness.instagram_url;e.classList.remove('hidden');hasSocial=true;}}if(currentBusiness.youtube_url){const e=document.getElementById('link-yt');if(e){e.href=currentBusiness.youtube_url;e.classList.remove('hidden');hasSocial=true;}}if(hasSocial&&socialBlock)socialBlock.classList.remove('hidden');}
function setupAdminButton(){if(document.getElementById('owner-admin-access'))return;const button=document.createElement('button');button.id='owner-admin-access';button.type='button';button.textContent='Admin';button.style.cssText='margin-top:18px;padding:8px 18px;border:1px solid #d1d5db;border-radius:20px;background:#fff;color:#374151;font-size:.78rem;font-weight:600;cursor:pointer;';button.addEventListener('click',openOwnerAdmin);const card=document.querySelector('.card-container');const social=document.getElementById('social-block');if(social&&social.parentNode)social.parentNode.insertBefore(button,social);else if(card)card.appendChild(button);}
async function openOwnerAdmin(){const pin=window.prompt('Enter 4-digit Admin PIN');if(pin===null)return;if(!/^\d{4}$/.test(pin)){alert('Please enter exactly 4 digits.');return;}try{const response=await fetch(`${SUPABASE_URL}/functions/v1/verify_admin_pin`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY},body:JSON.stringify({business_id:currentBusiness.id,pin})});const result=await response.json();if(!response.ok||!result.ok||!result.owner_token){alert('Incorrect Admin PIN.');return;}window.location.href=`${window.location.origin}/wonderqr/admin.html?token=${encodeURIComponent(result.owner_token)}`;}catch(error){console.error('Admin PIN verification failed:',error);alert('Unable to verify PIN. Please try again.');}}
function setupStars(){const stars=document.querySelectorAll('#star-container .star');stars.forEach(star=>star.addEventListener('click',()=>{const rating=parseInt(star.getAttribute('data-rating'),10);if(!rating||!currentBusiness)return;selectedRating=rating;stars.forEach(s=>s.classList.toggle('selected',parseInt(s.getAttribute('data-rating'),10)<=rating));if(rating>=4){setText('biz-subtitle','Redirecting to Google Reviews...');redirectToGoogle();}else document.getElementById('feedback-form-container')?.classList.remove('hidden');}));}
function redirectToGoogle(){if(currentBusiness?.google_review_url)window.location.href=currentBusiness.google_review_url;else setText('biz-subtitle','Google Review link is not configured for this business.');}
const feedbackForm=document.getElementById('feedback-form');
if(feedbackForm)feedbackForm.addEventListener('submit',async e=>{e.preventDefault();if(!currentBusiness||selectedRating<1||selectedRating>3){alert('Please select 1, 2, or 3 stars before submitting feedback.');return;}const messageEl=document.getElementById('fb-comments');const message=messageEl?messageEl.value.trim():'';if(!message){alert('Please enter your feedback.');return;}const submitButton=feedbackForm.querySelector('button[type="submit"]');if(submitButton){submitButton.disabled=true;submitButton.textContent='Sending...';}const {error}=await supabase.from('feedback').insert([{business_id:currentBusiness.id,rating:selectedRating,message}]);if(error){console.error('Feedback submission failed:',error);alert('Failed to send feedback: '+error.message);if(submitButton){submitButton.disabled=false;submitButton.textContent='Submit Feedback';}return;}document.getElementById('feedback-form-container')?.classList.add('hidden');document.getElementById('thank-you-msg')?.classList.remove('hidden');});

function setupJelloBlue(){
  if(document.getElementById('jello-blue-section'))return;
  const card=document.querySelector('.card-container');if(!card)return;
  const section=document.createElement('div');
  section.id='jello-blue-section';
  section.style.cssText='margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;';
  section.innerHTML=`
    <div style="font-size:.7rem;color:#9ca3af;letter-spacing:.4px;margin-bottom:7px;">POWERED BY</div>
    <button id="jello-blue-service-btn" type="button" style="width:100%;padding:11px 14px;border:1px solid #0d4734;border-radius:12px;background:#fff;color:#0d4734;font-weight:800;font-size:.84rem;cursor:pointer;box-shadow:0 3px 9px rgba(13,71,52,.10);">
      JB &nbsp; Jello Blue · Business Growth Consultant
    </button>
    <div style="font-size:.68rem;color:#6b7280;margin-top:7px;">Grow Smart. Grow Sustainable.</div>
  `;
  card.appendChild(section);
  document.getElementById('jello-blue-service-btn')?.addEventListener('click',openJelloBlueModal);
}
function openJelloBlueModal(){
  if(document.getElementById('jello-blue-modal'))return;
  const modal=document.createElement('div');
  modal.id='jello-blue-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(3,25,17,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;';
  modal.innerHTML=`
    <div role="dialog" aria-modal="true" style="position:relative;width:100%;max-width:420px;max-height:90vh;overflow:auto;background:#fff;border-radius:20px;padding:24px 20px;text-align:center;box-sizing:border-box;box-shadow:0 20px 50px rgba(0,0,0,.3);">
      <button id="jello-blue-close" type="button" aria-label="Close" style="position:absolute;right:12px;top:10px;border:0;background:#f3f4f6;width:32px;height:32px;border-radius:50%;font-size:20px;color:#374151;cursor:pointer;">×</button>
      <a href="https://jelloblue.wixsite.com/jbt1/general-4-1" target="_blank" rel="noopener" style="display:block;text-decoration:none;">
        <img src="https://jelloblue.wixsite.com/jbt1/general-4-1" alt="Jello Blue" style="max-width:170px;max-height:80px;object-fit:contain;margin:4px auto 12px;" onerror="this.style.display='none';">
      </a>
      <div style="font-size:1.35rem;font-weight:900;color:#0d4734;">JB · Jello Blue</div>
      <div style="font-size:.78rem;letter-spacing:1.2px;font-weight:800;color:#15803d;margin-top:5px;">GROW SMART. GROW SUSTAINABLE.</div>
      <div style="font-size:.88rem;font-weight:800;color:#374151;margin-top:15px;">BUSINESS GROWTH CONSULTANT</div>
      <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:13px 0;">
        <span style="background:#ecfdf5;color:#0d4734;padding:7px 10px;border-radius:20px;font-size:.76rem;font-weight:700;">STRATEGY</span>
        <span style="background:#ecfdf5;color:#0d4734;padding:7px 10px;border-radius:20px;font-size:.76rem;font-weight:700;">TECHNOLOGY</span>
        <span style="background:#ecfdf5;color:#0d4734;padding:7px 10px;border-radius:20px;font-size:.76rem;font-weight:700;">GROWTH</span>
      </div>
      <div style="color:#374151;font-size:.9rem;line-height:1.65;text-align:left;margin:10px 0 15px;">
        <strong>TURN BUSINESS POTENTIAL INTO PERFORMANCE</strong><br><br>
        • GROWTH STRATEGY<br>
        • DIGITAL SOLUTIONS<br>
        • PROCESS AUTOMATION<br>
        • MEASURABLE RESULTS
      </div>
      <div style="background:#f0fdf4;border-radius:12px;padding:12px;text-align:left;font-size:.84rem;line-height:1.7;">
        <strong>Grow Smart. Grow Sustainable.</strong><br>
        ✉️ <a href="mailto:care.jelloblue@gmail.com" style="color:#0d4734;font-weight:700;">care.jelloblue@gmail.com</a><br>
        📱 <a href="tel:8639989443" style="color:#0d4734;font-weight:700;">8639989443</a>
      </div>
      <a href="https://jelloblue.wixsite.com/jbt1/general-4-1" target="_blank" rel="noopener" style="display:inline-block;margin-top:15px;background:#0d4734;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:800;font-size:.85rem;">Learn More</a>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('jello-blue-close')?.addEventListener('click',()=>modal.remove());
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){modal.remove();document.removeEventListener('keydown',esc);}});
}

init();
