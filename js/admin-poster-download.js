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
  wrap.style='grid-column:1/-1;margin-top:6px;padding:14px 0 2px;border-top:1px solid #e5e7eb';
  wrap.innerHTML=`<div style="font-size:.86rem;font-weight:800;color:#0d4734;margin-bottom:8px">🖨️ Print-ready Poster</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px"><select id="large-poster-size" class="btn secondary" style="width:100%;appearance:auto;text-align:left"><option value="A4">A4 (8.27 × 11.69 in)</option><option value="A3">A3 (11.69 × 16.54 in)</option></select><button id="download-large-poster" class="btn primary" type="button" disabled>Download Poster</button></div><div class="hint">Premium print layout • 300 DPI PNG</div>`;
  actions.appendChild(wrap);
  $('download-large-poster')?.addEventListener('click',downloadLargePoster);
  return true;
}

function roundRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
function fitText(ctx,text,maxWidth,startSize,minSize,weight=800){let s=startSize;while(s>minSize){ctx.font=`${weight} ${s}px Arial`;if(ctx.measureText(text).width<=maxWidth)return s;s-=2}ctx.font=`${weight} ${minSize}px Arial`;return minSize}
function centerText(ctx,text,x,y,size,weight=700,color='#111827'){ctx.font=`${weight} ${size}px Arial`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(text,x,y)}

async function makePosterCanvas(sizeKey){
  if(!currentBusiness||!currentQr)throw new Error('Business QR is not ready yet.');
  if(typeof QRCode==='undefined')throw new Error('QR generator library is not available.');
  const size=posterSizes[sizeKey]||posterSizes.A4;
  const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Unable to prepare poster.');
  const qrHolder=document.createElement('div');
  qrHolder.style.cssText='position:absolute;left:-99999px;top:-99999px;width:1800px;height:1800px;overflow:hidden';document.body.appendChild(qrHolder);
  try{
    const targetUrl=`https://jelloblue.github.io/wonderqr/?qr=${encodeURIComponent(currentQr)}`;
    new QRCode(qrHolder,{text:targetUrl,width:1800,height:1800,colorDark:'#111111',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.H});
    await new Promise(r=>setTimeout(r,250));
    const qrCanvas=qrHolder.querySelector('canvas');const qrImg=qrHolder.querySelector('img');
    const qrSource=qrCanvas?qrCanvas.toDataURL('image/png'):(qrImg?.src||null);if(!qrSource)throw new Error('QR image could not be generated.');
    const qrImage=new Image();await new Promise((resolve,reject)=>{qrImage.onload=resolve;qrImage.onerror=()=>reject(new Error('QR image could not be loaded.'));qrImage.src=qrSource});

    const W=size.width,H=size.height,scale=W/2480;
    const S=n=>n*scale;
    const M=S(145);
    const dark='#10231c',green='#0d4734',light='#f3f8f5',muted='#66736d',gold='#c69a45';

    // Premium editorial layout: restrained colour, oversized typography, QR as the hero.
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
    ctx.fillStyle=dark;ctx.fillRect(0,0,W,S(360));
    ctx.fillStyle=green;ctx.fillRect(0,S(360),W,S(24));

    // Small brand mark
    centerText(ctx,'WONDERQR',W/2,S(145),S(42),800,'#ffffff');
    centerText(ctx,'A SIMPLE WAY TO HEAR FROM YOUR CUSTOMERS',W/2,S(245),S(28),600,'#d9e7e0');

    // Main headline
    centerText(ctx,'HOW WAS YOUR EXPERIENCE?',W/2,S(610),S(78),800,dark);
    centerText(ctx,'Tell us in a few seconds.',W/2,S(705),S(43),500,muted);

    // Business name gets the strongest local identity after the headline.
    const name=String(currentBusiness.business_name||'YOUR BUSINESS').trim();
    ctx.font='800 92px Arial';
    const nameSize=fitText(ctx,name,W-S(330),S(92),S(48),800);
    centerText(ctx,name.toUpperCase(),W/2,S(850),nameSize,800,green);

    // Star / rating cue, without promising any particular outcome.
    centerText(ctx,'★  ★  ★  ★  ★',W/2,S(985),S(68),700,gold);
    centerText(ctx,'Your honest feedback helps us improve.',W/2,S(1065),S(34),500,muted);

    // Hero QR card
    const qrSize=S(1390),qrX=(W-qrSize)/2,qrY=S(1185),cardPad=S(58);
    ctx.shadowColor='rgba(16,35,28,.13)';ctx.shadowBlur=S(42);ctx.shadowOffsetY=S(16);
    ctx.fillStyle='#ffffff';roundRect(ctx,qrX-cardPad,qrY-cardPad,qrSize+cardPad*2,qrSize+cardPad*2,S(38));ctx.fill();
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.drawImage(qrImage,qrX,qrY,qrSize,qrSize);

    // Strong scan instruction directly below QR.
    ctx.fillStyle=green;roundRect(ctx,M,S(2705),W-M*2,S(180),S(34));ctx.fill();
    centerText(ctx,'SCAN • RATE • SHARE',W/2,S(2818),S(56),800,'#ffffff');
    centerText(ctx,'Open your phone camera and scan the QR code above.',W/2,S(2948),S(31),500,muted);

    // Minimal footer, intentionally uncluttered for real-world printing.
    ctx.strokeStyle='#dfe8e3';ctx.lineWidth=S(3);ctx.beginPath();ctx.moveTo(M,S(3115));ctx.lineTo(W-M,S(3115));ctx.stroke();
    centerText(ctx,'Thank you for visiting us',W/2,S(3230),S(39),600,dark);
    centerText(ctx,'WonderQR  •  '+currentQr,W/2,S(3305),S(25),500,muted);
    return canvas;
  }finally{qrHolder.remove()}
}

async function downloadLargePoster(){
  const btn=$('download-large-poster'),select=$('large-poster-size'),key=select?.value||'A4';
  if(btn)btn.disabled=true;
  try{
    const canvas=await makePosterCanvas(key);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('Unable to prepare the print file.');
    const a=document.createElement('a');a.download=`WonderQR-Poster-${currentQr}-${key}.png`;a.href=URL.createObjectURL(blob);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }catch(e){console.error(e);alert(e.message||'Unable to download the poster.')}
  finally{if(btn)btn.disabled=false}
}

function ready(b){
  currentBusiness=b||currentBusiness;
  currentQr=$('stat-qr')?.textContent?.trim()||currentQr;
  if(!injectPosterControls())setTimeout(()=>injectPosterControls(),300);
  const btn=$('download-large-poster');if(btn)btn.disabled=!(currentBusiness&&currentQr&&currentQr!=='—');
}
window.addEventListener('wonderqr:admin-ready',e=>ready(e.detail?.business));
ready(null);
