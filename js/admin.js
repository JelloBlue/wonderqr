import { SUPABASE_URL } from './config.js';

const urlParams = new URLSearchParams(window.location.search);
let token = urlParams.get('token') || localStorage.getItem('admin_auth_token');
if (token) localStorage.setItem('admin_auth_token', token);

const businessTitleEl=document.getElementById('business-title');
const subtitleEl=document.getElementById('dashboard-subtitle');
const statusEl=document.getElementById('status-message');
const canvas=document.getElementById('standee-canvas');
const hiddenQrDiv=document.getElementById('qrcode-hidden');
const downloadBtn=document.getElementById('download-standee-btn');
const feedbackList=document.getElementById('feedback-list');
function setStatus(m,t='loading'){if(statusEl){statusEl.textContent=m;statusEl.className=`status ${t}`;}}
async function adminApi(){const r=await fetch(`${SUPABASE_URL}/functions/v1/admin_api`,{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':token},body:JSON.stringify({action:'dashboard',token})});const x=await r.json().catch(()=>({}));if(!r.ok)throw new Error(x.error||'Admin authorization failed');return x;}
async function loadDashboard(){try{if(!token){setStatus('Access denied. No admin token was provided.','error');if(subtitleEl)subtitleEl.textContent='Open the Admin page using your business token.';return;}setStatus('Authenticating...');const result=await adminApi();const business=result.business;if(!business){localStorage.removeItem('admin_auth_token');setStatus('Unauthorized. Invalid business token.','error');return;}if(businessTitleEl)businessTitleEl.textContent=business.business_name||'WonderQR Business';const qrRelation=Array.isArray(business.qr_codes)?business.qr_codes[0]:business.qr_codes;const qrCode=qrRelation?.code||business.qr_code||null;if(qrCode){setStatus(`Connected • QR Code: ${qrCode}`,'success');if(subtitleEl)subtitleEl.textContent=`QR Code: ${qrCode}`;await generateStandee(qrCode,business);}else{setStatus('Business found, but no QR code is assigned.','error');}await loadFeedback(result.feedback||[]);}catch(e){console.error(e);setStatus(e.message||'Unable to load Admin dashboard.','error');if(subtitleEl)subtitleEl.textContent='Please check the Admin link and try again.';}}
async function generateStandee(qrCode,business){if(!canvas||!hiddenQrDiv)return;if(typeof QRCode==='undefined'){setStatus('QR generator library failed to load.','error');return;}
  const ctx=canvas.getContext('2d');
  const W=1200,H=1800; canvas.width=W; canvas.height=H;
  const targetUrl=`https://jelloblue.github.io/wonderqr/?qr=${encodeURIComponent(qrCode)}`;
  hiddenQrDiv.innerHTML='';
  new QRCode(hiddenQrDiv,{text:targetUrl,width:600,height:600,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
  await wait(300);
  const qrCanvas=hiddenQrDiv.querySelector('canvas');
  const qrImg=hiddenQrDiv.querySelector('img');
  const qrSource=qrCanvas?qrCanvas.toDataURL('image/png'):(qrImg?.src||null);
  if(!qrSource){setStatus('QR image could not be generated.','error');return;}
  const qrImage=new Image();
  qrImage.onload=()=>{
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#0d4734';ctx.fillRect(0,0,W,250);
    ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='bold 72px Arial';ctx.fillText('SCAN TO REVIEW',W/2,145);
    ctx.fillStyle='#0d4734';ctx.font='bold 54px Arial';
    const name=(business?.business_name||'Your Business').trim();
    drawWrappedText(ctx,name,W/2,330,1000,62,70);
    ctx.fillStyle='#374151';ctx.font='34px Arial';ctx.fillText('We value your feedback',W/2,455);
    const qrSize=620,qrX=(W-qrSize)/2,qrY=535;
    ctx.fillStyle='#ffffff';ctx.strokeStyle='#d1d5db';ctx.lineWidth=8;ctx.fillRect(qrX-30,qrY-30,qrSize+60,qrSize+60);ctx.strokeRect(qrX-30,qrY-30,qrSize+60,qrSize+60);
    ctx.drawImage(qrImage,qrX,qrY,qrSize,qrSize);
    ctx.fillStyle='#111827';ctx.font='bold 38px Arial';ctx.fillText('Point your phone camera at the QR code',W/2,1280);
    ctx.fillStyle='#6b7280';ctx.font='30px Arial';ctx.fillText('Scan • Review • Support our business',W/2,1340);
    const links=[]; if(business?.whatsapp_number)links.push('WhatsApp'); if(business?.instagram_url)links.push('Instagram'); if(business?.youtube_url)links.push('YouTube');
    if(links.length){ctx.fillStyle='#0d4734';ctx.font='bold 30px Arial';ctx.fillText(links.join('   •   '),W/2,1460);}
    ctx.fillStyle='#0d4734';ctx.font='bold 34px Arial';ctx.fillText('WonderQR',W/2,1660);
    ctx.fillStyle='#6b7280';ctx.font='24px Arial';ctx.fillText(qrCode,W/2,1710);
    if(downloadBtn)downloadBtn.disabled=false;
    setStatus(`Review board ready • ${qrCode}`,'success');
  };
  qrImage.onerror=()=>setStatus('QR image could not be loaded.','error');
  qrImage.src=qrSource;
  if(downloadBtn)downloadBtn.onclick=()=>{try{const a=document.createElement('a');a.download=`Review-Board-${qrCode}-4x6.png`;a.href=canvas.toDataURL('image/png',1);document.body.appendChild(a);a.click();a.remove();}catch(e){alert('Unable to download the review board.');}};
}
function drawWrappedText(ctx,text,x,y,maxWidth,fontSize,lineHeight){const words=text.split(/\s+/);let line='';const lines=[];for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);lines.slice(0,2).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));}
async function loadFeedback(feedbacks){if(!feedbackList)return;if(!feedbacks.length){feedbackList.innerHTML='<div class="empty-message">No negative feedback reported yet.</div>';return;}feedbackList.innerHTML=feedbacks.map(item=>{const rating=Math.min(3,Math.max(1,Number(item.rating)||1));const stars='★'.repeat(rating)+'☆'.repeat(5-rating);const date=item.created_at?new Date(item.created_at).toLocaleString():'Unknown date';const msg=item.message?.trim()?escapeHtml(item.message):'<em>No written message provided</em>';return `<div class="feedback-card"><div class="feedback-stars">${stars}</div><div class="feedback-date">${escapeHtml(date)}</div><div class="feedback-msg">${msg}</div></div>`;}).join('');}
function wait(ms){return new Promise(r=>setTimeout(r,ms));}function escapeHtml(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\"/g,'&quot;').replace(/'/g,'&#039;');}
loadDashboard();
