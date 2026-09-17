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
  wrap.style='grid-column:1/-1;margin-top:5px;padding:12px 0 2px;border-top:1px solid #e5e7eb';
  wrap.innerHTML=`<div style="font-size:.82rem;font-weight:800;color:#0d4734;margin-bottom:7px">🖨️ Larger Print Poster</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px"><select id="large-poster-size" class="btn secondary" style="width:100%;appearance:auto;text-align:left"><option value="A4">A4 (8.27 × 11.69 in)</option><option value="A3">A3 (11.69 × 16.54 in)</option></select><button id="download-large-poster" class="btn primary" type="button" disabled>Download Poster</button></div><div class="hint">High-resolution 300 DPI PNG, suitable for professional printing.</div>`;
  actions.appendChild(wrap);
  $('download-large-poster')?.addEventListener('click',downloadLargePoster);
  return true;
}

function drawWrappedText(ctx,text,x,y,maxWidth,fontSize,lineHeight,maxLines=2){
  ctx.font=`800 ${fontSize}px Arial`;
  const words=String(text||'').split(/\s+/),lines=[];let line='';
  for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test;}
  if(line)lines.push(line);
  lines.slice(0,maxLines).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
}

function roundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
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
  return links.slice(0,4);
}

async function makePosterCanvas(sizeKey){
  if(!currentBusiness||!currentQr)throw new Error('Business QR is not ready yet.');
  if(typeof QRCode==='undefined')throw new Error('QR generator library is not available.');
  const size=posterSizes[sizeKey]||posterSizes.A4;
  const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Unable to prepare poster.');
  const qrHolder=document.createElement('div');
  qrHolder.style.cssText='position:absolute;left:-99999px;top:-99999px;width:1600px;height:1600px;overflow:hidden';document.body.appendChild(qrHolder);
  try{
    const targetUrl=`https://jelloblue.github.io/wonderqr/?qr=${encodeURIComponent(currentQr)}`;
    new QRCode(qrHolder,{text:targetUrl,width:1600,height:1600,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    await new Promise(r=>setTimeout(r,250));
    const qrCanvas=qrHolder.querySelector('canvas');const qrImg=qrHolder.querySelector('img');
    const qrSource=qrCanvas?qrCanvas.toDataURL('image/png'):(qrImg?.src||null);if(!qrSource)throw new Error('QR image could not be generated.');
    const qrImage=new Image();await new Promise((resolve,reject)=>{qrImage.onload=resolve;qrImage.onerror=()=>reject(new Error('QR image could not be loaded.'));qrImage.src=qrSource});
    const W=size.width,H=size.height,scale=W/2480;

    // Clean, print-first composition: generous margins, strong hierarchy, large readable type.
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
    const margin=125*scale;
    ctx.strokeStyle='#dbe5df';ctx.lineWidth=5*scale;roundRect(ctx,margin,margin,W-2*margin,H-2*margin,42*scale);ctx.stroke();

    // Header band
    ctx.fillStyle='#0d4734';roundRect(ctx,margin,margin,W-2*margin,470*scale,42*scale);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font=`800 ${112*scale}px Arial`;ctx.fillText('SCAN TO REVIEW',W/2,295*scale);
    ctx.font=`600 ${46*scale}px Arial`;ctx.fillText('Your feedback helps us serve you better',W/2,385*scale);

    // Business identity
    ctx.fillStyle='#0d4734';
    drawWrappedText(ctx,(currentBusiness.business_name||'Your Business').trim(),W/2,735*scale,2000*scale,92*scale,108*scale,2);
    ctx.fillStyle='#4b5563';ctx.font=`600 ${50*scale}px Arial`;ctx.fillText('We value your feedback',W/2,925*scale);

    // QR panel
    const qrSize=Math.min(1500*scale,W-500*scale),qrX=(W-qrSize)/2,qrY=1030*scale;
    ctx.shadowColor='rgba(0,0,0,.10)';ctx.shadowBlur=30*scale;ctx.shadowOffsetY=12*scale;
    ctx.fillStyle='#ffffff';roundRect(ctx,qrX-55*scale,qrY-55*scale,qrSize+110*scale,qrSize+110*scale,28*scale);ctx.fill();
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.drawImage(qrImage,qrX,qrY,qrSize,qrSize);

    // Instructions
    ctx.fillStyle='#111827';ctx.font=`800 ${54*scale}px Arial`;ctx.fillText('POINT YOUR PHONE CAMERA HERE',W/2,(1030+1500+145)*scale);
    ctx.fillStyle='#4b5563';ctx.font=`600 ${42*scale}px Arial`;ctx.fillText('Scan the QR code • Share your experience',W/2,(1030+1500+225)*scale);

    // Social/contact strip
    const links=getLinks(currentBusiness);
    if(links.length){
      const stripY=3000*scale,stripH=105*scale;
      ctx.fillStyle='#ecf7f1';roundRect(ctx,margin+85*scale,stripY,W-2*margin-170*scale,stripH,24*scale);ctx.fill();
      ctx.fillStyle='#0d4734';ctx.font=`700 ${35*scale}px Arial`;ctx.fillText(links.join('   •   '),W/2,stripY+69*scale);
    }

    // Footer branding
    ctx.fillStyle='#0d4734';ctx.font=`800 ${55*scale}px Arial`;ctx.fillText('WonderQR',W/2,H-315*scale);
    ctx.fillStyle='#6b7280';ctx.font=`500 ${30*scale}px Arial`;ctx.fillText(currentQr,W/2,H-250*scale);
    return canvas;
  }finally{qrHolder.remove();}
}

async function downloadLargePoster(){
  const btn=$('download-large-poster'),select=$('large-poster-size'),key=select?.value||'A4';
  if(btn)btn.disabled=true;
  try{
    const canvas=await makePosterCanvas(key);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('Unable to prepare the print file.');
    const a=document.createElement('a');a.download=`WonderQR-Poster-${currentQr}-${key}.png`;a.href=URL.createObjectURL(blob);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
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
