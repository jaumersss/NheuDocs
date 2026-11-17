// Local metadata profiles. These are editable device labels, not camera authentication.
export const metaProfile={make:'Meta AI',model:'Ray-Ban Meta Smart Glasses',software:'Meta View',comment:'app=Meta View&device=Ray-Ban Meta Smart Glasses'};
const encode=text=>new TextEncoder().encode(text);
function join(parts){const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;}
export function box(type,...parts){const data=join(parts),out=new Uint8Array(data.length+8);if(out.length>0xffffffff)throw new Error('Bloque de metadatos demasiado grande.');new DataView(out.buffer).setUint32(0,out.length);for(let i=0;i<4;i++)out[4+i]=type.charCodeAt(i);out.set(data,8);return out;}
export function parseBoxes(data,start=0,end=data.length){
 const view=new DataView(data.buffer,data.byteOffset,data.byteLength),list=[];let at=start;
 while(at<end){if(at+8>end)throw new Error('El vídeo contiene un bloque incompleto.');let size=view.getUint32(at),header=8;const type=String.fromCharCode(...data.subarray(at+4,at+8));
  if(size===1){if(at+16>end)throw new Error('Cabecera de vídeo incompleta.');size=Number(view.getBigUint64(at+8));header=16;}else if(!size)size=end-at;
  if(!Number.isSafeInteger(size)||size<header||at+size>end)throw new Error('Estructura MP4/MOV no válida.');list.push({type,start:at,end:at+size,header});at+=size;
 }return list;
}
function makeVideoMetadata(){
 const fields=[['com.apple.quicktime.make',metaProfile.make],['com.apple.quicktime.model',metaProfile.model],['com.apple.quicktime.software',metaProfile.software],['com.apple.quicktime.comment',metaProfile.comment]];
 const handler=new Uint8Array(25);handler.set(encode('mdta'),8);
 const keyHeader=new Uint8Array(8);new DataView(keyHeader.buffer).setUint32(4,fields.length);
 const keys=box('keys',keyHeader,...fields.map(([key])=>box('mdta',encode(key))));
 const items=fields.map(([,text],i)=>{const prefix=new Uint8Array(8);new DataView(prefix.buffer).setUint32(0,1);const item=box('\0\0\0\0',box('data',prefix,encode(text)));new DataView(item.buffer).setUint32(4,i+1);return item;});
 // ISO BMFF full-box meta with mdta key/value entries.
 return box('meta',new Uint8Array(4),box('hdlr',handler),keys,box('ilst',...items));
}
export async function tagMetaVideo(file){
 // Inspect only atom headers and moov; retain compressed media as Blob slices.
 const top=[];let at=0;
 while(at<file.size){const data=new Uint8Array(await file.slice(at,at+16).arrayBuffer());if(data.length<8)throw new Error('Archivo MP4/MOV incompleto.');const view=new DataView(data.buffer);let size=view.getUint32(0),header=8;if(size===1){if(data.length<16)throw new Error('Cabecera incompleta.');size=Number(view.getBigUint64(8));header=16;}else if(!size)size=file.size-at;
  if(!Number.isSafeInteger(size)||size<header||at+size>file.size)throw new Error('Estructura MP4/MOV no válida.');top.push({type:String.fromCharCode(...data.subarray(4,8)),start:at,end:at+size,header,open:view.getUint32(0)===0});at+=size;
 }
 const moovs=top.filter(b=>b.type==='moov');
 if(moovs.length!==1||!top.some(b=>b.type==='mdat'))throw new Error('Selecciona un MP4 o MOV válido con vídeo.');
 const moov=moovs[0],data=new Uint8Array(await file.slice(moov.start,moov.end).arrayBuffer()),children=parseBoxes(data,moov.header);
 if(top.some(b=>b.type==='moof'||b.type==='mfra')||children.some(b=>b.type==='mvex'))throw new Error('Este vídeo usa MP4 fragmentado. Expórtalo primero como MP4 estándar.');
 const preserved=children.filter(b=>b.type!=='meta').map(b=>data.subarray(b.start,b.end));
 const updated=box('moov',...preserved,makeVideoMetadata());
 const pieces=[];
 for(const node of top){
  if(node===moov){
   // Keep byte offsets unchanged: turn the former moov into a same-size free box.
   const head=new Uint8Array(node.header),v=new DataView(head.buffer);if(node.end-node.start>0xffffffff){v.setUint32(0,1);v.setBigUint64(8,BigInt(node.end-node.start));}else v.setUint32(0,node.end-node.start);head.set(encode('free'),4);
   pieces.push(head,file.slice(node.start+node.header,node.end));
  }else if(node.open){const size=node.end-node.start;if(size>0xffffffff)throw new Error('Este vídeo tiene un bloque abierto de más de 4 GB. Reexpórtalo como MP4 estándar.');const head=new Uint8Array(await file.slice(node.start,node.start+8).arrayBuffer());new DataView(head.buffer).setUint32(0,size);pieces.push(head,file.slice(node.start+8,node.end));}
  else pieces.push(file.slice(node.start,node.end));
 }
 const mov=/\.mov$/i.test(file.name);return new Blob([...pieces,updated],{type:mov?'video/quicktime':'video/mp4'});
}
