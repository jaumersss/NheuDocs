import {PDFDocument,StandardFonts} from 'pdf-lib';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('tests/output',{recursive:true});
for (const name of ['alpha','beta']) {
  const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);
  for(let i=0;i<3;i++){
    const page=doc.addPage([595,842]);page.drawText(`Documento ${name} - Pagina ${i+1}`,{x:50,y:770,size:22,font});page.drawText('Texto editable de prueba: café, mañana, ilusión.',{x:50,y:720,size:14,font});
    page.drawText('Producto',{x:50,y:670,size:12,font});page.drawText('Cantidad',{x:300,y:670,size:12,font});page.drawText('Cuadernos',{x:50,y:650,size:12,font});page.drawText('12',{x:300,y:650,size:12,font});
  }
  await writeFile(`tests/output/${name}.pdf`,await doc.save());
}
console.log('Synthetic fixtures created in tests/output/.');
