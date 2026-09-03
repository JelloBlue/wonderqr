// Converts generated copy-link actions on the Super Admin page into direct-open buttons.
function enhanceDirectLinkButtons(){
  document.querySelectorAll('[data-copy]').forEach(btn=>{
    if(btn.dataset.directOpen==='1') return;
    const text=(btn.textContent||'').trim().toLowerCase();
    const isCustomer=text.includes('customer');
    const isAdmin=text.includes('admin');
    const isSales=text.includes('sales')||text==='copy link';
    if(!isCustomer&&!isAdmin&&!isSales)return;
    const url=btn.getAttribute('data-copy');
    if(!url)return;
    btn.removeAttribute('data-copy');
    btn.dataset.directOpen='1';
    btn.dataset.openUrl=url;
    btn.classList.remove('btn-copy');
    if(isCustomer)btn.textContent='Customer Rating Link';
    else if(isAdmin)btn.textContent='Admin Link';
    else btn.textContent='Sales Link';
    btn.addEventListener('click',()=>window.open(url,'_blank','noopener,noreferrer'));
  });
}
const directLinkObserver=new MutationObserver(enhanceDirectLinkButtons);
directLinkObserver.observe(document.body,{childList:true,subtree:true});
setTimeout(enhanceDirectLinkButtons,100);
setTimeout(enhanceDirectLinkButtons,500);
setTimeout(enhanceDirectLinkButtons,1500);
