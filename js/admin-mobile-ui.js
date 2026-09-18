function initAdminMobileUi(){
  if(document.getElementById('admin-mobile-ui-styles'))return;
  const style=document.createElement('style');
  style.id='admin-mobile-ui-styles';
  style.textContent=`
    .admin-collapsible{position:relative}
    .admin-collapsible>h2{cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;user-select:none;margin-bottom:0!important}
    .admin-collapsible>h2::after{content:'+';font-size:1rem;font-weight:700;color:#6b7280}
    .admin-collapsible:not(.is-collapsed)>h2::after{content:'−'}
    .admin-collapsible.is-collapsed>*:not(h2){display:none!important}
    @media(max-width:760px){.page{padding:7px 7px 18px!important}.header{padding:12px 13px!important;margin-bottom:8px!important}.brand{font-size:1.12rem!important}.business-title{font-size:.94rem!important}.subtitle{font-size:.72rem!important}.status{padding:8px 10px!important;margin-bottom:8px!important;font-size:.76rem!important}.stats{gap:6px!important;margin-bottom:8px!important}.stat{padding:9px!important;border-radius:11px!important}.stat-label{font-size:.67rem!important}.stat-value{font-size:1.08rem!important}.grid{gap:8px!important}.card{padding:11px!important;border-radius:11px!important}.card h2{font-size:.91rem!important;margin-bottom:9px!important}.actions{margin-top:8px!important;gap:6px!important}.btn{padding:8px 8px!important;font-size:.78rem!important}#feedback-list{max-height:360px!important}.feedback-card{padding:9px!important;margin-bottom:6px!important}.feedback-msg{font-size:.8rem!important}.section{margin-top:8px!important}}
  `;
  document.head.appendChild(style);

  const apply=()=>{
    document.querySelectorAll('#business-settings-section,#business-info-section,#security-section,#review-filter-settings,#admin-usage-card,.grid > .card,#share-review-section').forEach(section=>{
      if(section.classList.contains('notification-static'))return;
      section.classList.add('admin-collapsible');
      const h=section.querySelector(':scope > h2');
      if(!h||h.dataset.collapsibleBound)return;
      h.dataset.collapsibleBound='1';
      h.setAttribute('role','button');
      h.setAttribute('tabindex','0');
      h.setAttribute('aria-expanded','false');
      section.classList.add('is-collapsed');
      const toggle=()=>{const collapsed=section.classList.toggle('is-collapsed');h.setAttribute('aria-expanded',String(!collapsed));};
      h.addEventListener('click',toggle);
      h.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
    });
    const share=document.getElementById('share-review-section');
    const page=document.querySelector('.page');
    const qrHidden=document.getElementById('qrcode-hidden');
    if(share&&page&&qrHidden&&share.parentElement===page&&share.nextElementSibling!==qrHidden)page.insertBefore(share,qrHidden);
  };

  apply();
  window.addEventListener('wonderqr:admin-ready',()=>setTimeout(apply,50),{once:true});
  window.addEventListener('wonderqr:usage-ready',()=>setTimeout(apply,20));
  setTimeout(apply,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initAdminMobileUi,{once:true});else initAdminMobileUi();
