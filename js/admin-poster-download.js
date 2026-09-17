const posterSizes={
  A4:{label:'A4 (8.27 × 11.69 in)',width:2480,height:3508},
  A3:{label:'A3 (11.69 × 16.54 in)',width:3508,height:4961}
};
let currentBusiness=null,currentQr=null;
const $=id=>document.getElementById(id);

function injectPosterControls(){
  if($('large-poster-controls'))return true;
  const actions=document.querySelector('.actions');
  if(!actions)return false;
  const wrap=document.createElement('div');
  wrap.id='large-poster-controls';
  wrap.style='grid-column:1/-1;margin-top:3px;padding-top:10px;border-top:1px solid #e5e7eb';
  wrap.innerHTML=`<div style="font-size:.8rem;font-weight:700;color:#374151;margin-bottom:6px">🖨️ Larger Print Poster</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px"><select id="large-poster-size" class="btn secondary" style="width:100%;appearance:auto;text-align:left"><option value="A4">A4 (8.27 × 11.69 in)</option><option value="A3">A3 (11.69 × 16.54 in)</option></select><button id="download-large-poster" class="btn primary" type="button" disabled>Download Poster</button></div><div class="hint">High-resolution 300 DPI PNG, suitable for professional printing.</div>`;
  actions.appendChild(wrap);
  $('download-large-poster')?.addEventListener('click',downloadLargePoster);
  return true;
}

function syncState(business,qr){
  if(business)currentBusiness=business;
  if(qr&&qr!=='—')currentQr=String(qr).trim();
  if(!currentQr||currentQr==='—'){
    const stat=$('stat-qr');
    const value=stat?.textContent?.trim();
    if(value&&value!=='—')currentQr=value;
  }
  const btn=$('download-large-poster');
  if(btn)btn.disabled=!(currentBusiness&&currentQr&&currentQr!=='—');
}

function drawWrappedText(ctx,text,x,y,maxWidth,fontSize,lineHeight){
  ctx.font=`bold ${fontSize}px Arial`;
  const words=String(text||'').split(/\s+/),lines=[];let line='';
  for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test;}
  if(line)lines.push(line);
  lines.slice(0,2).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
}

function getLinks(b){
  const links=[];
  if(b?.instagram_url)links.push('Instagram');
  if(b?.youtube_url)links.push('YouTube');
  if(b?.facebook_url)links.push('Facebook');
  if(b?.whatsapp_number)links.push('WhatsApp');
  if(b?.phone_number)links.push('Call');
  if(b?.justdial_url)links.push('Justdial');
  if(b?.zomato_url)links.push('Zomato');
  if(b?.swiggy_url)links.push('Swiggy');
  return links.slice(0,5);
}

function makeQrImage(targetUrl){
  return new Promise((resolve,reject)=>{
    if(typeof QRCode==='undefined')return reject(new Error('QR generator library is not available. Please refresh the page.'));
    const holder=document.createElement('div');
    holder.style.cssText='position:fixed;left:-10000px;top:-10000px;width:1200px;height:1200px;overflow:hidden;background:#fff';
    document.body.appendChild(holder);
    try{
      new QRCode(holder,{text:targetUrl,width:1200,height:1200,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    }catch(e){holder.remove();return reject(e)}
    let attempts=0;
    const finish=()=>{
      const canvas=holder.querySelector('canvas');
      if(canvas){
        try{const img=new Image();img.onload=()=>{holder.remove();resolve(img)};img.onerror=()=>{holder.remove();reject(new Error('QR image could not be loaded.'))};img.src=canvas.toDataURL('image/png');return}catch(e){holder.remove();return reject(e)}
      }
      const imgEl=holder.querySelector('img');
      if(imgEl?.src){const img=new Image();img.onload=()=>{holder.remove();resolve(img)};img.onerror=()=>{holder.remove();reject(new Error('QR image could not be loaded.'))};img.src=imgEl.src;return}
      if(++attempts<20)return setTimeout(finish,100);
      holder.remove();reject(new Error('QR image could not be generated.'));
    };
    setTimeout(finish,100);
  });
}

async function makePosterCanvas(sizeKey){
  syncState();
  if(!currentBusiness||!currentQr)throw new Error('Business QR is not ready yet. Please wait for the dashboard to finish loading.');
  const size=posterSizes[sizeKey]||posterSizes.A4;
  const canvas=document.createElement('canvas');
  canvas.width=size.width;canvas.height=size.height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Unable to prepare poster.');
  const targetUrl=`https://jelloblue.github.io/wonderqr/?qr=${encodeURIComponent(currentQr)}`;
  const qrImage=await makeQrImage(targetUrl);
  const W=size.width,H=size.height,scale=W/2480;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#0d4734';ctx.fillRect(0,0,W,420*scale);
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font=`bold ${96*scale}px Arial`;ctx.fillText('SCAN TO REVIEW',W/2,245*scale);
  ctx.fillStyle='#0d4734';
  drawWrappedText(ctx,(currentBusiness.business_name||'Your Business').trim(),W/2,555*scale,2050*scale,72*scale,88*scale);
  ctx.fillStyle='#374151';ctx.font=`${42*scale}px Arial`;ctx.fillText('We value your feedback',W/2,735*scale);
  const qrSize=Math.min(1450*scale,W-420*scale),qrX=(W-qrSize)/2,qrY=860*scale;
  ctx.fillStyle='#fff';ctx.strokeStyle='#d1d5db';ctx.lineWidth=10*scale;ctx.fillRect(qrX-45*scale,qrY-45*scale,qrSize+90*scale,qrSize+90*scale);ctx.strokeRect(qrX-45*scale,qrY-45*scale,qrSize+90*scale,qrSize+90*scale);ctx.drawImage(qrImage,qrX,qrY,qrSize,qrSize);
  ctx.fillStyle='#111827';ctx.font=`bold ${48*scale}px Arial`;ctx.fillText('Point your phone camera at the QR code',W/2,(860+1450+130)*scale);
  ctx.fillStyle='#6b7280';ctx.font=`${38*scale}px Arial`;ctx.fillText('Scan • Review • Support our business',W/2,(860+1450+205)*scale);
  const links=getLinks(currentBusiness);
  if(links.length){ctx.fillStyle='#0d4734';ctx.font=`bold ${36*scale}px Arial`;ctx.fillText(links.join('   •   '),W/2,(860+1450+310)*scale)}
  ctx.fillStyle='#0d4734';ctx.font=`bold ${42*scale}px Arial`;ctx.fillText('WonderQR',W/2,H-270*scale);
  ctx.fillStyle='#6b7280';ctx.font=`${30*scale}px Arial`;ctx.fillText(currentQr,W/2,H-210*scale);
  return canvas;
}

function canvasToBlob(canvas){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Your browser could not prepare the poster file. Please try A4 or refresh the page.')),'image/png');
  });
}

async function downloadLargePoster(){
  const btn=$('download-large-poster'),select=$('large-poster-size');
  const key=select?.value||'A4';
  syncState();
  if(!currentBusiness||!currentQr){alert('Please wait until the Business Admin dashboard has finished loading.');return}
  if(btn)btn.disabled=true;
  try{
    const canvas=await makePosterCanvas(key);
    const blob=await canvasToBlob(canvas);
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.download=`WonderQR-Poster-${currentQr}-${key}.png`;
    a.href=url;
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    alert(`${key} poster is ready. If your phone asks where to save it, choose Download.`);
  }catch(e){
    console.error('WonderQR poster download failed:',e);
    alert(e?.message||'Unable to download the larger poster. Please try A4 first.');
  }finally{if(btn)btn.disabled=false;}
}

function ready(b,qr){
  syncState(b,qr);
  if(!injectPosterControls())setTimeout(()=>ready(b,qr),250);
  else syncState();
}

window.addEventListener('wonderqr:admin-ready',e=>ready(e.detail?.business,e.detail?.qrCode));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>ready(null,null),{once:true});
else ready(null,null);
setInterval(()=>{if(!$('large-poster-controls'))ready(null,null);else syncState()},1000);
