const token=new URLSearchParams(location.search).get('token')||localStorage.getItem('admin_auth_token');
const ready=async()=>{
  if(document.getElementById('admin-notifications-card'))return;
  const anchor=document.getElementById('status-message');
  if(!anchor)return;
  const card=document.createElement('section');
  card.id='admin-notifications-card';
  card.className='card section';
  card.innerHTML='<h2>🔔 Notifications</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="enable-notifications-btn" class="btn primary" type="button">Enable Notifications</button><button id="disable-notifications-btn" class="btn secondary" type="button">Disable Notifications</button><button id="test-notifications-btn" class="btn secondary" type="button">Test This Device</button></div><div id="notification-status" class="hint">Enable notifications to receive messages from WonderQR.</div>';
  anchor.insertAdjacentElement('afterend',card);
  const status=document.getElementById('notification-status');
  let notificationModule;
  try{notificationModule=await import('./notifications.js');}
  catch(e){status.textContent='Notification controls are ready, but the notification module could not load. Please refresh once.';console.error('Notification module load failed:',e);return;}
  document.getElementById('enable-notifications-btn').onclick=async()=>{const b=document.getElementById('enable-notifications-btn');b.disabled=true;try{await notificationModule.enableAdminNotifications(token);status.textContent='Notifications enabled on this device. You can now use Test This Device.'}catch(e){status.textContent=e instanceof Error?e.message:String(e)}finally{b.disabled=false}};
  document.getElementById('disable-notifications-btn').onclick=async()=>{const b=document.getElementById('disable-notifications-btn');b.disabled=true;try{await notificationModule.disableAdminNotifications(token);status.textContent='Notifications disabled on this device.'}catch(e){status.textContent=e instanceof Error?e.message:String(e)}finally{b.disabled=false}};
  document.getElementById('test-notifications-btn').onclick=async()=>{const b=document.getElementById('test-notifications-btn');b.disabled=true;try{await notificationModule.testAdminNotification();status.textContent='Local notification test requested successfully.'}catch(e){status.textContent=e instanceof Error?e.message:String(e)}finally{b.disabled=false}};
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
