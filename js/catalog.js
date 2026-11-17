export const categories = [
  ['all','Todas'], ['organize','Organizar'], ['convert','Convertir'],
  ['optimize','Optimizar'], ['edit','Editar'], ['security','Proteger'], ['workflow','Flujos']
];
// reviewed against https://www.ilovepdf.com/es on 2026-11-16.
export const tools = [
  ['merge','Unir PDF','Combina varios PDF en un archivo.','organize','merge','coral'],
  ['split','Dividir PDF','Separa páginas y quédate con lo que necesitas.','organize','split','purple'],
  ['compress','Comprimir PDF','Reduce el tamaño de un PDF.','optimize','compress','mint'],
  ['pdf-word','PDF a Word','Convierte el texto de tu PDF en un DOCX editable.','convert','word','blue'],
  ['pdf-ppt','PDF a PowerPoint','Convierte cada página en una diapositiva.','convert','slides','coral'],
  ['pdf-excel','PDF a Excel','Lleva las filas de texto a una hoja de cálculo.','convert','table','mint'],
  ['edit','Editar PDF','Añade texto donde lo necesites.','edit','edit','purple'],
  ['pdf-jpg','PDF a JPG','Convierte cada página en una imagen.','convert','image','gold'],
  ['jpg-pdf','JPG a PDF','Reúne tus imágenes en un documento.','convert','image','gold'],
  ['sign','Firmar PDF','Dibuja tu firma y colócala en el documento.','security','pen','purple'],
  ['watermark','Marca de agua','Dale a tus páginas un sello personal.','edit','drop','blue'],
  ['rotate','Rotar PDF','Pon tus páginas en la dirección correcta.','edit','rotate','purple'],
  ['html-pdf','HTML a PDF','Guarda el contenido de un HTML como PDF.','convert','code','blue'],
  ['organize','Ordenar PDF','Arrastra las páginas para cambiar su orden.','organize','grid','purple'],
  ['numbers','Numerar páginas','Añade una referencia a cada página.','edit','hash','blue'],
  ['scan','Escanear a PDF','Convierte fotos de tus documentos en PDF.','organize','scan','mint'],
  ['compare','Comparar PDF','Encuentra los cambios de texto entre dos PDF.','security','compare','purple'],
  ['redact','Censurar PDF','Elimina una zona en una copia rasterizada.','security','redact','coral'],
  ['crop','Recortar PDF','Ajusta los márgenes visibles de las páginas.','edit','crop','mint'],
  ['forms','Formularios PDF','Rellena campos o crea un campo de texto.','edit','form','blue'],
  ['markdown','PDF a Markdown','Extrae el texto por páginas.','convert','code','mint'],
  ['remove','Eliminar páginas','Quita las páginas que ya no necesitas.','organize','trash','coral'],
  ['extract','Extraer páginas','Guarda solo la selección que te interesa.','organize','extract','gold'],
  ['workflow','Flujo de trabajo','Une, gira y numera PDF en una operación.','workflow','merge','purple']
].map(([id,name,description,category,icon,color])=>({id,name,description,category,icon,color}));

const paths = {
  merge:'M8 3v5l4 4 4-4V3M12 12v9m-4-4 4 4 4-4',
  split:'M12 21v-9M4 3v5l8 4 8-4V3M1 6l3-3 3 3m10 0 3-3 3 3',
  compress:'M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5M8 8 3 3m13 5 5-5M8 16l-5 5m13-5 5 5',
  word:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm0 0v6h6M7 12l2 6 3-5 3 5 2-6',
  slides:'M3 4h18v13H3zM8 22l4-5 4 5M12 8l4 3-4 3z',
  table:'M3 3h18v18H3zM3 9h18M9 3v18M3 15h18',
  edit:'m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z',
  image:'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M16 7h.01',
  pen:'M4 21c5-8 5 0 9-4s5 3 8-1M4 14l2-5 8-8 5 5-8 8z',
  drop:'M12 2S4 11 4 15a8 8 0 0 0 16 0c0-4-8-13-8-13zM8 15a4 4 0 0 0 4 4',
  rotate:'M3 10a9 9 0 1 1 1 7M3 3v7h7',
  code:'m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18',
  unlock:'M7 10V7a5 5 0 0 1 9-3M4 10h16v12H4zM12 15v3',
  lock:'M7 10V7a5 5 0 0 1 10 0v3M4 10h16v12H4zM12 15v3',
  grid:'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
  archive:'M3 3h18v5H3zm2 5v13h14V8M9 12h6',
  repair:'m14 6 4 4 4-4a7 7 0 0 1-8 9L7 22l-5-5 7-7a7 7 0 0 1 9-8z',
  hash:'M9 3 7 21M17 3l-2 18M3 9h18M2 15h18',
  scan:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M1 12h22M7 7h10M7 17h10',
  compare:'M3 3h7v18H3zm11 0h7v18h-7M6 8h1m10 0h1M6 12h1m10 0h1',
  redact:'M4 3h16v18H4zM7 8h10M7 12h10M7 16h6',
  crop:'M6 2v16h16M2 6h16v16',
  form:'M4 3h16v18H4zM7 7h2v2H7zm5 1h5M7 13h2v2H7zm5 1h5',
  spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  language:'M2 5h12M8 2v3M5 5c0 6 8 11 8 11M12 5c0 6-8 11-8 11M13 22l5-12 5 12m-8-4h6',
  trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  extract:'M14 2H4v20h16V10M13 11l8-8m-6 0h6v6',
  arrow:'M4 12h16m-6-6 6 6-6 6',
  search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  upload:'M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6',
  close:'m6 6 12 12M6 18 18 6',
  check:'m4 12 5 5L20 6',
  moon:'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10',
  sun:'M12 3V1m0 22v-2M3 12H1m22 0h-2M5 5 3 3m18 18-2-2M5 19l-2 2M21 3l-2 2M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  heart:'M20 5c-3-3-6-1-8 1-2-2-5-4-8-1s-2 6 0 8l8 8 8-8c2-2 3-5 0-8z',
  file:'M14 2H5v20h14V7zm0 0v6h5M8 12h8M8 16h6',
  download:'M12 3v13m-5-5 5 5 5-5M3 17v4h18v-4'
};
export function icon(name, cls='') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.file}"/></svg>`; }

const conversions = {
  'pdf-word': ['PDF', 'DOCX', 'blue'],
  'pdf-excel': ['PDF', 'XLSX', 'mint'],
  'pdf-ppt': ['PDF', 'PPTX', 'coral'],
  'pdf-jpg': ['PDF', 'JPG', 'gold'],
  'jpg-pdf': ['JPG', 'PDF', 'coral'],
  'html-pdf': ['HTML', 'PDF', 'coral'],
  'scan': ['FOTO', 'PDF', 'coral'],
  'markdown': ['PDF', 'MD', 'purple']
};

export function toolArtwork(tool) {
  const conversion = conversions[tool.id];
  if (!conversion) {
    return `<span class="tool-icon ${tool.color}">${icon(tool.icon)}</span>`;
  }
  const [source, output, color] = conversion;
  return `<span class="format-art ${color}" aria-hidden="true"><span class="format-source"><span>${source}</span>${icon('arrow')}</span><span class="format-output">${output}</span></span>`;
}
