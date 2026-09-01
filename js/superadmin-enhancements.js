import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const key = new URLSearchParams(location.search).get('key') || '';
const api = `${SUPABASE_URL}/functions/v1/superadmin_api`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function apiCall(action, extra = {}) {
  const r = await fetch(api, { method:'POST', headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'x-superadmin-key':key}, body:JSON.stringify({action,...extra}) });
  const d = await r.json().catch(() => ({error:'Invalid server response'}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}

// Opens and populates the Edit Business modal used by superadmin.js.
// The Edit button was already being rendered and its click handler was already
// calling openEditModal(), but that function was missing from the loaded scripts.
window.openEditModal = function(id) {
  const b = window.loadedBusinesses?.find(x => String(x.id) === String(id));
  const modal = document.getElementById('edit-modal');
  if (!b || !modal) {
    alert('Unable to open Edit Business: business record not found.');
    return;
  }

  const setValue = (fieldId, value) => {
    const el = document.getElementById(fieldId);
    if (el) el.value = value ?? '';
  };

  // Keep the ID both in the hidden field and on the modal. The submit handler
  // already supports both locations.
  setValue('edit-biz-id', b.id);
  modal.dataset.businessId = String(b.id);
  setValue('edit-biz-name', b.business_name);
  setValue('edit-owner-name', b.owner_name);
  setValue('edit-google-url', b.google_review_url);
  setValue('edit-whatsapp', b.whatsapp_number);
  setValue('edit-phone', b.phone_number);
  setValue('edit-instagram-url', b.instagram_url);
  setValue('edit-youtube-url', b.youtube_url);

  modal.classList.remove('hidden');
  modal.style.display = 'flex';
};

function enhanceBusinesses() {
  const tbody = document.getElementById('businesses-tbody');
  if (!tbody || !window.loadedBusinesses?.length) return;
  tbody.querySelectorAll('tr').forEach(row => {
    const edit = row.querySelector('[data-edit]');
    if (!edit || row.dataset.enhanced === '1') return;
    const b = window.loadedBusinesses.find(x => String(x.id) === String(edit.dataset.edit));
    if (!b) return;
    row.dataset.enhanced = '1';
    const status = b.active !== false;
    const cells = row.querySelectorAll('td');
    if (cells[4]) cells[4].insertAdjacentHTML('beforeend', `<div style="margin-top:4px;font-size:.75rem"><strong>${status ? 'Active' : 'Inactive'}</strong><br>Activated: ${esc(formatDate(b.activation_date))}</div>`);
    const actions = row.lastElementChild?.querySelector('div');
    if (!actions) return;
    const toggle = document.createElement('button');
    toggle.type='button'; toggle.className='action-btn';
    toggle.style.cssText=`background:${status?'#f59e0b':'#16a34a'};color:#fff`;
    toggle.textContent=status?'Deactivate':'Activate';
    toggle.dataset.bizToggle=String(b.id);
    actions.appendChild(toggle);
    const clear = document.createElement('button');
    clear.type='button'; clear.className='action-btn'; clear.style.cssText='background:#dc2626;color:#fff';
    clear.textContent='Clear Test Feedback'; clear.dataset.clearTest=String(b.id);
    actions.appendChild(clear);
  });
}

async function toggleBusiness(id) {
  const b = window.loadedBusinesses?.find(x => String(x.id) === String(id));
  if (!b) return;
  const next = b.active === false;
  if (!confirm(`${next ? 'Activate' : 'Deactivate'} ${b.business_name || 'this business'}?`)) return;
  try {
    await apiCall('update_business',{id:String(id),updates:{active:next}});
    alert(next ? 'Business activated.' : 'Business deactivated.');
    window.location.reload();
  } catch(e) { alert('Failed to change business status: '+e.message); }
}

async function clearTestFeedback(id) {
  const b = window.loadedBusinesses?.find(x => String(x.id) === String(id));
  if (!b) return;
  if (!confirm(`Clear TEST feedback for ${b.business_name || 'this business'}?\n\nThis will remove the test feedback records for this business. This cannot be undone.`)) return;
  try {
    const d = await apiCall('clear_test_feedback',{business_id:String(id)});
    alert(`${d.deleted || 0} test feedback record(s) cleared.`);
    window.location.reload();
  } catch(e) { alert('Failed to clear test feedback: '+e.message); }
}

document.addEventListener('click', e => {
  const toggle = e.target.closest('[data-biz-toggle]');
  if (toggle) { toggleBusiness(toggle.dataset.bizToggle); return; }
  const clear = e.target.closest('[data-clear-test]');
  if (clear) { clearTestFeedback(clear.dataset.clearTest); return; }
});

const observer = new MutationObserver(enhanceBusinesses);
observer.observe(document.body,{childList:true,subtree:true});
setTimeout(enhanceBusinesses,500);
setTimeout(enhanceBusinesses,1500);
