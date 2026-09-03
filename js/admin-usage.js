import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const usageApi=`${SUPABASE_URL}/functions/v1/usage_api`;
const adminToken=new URLSearchParams(location.search).get('token')||localStorage.getItem('admin_auth_token')||'';
let currentBusiness=null;
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

function ensureStyles(){
  if(document.getElementById('admin-usage-styles'))return;
  const s=document.createElement('style');s.id='admin-usage-styles';s.textContent=`
    .admin-usage-card{margin-top:14px}.admin-usage-launch{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:13px}.admin-usage-launch-text{font-size:.84rem;color:#6b7280;line-height:1.35}.admin-usage-btn{border:0;border-radius:9px;padding:11px 14px;background:#0d4734;color:#fff;font-weight:700;cursor:pointer;white-space:nowrap}
    .admin-usage-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:12px;z-index:1000}.admin-usage-overlay.hidden{display:none}.admin-usage-modal{width:min(560px,94vw);max-height:90vh;overflow:auto;background:#fff;border-radius:14px;padding:18px;box-sizing:border-box;box-shadow:0 20px 50px rgba(0,0,0,.25)}
    .admin-usage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px}.admin-usage-head h3{margin:0;font-size:1.05rem;color:#1f2937}.admin-usage-close{border:0;background:#f1f5f9;border-radius:50%;width:32px;height:32px;font-size:20px;cursor:pointer;color:#475569}
    .admin-usage-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-bottom:14px}.admin-usage-filter{width:100%;min-height:36px;border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:8px;padding:7px 8px;font-size:.76rem;font-weight:600;cursor:pointer;box-sizing:border-box;white-space:nowrap}.admin-usage-filter.active{background:#0d4734;color:#fff;border-color:#0d4734}.admin-usage-custom{display:none;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.admin-usage-custom.show{display:grid}.admin-usage-custom label{font-size:.68rem;color:#64748b}.admin-usage-custom input{width:100%;box-sizing:border-box;padding:8px;border:1px solid #cbd5e1;border-radius:7px;margin-top:3px}
    .admin-usage-section{border:1px solid #e2e8f0;border-radius:10px;padding:11px;margin-top:9px}.admin-usage-title{font-size:.76rem;font-weight:800;color:#475569;margin-bottom:9px}.admin-usage-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.admin-usage-stat{background:#f8fafc;border-radius:8px;padding:9px}.admin-usage-stat strong{display:block;font-size:1rem;color:#1f2937}.admin-usage-stat span{display:block;font-size:.68rem;color:#64748b;margin-top:2px}.admin-usage-links{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.admin-usage-link-stat{display:flex;justify-content:space-between;gap:8px;background:#f8fafc;border-radius:8px;padding:8px;font-size:.75rem;color:#475569}.admin-usage-link-stat strong{color:#1f2937}.admin-usage-foot{font-size:.68rem;color:#94a3b8;margin-top:12px;text-align:center}.admin-usage-loading{text-align:center;padding:24px;color:#64748b;font-size:.82rem}
    @media(max-width:600px){.admin-usage-launch{align-items:stretch;flex-direction:column}.admin-usage-btn{width:100%}.admin-usage-filters{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.admin-usage-filter{min-height:38px}.admin-usage-custom{grid-template-columns:1fr}.admin-usage-grid,.admin-usage-links{grid-template-columns:1fr 1fr}.admin-usage-modal{padding:15px}}
  `;document.head.appendChild(s);
}

function rangeFor(kind,from,to){
  const now=new Date();let a,b;
  if(kind==='custom'){a=new Date(`${from}T00:00:00`);b=new Date(`${to}T00:00:00`);b.setDate(b.getDate()+1)}
  else if(kind==='7d'){b=new Date(now);b.setDate(b.getDate()+1);a=new Date(now);a.setDate(a.getDate()-6);a.setHours(0,0,0,0)}
  else if(kind==='30d'){b=new Date(now);b.setDate(b.getDate()+1);a=new Date(now);a.setDate(a.getDate()-29);a.setHours(0,0,0,0)}
  else if(kind==='month'){a=new Date(now.getFullYear(),now.getMonth(),1);b=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)}
  else if(kind==='last_month'){a=new Date(now.getFullYear(),now.getMonth()-1,1);b=new Date(now.getFullYear(),now.getMonth(),1)}
  else {a=new Date(now);a.setHours(0,0,0,0);b=new Date(a);b.setDate(b.getDate()+1)}
  return {start:a.toISOString(),end:b.toISOString()};
}

function ensureModal(){
  if(document.getElementById('admin-usage-modal'))return;
  ensureStyles();
  const el=document.createElement('div');el.id='admin-usage-modal';el.className='admin-usage-overlay hidden';el.innerHTML=`<div class="admin-usage-modal" role="dialog" aria-modal="true" aria-labelledby="admin-usage-title"><div class="admin-usage-head"><h3 id="admin-usage-title">📊 Usage Analytics</h3><button type="button" class="admin-usage-close" id="admin-usage-close" aria-label="Close">×</button></div><div class="admin-usage-filters" id="admin-usage-filters"><button class="admin-usage-filter active" data-range="today">Today</button><button class="admin-usage-filter" data-range="7d">7 Days</button><button class="admin-usage-filter" data-range="30d">30 Days</button><button class="admin-usage-filter" data-range="month">This Month</button><button class="admin-usage-filter" data-range="last_month">Last Month</button><button class="admin-usage-filter" data-range="custom">Custom</button></div><div class="admin-usage-custom" id="admin-usage-custom"><label>From<input type="date" id="admin-usage-from"></label><label>To<input type="date" id="admin-usage-to"></label></div><div id="admin-usage-body" class="admin-usage-loading">Loading usage…</div><div class="admin-usage-foot">4-star and 5-star selections are intentionally not tracked.</div></div>`;document.body.appendChild(el);
  const close=()=>el.classList.add('hidden');document.getElementById('admin-usage-close').addEventListener('click',close);el.addEventListener('click',e=>{if(e.target===el)close()});
  document.getElementById('admin-usage-filters').addEventListener('click',e=>{const btn=e.target.closest('[data-range]');if(!btn)return;document.querySelectorAll('.admin-usage-filter').forEach(x=>x.classList.toggle('active',x===btn));document.getElementById('admin-usage-custom').classList.toggle('show',btn.dataset.range==='custom');if(btn.dataset.range!=='custom')loadUsage(btn.dataset.range)});
  document.getElementById('admin-usage-custom').addEventListener('change',()=>{const f=document.getElementById('admin-usage-from').value,t=document.getElementById('admin-usage-to').value;if(f&&t)loadUsage('custom',f,t)});
}

async function loadUsage(kind='today',from='',to=''){
  if(!currentBusiness)return;ensureModal();const body=document.getElementById('admin-usage-body');body.innerHTML='<div class="admin-usage-loading">Loading usage…</div>';
  try{
    const r=rangeFor(kind,from,to);const response=await fetch(usageApi,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'x-admin-token':adminToken},body:JSON.stringify({action:'summary',business_id:currentBusiness.id,start:r.start,end:r.end})});const d=await response.json();if(!response.ok)throw new Error(d.error||'Unable to load usage');
    const c=d.counts||{};const links=[['Instagram','instagram_click'],['YouTube','youtube_click'],['Facebook','facebook_click'],['Pinterest','pinterest_click'],['X','x_click'],['WhatsApp','whatsapp_click'],['Phone','phone_click'],['Justdial','justdial_click']];
    body.innerHTML=`<div class="admin-usage-section"><div class="admin-usage-title">QR Usage</div><div class="admin-usage-grid"><div class="admin-usage-stat"><strong>${Number(d.unique_visitors||0).toLocaleString('en-IN')}</strong><span>Unique visitors</span></div><div class="admin-usage-stat"><strong>${Number(d.total_scans||0).toLocaleString('en-IN')}</strong><span>QR scans</span></div></div></div><div class="admin-usage-section"><div class="admin-usage-title">Customer Feedback Selection</div><div class="admin-usage-grid"><div class="admin-usage-stat"><strong>${Number(c.rating_1||0).toLocaleString('en-IN')}</strong><span>⭐ 1 Star</span></div><div class="admin-usage-stat"><strong>${Number(c.rating_2||0).toLocaleString('en-IN')}</strong><span>⭐ 2 Star</span></div><div class="admin-usage-stat"><strong>${Number(c.rating_3||0).toLocaleString('en-IN')}</strong><span>⭐ 3 Star</span></div></div></div><div class="admin-usage-section"><div class="admin-usage-title">Social & Contact</div><div class="admin-usage-links">${links.map(([label,type])=>`<div class="admin-usage-link-stat"><span>${label}</span><strong>${Number(c[type]||0).toLocaleString('en-IN')}</strong></div>`).join('')}</div></div><div class="admin-usage-section"><div class="admin-usage-title">Recent activity</div><div style="font-size:.78rem;color:#475569">Last scan: <strong>${d.last_scan?new Date(d.last_scan).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'No scans in this period'}</strong></div></div>`;
  }catch(e){body.innerHTML=`<div class="admin-usage-loading">Unable to load usage.<br><small>${esc(e.message)}</small></div>`}
}

function injectLauncher(){
  if(document.getElementById('admin-usage-card'))return;
  const section=document.createElement('section');section.id='admin-usage-card';section.className='card section admin-usage-card';section.innerHTML='<h2>📊 Usage Analytics</h2><div class="admin-usage-launch"><div class="admin-usage-launch-text">See how this business is using WonderQR, including QR scans, private feedback selections and social/contact interactions.</div><button type="button" class="admin-usage-btn" id="open-admin-usage">View Usage Analytics</button></div>';
  const edit=document.getElementById('edit-panel')?.parentElement;const grid=document.querySelector('.grid');if(edit)edit.parentElement.insertBefore(section,edit);else if(grid)grid.insertAdjacentElement('afterend',section);else document.querySelector('.page')?.appendChild(section);
  document.getElementById('open-admin-usage').addEventListener('click',()=>{ensureModal();document.getElementById('admin-usage-title').textContent=`📊 ${currentBusiness?.business_name||'Business'} — Usage`;document.querySelectorAll('.admin-usage-filter').forEach((x,i)=>x.classList.toggle('active',i===0));document.getElementById('admin-usage-custom').classList.remove('show');document.getElementById('admin-usage-modal').classList.remove('hidden');loadUsage('today')});
}

window.addEventListener('wonderqr:admin-ready',e=>{currentBusiness=e.detail?.business||null;if(currentBusiness){injectLauncher();ensureModal()}});
setTimeout(()=>{if(!currentBusiness&&adminToken){fetch(`${SUPABASE_URL}/functions/v1/admin_api`,{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':adminToken},body:JSON.stringify({action:'dashboard',token:adminToken})}).then(r=>r.json()).then(x=>{if(x.business){currentBusiness=x.business;injectLauncher();ensureModal()}}).catch(()=>{})}},1200);
