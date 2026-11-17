import {mkdir, copyFile, cp} from 'node:fs/promises';
const libraries = {
  'piexifjs/piexif.js': 'piexif.js',
  'gifenc/dist/gifenc.esm.js': 'gifenc.js',
  'html2canvas/dist/html2canvas.min.js': 'html2canvas.min.js',
  'pdf-lib/dist/pdf-lib.min.js': 'pdf-lib.min.js',
  'pdfjs-dist/build/pdf.mjs': 'pdf.mjs',
  'pdfjs-dist/build/pdf.worker.mjs': 'pdf.worker.mjs',
  'docx/dist/index.iife.js': 'docx.js',
  'jszip/dist/jszip.min.js': 'jszip.min.js',
  'exceljs/dist/exceljs.min.js': 'exceljs.min.js',
  'pptxgenjs/dist/pptxgen.bundle.js': 'pptxgen.bundle.js'
};
await mkdir('vendor', {recursive: true});
for (const [source, dest] of Object.entries(libraries)) await copyFile(`node_modules/${source}`, `vendor/${dest}`);
for (const directory of ['cmaps', 'standard_fonts']) await cp(`node_modules/pdfjs-dist/${directory}`, `vendor/${directory}`, {recursive: true});
for (const name of ['piexifjs','gifenc','html2canvas','pdf-lib','pdfjs-dist','docx','jszip','exceljs','pptxgenjs']) {
  for (const license of ['LICENSE','LICENSE.md','LICENSE.txt']) {
    try {await copyFile(`node_modules/${name}/${license}`, `vendor/${name}-LICENSE.txt`); break;} catch {}
  }
}
console.log('Bibliotecas copiadas a vendor/. La web no necesita CDN.');
