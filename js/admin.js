import { SUPABASE_URL } from './config.js';

const params = new URLSearchParams(window.location.search);
let token = (params.get('token') || localStorage.getItem('admin_auth_token') || '').trim();
if (token) localStorage.setItem('admin_auth_token', token);

const $ = id => document.getElementById(id);
const statusEl = $('status-message');
const titleEl = $('business-title');
const subtitleEl = $('dashboard-subtitle');
const canvas = $('standee-canvas');
const hiddenQr = $('qrcode-hidden');
let business = null;
let qrCode = null;
let feedback = [];

function setStatus(text, type = 'loading') {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
}

function customerUrl() {
  return `https://jelloblue.github.io/wonderqr/?qr=${encodeURIComponent(qrCode || '')}`;
}

function clean(v) { return String(v ?? '').trim(); }
function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
}
function safeUrl(v) {
  try { const u = new URL(v); return ['http:','https:'].includes(u.protocol) ? u.href : '#'; }
  catch { return '#'; }
}

/*
 * IMPORTANT: do not send custom headers here.
 * The Admin token is already in the protected request body. Using only a
 * safelisted content type avoids a browser CORS preflight on mobile browsers.
 * Supabase Edge Functions parse JSON bodies regardless of this content type.
 */
async function api(action = 'auth', payload = {}) {
  if (!token) throw new Error('No admin access token was provided. Please reopen the Admin link.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/admin_api`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action, token, ...payload }),
      cache: 'no-store',
      signal: controller.signal
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text || 'Invalid server response' }; }
    if (!response.ok) throw new Error(data.error || `Admin service returned HTTP ${response.status}`);
    return data;
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('Business authentication timed out after 12 seconds.');
    if (e instanceof TypeError) throw new Error('Could not reach the WonderQR server. Please check your internet connection and try again.');
    throw e;
  } finally { clearTimeout(timer); }
}

function renderFeedback() {
  const list = $('feedback-list');
  if (!list) return;
  const items = feedback.filter(f => Number(f.rating) >= 1 && Number(f.rating) <= 4);
  if ($('feedback-count')) $('feedback-count').textContent = `(${items.length})`;
  if (!items.length) { list.innerHTML = '<div class="empty-message">No private feedback received.</div>'; return; }
  list.innerHTML = items.map(f => {
    const r = Number(f.rating);
    const stars = '★'.repeat(r) + '☆'.repeat(Math.max(0, 5-r));
    const date = f.created_at ? new Date(f.created_at).toLocaleString('en-IN', {dateStyle:'medium', timeStyle:'short'}) : '';
    return `<article class="feedback-card"><div class="feedback-stars">${stars}</div><div class="feedback-date">${escapeHtml(date)}</div><div class="feedback-msg">${escapeHtml(f.message || '')}</div>${f.customer_name ? `<div class="hint">Customer: ${escapeHtml(f.customer_name)}</div>` : ''}${f.customer_phone ? `<div class="hint">Contact: ${escapeHtml(f.customer_phone)}</div>` : ''}</article>`;
  }).join('');
}

function populateProfile() {
  if ($('profile-business')) $('profile-business').textContent = business?.business_name || '—';
  if ($('profile-qr')) $('profile-qr').textContent = qrCode || '—';
  if ($('profile-status')) $('profile-status').textContent = business?.active === false ? 'Inactive' : 'Active';
  const fields = {
    'edit-business-name':'business_name','edit-owner-name':'owner_name','edit-phone':'phone_number','edit-whatsapp':'whatsapp_number',
    'edit-instagram':'instagram_url','edit-youtube':'youtube_url','edit-facebook':'facebook_url','edit-pinterest':'pinterest_url','edit-x':'x_url'
  };
  Object.entries(fields).forEach(([id,key]) => { if ($(id)) $(id).value = business?.[key] || ''; });
  renderSocialLinks();
}

function renderSocialLinks() {
  const el = $('social-links'); if (!el || !business) return;
  const links = [];
  if (business.instagram_url) links.push(`<a href="${safeUrl(business.instagram_url)}" target="_blank" rel="noopener">Instagram</a>`);
  if (business.youtube_url) links.push(`<a href="${safeUrl(business.youtube_url)}" target="_blank" rel="noopener">YouTube</a>`);
  if (business.facebook_url) links.push(`<a href="${safeUrl(business.facebook_url)}" target="_blank" rel="noopener">Facebook</a>`);
  if (business.whatsapp_number) links.push(`<a href="https://wa.me/${String(business.whatsapp_number).replace(/\D/g,'')}" target="_blank" rel="noopener">WhatsApp</a>`);
  if (business.phone_number) links.push(`<a href="tel:${String(business.phone_number).replace(/[^+\d]/g,'')}">Call</a>`);
  if (business.justdial_url) links.push(`<a href="${safeUrl(business.justdial_url)}" target="_blank" rel="noopener">Justdial</a>`);
  if (business.pinterest_url) links.push(`<a href="${safeUrl(business.pinterest_url)}" target="_blank" rel="noopener">Pinterest</a>`);
  if (business.x_url) links.push(`<a href="${safeUrl(business.x_url)}" target="_blank" rel="noopener">X</a>`);
  el.innerHTML = links.length ? links.join('') : '<span class="hint">No social or contact links added.</span>';
}

function setupSharing() {
  if (!qrCode) return;
  const url = customerUrl();
  const name = business?.business_name || 'our business';
  const message = `Hi! 👋\n\nWe’d love to hear from you! Please share your experience with ${name} using the link below. ⭐\n\nYour feedback helps us improve and grow. Thank you! 🙏`;
  if ($('share-review-link')) $('share-review-link').textContent = url;
  if ($('share-review-message')) $('share-review-message').textContent = `${message}\n\n👉 ${url}`;
  const wa = $('share-whatsapp-btn');
  const other = $('share-other-btn');
  const copy = $('copy-review-link-btn');
  if (wa) { wa.disabled = false; wa.onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(message+'\n\n👉 '+url)}`, '_blank', 'noopener'); }
  if (other) { other.disabled = false; other.onclick = async () => { try { if (navigator.share) await navigator.share({title:`Review ${name}`,text:message,url}); else await navigator.clipboard.writeText(message+'\n\n👉 '+url); setStatus('Share options opened.','success'); } catch(e) { if(e?.name!=='AbortError') setStatus('Unable to share.','error'); } }; }
  if (copy) { copy.disabled = false; copy.onclick = async () => { try { await navigator.clipboard.writeText(url); setStatus('Review link copied.','success'); } catch { prompt('Copy this review link:', url); } }; }
}

function setupQrActions() {
  $('test-qr-btn')?.addEventListener('click', () => window.open(customerUrl(), '_blank', 'noopener'));
  $('copy-link-btn')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(customerUrl()); setStatus('Review link copied.','success'); } catch { prompt('Copy this review link:', customerUrl()); } });
  $('download-qr-btn')?.addEventListener('click', () => { if(!hiddenQr) return; const c=hiddenQr.querySelector('canvas'); if(!c){setStatus('QR is not ready yet.','error');return;} const a=document.createElement('a'); a.download=`WonderQR-${qrCode}.png`; a.href=c.toDataURL('image/png'); a.click(); });
  $('download-standee-btn')?.addEventListener('click', () => { if(!canvas || canvas.width<2){setStatus('Review board is not ready yet.','error');return;} const a=document.createElement('a'); a.download=`Review-Board-${qrCode}-4x6.png`; a.href=canvas.toDataURL('image/png'); a.click(); });
  $('share-qr-btn')?.addEventListener('click', async () => { if(!canvas || canvas.width<2){setStatus('QR is not ready yet.','error');return;} try { const blob=await new Promise(r=>canvas.toBlob(r,'image/png')); const file=new File([blob],`WonderQR-${qrCode}.png`,{type:'image/png'}); if(navigator.share && navigator.canShare?.({files:[file]})) await navigator.share({title:`WonderQR QR - ${business?.business_name||'Business'}`,files:[file]}); else { const a=document.createElement('a');a.download=file.name;a.href=canvas.toDataURL('image/png');a.click(); } } catch(e){ if(e?.name!=='AbortError')setStatus('Unable to share QR.','error'); } });
}

function generateStandee() {
  if (!canvas || !hiddenQr || !qrCode || typeof QRCode === 'undefined') return;
  try {
    hiddenQr.innerHTML='';
    new QRCode(hiddenQr,{text:customerUrl(),width:600,height:600,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    setTimeout(() => {
      const source=hiddenQr.querySelector('canvas')?.toDataURL('image/png') || hiddenQr.querySelector('img')?.src;
      if(!source)return;
      const img=new Image();
      img.onload=()=>{
        const W=1200,H=1800,ctx=canvas.getContext('2d'); canvas.width=W;canvas.height=H;
        ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#0d4734';ctx.fillRect(0,0,W,250);
        ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 72px Arial';ctx.fillText('SCAN TO REVIEW',W/2,145);
        ctx.fillStyle='#0d4734';ctx.font='bold 54px Arial';ctx.fillText((business?.business_name||'Your Business').slice(0,30),W/2,350);
        ctx.fillStyle='#374151';ctx.font='34px Arial';ctx.fillText('We value your feedback',W/2,455);
        const s=620,x=(W-s)/2,y=535;ctx.drawImage(img,x,y,s,s);
        ctx.fillStyle='#111827';ctx.font='bold 38px Arial';ctx.fillText('Point your phone camera at the QR code',W/2,1280);
        ctx.fillStyle='#6b7280';ctx.font='30px Arial';ctx.fillText('Scan • Review • Support our business',W/2,1340);
        ctx.fillStyle='#0d4734';ctx.font='bold 34px Arial';ctx.fillText('WonderQR',W/2,1660);ctx.fillStyle='#6b7280';ctx.font='24px Arial';ctx.fillText(qrCode,W/2,1710);
        ['test-qr-btn','copy-link-btn','download-qr-btn','download-standee-btn','share-qr-btn'].forEach(id=>{if($(id))$(id).disabled=false;});
      };
      img.src=source;
    },150);
  } catch(e) { console.error('QR generation',e); }
}

function setupEdit() {
  $('open-edit-btn')?.addEventListener('click',()=>{ $('edit-panel')?.classList.add('open'); document.querySelectorAll('.edit-category-wrap').forEach(x=>x.classList.remove('active')); document.querySelector('[data-category-wrap="business"]')?.classList.add('active'); });
  $('cancel-business-btn')?.addEventListener('click',()=>$('edit-panel')?.classList.remove('open'));
  document.querySelectorAll('.edit-category').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.edit-category-wrap').forEach(x=>x.classList.toggle('active',x.dataset.categoryWrap===btn.dataset.category));}));
  $('save-business-btn')?.addEventListener('click',saveProfile);
}

async function saveProfile() {
  const map={'business_name':'edit-business-name','owner_name':'edit-owner-name','phone_number':'edit-phone','whatsapp_number':'edit-whatsapp','instagram_url':'edit-instagram','youtube_url':'edit-youtube','facebook_url':'edit-facebook','pinterest_url':'edit-pinterest','x_url':'edit-x'};
  const data={};Object.entries(map).forEach(([k,id])=>{if($(id))data[k]=clean($(id).value)});
  if(!data.business_name){if($('edit-save-message'))$('edit-save-message').textContent='Business name is required.';return;}
  const btn=$('save-business-btn');if(btn)btn.disabled=true;
  try{const r=await api('update_profile',data);if(!r.business)throw new Error('Business profile was not returned.');business=r.business;populateProfile();setupSharing();generateStandee();if($('edit-save-message'))$('edit-save-message').textContent='Business information updated successfully.';setStatus(`Connected • QR Code: ${qrCode}`,'success');}catch(e){if($('edit-save-message'))$('edit-save-message').textContent=e.message||'Unable to save.';}finally{if(btn)btn.disabled=false;}
}

async function load() {
  if(!token){setStatus('Access denied. No admin token was provided.','error');return;}
  try {
    setStatus('Authenticating business…');
    const auth=await api('auth');
    if(!auth?.business) throw new Error('Business authentication returned no business.');
    business=auth.business;
    const rel=Array.isArray(business.qr_codes)?business.qr_codes[0]:business.qr_codes;
    qrCode=rel?.code || business.qr_code || null;
    if(titleEl)titleEl.textContent=business.business_name||'WonderQR Business';
    if(subtitleEl)subtitleEl.textContent=qrCode?`QR Code: ${qrCode}`:'Business account connected';
    populateProfile();setupSharing();setupQrActions();generateStandee();
    setStatus('Business authenticated. Loading feedback…','success');
    window.dispatchEvent(new CustomEvent('wonderqr:admin-ready',{detail:{business,qrCode}}));
    try { const r=await api('feedback'); feedback=r.feedback||[]; renderFeedback(); } catch(e) { console.error('Feedback load failed',e); setStatus('Business authenticated, but feedback could not be loaded.','error'); }
    if(qrCode)setStatus(`Connected • QR Code: ${qrCode}`,'success');
  } catch(e) {
    console.error('Admin authentication failed',e);
    setStatus(e.message||'Unable to authenticate business.','error');
    if(subtitleEl)subtitleEl.textContent='Please check the Admin link and try again.';
  }
}

setupEdit();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();