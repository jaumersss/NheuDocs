import {mkdir,cp,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const name of ['index.html','styles.css'])await copyFile(name,`dist/${name}`);
for(const name of ['assets','js','vendor'])await cp(name,`dist/${name}`,{recursive:true});
console.log('Exportación estática lista en dist/. Solo archivos públicos.');
