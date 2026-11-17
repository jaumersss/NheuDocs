import {GIFEncoder,quantize,applyPalette} from '../vendor/gifenc.js';
import {metaProfile,tagMetaVideo} from './meta-profile.js';
const MAX_PIXELS=24000000;
export function boundedDimensions(w,h){w=Math.round(w);h=Math.round(h);if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1||w>16000||h>16000||w*h>MAX_PIXELS)throw new Error('La imagen debe tener entre 1 y 16.000 píxeles por lado y un máximo de 24 megapíxeles.');return [w,h];}
function canvas(w,h){const c=document.createElement('canvas');[c.width,c.height]=boundedDimensions(w,h);return c;}
export async function loadImage(file){
 const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();boundedDimensions(image.naturalWidth,image.naturalHeight);return image;}catch(e){throw new Error('No se pudo abrir la imagen. Usa un archivo compatible de hasta 24 megapíxeles.');}finally{URL.revokeObjectURL(url);}
}
const num=(o,k,f,min=0,max=100)=>{const n=Number(o[k]??f);if(!Number.isFinite(n)||n<min||n>max)throw new Error(`Valor no válido: ${k} (${min}–${max}).`);return n;};
function blobOf(c,format='png',quality=.9){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('No se pudo exportar la imagen.')),`image/${format}`,quality));}
export async function dataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('No se pudo leer el archivo.'));r.readAsDataURL(file);});}
function fromDataURL(data){const binary=atob(data.split(',')[1]);return new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))],{type:'image/jpeg'});}
export async function readMetadata(file){const exif=globalThis.piexif.load(await dataURL(file));return {exif,author:exif['0th'][315]||'',description:exif['0th'][270]||'',copyright:exif['0th'][33432]||'',date:exif.Exif[36867]||exif['0th'][306]||'',gps:Object.keys(exif.GPS||{}).length>0};}
// Remove metadata application segments while retaining JFIF/ICC rendering information and compressed pixels.
export function stripJpegMetadata(bytes){
 if(bytes[0]!==255||bytes[1]!==216)throw new Error('No es un JPEG válido.');
 const parts=[bytes.slice(0,2)];let p=2;
 while(p<bytes.length){
  const start=p;if(bytes[p++]!==255)throw new Error('JPEG dañado.');while(bytes[p]===255)p++;const marker=bytes[p++];
  if(marker===218||marker===217){parts.push(bytes.slice(start));return new Blob(parts,{type:'image/jpeg'});}
  if(p+2>bytes.length)throw new Error('JPEG incompleto.');const len=bytes[p]*256+bytes[p+1];if(len<2||p+len>bytes.length)throw new Error('JPEG incompleto.');
  const icc=marker===226&&new TextDecoder().decode(bytes.slice(p+2,p+14))==='ICC_PROFILE\0';
  if(!((marker>=225&&marker<=239&&!icc)||marker===254))parts.push(bytes.slice(start,p+len));p+=len;
 }
 throw new Error('JPEG incompleto.');
}
async function metadata(file,o){
 let data=await dataURL(file),e;
 if(o.removeOther){data=await dataURL(stripJpegMetadata(new Uint8Array(await file.arrayBuffer())));e={'0th':{},Exif:{},GPS:{},'1st':{},thumbnail:null};}else e=globalThis.piexif.load(data);
 for(const [key,tag] of [['author',315],['description',270],['copyright',33432]]){
  if(o[key]){if(/[^\x20-\x7e\xa0-\xff]/.test(o[key]))throw new Error('Los campos EXIF admiten caracteres latinos; elimina emojis u otros alfabetos.');e['0th'][tag]=o[key];}else delete e['0th'][tag];
 }
 if(o.date&&!/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(o.date))throw new Error('Usa la fecha AAAA:MM:DD HH:MM:SS.');
 if(o.date){e.Exif[36867]=o.date;e['0th'][306]=o.date;}else {delete e.Exif[36867];delete e['0th'][306];}
 if(o.removeGPS)e.GPS={};return fromDataURL(globalThis.piexif.insert(globalThis.piexif.dump(e),data));
}
function zone(o,w,h){const x=Math.round(num(o,'x',10)*w/100),y=Math.round(num(o,'y',10)*h/100),sw=Math.round(num(o,'width',50,1)*w/100),sh=Math.round(num(o,'height',50,1)*h/100);if(sw<1||sh<1||x+sw>w||y+sh>h)throw new Error('La zona debe quedar dentro de la imagen. Ajusta su posición y tamaño.');return [x,y,sw,sh];}
function drawText(ctx,text,x,y,size,width,align='center',outline=false){ctx.font=`700 ${size}px Arial`;ctx.textAlign=align;ctx.textBaseline='middle';if(outline){ctx.strokeStyle='#000';ctx.lineWidth=Math.max(2,size/12);ctx.strokeText(text,x,y,width);}ctx.fillText(text,x,y,width);}
async function gifBlob(canvases,delay){const gif=GIFEncoder();for(const c of canvases){const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data,palette=quantize(data,256);gif.writeFrame(applyPalette(data,palette),c.width,c.height,{palette,delay,repeat:0});await new Promise(r=>setTimeout(r,0));}gif.finish();return new Blob([gif.bytes()],{type:'image/gif'});}
async function htmlImage(file,o){
 const parsed=new DOMParser().parseFromString(await file.text(),'text/html');
 const allowed=new Set(['P','DIV','SPAN','H1','H2','H3','H4','H5','H6','B','STRONG','I','EM','U','BR','HR','UL','OL','LI','TABLE','THEAD','TBODY','TR','TD','TH','PRE','CODE','BLOCKQUOTE']);
 function clean(node){if(node.nodeType===3)return document.createTextNode(node.textContent);if(node.nodeType!==1||['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','LINK','META'].includes(node.tagName))return document.createTextNode('');const el=document.createElement(allowed.has(node.tagName)?node.tagName.toLowerCase():'span');for(const prop of ['color','background-color','font-size','font-weight','text-align','padding','margin','border','border-collapse']){const v=node.style?.getPropertyValue(prop);if(v&&!/url|var\(/i.test(v))el.style.setProperty(prop,v);}for(const child of node.childNodes)el.append(clean(child));return el;}
 const host=document.createElement('div');host.style.cssText=`box-sizing:border-box;position:absolute;left:-20000px;top:0;width:${num(o,'htmlWidth',1200,320,2400)}px;background:white;color:#202d49;padding:32px;overflow:hidden;max-height:10000px;`;
 for(const child of parsed.body.childNodes)host.append(clean(child));document.body.append(host);
 try{boundedDimensions(host.offsetWidth,host.offsetHeight);return await globalThis.html2canvas(host,{backgroundColor:'#ffffff',scale:1,logging:false});}finally{host.remove();}
}
export async function renderImage(id,file,o={}){
 if(id==='img-html')return htmlImage(file,o);
 const im=await loadImage(file),w=im.naturalWidth,h=im.naturalHeight;let outW=w,outH=h,rect=[0,0,w,h];
 if(id==='img-resize'){const value=num(o,'size',50,1,16000),ratio=o.resizeMode==='pixels'?value/w:value/100;outW=w*ratio;outH=h*ratio;}
 if(id==='img-upscale'){const scale=num(o,'scale',2,2,4);outW=w*scale;outH=h*scale;}
 if(id==='img-crop'){rect=zone(o,w,h);outW=rect[2];outH=rect[3];}
 const rotation=id==='img-rotate'?num(o,'rotation',90,0,270):0;if(rotation%90!==0)throw new Error('El giro debe ser múltiplo de 90°.');if(rotation===90||rotation===270)[outW,outH]=[outH,outW];
 const c=canvas(outW,outH),ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingQuality='high';
 if(id==='img-jpg'||o.format==='jpeg'||o.format==='gif'){ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);}
 ctx.save();
 if(id==='img-edit')ctx.filter=`brightness(${num(o,'brightness',100,0,200)}%) contrast(${num(o,'contrast',100,0,200)}%) saturate(${num(o,'saturation',100,0,200)}%)`;
 if(id==='img-rotate'){ctx.translate(c.width/2,c.height/2);ctx.rotate(rotation*Math.PI/180);ctx.scale(o.flip==='horizontal'?-1:1,o.flip==='vertical'?-1:1);ctx.drawImage(im,-w/2,-h/2);}
 else ctx.drawImage(im,...rect,0,0,c.width,c.height);ctx.restore();
 if(id==='img-background'){const color=o.background||'#ffffff',rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),t=num(o,'tolerance',35,0,255);const pixels=ctx.getImageData(0,0,c.width,c.height);for(let i=0;i<pixels.data.length;i+=4){if(Math.max(...rgb.map((v,j)=>Math.abs(v-pixels.data[i+j])))<=t)pixels.data[i+3]=0;}ctx.putImageData(pixels,0,0);}
 if(id==='img-pixelate'){const [x,y,rw,rh]=zone(o,w,h),block=num(o,'block',18,4,100),small=canvas(Math.max(1,Math.ceil(rw/block)),Math.max(1,Math.ceil(rh/block)));small.getContext('2d').drawImage(c,x,y,rw,rh,0,0,small.width,small.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(small,0,0,small.width,small.height,x,y,rw,rh);}
 if(id==='img-edit'&&o.text){ctx.fillStyle=o.color||'#fff';drawText(ctx,o.text,c.width/2,c.height*.85,num(o,'fontSize',40,8,500),c.width*.9);}
 if(id==='img-watermark'){
  if(!o.text&&!o.logo)throw new Error('Escribe un texto o selecciona un logo.');ctx.globalAlpha=num(o,'opacity',50,1)/100;ctx.fillStyle=o.color||'#fff';const center=o.position==='center',top=o.position==='top',pad=Math.max(8,c.width*.04);
  if(o.logo){const logo=await loadImage(o.logo),lw=c.width*.25,lh=lw*logo.naturalHeight/logo.naturalWidth;ctx.drawImage(logo,center?(c.width-lw)/2:top?pad:c.width-lw-pad,center?(c.height-lh)/2:top?pad:c.height-lh-pad,lw,lh);}
  if(o.text)drawText(ctx,o.text,center?c.width/2:top?pad:c.width-pad,center?c.height/2:top?pad+num(o,'fontSize',40,8,500)/2:c.height-pad-num(o,'fontSize',40,8,500)/2,num(o,'fontSize',40,8,500),c.width-2*pad,center?'center':top?'left':'right');
 }
 if(id==='img-meme'){if(!o.top&&!o.bottom)throw new Error('Escribe al menos un texto.');ctx.fillStyle='#fff';const size=Math.max(14,c.width/12);drawText(ctx,(o.top||'').toUpperCase(),c.width/2,size*.8,size,c.width*.92,'center',true);drawText(ctx,(o.bottom||'').toUpperCase(),c.width/2,c.height-size*.8,size,c.width*.92,'center',true);}
 return c;
}
export async function executeImage(id,files,o,progress=()=>{}){
 if(id==='img-gif'){
  const first=await loadImage(files[0]),width=num(o,'gifWidth',640,32,1600),height=Math.round(width*first.naturalHeight/first.naturalWidth);if(width*height*files.length>48000000)throw new Error('El GIF es demasiado grande. Reduce el ancho o el número de fotos.');
  const frames=[];for(const file of files){const im=await loadImage(file),c=canvas(width,height),ctx=c.getContext('2d'),scale=Math.min(width/im.naturalWidth,height/im.naturalHeight);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(im,(width-im.naturalWidth*scale)/2,(height-im.naturalHeight*scale)/2,im.naturalWidth*scale,im.naturalHeight*scale);frames.push(c);progress(frames.length/files.length*80,'Preparando animación…');}return {blob:await gifBlob(frames,num(o,'delay',500,40,10000)),name:'nheu-animacion.gif'};
 }
 const results=[];
 for(let i=0;i<files.length;i++){
  const file=files[i];progress(i/files.length*95,`Procesando ${i+1} de ${files.length}…`);let blob,ext='png',note='';
  if(id==='img-meta'){
   if(/\.(mp4|mov)$/i.test(file.name)){blob=await tagMetaVideo(file);ext=/\.mov$/i.test(file.name)?'mov':'mp4';}
   else{
    let jpeg;
    if(/\.jpe?g$/i.test(file.name)&&o.framing!=='portrait')jpeg=(await dataURL(file)).replace(/^data:[^;]*;/,'data:image/jpeg;');
    else{
     let c;
     if(o.framing==='portrait'){const im=await loadImage(file);c=canvas(3024,4032);const ctx=c.getContext('2d'),ratio=Math.max(c.width/im.naturalWidth,c.height/im.naturalHeight);ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingQuality='high';ctx.drawImage(im,(c.width-im.naturalWidth*ratio)/2,(c.height-im.naturalHeight*ratio)/2,im.naturalWidth*ratio,im.naturalHeight*ratio);}
     else c=await renderImage('img-jpg',file,{});
     jpeg=c.toDataURL('image/jpeg',.95);
    }
    const p=globalThis.piexif,e=p.load(jpeg);e['0th'][p.ImageIFD.Make]=metaProfile.make;e['0th'][p.ImageIFD.Model]=metaProfile.model;e['0th'][p.ImageIFD.Software]=metaProfile.software;e.Exif[p.ExifIFD.UserComment]='ASCII\0\0\0'+metaProfile.comment;
    blob=fromDataURL(p.insert(p.dump(e),jpeg));ext='jpg';
   }
   note='Perfil de metadatos aplicado. La etiqueta en redes sociales depende de cada plataforma.';
  }
  else if(id==='img-metadata'){blob=await metadata(file,o);ext='jpg';}
  else if(id==='img-clean'&&/\.jpe?g$/i.test(file.name)){blob=stripJpegMetadata(new Uint8Array(await file.arrayBuffer()));ext='jpg';}
  else{
   const c=await renderImage(id,file,o);const format=id==='img-jpg'?'jpeg':o.format||'png';
   if(format==='gif')blob=await gifBlob([c],500);else blob=await blobOf(c,format,num(o,'quality',90,10)/100);
   ext=blob.type==='image/jpeg'?'jpg':blob.type.split('/')[1];
   if(id==='img-compress'&&blob.size>=file.size){blob=file;ext=file.name.split('.').pop();note='El original ya pesa menos: se conserva sin cambios.';}
  }
  results.push({blob,name:`${String(i+1).padStart(2,'0')}-${file.name.replace(/\.[^.]+$/,'')}-${id.slice(4)}.${ext}`,note});await new Promise(r=>setTimeout(r,0));
 }
 if(results.length===1)return results[0];const zip=new globalThis.JSZip();for(const r of results)zip.file(r.name,r.blob);return {blob:await zip.generateAsync({type:'blob'}),name:'nheu-imagenes.zip',note:results.some(r=>r.note)?'Se han conservado los originales que ya tenían un tamaño menor.':''};
}
