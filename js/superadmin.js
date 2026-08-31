import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const urlParams = new URLSearchParams(window.location.search);
const adminPass = urlParams.get('key');
const MASTER_KEY = '131211';

if (adminPass !== MASTER_KEY) {
  document.getElementById('auth-status').innerText = "Access Denied: Invalid Master Key.";
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  document.getElementById('auth-status').innerText = "System Overview";
  document.getElementById('admin-content').classList.remove('hidden');
  window.loadedBusinesses = [];

  window.copyText = function(text, label) {
    if (!text || text === 'undefined') return alert(`Cannot copy ${label}: Missing link.`);
    navigator.clipboard.writeText(text); alert(`${label} copied to clipboard!`);
  };

  window.showQrModal = function(url, title='Customer QR Code') {
    const modal=document.getElementById('qr-modal'),container=document.getElementById('qr-canvas-container'),titleEl=document.getElementById('qr-modal-title'),urlEl=document.getElementById('qr-modal-url'),downloadBtn=document.getElementById('download-qr-btn');
    titleEl.innerText=title;urlEl.innerText=url;container.innerHTML='';
    new QRCode(container,{text:url,width:200,height:200,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    setTimeout(()=>{const img=container.querySelector('img'),canvas=container.querySelector('canvas');if(img&&img.src)downloadBtn.href=img.src;else if(canvas)downloadBtn.href=canvas.toDataURL('image/png');},150);
    modal.classList.remove('hidden');modal.style.display='flex';
  };

  function setupListener(id,event,callback){const el=document.getElementById(id);if(el)el.addEventListener(event,callback);}
  setupListener('open-add-modal-btn','click',()=>{document.getElementById('add-biz-form').reset();const m=document.getElementById('add-modal');m.classList.remove('hidden');m.style.display='flex';});
  setupListener('close-add-modal-btn','click',()=>{const m=document.getElementById('add-modal');m.classList.add('hidden');m.style.display='none';});
  setupListener('close-edit-modal-btn','click',()=>{const m=document.getElementById('edit-modal');m.classList.add('hidden');m.style.display='none';});
  setupListener('close-qr-modal-btn','click',()=>{const m=document.getElementById('qr-modal');m.classList.add('hidden');m.style.display='none';});

  async function loadDashboard(){
    const {count:bizCount}=await supabase.from('businesses').select('*',{count:'exact',head:true});
    const {count:repsCount}=await supabase.from('sales_reps').select('*',{count:'exact',head:true});
    const {count:fbCount}=await supabase.from('feedback').select('*',{count:'exact',head:true});
    let {count:qrCount}=await supabase.from('qr_codes').select('*',{count:'exact',head:true}).ilike('status','assigned');
    if(!qrCount||qrCount===0){const {count:c}=await supabase.from('businesses').select('qr_code_id',{count:'exact',head:true}).not('qr_code_id','is',null);qrCount=c||0;}
    document.getElementById('stat-biz').innerText=bizCount||0;document.getElementById('stat-reps').innerText=repsCount||0;document.getElementById('stat-qr').innerText=qrCount||0;document.getElementById('stat-fb').innerText=fbCount||0;
    const {data:salesReps}=await supabase.from('sales_reps').select('*').order('created_at',{ascending:false});
    const {data:qrCodes}=await supabase.from('qr_codes').select('id,code');
    const {data:businesses,error}=await supabase.from('businesses').select('*').order('created_at',{ascending:false});
    const {data:feedbackData}=await supabase.from('feedback').select('business_id,rating');
    if(error)console.error('Error loading businesses:',error);
    window.loadedBusinesses=businesses||[];
    const ratingStatsMap=new Map();(feedbackData||[]).forEach(item=>{if(!item.business_id)return;if(!ratingStatsMap.has(item.business_id))ratingStatsMap.set(item.business_id,{total:0,1:0,2:0,3:0,4:0,5:0});const s=ratingStatsMap.get(item.business_id);s.total++;const r=Number(item.rating);if(r>=1&&r<=5)s[r]++;});
    const repSelect=document.getElementById('add-rep-select');if(repSelect){repSelect.innerHTML='<option value="">Direct Admin (No Rep)</option>';(salesReps||[]).filter(r=>r.active!==false).forEach(r=>repSelect.innerHTML+=`<option value="${r.id}">${r.rep_name}</option>`);}
    const repsTbody=document.getElementById('reps-tbody');if(repsTbody){repsTbody.innerHTML='';const baseUrl=`${window.location.origin}/wonderqr`;(salesReps||[]).forEach(r=>{const repPortalUrl=`${baseUrl}/sales.html?rep_token=${r.access_token}`;const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${r.rep_name||'N/A'}</strong></td><td><span class="status-badge ${r.active!==false?'badge-active':'badge-inactive'}">${r.active!==false?'Active':'Inactive'}</span></td><td><code>${r.access_token||'N/A'}</code></td><td><button type="button" class="action-btn btn-copy" onclick="copyText('${repPortalUrl}','Sales Rep Link')">Copy Rep Link</button></td>`;repsTbody.appendChild(tr);});}
    const repMap=new Map((salesReps||[]).map(r=>[r.id,r.rep_name]));const qrMap=new Map((qrCodes||[]).map(q=>[q.id,q.code]));const tbody=document.getElementById('businesses-tbody');tbody.innerHTML='';const baseUrl=`${window.location.origin}/wonderqr`;
    window.loadedBusinesses.forEach(b=>{const qrCode=qrMap.get(b.qr_code_id)||'';const customerUrl=`${baseUrl}/?qr=${encodeURIComponent(qrCode)}`;const ownerUrl=`${baseUrl}/admin.html?token=${b.auth_token||''}`;const repName=repMap.get(b.sales_rep_id)||'Direct Admin';const stats=ratingStatsMap.get(b.id)||{total:0,1:0,2:0,3:0,4:0,5:0};const tr=document.createElement('tr');tr.innerHTML=`<td><strong>${b.business_name||'N/A'}</strong></td><td>${b.owner_name||'N/A'}</td><td><code>${qrCode||'N/A'}</code></td><td>${repName}</td><td><div style="font-size:.78rem;line-height:1.45;"><strong>Total: ${stats.total}</strong><br>⭐5: ${stats[5]} | ⭐4: ${stats[4]}<br>⭐3: ${stats[3]} | ⭐2: ${stats[2]} | ⭐1: ${stats[1]}</div></td><td><div style="display:flex;flex-wrap:wrap;gap:4px;"><button type="button" class="action-btn btn-copy" onclick="copyText('${customerUrl}','Customer Link')">Copy Link</button><button type="button" class="action-btn btn-qr" onclick="showQrModal('${customerUrl}','${String(b.business_name||'Business').replace(/'/g,"\\'")} QR')">Generate QR</button><button type="button" class="action-btn btn-copy" style="background-color:#6366f1;" onclick="copyText('${ownerUrl}','Owner Link')">Copy Owner Link</button><button type="button" class="action-btn btn-edit" onclick="openEditModal('${b.id}')">Edit</button></div></td>`;tbody.appendChild(tr);});
  }

  setupListener('add-biz-form','submit',async e=>{e.preventDefault();const qrCode=document.getElementById('add-qr-code').value.trim(),bizName=document.getElementById('add-biz-name').value.trim(),googleUrl=document.getElementById('add-google-url').value.trim(),ownerName=document.getElementById('add-owner-name').value.trim(),repId=document.getElementById('add-rep-select').value||null,whatsapp=document.getElementById('add-whatsapp').value.trim()||null,phone=document.getElementById('add-phone').value.trim()||null,instaUrl=document.getElementById('add-instagram-url').value.trim()||null,ytUrl=document.getElementById('add-youtube-url').value.trim()||null;const {data:qrData,error:qrErr}=await supabase.from('qr_codes').select('id').ilike('code',qrCode).single();if(qrErr||!qrData)return alert('QR Code not found!');const {error:bizErr}=await supabase.from('businesses').insert([{qr_code_id:qrData.id,business_name:bizName,google_review_url:googleUrl,owner_name:ownerName,sales_rep_id:repId,whatsapp_number:whatsapp,phone_number:phone,instagram_url:instaUrl,youtube_url:ytUrl}]);if(bizErr)return alert('Failed to onboard: '+bizErr.message);await supabase.from('qr_codes').update({status:'assigned'}).eq('id',qrData.id);alert('Business Onboarded Successfully!');document.getElementById('add-modal').classList.add('hidden');document.getElementById('add-modal').style.display='none';loadDashboard();});

  setupListener('edit-biz-form','submit',async e=>{e.preventDefault();const bizId=document.getElementById('edit-biz-id').value;const updatedData={business_name:document.getElementById('edit-biz-name').value.trim(),owner_name:document.getElementById('edit-owner-name').value.trim(),google_review_url:document.getElementById('edit-google-url').value.trim(),whatsapp_number:document.getElementById('edit-whatsapp').value.trim()||null,phone_number:document.getElementById('edit-phone').value.trim()||null,instagram_url:document.getElementById('edit-instagram-url').value.trim()||null,youtube_url:document.getElementById('edit-youtube-url').value.trim()||null};const {error}=await supabase.from('businesses').update(updatedData).eq('id',bizId);if(error)alert('Failed to update: '+error.message);else{alert('Business updated successfully!');document.getElementById('edit-modal').classList.add('hidden');document.getElementById('edit-modal').style.display='none';await loadDashboard();}});

  setupListener('create-rep-btn','click',async()=>{const name=document.getElementById('new-rep-name').value.trim();if(!name)return alert('Enter rep name');const newToken=crypto.randomUUID();const {error}=await supabase.from('sales_reps').insert([{rep_name:name,access_token:newToken,active:true}]);if(error)alert('Error: '+error.message);else{const repUrl=`${window.location.origin}/wonderqr/sales.html?rep_token=${newToken}`;prompt('Sales Rep Token Created! Copy their portal URL:',repUrl);document.getElementById('new-rep-name').value='';loadDashboard();}});

  // Add the PIN reset control to every Edit Business modal.
  window.resetBusinessPin = async function(){
    const bizId=document.getElementById('edit-biz-id')?.value;
    if(!bizId)return alert('Select a business first.');
    const pin=prompt('Enter new 4-digit Admin PIN:');
    if(pin===null)return;
    if(!/^\d{4}$/.test(pin))return alert('PIN must be exactly 4 digits.');
    if(!confirm('Reset this business Admin PIN?'))return;
    try{
      const response=await fetch(`${SUPABASE_URL}/functions/v1/reset_admin_pin`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY},body:JSON.stringify({business_id:bizId,pin,admin_key:MASTER_KEY})});
      const result=await response.json();
      if(!response.ok||!result.ok)throw new Error(result.error||'Reset failed');
      alert('Admin PIN reset successfully.');
    }catch(err){console.error(err);alert('Failed to reset Admin PIN: '+err.message);}
  };

  loadDashboard();
}

window.openEditModal = function(bizId){
  if(!window.loadedBusinesses)return;
  const biz=window.loadedBusinesses.find(b=>String(b.id)===String(bizId));if(!biz)return;
  document.getElementById('edit-biz-id').value=biz.id||'';document.getElementById('edit-biz-name').value=biz.business_name||'';document.getElementById('edit-owner-name').value=biz.owner_name||'';document.getElementById('edit-google-url').value=biz.google_review_url||'';document.getElementById('edit-whatsapp').value=biz.whatsapp_number||'';document.getElementById('edit-phone').value=biz.phone_number||'';document.getElementById('edit-instagram-url').value=biz.instagram_url||'';document.getElementById('edit-youtube-url').value=biz.youtube_url||'';
  const modal=document.getElementById('edit-modal');
  if(!document.getElementById('reset-pin-btn')){const btn=document.createElement('button');btn.id='reset-pin-btn';btn.type='button';btn.className='action-btn';btn.style.cssText='background:#dc2626;color:white;margin-right:auto;';btn.textContent='Reset Admin PIN';btn.onclick=window.resetBusinessPin;modal.querySelector('form > div:last-child').prepend(btn);}
  modal.classList.remove('hidden');modal.style.display='flex';
};
