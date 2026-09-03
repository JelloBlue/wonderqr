// Optional social/review links for Super Admin onboarding and editing.
// Injects fields into both business forms and validates/forwards them to superadmin_api.
(() => {
  const fields = [
    ['facebook_url', 'Facebook Page URL'],
    ['whatsapp_number', 'WhatsApp Number'],
    ['phone_number', 'Phone Number'],
    ['justdial_url', 'Justdial URL'],
    ['zomato_url', 'Zomato URL'],
    ['swiggy_url', 'Swiggy URL'],
    ['pinterest_url', 'Pinterest URL'],
    ['x_url', 'X (Twitter) Profile URL']
  ];
  const isUrl = v => { if (!v) return true; try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };
  const isPhone = v => !v || /^\+?[0-9][0-9\s().-]{8,18}$/.test(v);
  const inputType = id => id.endsWith('_url') ? 'url' : 'tel';

  function addFields(formId, prefix) {
    const form = document.getElementById(formId);
    if (!form || form.dataset.socialFieldsReady) return;
    const anchor = document.getElementById(`${prefix}-youtube-url`);
    const box = document.createElement('div');
    box.dataset.socialFields = 'true';
    box.innerHTML = '<div style="margin:14px 0 8px;font-weight:700;color:#374151">Social & Review Links</div>' + fields.map(([id,label]) => `<label class="form-label">${label} (Optional)</label><input type="${inputType(id)}" id="${prefix}-${id}" class="form-input" placeholder="${id.endsWith('_url') ? 'https://...' : '+919876543210'}">`).join('');
    if (anchor?.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    else form.insertBefore(box, form.querySelector('button[type="submit"]'));
    form.dataset.socialFieldsReady = 'true';
  }

  function validate(prefix) {
    for (const [id,label] of fields) {
      const el = document.getElementById(`${prefix}-${id}`); if (!el) continue;
      const v = el.value.trim();
      if (id.endsWith('_url') && !isUrl(v)) { alert(`${label} must be a valid http(s) URL.`); el.focus(); return false; }
      if (id.endsWith('_number') && !isPhone(v)) { alert(`${label} must be a valid phone number.`); el.focus(); return false; }
    }
    return true;
  }

  function values(prefix) {
    const out = {};
    fields.forEach(([id]) => { const el=document.getElementById(`${prefix}-${id}`); if(el) out[id]=el.value.trim() || null; });
    return out;
  }

  function inject() { addFields('add-biz-form','add'); addFields('edit-biz-form','edit'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject();

  // The existing superadmin.js keeps its API helper private. Wrap fetch so its existing
  // dashboard/add/edit calls remain untouched while these optional fields are forwarded.
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.includes('/functions/v1/superadmin_api') && init.body && typeof init.body === 'string') {
        const payload = JSON.parse(init.body);
        if (payload.action === 'onboard' && !validate('add')) return new Response(JSON.stringify({error:'Validation failed'}), {status:400,headers:{'Content-Type':'application/json'}});
        if (payload.action === 'onboard') Object.assign(payload, values('add'));
        if (payload.action === 'update_business' && !validate('edit')) return new Response(JSON.stringify({error:'Validation failed'}), {status:400,headers:{'Content-Type':'application/json'}});
        if (payload.action === 'update_business') payload.updates = {...payload.updates, ...values('edit')};
        init = {...init, body: JSON.stringify(payload)};
      }
    } catch (e) { console.warn('Social link form enhancement:', e); }
    return originalFetch(input, init);
  };
})();
