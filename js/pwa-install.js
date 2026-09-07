let deferredPrompt=null;
const installButton=document.getElementById('install-app-btn');
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;if(installButton)installButton.hidden=false});
installButton?.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installButton.hidden=true});
window.addEventListener('appinstalled',()=>{deferredPrompt=null;if(installButton)installButton.hidden=true});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.error('WonderQR service worker registration failed',err)));
