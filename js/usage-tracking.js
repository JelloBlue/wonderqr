import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const qrCode = (new URLSearchParams(location.search).get('qr') || '').trim();
const usageApi = `${SUPABASE_URL}/functions/v1/usage_api`;

function visitorId() {
  try {
    const key = 'wonderqr_visitor_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch { return ''; }
}

function send(eventType) {
  if (!qrCode) return;
  fetch(usageApi, {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY},
    body:JSON.stringify({action:'event',qr_code:qrCode,event_type:eventType,visitor_id:visitorId()})
  }).catch(()=>{});
}

send('scan');

document.addEventListener('click', e => {
  const star = e.target.closest('#star-container .star');
  if (star) {
    const rating = Number(star.getAttribute('data-rating'));
    if (rating >= 1 && rating <= 3) send(`rating_${rating}`);
    return;
  }
  const link = e.target.closest('#social-block a');
  if (!link || link.classList.contains('hidden')) return;
  const map = {
    'link-insta':'instagram_click','link-yt':'youtube_click','link-fb':'facebook_click',
    'link-wa':'whatsapp_click','link-call':'phone_click','link-justdial':'justdial_click',
    'link-pinterest':'pinterest_click','link-x':'x_click'
  };
  const eventType = map[link.id];
  if (eventType) send(eventType);
});
