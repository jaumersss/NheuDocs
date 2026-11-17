import {tools as documentTools,categories,icon,toolArtwork} from './catalog.js';
import {execute,readPdf,openPreview,pageCanvas,escapeHTML} from './engine.js';
import {mediaTools,mediaAccept,mediaNotes,mediaOptions} from './media-catalog.js';
import {executeImage,renderImage,loadImage,readMetadata} from './image-engine.js';
import {executeZip} from './zip-engine.js';
const tools=[...documentTools,...mediaTools];
const params=new URLSearchParams(location.search);
const requestedTool=params.get('tool')||location.hash.slice(1);
let mode=tools.find(t=>t.id===requestedTool)?.mode||(['img','zip'].includes(params.get('mode'))?params.get('mode'):'docs');
let product;
const $=selector=>document.querySelector(selector);
const state={category:'all',query:'',tool:null,files:[],busy:false,generation:0,result:null,signature:false,pageOrder:[]};
function updateProduct(nextMode){
mode=nextMode;
product=mode==='img'?'Nheu IMG':mode==='zip'?'ZipFusion':'NheuDocs';
document.querySelectorAll('[data-mode]').forEach(a=>{a.classList.toggle('active',a.dataset.mode===mode);if(a.dataset.mode===mode)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
document.querySelector('[data-mode="img"]').textContent='IMG';
$('.brand > span').innerHTML=mode==='zip'?'Zip<span class="brand-light">Fusion</span>':`Nheu<span class="brand-light">${mode==='img'?'IMG':'Docs'}</span>`;
$('.brand').href=$('#catalog-link').href=`?mode=${mode}`;$('.brand').setAttribute('aria-label',`${product}, inicio`);
$('#tools').setAttribute('aria-label',`Herramientas ${product}`);$('footer > span').textContent='© 2026 Nheu · Docs, IMG & ZipFusion';document.title=`${product} — Tus archivos, sin complicaciones.`;
document.documentElement.dataset.product=mode;
const productLogo=`./assets/logo${mode==='docs'?'':'-'+mode}.svg`;
$('.brand img').src=productLogo;$('link[rel=icon]').href=productLogo;
}
updateProduct(mode);
for(const suffix of ['', '-img', '-zip']){const img=new Image();img.src=`./assets/logo${suffix}.svg`;}
const workspace=$('#workspace');let resultURL=null;let toastTimer;
function hydrate(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4000);}
function readSetting(key,fallback){try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
function writeSetting(key,value){try{localStorage.setItem(key,value);}catch{}}
function setTheme(theme){document.documentElement.dataset.theme=theme;$('#theme').innerHTML=icon(theme==='dark'?'sun':'moon');$('#theme').setAttribute('aria-label',theme==='dark'?'Activar modo claro':'Activar modo oscuro');writeSetting('nheudocs-theme',theme);}
setTheme(readSetting('nheudocs-theme','light'));$('#theme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
function normalize(text){return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function renderCatalog(){
  const catalog=tools.filter(t=>(t.mode||'docs')===mode);
  const availableCategories=categories.filter(([id])=>id==='all'||catalog.some(t=>t.category===id));
  $('#filters').innerHTML=availableCategories.map(([id,label])=>`<button class="filter ${id===state.category?'active':''}" data-category="${id}" aria-pressed="${id===state.category}">${label}${id==='all'?'<span>'+catalog.length+'</span>':''}</button>`).join('');
  const visible=catalog.filter(t=>(state.category==='all'||t.category===state.category)&&normalize(`${t.name} ${t.description}`).includes(normalize(state.query)));
  $('#tool-grid').innerHTML=visible.map(tool=>`<a class="tool-card" href="?tool=${tool.id}">${toolArtwork(tool)}<span class="card-arrow" aria-hidden="true">→</span><h3>${tool.name}</h3><p>${tool.description}</p></a>`).join('');
  $('#result-count').textContent=`${visible.length} herramientas`;
  $('#empty').hidden=visible.length!==0;
}
$('#filters').onclick=event=>{const button=event.target.closest('[data-category]');if(button){state.category=button.dataset.category;renderCatalog();}};
$('#search').oninput=event=>{state.query=event.target.value;renderCatalog();};
$('#clear-search').onclick=()=>{state.query='';state.category='all';$('#search').value='';renderCatalog();};
document.addEventListener('keydown',event=>{if(event.key==='/'&&workspace.hidden&&!$('#info-dialog').open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}});
function showInfo(html){$('#info-content').innerHTML=html;$('#info-dialog').showModal();}
$('#tool-help').onclick=()=>{
  const tool=state.tool;if(!tool)return;
  const explanation=tool.id==='zip-fuse'
    ? '<p>Combina una imagen y un ZIP en un solo archivo. El resultado se sigue viendo como una foto, pero también contiene los archivos del ZIP.</p><ol><li>Arrastra una imagen JPG o PNG al recuadro superior.</li><li>Arrastra el ZIP que quieres guardar al recuadro inferior.</li><li>Añade una contraseña si quieres proteger el contenido y pulsa «Procesar archivos».</li><li>Descarga la imagen fusionada. Para recuperar su contenido, usa «Extraer de una imagen» en ZipFusion.</li></ol><p>Conserva el archivo descargado original: editarlo, recomprimirlo o enviarlo por servicios que comprimen fotos puede eliminar el ZIP. Para compartirlo, envíalo como archivo o documento.</p>'
    : `<p>${escapeHTML(tool.description)}</p><p>Selecciona o arrastra ${multiFor(tool.id)?'los archivos':'un archivo'} compatible${multiFor(tool.id)?'s':''}, ajusta las opciones disponibles y pulsa «Procesar archivos». Cuando termine, descarga el resultado.</p>${notes[tool.id]||mediaNotes[tool.id]?`<p>${escapeHTML(notes[tool.id]||mediaNotes[tool.id])}</p>`:''}`;
  showInfo(`<h2>${escapeHTML(tool.name)}</h2>${explanation}<p class="help-local">Los archivos se procesan en tu dispositivo, sin límite fijo de peso. La capacidad depende de la memoria disponible y del navegador; los archivos muy grandes pueden agotar la memoria de la pestaña.</p>`);
};
$('#privacy').onclick=()=>showInfo('<h2>Privacidad</h2><p>Los documentos, imágenes y archivos ZIP se procesan en tu navegador. En este dispositivo se guardan tu preferencia de tema, la configuración del flujo y los archivos que descargues.</p>');
$('.close-info').onclick=()=>$('#info-dialog').close();
$('#info-dialog').addEventListener('click',event=>{if(event.target===$('#info-dialog')){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)event.target.close();}});
function clearResult(){if(resultURL){URL.revokeObjectURL(resultURL);resultURL=null;}state.result=null;$('#result').replaceChildren();$('#result').hidden=true;$('#error').hidden=true;$('#progress').hidden=true;}
function resetWorkspace(){state.generation++;state.files=[];state.signature=false;state.pageOrder=[];clearResult();if($('#file-input'))$('#file-input').value='';if($('#file-list'))$('#file-list').replaceChildren();$('#options').replaceChildren();$('.page-thumbs')?.remove();$('#page-order')?.remove();clearFileDrag();}
function showCatalog(nextMode,{updateHistory=true}={}){
  if(state.busy){toast('Espera a que termine el procesamiento para cambiar de herramienta.');return;}
  resetWorkspace();state.tool=null;state.category='all';state.query='';$('#search').value='';
  updateProduct(nextMode);workspace.hidden=true;workspace.classList.remove('has-files','fuse-page');
  $('#workspace-controls').hidden=true;$('#tools').hidden=false;$('.search').hidden=false;$('#catalog-link').hidden=true;document.body.classList.remove('tool-page');
  if($('#info-dialog').open)$('#info-dialog').close();
  renderCatalog();if(updateHistory)history.pushState(null,'',`?mode=${mode}`);window.scrollTo(0,0);
}
document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('a[data-mode],a.brand,#catalog-link,a.tool-card');if(!link)return;
  event.preventDefault();if(state.busy){toast('Espera a que termine el procesamiento para cambiar de herramienta.');return;}
  const target=new URL(link.href,location.href),id=target.searchParams.get('tool');
  if(id)openTool(id);else showCatalog(target.searchParams.get('mode')||mode);
});
window.addEventListener('popstate',()=>{
  if(state.busy){history.pushState(null,'',state.tool?`?tool=${state.tool.id}`:`?mode=${mode}`);toast('Espera a que termine el procesamiento para cambiar de herramienta.');return;}
  const target=new URLSearchParams(location.search),id=target.get('tool')||location.hash.slice(1);
  if(tools.some(t=>t.id===id))openTool(id,{updateHistory:false});
  else showCatalog(['img','zip'].includes(target.get('mode'))?target.get('mode'):'docs',{updateHistory:false});
});
function restoreGenericWorkspace(){if($('#dropzone'))return;$('#workspace-files').innerHTML='<div id="dropzone" class="dropzone"><button type="button" class="primary" id="choose-label">Seleccionar archivos</button><span>o suelta los archivos en cualquier parte de la página</span><small id="accepted-types">Archivos · Sin límite fijo de peso</small><input id="file-input" type="file" hidden></div><ul id="file-list" class="file-list" aria-label="Archivos seleccionados"></ul>';$('#file-list').onclick=event=>{if(state.busy)return;const remove=event.target.closest('[data-remove]'),move=event.target.closest('[data-move]');if(remove){state.files.splice(Number(remove.dataset.remove),1);clearResult();renderFiles();refreshPreview();}if(move){const i=Number(move.dataset.move),j=i+Number(move.dataset.direction);[state.files[i],state.files[j]]=[state.files[j],state.files[i]];clearResult();renderFiles();refreshPreview();}};$('#choose-label').onclick=()=>{if(!state.busy)$('#file-input').click();};$('#file-input').onchange=event=>{addFiles(event.target.files);event.target.value='';};}
function setupZipFuseZones(){
  const host=$('#workspace-files');
  host.querySelector('.fuse-zones')?.remove();
  $('#dropzone').hidden=true;$('#file-list').hidden=true;
  host.insertAdjacentHTML('afterbegin',`<div class="fuse-zones">${[['image','image','Arrastra la imagen aquí','JPG o PNG'],['archive','archive','Arrastra el ZIP aquí','Archivo ZIP']].map(([slot,glyph,title,hint])=>`<label class="fuse-box" data-fuse-slot="${slot}">${icon(glyph)}<strong>${title}</strong><span class="fuse-caption">${hint} · o haz clic para seleccionar</span><span class="fuse-selected" aria-live="polite"></span><input data-fuse-input="${slot}" type="file" accept="${slot==='image'?'.jpg,.jpeg,.png':'.zip'}" aria-label="${slot==='image'?'Seleccionar imagen':'Seleccionar ZIP'}"></label>`).join('')}</div>`);
  host.querySelectorAll('[data-fuse-input]').forEach(input=>input.onchange=()=>{setFuseFile(input.dataset.fuseInput,input.files[0]);input.value='';});
  host.querySelectorAll('.fuse-box').forEach(zone=>{zone.ondragover=e=>{e.preventDefault();e.stopPropagation();if(!state.busy)zone.classList.add('dragging');};zone.ondragleave=()=>zone.classList.remove('dragging');zone.ondrop=e=>{e.preventDefault();e.stopPropagation();zone.classList.remove('dragging');setFuseFile(zone.dataset.fuseSlot,e.dataTransfer.files[0]);};});
}
function setFuseFile(slot,file){
  if(!file||state.busy)return;
  if(!(slot==='image'?/\.(jpe?g|png)$/i:/\.zip$/i).test(file.name)){fail(slot==='image'?'Selecciona una imagen JPG o PNG.':'Selecciona un archivo ZIP.');return;}
  const index=slot==='image'?0:1;
  if(!file.size){fail('Selecciona un archivo no vacío.');return;}
  state.files[index]=file;clearResult();
  const zone=$(`[data-fuse-slot="${slot}"]`);zone.classList.add('has-file');zone.querySelector('.fuse-selected').textContent=`${file.name} · ${sizeLabel(file.size)}`;zone.querySelector('.fuse-caption').textContent='Haz clic o arrastra otro archivo para cambiarlo';updateRun();
}
const notes={
  'pdf-word':'Conversión local de texto a DOCX editable. No reproduce imágenes ni la maquetación original. Para PDF escaneados, aplica OCR primero.',
  'pdf-excel':'Extrae filas y separa columnas según su posición. No interpreta fórmulas ni garantiza la estructura de tablas complejas. Revisa el resultado.',
  'pdf-ppt':'Cada página se guarda como una imagen en una diapositiva. El texto de la presentación no será editable.',
  'compress':'La optimización sin pérdida reescribe la estructura. Los modos visuales convierten las páginas en imágenes y eliminan texto seleccionable, enlaces, formularios y firmas.',
  'sign':'Firma visual dibujada, sin certificado digital ni solicitud de firma a terceros. Se coloca en las páginas seleccionadas.',
  'html-pdf':'Conversión del texto de un archivo HTML local. No carga direcciones web, imágenes, estilos ni scripts.',
  'compare':'Compara el texto extraíble página a página. No detecta cambios de imágenes, diseño ni texto de PDF escaneados.',
  'crop':'Recorta el área visible. El contenido fuera del recorte sigue dentro del PDF; para eliminar información usa Censurar.',
  'redact':'Crea una copia de imágenes y borra la zona indicada. No conserva texto seleccionable, enlaces, formularios ni metadatos originales. Comprueba la zona y el resultado antes de compartir.',
  'scan':'En móvil puedes tomar una foto desde el selector del dispositivo. No incluye envío por QR ni corrección automática de perspectiva.',
  'forms':'Rellena campos existentes o añade un campo de texto. No incluye detección automática de casillas en documentos escaneados.',
  'markdown':'Exporta el texto organizado por páginas. No reconstruye automáticamente tablas, encabezados ni enlaces.',
  'workflow':'Une tus PDF en el orden de la lista; después aplica el giro y la numeración elegidos. Puedes guardar esta configuración para reutilizarla.'
};
const acceptFor=id=>id.startsWith('img-')||id.startsWith('zip-')?mediaAccept(id):['jpg-pdf','scan'].includes(id)?'.jpg,.jpeg,.png,.webp':({'html-pdf':'.html,.htm'}[id]||'.pdf');
const multiFor=id=>id.startsWith('img-')?!['img-metadata','img-html'].includes(id):id.startsWith('zip-')?['zip-create','zip-fuse'].includes(id):['merge','jpg-pdf','scan','compare','workflow'].includes(id);
function input(name,label,value='',type='text',extra=''){return `<label class="field ${type==='textarea'?'wide':''}">${label}${type==='textarea'?`<textarea name="${name}" ${extra}>${escapeHTML(value)}</textarea>`:`<input name="${name}" type="${type}" value="${escapeHTML(value)}" ${extra}>`}</label>`;}
function select(name,label,items,value){return `<label class="field">${label}<select name="${name}">${items.map(([v,l])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${l}</option>`).join('')}</select></label>`;}
function pageInput(value=''){return `<label class="field wide">Páginas<input name="pages" placeholder="Todas · o escribe 1, 3, 5-8" value="${escapeHTML(value)}"><small>Puedes usar rangos y separar páginas con comas.</small></label>`;}
function optionsFor(id){
  if(id.startsWith('img-')||id.startsWith('zip-'))return mediaOptions(id,input,select);
  let html='';
  if(['extract','remove','rotate','numbers','watermark','crop','edit','sign','redact'].includes(id))html+=pageInput(id==='remove'?'1':'');
  if(id==='split')html+=`<label class="field wide">Grupos de páginas<input name="groups" placeholder="Ejemplo: 1-3; 4-6; 7"><small>Separa grupos con punto y coma. Vacío: un PDF por página, dentro de un ZIP.</small></label>`;
  if(id==='rotate')html+=select('rotation','Giro',[[90,'90° a la derecha'],[180,'180°'],[270,'90° a la izquierda']],90);
  if(id==='compress')html+=select('quality','Tipo de compresión',[['lossless','Optimizar estructura · sin rasterizar'],['balanced','Visual equilibrada · convierte a imágenes'],['small','Visual ligera · convierte a imágenes']],'lossless');
  if(['jpg-pdf','scan'].includes(id))html+=select('orientation','Orientación',[['portrait','A4 vertical'],['landscape','A4 horizontal']],'portrait')+select('margin','Margen',[['normal','10 mm'],['none','Sin margen']],'normal');
  if(id==='numbers')html+=input('start','Primer número',1,'number','min="1"')+select('align','Alineación',[['center','Centrada'],['left','Izquierda'],['right','Derecha']],'center')+select('position','Posición',[['bottom','Pie de página'],['top','Encabezado']],'bottom');
  if(id==='watermark')html+=input('text','Texto de la marca','CONFIDENCIAL','text','maxlength="100"')+select('opacity','Opacidad',[['0.15','Suave · 15 %'],['0.3','Media · 30 %'],['0.5','Intensa · 50 %']],'0.15');
  if(id==='crop')html+=input('margin','Recortar por cada lado (puntos)',20,'number','min="0" step="1"');
  if(id==='edit')html+=input('text','Texto que quieres añadir','','text','maxlength="250"')+input('size','Tamaño (puntos)',18,'number','min="6" max="90"');
  if(['edit','sign','redact'].includes(id))html+=input('x','X · desde la izquierda (%)',id==='sign'?55:10,'number','min="0" max="95"')+input('y','Y · desde arriba (%)',id==='sign'?75:10,'number','min="0" max="95"')+'<p class="notice">Las coordenadas se aplican a las páginas seleccionadas. En páginas giradas, el texto y la firma usan la orientación interna del PDF.</p>';
  if(id==='redact')html+=input('width','Ancho de la zona (%)',50,'number','min="1" max="100"')+input('height','Alto de la zona (%)',10,'number','min="1" max="100"');
  if(id==='sign')html+='<div class="signature-wrap"><p>Dibuja tu firma</p><canvas id="signature" width="650" height="160" aria-label="Área para dibujar la firma"></canvas><button id="clear-signature" type="button">Borrar firma</button></div>';
  if(id==='forms')html+='<div class="field wide" id="form-fields">Selecciona un PDF para leer sus campos.</div>'+input('newField','Nombre del nuevo campo (opcional)','','text','maxlength="80"')+input('newValue','Valor inicial','','text','maxlength="500"')+input('page','Página del nuevo campo',1,'number','min="1"');
  if(id==='workflow'){
    let saved={};try{saved=JSON.parse(readSetting('nheudocs-workflow','{}'));}catch{}
    html+=select('rotation','Girar después de unir',[[0,'Sin giro'],[90,'90° a la derecha'],[180,'180°'],[270,'90° a la izquierda']],saved.rotation||0)+`<label class="step-check"><input type="checkbox" name="numbering" ${saved.numbering?'checked':''}> Numerar las páginas</label><button id="save-flow" class="secondary" type="button">Guardar configuración</button>`;
  }
  return html;
}
async function openTool(id,{updateHistory=true}={}){
  const tool=tools.find(item=>item.id===id);
  if(!tool||state.busy)return;
  resetWorkspace();
  updateProduct(tool.mode||'docs');
  if($('#info-dialog').open)$('#info-dialog').close();
  restoreGenericWorkspace();
  document.querySelector('.fuse-zones')?.remove();$('#dropzone').hidden=false;$('#file-list').hidden=false;
  state.tool=tool;
  updateRun();
  document.title=`${tool.name} · ${product}`;
  $('#tools').hidden=true;
  $('.search').hidden=true;
  $('#catalog-link').hidden=false;
  workspace.hidden=false;
  document.body.classList.add('tool-page');
  workspace.classList.toggle('fuse-page',id==='zip-fuse');
  if(id==='organize') $('#workspace-files').append($('#options'));
  else $('#workspace-controls').prepend($('#options'));
  $('#workspace-title').textContent=tool.name;
  $('#workspace-description').textContent=tool.description;
  $('#workspace-icon').innerHTML=toolArtwork(tool);
  $('#tool-note').textContent=notes[id]||mediaNotes[id]||'';
  $('#tool-note').hidden=!(notes[id]||mediaNotes[id]);
  $('#choose-label').textContent=id==='img-meta'?'Seleccionar fotos o vídeos':id.startsWith('zip-')?'Seleccionar archivos':id.startsWith('img-')?(id==='img-html'?'Seleccionar HTML':'Seleccionar imágenes'):({'jpg-pdf':'Seleccionar imágenes','scan':'Seleccionar fotos','html-pdf':'Seleccionar HTML'}[id]||'Seleccionar PDF');
  $('#file-input').accept=acceptFor(id)==='*'?'':acceptFor(id);$('#file-input').multiple=multiFor(id);$('#file-input').removeAttribute('capture');if(id==='scan')$('#file-input').setAttribute('capture','environment');
  $('#accepted-types').textContent=`${acceptFor(id)==='*'?'Todos los archivos':acceptFor(id).replaceAll('.','').toUpperCase().replaceAll(',',', ')} · Sin límite fijo de peso`;
  $('#options').innerHTML=optionsFor(id);$('#run').textContent='Procesar archivos →';$('#run').disabled=true;
  if(id==='zip-fuse')setupZipFuseZones();
  if(id==='zip-fuse')$('#tool-note').hidden=true;
  if(id==='sign')setupSignature();if(id==='workflow')$('#save-flow').onclick=()=>{writeSetting('nheudocs-workflow',JSON.stringify(collectOptions()));toast('Flujo guardado en este navegador.');};
  if(updateHistory)history.pushState(null,'',`?tool=${id}`);
  window.scrollTo(0,0);
}
function setupSignature(){const canvas=$('#signature');const ctx=canvas.getContext('2d');ctx.strokeStyle='#202d49';ctx.lineWidth=2.3;ctx.lineCap='round';ctx.lineJoin='round';let drawing=false;const point=e=>{const r=canvas.getBoundingClientRect();return[(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height];};canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drawing=true;ctx.beginPath();ctx.moveTo(...point(e));};canvas.onpointermove=e=>{if(!drawing)return;ctx.lineTo(...point(e));ctx.stroke();state.signature=true;};canvas.onpointerup=canvas.onpointercancel=()=>drawing=false;$('#clear-signature').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);state.signature=false;};}
function collectOptions(){const result={fields:{}};if(state.tool.id==='organize')result.pages=state.pageOrder.map(page=>page+1).join(',');$('#options').querySelectorAll('input,select,textarea').forEach(el=>{const value=el.type==='checkbox'?el.checked:el.value;if(el.dataset.field!==undefined)result.fields[el.dataset.field]=value;else if(el.name)result[el.name]=value;});if(state.tool.id==='img-watermark')result.logo=$('#watermark-logo')?.files[0];if(state.tool.id==='sign'&&state.signature)result.signature=$('#signature').toDataURL('image/png');return result;}
function sizeLabel(n){return n>=1024*1024?`${(n/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(n/1024))} KB`;}
function updateRun(){
  const fuse=state.tool.id==='zip-fuse';
  $('#workspace-controls').hidden=fuse?!(state.files[0]&&state.files[1]):!state.files.length;
  workspace.classList.toggle('has-files',Boolean(state.files.length));
  const minimum=['merge','compare','zip-fuse'].includes(state.tool.id)?2:1;
  $('#run').disabled=state.busy||(fuse?!(state.files[0]&&state.files[1]):state.files.length<minimum)||(state.tool.id==='organize'&&!state.pageOrder.length);
}
function renderFiles(){
  const files=state.tool.id==='zip-fuse'?state.files.map((file,i)=>file?{file,index:i}:null).filter(Boolean).map(({file,index})=>({file,index})):state.files.map((file,index)=>({file,index}));
  $('#file-list').innerHTML=files.map(({file,index:i})=>`<li><span class="tool-icon blue">${icon('file')}</span><span class="file-info"><strong>${escapeHTML(file.name)}</strong><small>${sizeLabel(file.size)}</small></span>${multiFor(state.tool.id)&&state.tool.id!=='zip-fuse'?`<button class="icon-button" data-move="${i}" data-direction="-1" ${i===0?'disabled':''} aria-label="Subir ${escapeHTML(file.name)}">↑</button><button class="icon-button" data-move="${i}" data-direction="1" ${i===state.files.length-1?'disabled':''} aria-label="Bajar ${escapeHTML(file.name)}">↓</button>`:''}<button class="icon-button" data-remove="${i}" aria-label="Quitar ${escapeHTML(file.name)}">${icon('close')}</button></li>`).join('');updateRun();
}
function fail(message){$('#error').textContent=message;$('#error').hidden=false;}
async function addFiles(list){
  if(state.busy)return;const incoming=Array.from(list);if(!incoming.length)return;
  const extensions=acceptFor(state.tool.id).split(',');
  if(!extensions.includes('*')&&incoming.some(file=>!extensions.some(ext=>file.name.toLowerCase().endsWith(ext)))){fail(`Selecciona archivos de estos tipos: ${extensions.join(', ')}.`);return;}
  if(incoming.some(f=>!f.size)){fail('Uno de los archivos está vacío.');return;}
  const next=multiFor(state.tool.id)?[...state.files,...incoming]:[incoming[0]];
  if(next.length>50){fail('Puedes procesar hasta 50 archivos en una operación.');return;}
  if(state.tool.id==='compare'&&next.length>2){fail('La comparación admite exactamente dos PDF.');return;}
  state.files=next;clearResult();renderFiles();await refreshPreview();
}
async function refreshPreview(){
  const generation=++state.generation;$('.page-thumbs')?.remove();$('#page-order')?.remove();state.pageOrder=[];updateRun();
  if(!state.files.length)return;
  if(state.tool.id==='img-meta'&&/\.(mp4|mov)$/i.test(state.files[0].name))return;
  if(state.tool.id.startsWith('img-')&&state.tool.id!=='img-html')return refreshImagePreview(generation);
  if(state.tool.id==='organize')return renderPageOrder(state.files[0],generation);
  if(state.tool.id==='forms'){
    const target=$('#form-fields');try{const doc=await readPdf(state.files[0]);if(generation!==state.generation)return;const fields=doc.getForm().getFields();target.replaceChildren();let supported=0;
      for(const field of fields){const type=field.constructor.name;const label=document.createElement('label');label.className='field';const caption=document.createElement('span');caption.textContent=field.getName();label.append(caption);let input;
        if(type==='PDFTextField'){input=document.createElement('input');input.value=field.getText()||'';}
        else if(type==='PDFCheckBox'){input=document.createElement('input');input.type='checkbox';input.checked=field.isChecked();}
        else if(['PDFDropdown','PDFOptionList','PDFRadioGroup'].includes(type)){input=document.createElement('select');const options=field.getOptions();const current=field.getSelected();input.append(new Option('Sin seleccionar',''));for(const value of options){const opt=new Option(value,value);opt.selected=Array.isArray(current)?current.includes(value):current===value;input.append(opt);}}
        else continue;input.dataset.field=field.getName();input.disabled=field.isReadOnly();label.append(input);target.append(label);supported++;
      }if(!supported)target.textContent='No hay campos compatibles. Puedes crear un campo de texto debajo.';
    }catch(e){if(generation===state.generation)target.textContent=e.message;}
  }
  if(!['extract','remove','split','rotate','crop','edit','sign','redact'].includes(state.tool.id))return;
  let doc;try{doc=await openPreview(state.files[0]);if(generation!==state.generation)return;const container=document.createElement('div');container.className='page-thumbs';$('#options').prepend(container);for(let i=0;i<Math.min(doc.numPages,12);i++){if(generation!==state.generation)return;const canvas=await pageCanvas(doc,i,.18);if(generation!==state.generation)return;const item=document.createElement('div');item.className='thumb';item.append(canvas,document.createTextNode(`${i+1}`));container.append(item);}if(doc.numPages>12){const remaining=document.createElement('span');remaining.textContent=`+ ${doc.numPages-12} páginas`;container.append(remaining);}}
  catch{/* A failed preview never blocks the processor's specific error message. */}finally{if(doc)await doc.destroy();}
}
$('#file-list').onclick=event=>{if(state.busy)return;const remove=event.target.closest('[data-remove]'),move=event.target.closest('[data-move]');if(remove){state.files.splice(Number(remove.dataset.remove),1);clearResult();renderFiles();refreshPreview();}if(move){const i=Number(move.dataset.move),j=i+Number(move.dataset.direction);[state.files[i],state.files[j]]=[state.files[j],state.files[i]];clearResult();renderFiles();refreshPreview();}};
$('#choose-label').onclick=()=>{if(!state.busy)$('#file-input').click();};
$('#file-input').onchange=event=>{addFiles(event.target.files);event.target.value='';};

function isFileDrag(event){
  return state.tool?.id!=='zip-fuse' && !workspace.hidden && Array.from(event.dataTransfer?.types||[]).includes('Files');
}
function clearFileDrag(){document.body.classList.remove('file-dragging');}
document.addEventListener('dragover',event=>{
  if(!isFileDrag(event))return;
  event.preventDefault();
  event.dataTransfer.dropEffect=state.busy?'none':'copy';
  if(!state.busy)document.body.classList.add('file-dragging');
});
document.addEventListener('dragleave',event=>{
  if(!event.relatedTarget && (event.clientX<=0 || event.clientY<=0 ||
    event.clientX>=window.innerWidth || event.clientY>=window.innerHeight))clearFileDrag();
});
document.addEventListener('dragend',clearFileDrag);
window.addEventListener('blur',clearFileDrag);
document.addEventListener('drop',event=>{
  if(!isFileDrag(event))return;
  event.preventDefault();
  clearFileDrag();
  addFiles(event.dataTransfer.files);
});
function setProgress(percent,label){$('#progress').hidden=false;$('#progress-bar').value=percent;$('#progress-percent').textContent=`${Math.round(percent)}%`;$('#progress-label').textContent=label;}
$('#run').onclick=async()=>{
  if(state.busy)return;clearResult();state.busy=true;updateRun();$('#options').querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);$('#run').textContent='Procesando…';
  const started=performance.now();try{
    const options=collectOptions();await new Promise(resolve=>requestAnimationFrame(resolve));const result=await (state.tool.id.startsWith('img-')?executeImage:state.tool.id.startsWith('zip-')?executeZip:execute)(state.tool.id,state.files,options,setProgress);
    state.result=result;resultURL=URL.createObjectURL(result.blob);setProgress(100,'Todo listo.');$('#result').hidden=false;
    $('#result').innerHTML=`<h3>Archivo listo</h3><p>${escapeHTML(result.name)} · ${sizeLabel(result.blob.size)} · ${((performance.now()-started)/1000).toFixed(1)} s</p>${result.note?`<p>${escapeHTML(result.note)}</p>`:''}<div class="result-actions"><a class="primary" id="download-result">${icon('download')} Descargar resultado</a>${result.blob.type.includes('pdf')?'<button id="continue-result" class="secondary">Usar en otra herramienta</button>':''}</div>`;
    if(result.blob.type.startsWith('image/')){const preview=new Image();preview.className='result-image';preview.alt='Resultado procesado';preview.src=resultURL;$('#result').prepend(preview);}
    if(result.blob.type.startsWith('video/')){const preview=document.createElement('video');preview.controls=true;preview.playsInline=true;preview.preload='metadata';preview.className='result-image';preview.setAttribute('aria-label','Vídeo con perfil de metadatos');preview.src=resultURL;$('#result').prepend(preview);}
    $('#download-result').href=resultURL;$('#download-result').download=result.name;
    if($('#continue-result'))$('#continue-result').onclick=()=>{const file=new File([result.blob],result.name,{type:result.blob.type});showInfo(`<h2>Usar en otra herramienta</h2><p>Elige qué hacer con el PDF que acabas de crear.</p><div class="filters">${['split','compress','rotate','numbers','watermark','pdf-word','pdf-jpg'].map(id=>`<button class="secondary" data-next="${id}">${tools.find(t=>t.id===id).name}</button>`).join('')}</div>`);$('#info-content').onclick=async event=>{const button=event.target.closest('[data-next]');if(button){$('#info-dialog').close();await openTool(button.dataset.next);await addFiles([file]);}};};
    $('#result').scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch(error){fail(error.message||'No se ha podido completar la operación.');}
  finally{state.busy=false;$('#options').querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=false);$('#run').textContent='Procesar de nuevo →';updateRun();}
};
$('#options').addEventListener('input',()=>{if(!state.busy)clearResult();});
hydrate();
renderCatalog();
const initial=new URLSearchParams(location.search).get('tool')||location.hash.slice(1);
if(tools.some(tool=>tool.id===initial))openTool(initial,{updateHistory:false});

async function renderPageOrder(file, generation) {
  let pdf;
  try {
    const documentPdf = await readPdf(file);
    if (generation !== state.generation) return;
    const section = document.createElement('section');
    section.id = 'page-order';
    section.innerHTML = '<h2>Orden de las páginas</h2><p>Arrastra una miniatura o usa las flechas para cambiarla de posición.</p><ol class="sort-grid"></ol><span class="sr-only" role="status"></span>';
    $('#options').prepend(section);
    const list = section.querySelector('ol');
    const status = section.querySelector('[role="status"]');
    const items = documentPdf.getPageIndices().map(page => {
      const item = document.createElement('li');
      item.draggable = true;
      item.dataset.page = page;
      item.innerHTML = `<div class="sort-preview" aria-hidden="true">${icon('file')}</div><strong>Página ${page+1}</strong><div class="sort-actions"><button type="button" data-step="-1" aria-label="Mover página ${page+1} hacia arriba">↑</button><button type="button" data-step="1" aria-label="Mover página ${page+1} hacia abajo">↓</button></div>`;
      return item;
    });
    list.append(...items);

    function syncOrder() {
      state.pageOrder = Array.from(list.children, item => Number(item.dataset.page));
      for (const item of list.children) {
        item.toggleAttribute('data-first', item === list.firstElementChild);
        item.toggleAttribute('data-last', item === list.lastElementChild);
        item.querySelector('[data-step="-1"]').setAttribute('aria-disabled', String(item === list.firstElementChild));
        item.querySelector('[data-step="1"]').setAttribute('aria-disabled', String(item === list.lastElementChild));
      }
      clearResult();
      updateRun();
    }

    function move(item, target) {
      if (state.busy || !target || item === target) return;
      const focus = item.contains(document.activeElement) ? document.activeElement : null;
      if (state.pageOrder.indexOf(Number(item.dataset.page)) < state.pageOrder.indexOf(Number(target.dataset.page))) target.after(item);
      else target.before(item);
      syncOrder();
      focus?.focus({preventScroll:true});
      status.textContent = `Página ${Number(item.dataset.page)+1} en la posición ${state.pageOrder.indexOf(Number(item.dataset.page))+1}.`;
    }

    list.addEventListener('click', event => {
      const button = event.target.closest('[data-step]');
      if (!button) return;
      const item = button.closest('li');
      move(item, Number(button.dataset.step) < 0 ? item.previousElementSibling : item.nextElementSibling);
    });
    let dragged;
    list.addEventListener('dragstart', event => {
      dragged = event.target.closest('li');
      if (state.busy || !dragged || event.target.closest('button')) {
        dragged = null;
        event.preventDefault();
        return;
      }
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', dragged.dataset.page);
      dragged.classList.add('dragged');
    });
    list.addEventListener('dragover', event => {
      if (!dragged || state.busy) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      list.querySelector('.drop-target')?.classList.remove('drop-target');
      event.target.closest('li')?.classList.add('drop-target');
    });
    function endDrag() {
      dragged?.classList.remove('dragged');
      list.querySelector('.drop-target')?.classList.remove('drop-target');
      dragged = null;
    }
    list.addEventListener('drop', event => {
      if (!dragged) return;
      event.preventDefault();
      move(dragged, event.target.closest('li'));
      endDrag();
    });
    list.addEventListener('dragend', endDrag);
    syncOrder();

    pdf = await openPreview(file);
    for (const [index, item] of items.entries()) {
      if (generation !== state.generation) break;
      try {
        const page = await pdf.getPage(index+1);
        const view = page.getViewport({scale:1});
        const canvas = await pageCanvas(pdf, index, Math.min(135/view.width, 170/view.height));
        if (generation === state.generation) item.firstElementChild.replaceChildren(canvas);
      } catch {
        // Keep the numbered placeholder if a page cannot be rendered.
      }
    }
  } catch (error) {
    if (generation === state.generation) fail(error.message);
  } finally {
    if (pdf) await pdf.destroy();
  }
}

async function refreshImagePreview(generation){
  const file=state.files[0],id=state.tool.id;
  try{
    if(id==='img-metadata'){
      const info=await readMetadata(file);if(generation!==state.generation)return;
      for(const key of ['author','description','copyright','date'])$('#options [name="'+key+'"]').value=info[key];
      $('#metadata-info').textContent=`EXIF leído · ${info.gps?'Contiene ubicación GPS':'Sin ubicación GPS'}. Los campos corresponden a esta foto.`;
    }
    const im=await loadImage(file);if(generation!==state.generation)return;
    const wrap=document.createElement('div');wrap.className='page-thumbs image-preview';
    const c=document.createElement('canvas'),ratio=Math.min(1,700/im.naturalWidth);c.width=Math.round(im.naturalWidth*ratio);c.height=Math.round(im.naturalHeight*ratio);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    const label=document.createElement('p');label.textContent=`Original · ${im.naturalWidth} × ${im.naturalHeight} px${state.files.length>1?' · Vista de la primera imagen':''}`;
    wrap.append(c,label);$('#workspace-files').append(wrap);
    if(['img-crop','img-pixelate'].includes(id)){
      label.textContent+=' · Arrastra para marcar una zona';let start;
      const point=e=>{const r=c.getBoundingClientRect();return [Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))];};
      c.onpointerdown=e=>{if(state.busy)return;start=point(e);c.setPointerCapture(e.pointerId);};
      c.onpointermove=e=>{if(!start)return;const p=point(e),ctx=c.getContext('2d');ctx.drawImage(im,0,0,c.width,c.height);ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();ctx.lineWidth=3;ctx.strokeRect(start[0]*c.width/100,start[1]*c.height/100,(p[0]-start[0])*c.width/100,(p[1]-start[1])*c.height/100);};
      c.onpointerup=e=>{if(!start)return;const p=point(e),values={x:Math.floor(Math.min(start[0],p[0])),y:Math.floor(Math.min(start[1],p[1])),width:Math.max(1,Math.floor(Math.abs(p[0]-start[0]))),height:Math.max(1,Math.floor(Math.abs(p[1]-start[1])))};for(const [k,v] of Object.entries(values))$('#options [name="'+k+'"]').value=v;start=null;clearResult();};c.onpointercancel=()=>start=null;
    }
    if(!['img-metadata','img-clean','img-gif','img-meta'].includes(id)){
      const button=document.createElement('button');button.className='secondary';button.textContent='Actualizar vista previa';wrap.append(button);
      button.onclick=async()=>{if(state.busy)return;button.disabled=true;try{const out=await renderImage(id,file,collectOptions());if(generation!==state.generation)return;const result=wrap.querySelector('.edited-preview')||document.createElement('div');result.className='edited-preview';result.replaceChildren(out);wrap.append(result);}catch(e){fail(e.message);}finally{button.disabled=false;}};
    }
  }catch(e){if(generation===state.generation)fail(e.message);}
}
