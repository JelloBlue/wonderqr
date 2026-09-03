// Optional social/review links for Super Admin onboarding and editing.
(() => {
  const fields = [
    ['facebook_url', 'Facebook Page URL'], ['justdial_url', 'Justdial URL'], ['zomato_url', 'Zomato URL'],
    ['swiggy_url', 'Swiggy URL'], ['pinterest_url', 'Pinterest URL'], ['x_url', 'X (Twitter) Profile URL']
  ];
  const isUrl = v => { if (!v) return true; try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };
  function addFields(formId, prefix) {
    const form=document.getElementById(formId); if(!form||form.dataset.socialFieldsReady)return;
    const anchor=document.getElementById(`${prefix}-youtube-url`); const box=document.createElement('div'); box.dataset.socialFields='true';
    box.innerHTML='<div style="margin:14px 0 8px;font-weight:700;color:#374151">Social & Review Links</div>'+fields.map(([id,label])=>`<label class="form-label">${label} (Optional)</label><input type="url" id="${prefix}-${id}" class="form-input" placeholder="https://...">`).join('');
    if(anchor?.parentNode)anchor.parentNode.insertBefore(box,anchor.nextSibling);else form.insertBefore(box,form.querySelector('button[type="submit"]'));form.dataset.socialFieldsReady='true';
  }
  function validate(prefix){for(const[id,label]of fields){const el=document.getElementById(`${prefix}-${id}`);if(el&&!isUrl(el.value.trim())){alert(`${label} must be a valid http(s) URL.`);el.focus();return false;}}return true;}
  function values(prefix){const out={};fields.forEach(([id])=>{const el=document.getElementById(`${prefix}-${id}`);if(el)out[id]=el.value.trim()||null;});return out;}
  function inject(){addFields('add-biz-form','add');addFields('edit-biz-form','edit');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
  const originalFetch=window.fetch.bind(window);
  window.fetch=async(input,init={})=>{try{const url=typeof input==='string'?input:input?.url||'';if(url.includes('/functions/v1/superadmin_api')&&init.body&&typeof init.body==='string'){
    const payload=JSON.parse(init.body);if(payload.action==='onboard'&&!validate('add'))return new Response(JSON.stringify({error:'Validation failed'}),{status:400,headers:{'Content-Type':'application/json'}});if(payload.action==='onboard')Object.assign(payload,values('add'));if(payload.action==='update_business'&&!validate('edit'))return new Response(JSON.stringify({error:'Validation failed'}),{status:400,headers:{'Content-Type':'application/json'}});if(payload.action==='update_business')payload.updates={...payload.updates,...values('edit')};init={...init,body:JSON.stringify(payload)};}}catch(e){console.warn('Social link form enhancement:',e);}return originalFetch(input,init);};
  let wrapped=false;const tryWrap=()=>{if(wrapped||typeof window.openEditModal!=='function')return;const original=window.openEditModal;window.openEditModal=function(id){original(id);setTimeout(()=>{const b=(window.loadedBusinesses||[]).find(x=>String(x.id)===String(id));if(!b)return;fields.forEach(([name])=>{const el=document.getElementById(`edit-${name}`);if(el)el.value=b[name]||'';});},0);};wrapped=true;};const timer=setInterval(()=>{tryWrap();if(wrapped)clearInterval(timer);},100);
})();
