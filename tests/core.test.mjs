import test from 'node:test';
import assert from 'node:assert/strict';
import * as pdf from 'pdf-lib';
import JSZip from 'jszip';
import {File} from 'node:buffer';
import {parsePages,execute} from '../js/engine.js';
globalThis.PDFLib=pdf;
globalThis.JSZip=JSZip;
async function fixture(){const doc=await pdf.PDFDocument.create();for(let i=0;i<3;i++){const p=doc.addPage([500+i*10,700]);p.drawText(`Pagina ${i+1}`);}return new File([await doc.save()],'ejemplo.pdf',{type:'application/pdf'});}
const source=await fixture();
async function resultPdf(id,options={},files=[source]){const result=await execute(id,files,options);return pdf.PDFDocument.load(await result.blob.arrayBuffer());}
test('ranges validate bounds, reversed order and intentional duplicates',()=>{
  assert.deepEqual(parsePages('3-1,2',3),[2,1,0]);
  assert.deepEqual(parsePages('3,1,3',3,{duplicates:true}),[2,0,2]);
  for(const value of ['0','4','1,,2','x','1-4','1;2'])assert.throws(()=>parsePages(value,3));
});
test('merge preserves order and all pages',async()=>{const result=await resultPdf('merge',{},[source,source]);assert.equal(result.getPageCount(),6);assert.equal(result.getPage(3).getWidth(),500);});
test('extract respects a reverse range',async()=>{const result=await resultPdf('extract',{pages:'3-2'});assert.equal(result.getPageCount(),2);assert.equal(result.getPage(0).getWidth(),520);});
test('organize can duplicate pages',async()=>{const result=await resultPdf('organize',{pages:'2,1,2'});assert.deepEqual(result.getPages().map(p=>p.getWidth()),[510,500,510]);});
test('remove cannot remove every page',async()=>{await assert.rejects(()=>resultPdf('remove',{pages:'1-3'}),/al menos/);assert.equal((await resultPdf('remove',{pages:'2'})).getPageCount(),2);});
test('split emits real PDFs for each group',async()=>{const result=await execute('split',[source],{groups:'1-2;3'});const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());assert.equal(Object.keys(zip.files).length,2);assert.equal((await pdf.PDFDocument.load(await zip.file('ejemplo-1.pdf').async('uint8array'))).getPageCount(),2);});
test('rotation applies only to requested pages',async()=>{const result=await resultPdf('rotate',{pages:'2',rotation:90});assert.deepEqual(result.getPages().map(p=>p.getRotation().angle),[0,90,0]);});
test('crop changes box and rejects destructive dimensions',async()=>{const result=await resultPdf('crop',{margin:20});assert.deepEqual(result.getPage(0).getCropBox(),{x:20,y:20,width:460,height:660});await assert.rejects(()=>resultPdf('crop',{margin:300}));});
test('compression never returns a larger file',async()=>{const result=await execute('compress',[source],{quality:'lossless'});assert.ok(result.blob.size<=source.size);});
test('forms create a genuinely editable PDF field',async()=>{const result=await resultPdf('forms',{newField:'Nombre',newValue:'María',page:1});assert.equal(result.getForm().getTextField('Nombre').getText(),'María');});
test('text addition rejects blank text and overflow',async()=>{await assert.rejects(()=>resultPdf('edit',{text:'',x:10,y:10}));await assert.rejects(()=>resultPdf('edit',{text:'Este texto no cabe',x:95,y:10,size:90}));});
test('workflow merges then rotates and numbers',async()=>{const result=await resultPdf('workflow',{rotation:180,numbering:true},[source,source]);assert.equal(result.getPageCount(),6);assert.ok(result.getPages().every(p=>p.getRotation().angle===180));});
