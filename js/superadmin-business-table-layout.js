// Normalize the desktop business table to the columns that are actually shown.
// Owner and QR Code remain available in the mobile business cards; this only
// removes those two desktop cells so Review Stats and Actions cannot shift.

function normalizeBusinessTable(){
  const tbody=document.getElementById('businesses-tbody');
  const table=tbody?.closest('table');
  if(!tbody||!table)return;

  const head=table.querySelector('thead tr');
  if(head){
    const headers=[...head.children];
    if(headers.length>5){
      headers[2]?.remove();
      headers[2]?.remove();
    }
  }

  tbody.querySelectorAll('tr').forEach(row=>{
    const cells=[...row.children];
    if(cells.length>5){
      cells[2]?.remove();
      cells[2]?.remove();
    }
  });

  table.classList.add('business-table-normalized');
}

function ensureBusinessTableStyles(){
  if(document.getElementById('business-table-layout-styles'))return;
  const style=document.createElement('style');
  style.id='business-table-layout-styles';
  style.textContent=`
    #businesses-tbody.business-table-normalized{}
    #businesses-tbody td:nth-child(4){font-size:.78rem;line-height:1.45}
    #businesses-tbody th:nth-child(1){width:24%}
    #businesses-tbody th:nth-child(2){width:10%}
    #businesses-tbody th:nth-child(3){width:18%}
    #businesses-tbody th:nth-child(4){width:22%}
    #businesses-tbody th:nth-child(5){width:26%}
  `;
  document.head.appendChild(style);
}

function run(){
  ensureBusinessTableStyles();
  normalizeBusinessTable();
}

document.addEventListener('DOMContentLoaded',run);
const observer=new MutationObserver(run);
observer.observe(document.body,{childList:true,subtree:true});
setTimeout(run,300);
setTimeout(run,1000);
setTimeout(run,2000);
