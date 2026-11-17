import test from 'node:test';
import assert from 'node:assert/strict';
import {box,parseBoxes,tagMetaVideo,metaProfile} from '../js/meta-profile.js';
const concat=(...parts)=>new Uint8Array(Buffer.concat(parts));
function fixture(front=false,open=false){
 const mdat=box('mdat',new Uint8Array([11,22,33,44]));if(open)new DataView(mdat.buffer).setUint32(0,0);
 const ftyp=box('ftyp',new TextEncoder().encode('isom\0\0\0\0isom'));
 const offset=new Uint8Array(12);new DataView(offset.buffer).setUint32(4,1);
 let moov=box('moov',box('trak',box('stco',offset)),box('udta',box('name',new TextEncoder().encode('Keep me'))));
 new DataView(offset.buffer).setUint32(8,ftyp.length+(front?moov.length:0)+8);
 moov=box('moov',box('trak',box('stco',offset)),box('udta',box('name',new TextEncoder().encode('Keep me'))));
 return new File([ftyp,...(front?[moov,mdat]:[mdat,moov])],'clip.mp4',{type:'video/mp4'});
}
for(const front of [false,true])test(`Video tagging preserves media bytes, offsets and track tables (moov ${front?'first':'last'})`,async()=>{
 const file=fixture(front),before=new Uint8Array(await file.arrayBuffer()),after=new Uint8Array(await(await tagMetaVideo(file)).arrayBuffer());
 const a=parseBoxes(before),b=parseBoxes(after),am=a.find(n=>n.type==='mdat'),bm=b.find(n=>n.type==='mdat');
 assert.equal(am.start,bm.start);assert.deepEqual(after.slice(bm.start,bm.end),before.slice(am.start,am.end));
 const old=a.find(n=>n.type==='moov'),updated=b.find(n=>n.type==='moov'),oldTrak=parseBoxes(before,old.start+old.header,old.end).find(n=>n.type==='trak'),newTrak=parseBoxes(after,updated.start+updated.header,updated.end).find(n=>n.type==='trak');
 assert.deepEqual(after.slice(newTrak.start,newTrak.end),before.slice(oldTrak.start,oldTrak.end));
 const text=new TextDecoder().decode(after.slice(updated.start,updated.end));assert.ok(text.includes(metaProfile.comment));assert.ok(text.includes('Keep me'));assert.equal(b.filter(n=>n.type==='moov').length,1);
});
test('Open-ended mdat is closed before appending new moov',async()=>{const file=fixture(true,true),out=new Uint8Array(await(await tagMetaVideo(file)).arrayBuffer());assert.equal(parseBoxes(out).at(-1).type,'moov');});
test('Repeated tagging leaves one active profile',async()=>{let file=fixture(true);file=new File([await tagMetaVideo(file)],'tagged.mp4');const out=new Uint8Array(await(await tagMetaVideo(file)).arrayBuffer()),moov=parseBoxes(out).find(n=>n.type==='moov');assert.equal(parseBoxes(out,moov.start+moov.header,moov.end).filter(n=>n.type==='meta').length,1);});
test('Rejects invalid and fragmented containers',async()=>{await assert.rejects(()=>tagMetaVideo(new File(['invalid'],'fake.mp4')));const source=fixture(),file=new File([source,box('moof')],'fragment.mp4');await assert.rejects(()=>tagMetaVideo(file),/fragmentado/);});
