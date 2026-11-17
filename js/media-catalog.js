export const mediaTools = [
 ['img-compress','Comprimir imagen','Reduce el peso de tus fotos por lotes.','optimize','compress','mint'],
 ['img-resize','Redimensionar imagen','Ajusta el tamaño en píxeles o porcentaje.','edit','crop','blue'],
 ['img-crop','Recortar imagen','Quédate con una zona exacta de la foto.','edit','crop','mint'],
 ['img-jpg','Convertir a JPG','Convierte PNG, WebP, SVG, BMP y GIF a JPG.','convert','image','gold'],
 ['img-convert','Convertir desde JPG','Exporta a PNG, WebP o GIF.','convert','image','gold'],
 ['img-edit','Editor de fotos','Ajusta luz, contraste, color y añade texto.','edit','edit','purple'],
 ['img-upscale','Ampliar imagen','Amplía hasta 4× con interpolación suave.','optimize','spark','mint'],
 ['img-background','Eliminar fondo','Haz transparente un fondo de color uniforme.','edit','image','mint'],
 ['img-watermark','Marca de agua','Añade texto o tu logo con transparencia.','edit','drop','blue'],
 ['img-meme','Crear meme','Pon texto arriba y abajo de tu imagen.','edit','spark','purple'],
 ['img-rotate','Girar y voltear','Gira tus fotos o crea un efecto espejo.','edit','rotate','blue'],
 ['img-html','HTML a imagen','Convierte un HTML local en una imagen.','convert','code','gold'],
 ['img-pixelate','Pixelar una zona','Oculta una cara o una zona de tu elección.','security','redact','blue'],
 ['img-metadata','Editar metadatos','Consulta y edita autor, fecha y copyright EXIF.','edit','form','purple'],
 ['img-clean','Eliminar metadatos','Quita EXIF, ubicación y otros datos de tus fotos.','security','lock','mint'],
 ['img-gif','Crear GIF animado','Une varias imágenes en una animación.','convert','slides','coral'],
 ['img-meta','Perfil Ray-Ban Meta','Aplica metadatos de Ray-Ban Meta a fotos y vídeos.','edit','image','gold'],
 ['zip-fuse','Fusionar imagen y archivos','Guarda un ZIP dentro de un JPG o PNG.','organize','merge','purple'],
 ['zip-extract','Extraer de una imagen','Recupera los archivos de una imagen ZipFusion.','organize','extract','gold'],
 ['zip-create','Crear ZIP','Agrupa archivos, con contraseña opcional.','organize','archive','blue'],
 ['zip-open','Abrir ZIP','Extrae un ZIP, también protegido con contraseña.','organize','unlock','mint']
].map(([id,name,description,category,icon,color])=>({id,name,description,category,icon,color,mode:id.startsWith('img-')?'img':'zip'}));
export const mediaAccept = id => id==='img-meta'?'.jpg,.jpeg,.png,.webp,.mp4,.mov':id.startsWith('zip-') ? (id==='zip-extract'?'.jpg,.jpeg,.png':id==='zip-open'?'.zip':'*') : id==='img-html'?'.html,.htm':id==='img-metadata'?'.jpg,.jpeg':'.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg';
export const mediaNotes = {
 'img-meta':'Aplica un perfil de metadatos: no acredita que el archivo se haya capturado con las gafas ni garantiza la etiqueta en Instagram. Fotos: salida JPEG; vídeos MP4/MOV: conserva imagen, audio y duración, sin recodificar. No admite MP4 fragmentado.',
 'img-compress':'Exporta a JPG o WebP; la transparencia se conserva solo en WebP. Si el original ya pesa menos, se conserva. Los GIF se procesan como imagen fija.',
 'img-upscale':'Ampliación por interpolación, sin IA: aumenta las dimensiones, pero no recupera detalle perdido.',
 'img-background':'Para fondos lisos: selecciona el color y la tolerancia. Se eliminan los píxeles similares en toda la imagen; no detecta personas ni objetos.',
 'img-pixelate':'Selecciona la zona en porcentajes o arrastra sobre la vista previa. No hay detección automática de caras.',
 'img-html':'Renderiza texto, tablas y estilos básicos de un HTML local. No ejecuta scripts ni carga recursos externos; no captura páginas por URL.',
 'img-metadata':'Edición EXIF para JPEG sin recomprimir. Los campos vacíos se eliminan; se conservan otros metadatos salvo que selecciones borrarlos.',
 'img-clean':'JPEG: elimina EXIF, XMP, IPTC y comentarios sin recomprimir. Otros formatos: nueva imagen PNG sin metadatos; GIF animado se convierte en imagen fija.',
 'zip-fuse':'Primero añade una imagen JPG o PNG y después los archivos. Un ZIP sin contraseña nueva se conserva tal cual. Para conservar el contenido, no edites ni recomprimas la imagen fusionada.',
 'zip-extract':'Recupera los archivos en un ZIP normal sin contraseña. Si están cifrados, introduce la contraseña original.',
 'zip-open':'Genera un ZIP normal sin contraseña con el contenido extraído. Sin límite fijo de tamaño; hasta 1.000 entradas.',
};
export function mediaOptions(id,input,select){
 const number=(n,l,v,min=0,max=100)=>input(n,l,v,'number',`min="${min}" max="${max}"`);
 const format=()=>select('format','Formato de salida',[['png','PNG'],['jpeg','JPG'],['webp','WebP'],['gif','GIF fijo']],'png');
 const zone=()=>number('x','Desde la izquierda (%)',10)+number('y','Desde arriba (%)',10)+number('width','Ancho de la zona (%)',50,1)+number('height','Alto de la zona (%)',50,1);
 const text=()=>input('text','Texto','','text','maxlength="200"')+input('color','Color del texto','#ffffff','color')+number('fontSize','Tamaño del texto (px)',40,8,500);
 if(id.startsWith('zip-'))return input('password',id==='zip-create'||id==='zip-fuse'?'Contraseña nueva (opcional)':'Contraseña del archivo (si tiene)','','password','autocomplete="off"')+(id==='zip-fuse'?'<p class="notice">La primera imagen de la lista es la portada. Usa las flechas para cambiar el orden.</p>':'');
 let h='';
 if(id==='img-meta')return select('framing','Encuadre de las fotos',[['original','Conservar tamaño y encuadre'],['portrait','Recortar a vertical 3:4 · 3024 × 4032']],'original')+'<p class="notice">Fabricante: Meta AI · Modelo: Ray-Ban Meta Smart Glasses · Software: Meta View. El encuadre solo se aplica a fotos. En JPEG sin recorte se conservan los píxeles. Se reemplazan los campos de dispositivo; otros datos previos pueden permanecer.</p>';
 if(id==='img-compress')h+=select('format','Formato',[['jpeg','JPG'],['webp','WebP']],'jpeg')+number('quality','Calidad (%)',80,10);
 if(id==='img-resize')h+=select('resizeMode','Medida',[['percent','Porcentaje'],['pixels','Ancho en píxeles (mantiene proporción)']],'percent')+number('size','Porcentaje o ancho',50,1,16000);
 if(id==='img-crop'||id==='img-pixelate')h+=zone();
 if(id==='img-pixelate')h+=number('block','Tamaño del píxel',18,4,100);
 if(id==='img-convert')h+=format();
 if(id==='img-edit')h+=number('brightness','Brillo (%)',100,0,200)+number('contrast','Contraste (%)',100,0,200)+number('saturation','Saturación (%)',100,0,200)+text();
 if(id==='img-upscale')h+=select('scale','Ampliación',[[2,'2×'],[3,'3×'],[4,'4×']],2);
 if(id==='img-background')h+=input('background','Color del fondo','#ffffff','color')+number('tolerance','Tolerancia',35,0,255);
 if(id==='img-watermark')h+=text()+'<label class="field wide">Logo (opcional, PNG o JPG)<input type="file" id="watermark-logo" accept="image/png,image/jpeg"></label>'+number('opacity','Opacidad (%)',50,1)+select('position','Posición',[['bottom','Abajo a la derecha'],['center','Centro'],['top','Arriba a la izquierda']],'bottom');
 if(id==='img-meme')h+=input('top','Texto superior','','text','maxlength="120"')+input('bottom','Texto inferior','','text','maxlength="120"');
 if(id==='img-rotate')h+=select('rotation','Giro',[[90,'90° derecha'],[180,'180°'],[270,'90° izquierda'],[0,'Sin giro']],90)+select('flip','Espejo',[['none','No'],['horizontal','Horizontal'],['vertical','Vertical']],'none');
 if(id==='img-html')h+=number('htmlWidth','Ancho de la imagen (px)',1200,320,2400);
 if(id==='img-metadata')h+='<p class="notice wide" id="metadata-info">Se cargarán los datos de la primera foto.</p>'+input('author','Autor','','text','maxlength="150"')+input('description','Descripción','','text','maxlength="500"')+input('copyright','Copyright','','text','maxlength="150"')+input('date','Fecha EXIF (AAAA:MM:DD HH:MM:SS)','','text','placeholder="2026:11:17 10:30:00"')+'<label class="step-check wide"><input type="checkbox" name="removeGPS"> Eliminar ubicación GPS</label><label class="step-check wide"><input type="checkbox" name="removeOther"> Eliminar todos los datos previos antes de guardar estos campos</label>';
 if(id==='img-gif')h+=number('delay','Duración por foto (ms)',500,40,10000)+number('gifWidth','Ancho del GIF (px)',640,32,1600)+'<p class="notice">Se usa el orden de la lista. Las imágenes se ajustan a la primera proporción sobre fondo blanco.</p>';
 return h;
}
