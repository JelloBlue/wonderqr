import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const key = new URLSearchParams(location.search).get('key') || '';
const usageApi = `${SUPABASE_URL}/functions/v1/usage_api`;
const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

function ensureStyles(){
  if(document.getElementById('usage-modal-styles'))return;
  const s=document.createElement('style');s.id='usage-modal-styles';s.textContent=`
    .usage-btn{background:#2563eb;color:#fff}
    .usage-modal-card{width:min(560px,94vw);max-height:90vh;overflow:auto;background:#fff;border-radius:14px;padding:18px;box-sizing:border-box;box-shadow:0 20px 50px rgba(0,0,0,.25)}
    .usage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px}.usage-head h3{margin:0;font-size:1.05rem;color:#1f2937}.usage-close{border:0;background:#f1f5f9;border-radius:50%;width:32px;height:32px;font-size:20px;cursor:pointer;color:#475569}
    .usage-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-bottom:14px}.usage-filter{width:100%;min-height:36px;border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:8px;padding:7px 8px;font-size:.76rem;font-weight:600;cursor:pointer;box-sizing:border-box;white-space:nowrap}.usage-filter:hover{background:#f8fafc}.usage-filter.active{background:#2563eb;color:#fff;border-color:#2563eb}.usage-custom{display:none;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.usage-custom.show{display:grid}.usage-custom label{font-size:.68rem;color:#64748b}.usage-custom input{width:100%;box-sizing:border-box;padding:8px;border:1px solid #cbd5e1;border-radius:7px;margin-top:3px}
    .usage-section{border:1px solid #e2e8f0;border-radius:10px;padding:11px;margin-top:9px}.usage-section-title{font-size:.76rem;font-weight:800;color:#475569;margin-bottom:9px}.usage-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.usage-stat{background:#f8fafc;border-radius:8px;padding:9px}.usage-stat strong{display:block;font-size:1rem;color:#1f2937}.usage-stat span{display:block;font-size:.68rem;color:#64748b;margin-top:2px}.usage-links{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.usage-link-stat{display:flex;justify-content:space-between;gap:8px;background:#f8fafc;border-radius:8px;padding:8px;font-size:.75rem;color:#475569}.usage-link-stat strong{color:#1f2937}.usage-foot{font-size:.68rem;color:#94a3b8;margin-top:12px;text-align:center}.usage-loading{text-align:center;padding:24px;color:#64748b;font-size:.82rem}
    @media(max-width:600px){.usage-filters{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.usage-filter{min-height:38px}.usage-custom{grid-template-columns:1fr}.usage-grid,.usage-links{grid-template-columns:1fr 1fr}.usage-modal-card{padding:15px}}
  `;document.head.appendChild(s);
}

function ensureModal(){
  if(document.getElementById('usage-modal'))return;
  ensureStyles();
  const el=document.createElement('div');el.id='usage-modal';el.className='modal-overlay hidden';el.innerHTML=`<div class="usage-modal-card" role="dialog" aria-modal="true" aria-labelledby="usage-title"><div class="usage-head"><h3 id="usage-title">📊 Business Usage</h3><button type="button" class="usage-close" id="usage-close" aria-label="Close">×</button></div><div class="usage-filters" id="usage-filters"><button class="usage-filter active" data-range="today">Today</button><button class="usage-filter" data-range="7d">7 Days</button><button class="usage-filter" data-range="30d">30 Days</button><button class="usage-filter" data-range="month">This Month</button><button class="usage-filter" data-range="last_month">Last Month</button><button class="usage-filter" data-range="custom">Custom</button></div><div class="usage-custom" id="usage-custom"><label>From<input type="date" id="usage-from"></label><label>To<input type="date" id="usage-to"></label></div><div id="usage-body" class="usage-loading">Loading usage…</div><div class="usage-foot">4-star and 5-star selections are intentionally not tracked.</div></div>`;document.body.appendChild(el);
  const close=()=>el.classList.add('hidden');
  document.getElementById('usage-close').addEventListener('click',close);el.addEventListener('click',e=>{if(e.target===el)close();});
  document.getElementById('usage-filters').addEventListener('click',e=>{const btn=e.target.closest('[data-range]');if(!btn)return;document.querySelectorAll('.usage-filter').forEach(x=>x.classList.toggle('active',x===btn));const custom=document.getElementById('usage-custom');custom.classList.toggle('show',btn.dataset.range==='custom');if(btn.dataset.range!=='custom')loadUsage(window.currentUsageBusiness,btn.dataset.range);});
  document.getElementById('usage-custom').addEventListener('change',()=>{const f=document.getElementById('usage-from').value,t=document.getElementById('usage-to').value;if(f&&t)loadUsage(window.currentUsageBusiness,'custom',f,t);});
}

function rangeFor(kind,from,to){
  const now=new Date();let a,b;
  if(kind==='custom'){a=new Date(`${from}T00:00:00`);b=new Date(`${to}T00:00:00`);b.setDate(b.getDate()+1);}
  else if(kind==='7d'){b=new Date(now);b.setDate(b.getDate()+1);a=new Date(now);a.setDate(a.getDate()-6);a.setHours(0,0,0,0);}
  else if(kind==='30d'){b=new Date(now);b.setDate(b.getDate()+1);a=new Date(now);a.setDate(a.getDate()-29);a.setHours(0,0,0,0);}
  else if(kind==='month'){a=new Date(now.getFullYear(),now.getMonth(),1);b=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);}
  else if(kind==='last_month'){a=new Date(now.getFullYear(),now.getMonth()-1,1);b=new Date(now.getFullYear(),now.getMonth(),1);}
  else {a=new Date(now);a.setHours(0,0,0,0);b=new Date(a);b.setDate(b.getDate()+1);}
  return {start:a.toISOString(),end:b.toISOString()};
}

async function loadUsage(b,kind='today',from='',to=''){
  if(!b)return;ensureModal();const body=document.getElementById('usage-body');body.innerHTML='<div class="usage-loading">Loading usage…</div>';
  try{
    const r=rangeFor(kind,from,to);const response=await fetch(usageApi,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'x-superadmin-key':key},body:JSON.stringify({action:'summary',business_id:b.id,start:r.start,end:r.end})});
    const d=await response.json();if(!response.ok)throw new Error(d.error||'Unable to load usage');
    const c=d.counts||{};const links=[['Instagram','instagram_click'],['YouTube','youtube_click'],['Facebook','facebook_click'],['Pinterest','pinterest_click'],['X','x_click'],['WhatsApp','whatsapp_click'],['Phone','phone_click'],['Justdial','justdial_click']];
    body.innerHTML=`<div class="usage-section"><div class="usage-section-title">QR Usage</div><div class="usage-grid"><div class="usage-stat"><strong>${Number(d.unique_visitors||0).toLocaleString('en-IN')}</strong><span>Unique visitors</span></div><div class="usage-stat"><strong>${Number(d.total_scans||0).toLocaleString('en-IN')}</strong><span>QR scans</span></div></div></div><div class="usage-section"><div class="usage-section-title">Customer Feedback Selection</div><div class="usage-grid"><div class="usage-stat"><strong>${Number(c.rating_1||0).toLocaleString('en-IN')}</strong><span>⭐ 1 Star</span></div><div class="usage-stat"><strong>${Number(c.rating_2||0).toLocaleString('en-IN')}</strong><span>⭐ 2 Star</span></div><div class="usage-stat"><strong>${Number(c.rating_3||0).toLocaleString('en-IN')}</strong><span>⭐ 3 Star</span></div></div></div><div class="usage-section"><div class="usage-section-title">Social & Contact</div><div class="usage-links">${links.map(([label,type])=>`<div class="usage-link-stat"><span>${label}</span><strong>${Number(c[type]||0).toLocaleString('en-IN')}</strong></div>`).join('')}</div></div><div class="usage-section"><div class="usage-section-title">Recent activity</div><div style="font-size:.78rem;color:#475569">Last scan: <strong>${d.last_scan?new Date(d.last_scan).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'No scans in this period'}</strong></div></div>`;
  }catch(e){body.innerHTML=`<div class="usage-loading">Unable to load usage.<br><small>${esc(e.message)}</small></div>`;}
}

function openUsage(id){const b=window.loadedBusinesses?.find(x=>String(x.id)===String(id));if(!b){alert('Business record not found.');return;}ensureModal();window.currentUsageBusiness=b;document.getElementById('usage-title').textContent=`📊 ${b.business_name||'Business'} — Usage`;document.querySelectorAll('.usage-filter').forEach((x,i)=>x.classList.toggle('active',i===0));document.getElementById('usage-custom').classList.remove('show');document.getElementById('usage-modal').classList.remove('hidden');loadUsage(b,'today');}

function enhance(){const businesses=window.loadedBusinesses||[];if(!businesses.length)return;document.querySelectorAll('#businesses-tbody tr').forEach(row=>{const edit=row.querySelector('[data-edit]');if(!edit||row.querySelector('[data-usage-business]'))return;const btn=document.createElement('button');btn.type='button';btn.className='action-btn usage-btn';btn.textContent='See Usage';btn.dataset.usageBusiness=edit.dataset.edit;const actions=row.lastElementChild?.querySelector('div');if(actions)actions.appendChild(btn);});document.querySelectorAll('#business-mobile-cards .record-card').forEach(card=>{const edit=card.querySelector('[data-edit]');if(!edit||card.querySelector('[data-usage-business]'))return;const btn=document.createElement('button');btn.type='button';btn.className='action-btn usage-btn';btn.textContent='See Usage';btn.dataset.usageBusiness=edit.dataset.edit;const actions=card.querySelector('.card-actions');if(actions)actions.appendChild(btn);});}

document.addEventListener('click',e=>{const btn=e.target.closest('[data-usage-business]');if(btn){e.preventDefault();e.stopPropagation();openUsage(btn.dataset.usageBusiness);}});
const observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true});setTimeout(enhance,500);setTimeout(enhance,1500);ensureModal();