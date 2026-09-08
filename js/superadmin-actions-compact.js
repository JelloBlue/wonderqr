// Keep the Super Admin business table compact without changing any business actions.
// The existing buttons keep their data attributes and event handlers; they are
// only moved into a native <details> menu for the desktop Actions column.

function ensureCompactActionStyles(){
  if(document.getElementById('compact-business-actions-styles')) return;
  const s=document.createElement('style');
  s.id='compact-business-actions-styles';
  s.textContent=`
    #businesses-tbody .compact-actions-wrap{display:block!important;position:relative!important}
    #businesses-tbody .compact-actions{position:relative;display:inline-block}
    #businesses-tbody .compact-actions>summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:7px 11px;border:0;border-radius:7px;background:#4f46e5;color:#fff;font-size:.75rem;font-weight:700;white-space:nowrap}
    #businesses-tbody .compact-actions>summary::-webkit-details-marker{display:none}
    #businesses-tbody .compact-actions>summary:after{content:'▾';font-size:.65rem}
    #businesses-tbody .compact-actions[open]>summary:after{content:'▴'}
    #businesses-tbody .compact-action-menu{position:absolute;right:0;top:calc(100% + 5px);z-index:40;min-width:175px;padding:7px;background:#fff;border:1px solid #e2e8f0;border-radius:9px;box-shadow:0 12px 28px rgba(0,0,0,.16)}
    #businesses-tbody .compact-action-menu .action-btn{display:block!important;width:100%;box-sizing:border-box;margin:3px 0;text-align:left}
    #businesses-tbody .compact-action-menu [data-copy],#businesses-tbody .compact-action-menu [data-qr],#businesses-tbody .compact-action-menu [data-clear-test]{display:block!important}
  `;
  document.head.appendChild(s);
}

function compactBusinessActions(){
  const tbody=document.getElementById('businesses-tbody');
  if(!tbody) return;
  ensureCompactActionStyles();
  tbody.querySelectorAll('tr').forEach(row=>{
    const actionsWrap=row.lastElementChild?.querySelector(':scope > div');
    if(!actionsWrap||actionsWrap.dataset.compactActions==='1'||actionsWrap.closest('.compact-actions')) return;
    const buttons=[...actionsWrap.querySelectorAll(':scope > button')];
    if(!buttons.length) return;

    actionsWrap.dataset.compactActions='1';
    actionsWrap.className='compact-actions-wrap';
    actionsWrap.style.cssText='';

    const details=document.createElement('details');
    details.className='compact-actions';
    const summary=document.createElement('summary');
    summary.textContent='⋮ Actions';
    const menu=document.createElement('div');
    menu.className='compact-action-menu';
    buttons.forEach(btn=>menu.appendChild(btn));
    details.append(summary,menu);
    actionsWrap.replaceChildren(details);
  });
}

const observer=new MutationObserver(compactBusinessActions);

document.addEventListener('DOMContentLoaded',()=>{
  compactBusinessActions();
  observer.observe(document.getElementById('businesses-tbody')||document.body,{childList:true,subtree:true});
});

setTimeout(compactBusinessActions,500);
setTimeout(compactBusinessActions,1500);
