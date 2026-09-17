const posterSizes={
  A4:{label:'A4 (8.27 × 11.69 in)',width:2480,height:3508},
  A3:{label:'A3 (11.69 × 16.54 in)',width:3508,height:4961}
};
let currentBusiness=null,currentQr=null;
const $=id=>document.getElementById(id);

function injectPosterControls(){
  if($('large-poster-controls'))return;
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

async function makePosterCanvas(sizeKey){
  if(!currentBusiness||!currentQr)throw new Error('Business QR is not ready yet.');
  if(typeof QRCode==='undefined')throw new Error('QR generator library is not available.');
  const size=posterSizes[sizeKey]||posterSizes.A4;
  const canvas=document.createElement('canvas');
  canvas.width=size.width;canvas.height=size.height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Unable to prepare poster.');
  const qrHolder=document.createElement('div');
  qrHolder.style.cssText='position:absolute;left:-99999px;top:-99999px;width:1600px;height:1600px;overflow:hidden';
  document.body.appendChild(qrHolder);
  try{
    const targetUrl=`https://jelloblue.github.io/wonderqr/?qr=${encodeURIComponent(currentQr)}`;
    new QRCode(qrHolder,{text:targetUrl,width:1600,height:1600,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    await new Promise(r=>setTimeout(r,250));
    const qrCanvas=qrHolder.querySelector('canvas');
    const qrImg=qrHolder.querySelector('img');
    const qrSource=qrCanvas?qrCanvas.toDataURL('image/png'):(qrImg?.src||null);
    if(!qrSource)throw new Error('QR image could not be generated.');
    const qrImage=new Image();
    await new Promise((resolve,reject)=>{qrImage.onload=resolve;qrImage.onerror=()=>reject(new Error('QR image could not be loaded.'));qrImage.src=qrSource});
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
  }finally{qrHolder.remove();}
}

async function downloadLargePoster(){
  const btn=$('download-large-poster'),select=$('large-poster-size');
  const key=select?.value||'A4';
  if(btn)btn.disabled=true;
  try{
    const canvas=await makePosterCanvas(key);
    const a=document.createElement('a');
    a.download=`WonderQR-Poster-${currentQr}-${key}.png`;
    a.href=canvas.toDataURL('image/png',1);
    document.body.appendChild(a);a.click();a.remove();
  }catch(e){console.error(e);alert(e.message||'Unable to download the larger poster.');}
  finally{if(btn)btn.disabled=false;}
}

function ready(b){
  currentBusiness=b||currentBusiness;
  currentQr=$('stat-qr')?.textContent?.trim()||currentQr;
  if(!injectPosterControls())setTimeout(()=>injectPosterControls(),300);
  const btn=$('download-large-poster');if(btn)btn.disabled=!(currentBusiness&&currentQr&&currentQr!=='—');
}

window.addEventListener('wonderqr:admin-ready',e=>ready(e.detail?.business));
ready(null);
