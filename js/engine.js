const libraryPromises = new Map();
export function loadScript(path) {
  if (!libraryPromises.has(path)) libraryPromises.set(path, new Promise((resolve,reject)=>{
    const script=document.createElement('script'); script.src=new URL(path,import.meta.url).href;
    script.onload=resolve;script.onerror=()=>{libraryPromises.delete(path);script.remove();reject(new Error('No se pudo cargar el motor. Recarga la página y vuelve a intentarlo.'));};document.head.append(script);
  }));
  return libraryPromises.get(path);
}
let pdfjsPromise;
export async function pdfjs() {
  pdfjsPromise??=import('../vendor/pdf.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdf.worker.mjs',import.meta.url).href;return lib;});
  return pdfjsPromise;
}
export async function openPreview(file) {
  const lib=await pdfjs();
  const task=lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),cMapUrl:new URL('../vendor/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('../vendor/standard_fonts/',import.meta.url).href,isEvalSupported:false});
  task.onPassword=()=>task.destroy();
  return task.promise;
}
export function parsePages(value,count,{duplicates=false}={}) {
  if(!Number.isInteger(count)||count<1) throw new Error('El documento no tiene páginas.');
  if(!value||value.trim()===''||value.trim().toLowerCase()==='todas') return Array.from({length:count},(_,i)=>i);
  const pages=[];
  for(const part of value.split(',')) {
    const match=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if(!match) throw new Error('Escribe páginas como 1, 3, 5-8.');
    const start=Number(match[1]),end=match[2]?Number(match[2]):start;
    if(start<1||start>count||end<1||end>count) throw new Error(`Las páginas deben estar entre 1 y ${count}.`);
    for(let n=start;;n+=start<=end?1:-1){pages.push(n-1);if(n===end)break;}
  }
  return duplicates?pages:[...new Set(pages)];
}
export function escapeHTML(text) {return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function number(value,min,max,label) {const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw new Error(`${label}: introduce un valor entre ${min} y ${max}.`);return n;}
function safeText(text) {return String(text).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');}
function textForFont(font,text) {
  try{font.encodeText(text);return text;}catch{throw new Error('El texto añadido contiene caracteres que esta fuente no admite. Usa caracteres latinos en esta herramienta.');}
}
export async function readPdf(file) {try{return await PDFLib.PDFDocument.load(await file.arrayBuffer());}catch(e){if(/encrypt/i.test(e.message))throw new Error('Este PDF está protegido. Abre una copia sin contraseña para continuar.');throw new Error('No se puede abrir este PDF. Comprueba que el archivo se pueda abrir.');}}
const output=(data,name,type='application/pdf',note='')=>({blob:data instanceof Blob?data:new Blob([data],{type}),name,note});
const baseName=file=>file.name.replace(/\.[^.]+$/,'').replace(/[<>:"/\\|?*]/g,'_');
const pdfOutput=async(doc,name,note='')=>output(await doc.save(),name,'application/pdf',note);

export async function pageCanvas(doc,index,scale=1.5) {
  const page=await doc.getPage(index+1);const initial=page.getViewport({scale});
  scale*=Math.min(1,Math.sqrt(8000000/(initial.width*initial.height)));
  const viewport=page.getViewport({scale});const canvas=document.createElement('canvas');
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'white'}).promise;
  page.cleanup();return canvas;
}
async function canvasBytes(canvas,type='image/jpeg',quality=.85) {const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,quality));if(!blob)throw new Error('No se pudo crear la imagen.');return new Uint8Array(await blob.arrayBuffer());}
export async function extractTextPages(file,progress=()=>{}) {
  const doc=await openPreview(file);const pages=[];
  try{for(let i=1;i<=doc.numPages;i++){
    const page=await doc.getPage(i);const content=await page.getTextContent();const lines=[];
    for(const item of content.items){if(!('str'in item)||!item.str.trim())continue;const y=item.transform[5];let line=lines.find(l=>Math.abs(l.y-y)<3);if(!line){line={y,items:[]};lines.push(line);}line.items.push({text:item.str,x:item.transform[4],width:item.width});}
    lines.sort((a,b)=>b.y-a.y);for(const line of lines)line.items.sort((a,b)=>a.x-b.x);
    pages.push({lines,text:lines.map(l=>l.items.map(i=>i.text).join(' ')).join('\n')});progress(Math.round(i/doc.numPages*75),`Leyendo página ${i} de ${doc.numPages}…`);page.cleanup();
  }}finally{await doc.destroy();}return pages;
}
async function textPdf(text) {
  const doc=await PDFLib.PDFDocument.create();const font=await doc.embedFont(PDFLib.StandardFonts.Helvetica);let page=doc.addPage(),y=790;
  const line=(value)=>{if(y<45){page=doc.addPage();y=790;}page.drawText(textForFont(font,value),{x:45,y,size:11,font});y-=16;};
  for(const paragraph of safeText(text).split('\n')){
    let buffer='';for(const word of paragraph.split(/\s+/)) {
      // Break long words too, so URLs cannot overflow the page.
      for(const part of word.match(/.{1,65}/gu)||['']){const next=buffer?`${buffer} ${part}`:part;if(font.widthOfTextAtSize(textForFont(font,next),11)>500&&buffer){line(buffer);buffer=part;}else buffer=next;}
    }line(buffer);
  }return doc;
}

export async function execute(id,files,options={},progress=()=>{}) {
  if(!files.length)throw new Error('Selecciona un archivo para continuar.');
  progress(4,'Preparando tus archivos…');
  const stem=baseName(files[0]);
  const {PDFDocument,StandardFonts,rgb,degrees}=PDFLib;
  if(id==='merge'||id==='workflow') {
    if(files.length<2&&id==='merge')throw new Error('Selecciona al menos dos PDF para unirlos.');
    const doc=await PDFDocument.create();
    for(let i=0;i<files.length;i++){const source=await readPdf(files[i]);for(const page of await doc.copyPages(source,source.getPageIndices()))doc.addPage(page);progress(10+(i+1)/files.length*65,`Uniendo ${i+1} de ${files.length}…`);}
    if(id==='workflow'){
      const angle=Number(options.rotation||0);const font=await doc.embedFont(StandardFonts.Helvetica);
      for(const [i,page] of doc.getPages().entries()){if(angle)page.setRotation(degrees((page.getRotation().angle+angle)%360));if(options.numbering)page.drawText(`${i+1} / ${doc.getPageCount()}`,{x:page.getWidth()/2-12,y:20,size:10,font,color:rgb(.3,.35,.45)});}
    }
    return pdfOutput(doc,id==='merge'?'NheuDocs-unido.pdf':'NheuDocs-flujo.pdf');
  }
  if(['jpg-pdf','scan'].includes(id)) {
    const doc=await PDFDocument.create();
    for(let i=0;i<files.length;i++) {
      const bitmap=await createImageBitmap(files[i]);const canvas=document.createElement('canvas');const scale=Math.min(1,3000/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const img=await doc.embedJpg(await canvasBytes(canvas));const landscape=options.orientation==='landscape';const page=doc.addPage(landscape?[842,595]:[595,842]);const margin=options.margin==='none'?0:28;const ratio=Math.min((page.getWidth()-2*margin)/img.width,(page.getHeight()-2*margin)/img.height);const w=img.width*ratio,h=img.height*ratio;page.drawImage(img,{x:(page.getWidth()-w)/2,y:(page.getHeight()-h)/2,width:w,height:h});canvas.width=canvas.height=1;progress((i+1)/files.length*90,`Añadiendo imagen ${i+1}…`);
    }return pdfOutput(doc,`${stem}.pdf`);
  }
  if(id==='html-pdf') {
    const parsed=new DOMParser().parseFromString(await files[0].text(),'text/html');parsed.querySelectorAll('script,style,noscript,iframe,object,svg').forEach(el=>el.remove());parsed.querySelectorAll('p,div,br,h1,h2,h3,li,tr').forEach(el=>el.append('\n'));
    return pdfOutput(await textPdf(parsed.body.textContent),`${stem}.pdf`,'Se ha convertido el texto. No se han ejecutado scripts ni cargado recursos externos.');
  }
  if(['pdf-word','pdf-excel','markdown','compare'].includes(id)) {
    const pages=await extractTextPages(files[0],progress);
    if(!pages.some(p=>p.text.trim()))throw new Error('Este PDF no contiene texto extraíble. Usa un PDF con texto seleccionable.');
    if(id==='markdown')return output(pages.map((p,i)=>`## Página ${i+1}\n\n${p.text}`).join('\n\n---\n\n'),`${stem}.md`,'text/markdown;charset=utf-8','Texto extraído por página. Revisa títulos, listas y tablas antes de reutilizarlo.');
    if(id==='pdf-word') {
      await loadScript('../vendor/docx.js');const {Document,Paragraph,TextRun,Packer}=window.docx;
      const sections=pages.map(p=>({children:p.text.split('\n').map(line=>new Paragraph({children:[new TextRun(safeText(line))],spacing:{after:100}}))}));
      return output(await Packer.toBlob(new Document({creator:'NheuDocs',sections})),`${stem}.docx`,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Word editable con el texto extraído. Las imágenes, tablas complejas y la maquetación original no se conservan.');
    }
    if(id==='pdf-excel') {
      await loadScript('../vendor/exceljs.min.js');const workbook=new ExcelJS.Workbook();workbook.creator='NheuDocs';
      pages.forEach((p,index)=>{const sheet=workbook.addWorksheet(`Página ${index+1}`);for(const line of p.lines){const cells=[];let buffer='',end=-Infinity;for(const item of line.items){if(item.x-end>18&&buffer){cells.push(buffer);buffer='';}buffer+=(buffer?' ':'')+item.text;end=item.x+item.width;}if(buffer)cells.push(buffer);sheet.addRow(cells);}sheet.columns.forEach(col=>{col.width=26;});});
      return output(await workbook.xlsx.writeBuffer(),`${stem}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Filas detectadas por posición. Revisa la separación en columnas y los tipos de datos.');
    }
    if(files.length!==2)throw new Error('Selecciona exactamente dos PDF para compararlos.');
    const other=await extractTextPages(files[1]);let changed=0;
    const rows=Array.from({length:Math.max(pages.length,other.length)},(_,i)=>{const a=pages[i]?.text||'',b=other[i]?.text||'';const same=a===b;if(!same)changed++;return `<tr class="${same?'same':'changed'}"><th>${i+1}<br>${same?'Sin cambios':'Cambios'}</th><td><pre>${escapeHTML(a||'Sin página')}</pre></td><td><pre>${escapeHTML(b||'Sin página')}</pre></td></tr>`;}).join('');
    return output(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Comparación · NheuDocs</title><style>body{font:14px system-ui;color:#20304b;padding:30px;background:#f5f7fb}table{border-collapse:collapse;width:100%;table-layout:fixed}td,th{border:1px solid #d7deef;padding:15px;vertical-align:top}th:first-child{width:80px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px system-ui}.changed{background:#fff4d9}h1{letter-spacing:-1px}</style><h1>Comparación de texto</h1><p>${changed} páginas con cambios. No se comparan imágenes ni diseño.</p><table><thead><tr><th>Página</th><th>${escapeHTML(files[0].name)}</th><th>${escapeHTML(files[1].name)}</th></tr></thead><tbody>${rows}</tbody></table></html>`,`${stem}-comparacion.html`,'text/html',`${changed} páginas con diferencias de texto.`);
  }
  if(['pdf-jpg','pdf-ppt','redact'].includes(id)||(id==='compress'&&options.quality!=='lossless')) {
    const preview=await openPreview(files[0]);
    try {
      const indices=id==='redact'?parsePages(options.pages,preview.numPages):Array.from({length:preview.numPages},(_,i)=>i);
      let zip,ppt,resultDoc;
      if(id==='pdf-jpg')zip=new JSZip();
      else if(id==='pdf-ppt'){await loadScript('../vendor/pptxgen.bundle.js');ppt=new PptxGenJS();ppt.author='NheuDocs';const first=await preview.getPage(1);const view=first.getViewport({scale:1});ppt.defineLayout({name:'PDF',width:view.width/72,height:view.height/72});ppt.layout='PDF';ppt._nheuSize={w:view.width/72,h:view.height/72};}
      else resultDoc=await PDFDocument.create();
      const selected=new Set(indices);
      for(let i=0;i<preview.numPages;i++){
        const scale=id==='compress'?(options.quality==='small'?.9:1.5):1.6;
        const canvas=await pageCanvas(preview,i,scale);
        if(id==='redact'&&selected.has(i)){
          const x=number(options.x,0,99,'X'),y=number(options.y,0,99,'Y'),w=number(options.width,1,100,'Ancho'),h=number(options.height,1,100,'Alto');
          if(x+w>100||y+h>100)throw new Error('La zona de censura debe quedar dentro de la página.');
          const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(Math.floor(canvas.width*x/100),Math.floor(canvas.height*y/100),Math.ceil(canvas.width*w/100),Math.ceil(canvas.height*h/100));
        }
        const quality=id==='compress'?(options.quality==='small'?.5:.75):.92;
        if(zip)zip.file(`${stem}-${String(i+1).padStart(3,'0')}.jpg`,await canvasBytes(canvas,'image/jpeg',quality));
        else if(ppt){const size=ppt._nheuSize;const ratio=Math.min(size.w/canvas.width,size.h/canvas.height);const w=canvas.width*ratio,h=canvas.height*ratio;const slide=ppt.addSlide();slide.addImage({data:canvas.toDataURL('image/jpeg',.92),x:(size.w-w)/2,y:(size.h-h)/2,w,h});}
        else {const page=await preview.getPage(i+1),v=page.getViewport({scale:1});const p=resultDoc.addPage([v.width,v.height]);const image=await resultDoc.embedJpg(await canvasBytes(canvas,'image/jpeg',quality));p.drawImage(image,{x:0,y:0,width:v.width,height:v.height});}
        canvas.width=canvas.height=1;progress((i+1)/preview.numPages*90,`Procesando página ${i+1} de ${preview.numPages}…`);
      }
      if(zip)return output(await zip.generateAsync({type:'blob'}),`${stem}-imagenes.zip`,'application/zip');
      if(ppt)return output(await ppt.write({outputType:'blob'}),`${stem}.pptx`,'application/vnd.openxmlformats-officedocument.presentationml.presentation','Cada diapositiva contiene una imagen. El texto no es editable.');
      const bytes=await resultDoc.save();
      if(id==='compress'&&bytes.length>=files[0].size)return output(files[0],`${stem}-original.pdf`,'application/pdf','La conversión no redujo el tamaño. Te devolvemos el original sin alteraciones.');
      return output(bytes,`${stem}-${id==='redact'?'censurado':'comprimido'}.pdf`,'application/pdf',id==='redact'?'La copia contiene únicamente imágenes con la zona borrada. Se eliminan texto, formularios, enlaces y metadatos originales.':`Tamaño reducido un ${Math.round((1-bytes.length/files[0].size)*100)} %. La copia está rasterizada; ya no contiene texto seleccionable ni formularios.`);
    }finally{await preview.destroy();}
  }
  const doc=await readPdf(files[0]);const count=doc.getPageCount();const indices=parsePages(options.pages,count,{duplicates:id==='organize'});
  if(['split','extract','organize','remove'].includes(id)) {
    if(id==='split'){
      const zip=new JSZip();const groups=options.groups?.trim()?options.groups.split(';').map(s=>{if(!s.trim())throw new Error('Hay un grupo vacío entre separadores.');return parsePages(s,count);}):doc.getPageIndices().map(i=>[i]);
      for(let i=0;i<groups.length;i++){const part=await PDFDocument.create();for(const p of await part.copyPages(doc,groups[i]))part.addPage(p);zip.file(`${stem}-${i+1}.pdf`,await part.save());progress((i+1)/groups.length*90,`Separando grupo ${i+1}…`);}return output(await zip.generateAsync({type:'blob'}),`${stem}-dividido.zip`,'application/zip');
    }
    const selection=id==='remove'?doc.getPageIndices().filter(i=>!indices.includes(i)):indices;
    if(!selection.length)throw new Error('El resultado debe conservar al menos una página.');
    const result=await PDFDocument.create();for(const p of await result.copyPages(doc,selection))result.addPage(p);return pdfOutput(result,`${stem}-${id}.pdf`);
  }
  if(id==='compress') {
    const bytes=await doc.save({useObjectStreams:true});const smaller=bytes.length<files[0].size;
    return output(smaller?bytes:files[0],`${stem}-${smaller?'optimizado':'original'}.pdf`,'application/pdf',smaller?`Tamaño reducido un ${Math.round((1-bytes.length/files[0].size)*100)} %.`:'Este archivo ya está optimizado. Te devolvemos el original sin aumentar su tamaño.');
  }
  const font=await doc.embedFont(StandardFonts.Helvetica);
  if(id==='forms'){
    const form=doc.getForm();
    for(const [name,value]of Object.entries(options.fields||{})){
      const field=form.getField(name);if(field.isReadOnly())continue;if(field.constructor.name==='PDFTextField')field.setText(textForFont(font,String(value)));else if(field.constructor.name==='PDFCheckBox')value?field.check():field.uncheck();else if(['PDFDropdown','PDFOptionList','PDFRadioGroup'].includes(field.constructor.name)){if(value)field.select(value);else field.clear();}
    }
    if(options.newField?.trim()){
      if(form.getFields().some(f=>f.getName()===options.newField.trim()))throw new Error('Ya existe un campo con ese nombre.');
      const page=doc.getPage(number(options.page||1,1,count,'Página')-1),f=form.createTextField(options.newField.trim());f.setText(textForFont(font,options.newValue||''));f.addToPage(page,{x:40,y:page.getHeight()-90,width:Math.min(220,page.getWidth()-80),height:30,font});
    }
    if(!Object.keys(options.fields||{}).length&&!options.newField?.trim())throw new Error('Introduce un nombre para crear el nuevo campo.');
    form.updateFieldAppearances(font);return pdfOutput(doc,`${stem}-formulario.pdf`);
  }
  let signature;if(id==='sign'){if(!options.signature)throw new Error('Dibuja tu firma antes de continuar.');signature=await doc.embedPng(options.signature);}
  for(const [position,index]of indices.entries()) {
    const page=doc.getPage(index),w=page.getWidth(),h=page.getHeight();
    if(id==='rotate'){const angle=Number(options.rotation||90);if(![90,180,270].includes(angle))throw new Error('Ángulo no válido.');page.setRotation(degrees((page.getRotation().angle+angle)%360));}
    if(id==='numbers'){const n=number(options.start||1,1,999999,'Número inicial');const label=`${position+n}`;const width=font.widthOfTextAtSize(label,11);page.drawText(label,{x:options.align==='left'?25:options.align==='right'?w-width-25:(w-width)/2,y:options.position==='top'?h-28:22,size:11,font,color:rgb(.3,.35,.45)});}
    if(id==='watermark'){
      if(!options.text?.trim())throw new Error('Escribe el texto de la marca de agua.');const text=textForFont(font,options.text.trim());const size=Math.min(44,w*.75/font.widthOfTextAtSize(text,1));const width=font.widthOfTextAtSize(text,size);page.drawText(text,{x:(w-width)/2,y:h*.45,size,font,rotate:degrees(25),opacity:number(options.opacity||.2,.05,1,'Opacidad'),color:rgb(.32,.39,.7)});
    }
    if(id==='crop'){const margin=number(options.margin,0,Math.min(w,h)/2-1,'Margen');const box=page.getCropBox();if(2*margin>=Math.min(box.width,box.height))throw new Error('El margen es demasiado grande.');page.setCropBox(box.x+margin,box.y+margin,box.width-2*margin,box.height-2*margin);}
    if(id==='edit'){
      if(!options.text?.trim())throw new Error('Escribe el texto que quieres añadir.');const size=number(options.size||18,6,90,'Tamaño');const x=number(options.x,0,95,'X')*w/100,y=h-number(options.y,0,95,'Y')*h/100-size;const text=textForFont(font,options.text.trim());if(font.widthOfTextAtSize(text,size)>w-x)throw new Error('El texto no cabe. Reduce el tamaño o cambia la posición.');page.drawText(text,{x,y,size,font,color:rgb(.12,.17,.27)});
    }
    if(id==='sign'){const width=Math.min(150,w*.4),height=width*signature.height/signature.width;const x=number(options.x||55,0,95,'X')*w/100,y=h-number(options.y||75,0,95,'Y')*h/100-height;if(x+width>w||y<0)throw new Error('La firma quedaría fuera de la página. Ajusta X e Y.');page.drawImage(signature,{x,y,width,height});}
    progress((position+1)/indices.length*90,`Actualizando página ${index+1}…`);
  }
  if(!['rotate','numbers','watermark','crop','edit','sign'].includes(id))throw new Error('Herramienta no disponible.');
  return pdfOutput(doc,`${stem}-${id}.pdf`);
}
