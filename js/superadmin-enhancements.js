import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import './superadmin-links.js';
import './superadmin-link-buttons.js?v=2';
import './superadmin-usage.js?v=2';
import './superadmin-actions-compact.js';

const key = new URLSearchParams(location.search).get('key') || '';
const api = `${SUPABASE_URL}/functions/v1/superadmin_api`;
const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

async function apiCall(action, extra = {}) {
  const r = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'x-superadmin-key':key}, body:JSON.stringify({action,...extra}) });
  const d = await r.json().catch(() => ({error:'Invalid server response'}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}
function formatDate(value) { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function ensurePinControls() {
  const modal=document.getElementById('edit-modal'),form=document.getElementById('edit-biz-form');
  if(!modal||!form||document.getElementById('edit-biz-pin'))return;
  const row=document.createElement('div');row.id='edit-pin-section';row.style.cssText='margin-top:14px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px';
  row.innerHTML='<label class="form-label" style="font-weight:600">Admin PIN</label><input type="tel" id="edit-biz-pin" class="form-input" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="Enter new 4-digit PIN"><div style="font-size:.72rem;color:#64748b;margin-top:4px">Leave blank to keep the current PIN.</div><button type="button" id="change-pin-btn" class="action-btn" style="margin-top:8px;background:#7c3aed;color:#fff">Change PIN</button>';
  const buttons=form.querySelector('div:last-child');form.insertBefore(row,buttons||null);
  const pinInput=document.getElementById('edit-biz-pin');pinInput.addEventListener('input',()=>{pinInput.value=pinInput.value.replace(/\D/g,'').slice(0,4);});
  document.getElementById('change-pin-btn').addEventListener('click',async()=>{const id=document.getElementById('edit-biz-id')?.value||modal.dataset.businessId,pin=pinInput.value.replace(/\D/g,'').slice(0,4);pinInput.value=pin;if(!id)return alert('Business record not found.');if(pin.length!==4)return alert('Please enter exactly 4 digits for the new PIN.');if(!confirm('Change the Admin PIN for this business?'))return;const btn=document.getElementById('change-pin-btn');btn.disabled=true;try{await apiCall('reset_pin',{business_id:String(id),pin});pinInput.value='';alert('Admin PIN changed successfully.');}catch(e){alert('Failed to change PIN: '+e.message);}finally{btn.disabled=false;}});
}
window.openEditModal=function(id){const b=window.loadedBusinesses?.find(x=>String(x.id)===String(id)),modal=document.getElementById('edit-modal');if(!b||!modal){alert('Unable to open Edit Business: business record not found.');return;}const setValue=(fieldId,value)=>{const el=document.getElementById(fieldId);if(el)el.value=value??'';};setValue('edit-biz-id',b.id);modal.dataset.businessId=String(b.id);setValue('edit-biz-name',b.business_name);setValue('edit-owner-name',b.owner_name);setValue('edit-google-url',b.google_review_url);setValue('edit-whatsapp',b.whatsapp_number);setValue('edit-phone',b.phone_number);setValue('edit-instagram-url',b.instagram_url);setValue('edit-youtube-url',b.youtube_url);['facebook_url','whatsapp_number','phone_number','justdial_url','zomato_url','swiggy_url','pinterest_url','x_url'].forEach(name=>setValue(`edit-${name}`,b[name]));ensurePinControls();const pin=document.getElementById('edit-biz-pin');if(pin)pin.value='';modal.classList.remove('hidden');modal.style.display='flex';};

// The core Super Admin renderer in superadmin.js already creates the business
// Activate/Deactivate and Clear Test Feedback controls. This enhancement only
// adds the activation metadata and must not append duplicate action buttons.
function enhanceBusinesses(){const tbody=document.getElementById('businesses-tbody');if(!tbody||!window.loadedBusinesses?.length)return;tbody.querySelectorAll('tr').forEach(row=>{const edit=row.querySelector('[data-edit]');if(!edit||row.dataset.enhanced==='1')return;const b=window.loadedBusinesses.find(x=>String(x.id)===String(edit.dataset.edit));if(!b)return;row.dataset.enhanced='1';const status=b.active!==false,cells=row.querySelectorAll('td');if(cells[4])cells[4].insertAdjacentHTML('beforeend',`<div style="margin-top:4px;font-size:.75rem"><strong>${status?'Active':'Inactive'}</strong><br>Activated: ${esc(formatDate(b.activation_date))}</div>`);});}

// Business status changes are handled by the core superadmin.js event delegation.

// Keep the Super Admin Add Business form consistent with the Sales Rep onboarding form.
function enhanceAddBusinessForm() {
  const form = document.getElementById('add-biz-form');
  if (!form || form.dataset.placeholdersEnhanced === '1') return;
  const fields = {
    'add-qr-code': ['text', 'e.g. RS00001'],
    'add-biz-name': ['text', 'e.g. Varsha Grand'],
    'add-google-url': ['text', 'e.g. ChIJxxxxxxxxxxxxxxxx'],
    'add-owner-name': ['text', 'e.g. Ravi'],
    'add-whatsapp': ['tel', 'e.g. 919876543210'],
    'add-phone': ['tel', 'e.g. +919876543210'],
    'add-instagram-url': ['url', 'https://instagram.com/...'],
    'add-youtube-url': ['url', 'https://youtube.com/...']
  };
  Object.entries(fields).forEach(([id, [type, placeholder]]) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.type = type;
    input.placeholder = placeholder;
  });
  const googleLabel = form.querySelector('label[for="add-google-url"]');
  if (googleLabel) googleLabel.textContent = 'Google Place ID *';
  const google = document.getElementById('add-google-url');
  if (google && /^https?:\/\/search\.google\.com\/local\/writereview\?placeid=$/i.test(google.value.trim())) google.value = '';
  form.dataset.placeholdersEnhanced = '1';
}

document.addEventListener('DOMContentLoaded', enhanceAddBusinessForm);
document.addEventListener('click', e => {
  if (e.target.closest('#open-add-modal-btn')) setTimeout(enhanceAddBusinessForm, 0);
});
const observer=new MutationObserver(enhanceBusinesses);observer.observe(document.body,{childList:true,subtree:true});
setTimeout(enhanceBusinesses,500);setTimeout(enhanceBusinesses,1500);setTimeout(enhanceAddBusinessForm,100);
