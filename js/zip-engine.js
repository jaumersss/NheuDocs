export function shiftZipOffsets(zipBuffer, prependOffset) {
      const bytes = new Uint8Array(zipBuffer.slice(0));
      const view = new DataView(bytes.buffer);
      const len = bytes.length;
      if (len < 22) {
        throw new Error("L'arxiu ZIP és massa petit o està malmès.");
      }

      // 1. Locate End of Central Directory (EOCD: PK\x05\x06)
      const minPos = Math.max(0, len - 22 - 65535);
      let eocdPos = -1;
      for (let i = len - 22; i >= minPos; i--) {
        if (view.getUint32(i, true) === 0x06054b50) {
          const commentLen = view.getUint16(i + 20, true);
          if (i + 22 + commentLen === len) {
            eocdPos = i;
            break;
          }
        }
      }
      if (eocdPos === -1) {
        for (let i = len - 22; i >= minPos; i--) {
          if (view.getUint32(i, true) === 0x06054b50) {
            eocdPos = i;
            break;
          }
        }
      }
      if (eocdPos === -1) {
        throw new Error("No s'ha trobat cap estructura ZIP vàlida (EOCD).");
      }

      const cdSize32 = view.getUint32(eocdPos + 12, true);
      const recordedCdOffset32 = view.getUint32(eocdPos + 16, true);

      // 2. Check for Zip64 EOCD Locator (PK\x06\x07) immediately before EOCD
      let hasZip64 = false;
      let zip64EocdPos = -1;
      let cdSize = cdSize32;
      let recordedCdOffset = recordedCdOffset32;

      if (eocdPos >= 20 && view.getUint32(eocdPos - 20, true) === 0x07064b50) {
        const locPos = eocdPos - 20;
        const recZip64Off = Number(view.getBigUint64(locPos + 8, true));
        if (recZip64Off >= 0 && recZip64Off + 56 <= locPos && view.getUint32(recZip64Off, true) === 0x06064b50) {
          zip64EocdPos = recZip64Off;
        } else if (locPos >= 56 && view.getUint32(locPos - 56, true) === 0x06064b50) {
          zip64EocdPos = locPos - 56;
        } else {
          for (let p = locPos - 56; p >= Math.max(0, locPos - 4096); p--) {
            if (view.getUint32(p, true) === 0x06064b50) {
              const recLen = Number(view.getBigUint64(p + 4, true));
              if (p + 12 + recLen === locPos) {
                zip64EocdPos = p;
                break;
              }
            }
          }
        }
        if (zip64EocdPos !== -1) {
          hasZip64 = true;
          cdSize = Number(view.getBigUint64(zip64EocdPos + 40, true));
          recordedCdOffset = Number(view.getBigUint64(zip64EocdPos + 48, true));
        }
      }

      // 3. Locate actual start of Central Directory in bytes
      const cdEndPos = hasZip64 ? zip64EocdPos : eocdPos;
      let actualCdPos = -1;
      if (cdSize === 0) {
        actualCdPos = cdEndPos;
      } else if (cdEndPos >= cdSize && view.getUint32(cdEndPos - cdSize, true) === 0x02014b50) {
        actualCdPos = cdEndPos - cdSize;
      } else if (recordedCdOffset >= 0 && recordedCdOffset + 46 <= cdEndPos && view.getUint32(recordedCdOffset, true) === 0x02014b50) {
        actualCdPos = recordedCdOffset;
      } else {
        throw new Error("No s'ha pogut localitzar el Directori Central del ZIP.");
      }

      const sourceShift = actualCdPos - recordedCdOffset;

      // 4. Shift every Central Directory entry's relative offset of local header
      let pos = actualCdPos;
      const cdLimit = actualCdPos + cdSize;
      while (pos < cdLimit) {
        if (pos + 46 > cdLimit || view.getUint32(pos, true) !== 0x02014b50) {
          throw new Error("Estructura del Directori Central ZIP corrupta.");
        }
        const fnameLen = view.getUint16(pos + 28, true);
        const extraLen = view.getUint16(pos + 30, true);
        const commentLen = view.getUint16(pos + 32, true);
        const compSize32 = view.getUint32(pos + 20, true);
        const uncompSize32 = view.getUint32(pos + 24, true);
        const localOffset32 = view.getUint32(pos + 42, true);

        if (localOffset32 !== 0xffffffff) {
          let baseLocal = localOffset32;
          if (sourceShift !== 0 && baseLocal + sourceShift >= 0 && baseLocal + sourceShift + 4 <= actualCdPos &&
              view.getUint32(baseLocal + sourceShift, true) === 0x04034b50) {
            baseLocal += sourceShift;
          }
          const newLocalOffset = baseLocal + prependOffset;
          if (newLocalOffset > 0xffffffff) {
            throw new Error("L'arxiu supera el límit de 4 GB sense Zip64.");
          }
          view.setUint32(pos + 42, newLocalOffset, true);
        } else {
          let ep = pos + 46 + fnameLen;
          const extraEnd = ep + extraLen;
          while (ep + 4 <= extraEnd) {
            const headerId = view.getUint16(ep, true);
            const dataSize = view.getUint16(ep + 2, true);
            if (headerId === 0x0001) {
              let fOff = ep + 4;
              if (uncompSize32 === 0xffffffff) fOff += 8;
              if (compSize32 === 0xffffffff) fOff += 8;
              if (fOff + 8 <= ep + 4 + dataSize) {
                let baseLocal64 = Number(view.getBigUint64(fOff, true));
                if (sourceShift !== 0 && baseLocal64 + sourceShift >= 0 && baseLocal64 + sourceShift + 4 <= actualCdPos &&
                    view.getUint32(baseLocal64 + sourceShift, true) === 0x04034b50) {
                  baseLocal64 += sourceShift;
                }
                view.setBigUint64(fOff, BigInt(baseLocal64 + prependOffset), true);
              }
              break;
            }
            ep += 4 + dataSize;
          }
        }

        pos += 46 + fnameLen + extraLen + commentLen;
      }

      // 5. Update EOCD and Zip64 EOCD / Locator offsets
      const newCdOffset = actualCdPos + prependOffset;
      if (recordedCdOffset32 !== 0xffffffff) {
        if (newCdOffset > 0xffffffff) {
          throw new Error("L'arxiu supera el límit de 4 GB sense Zip64.");
        }
        view.setUint32(eocdPos + 16, newCdOffset, true);
      }
      if (hasZip64) {
        view.setBigUint64(eocdPos - 20 + 8, BigInt(zip64EocdPos + prependOffset), true);
        view.setBigUint64(zip64EocdPos + 48, BigInt(newCdOffset), true);
      }

      return new Blob([bytes], { type: 'application/zip' });
    }

function safeName(name){if(name.startsWith('/')||name.includes('\\')||name.split('/').includes('..'))throw new Error('El ZIP contiene una ruta no válida.');return name;}
export async function executeZip(id,files,options,progress=()=>{}){
 const z=globalThis.zip;z.configure({useWebWorkers:false});
 const password=options.password||undefined;
 let image=null,payload=files,offset=0;
 if(id==='zip-fuse'){
  if(files.length<2)throw new Error('Añade una imagen y al menos un archivo.');
  image=files[0];const b=new Uint8Array(await image.slice(0,8).arrayBuffer());
  const png=b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71, jpg=b[0]===255&&b[1]===216&&b[2]===255;
  if(!png&&!jpg)throw new Error('El primer archivo debe ser una imagen JPG o PNG válida.');
  image={file:image,mime:png?'image/png':'image/jpeg',ext:png?'png':'jpg'};offset=image.file.size;payload=files.slice(1);
  if(payload.length===1&&/\.zip$/i.test(payload[0].name)&&!password){
   const shifted=shiftZipOffsets(await payload[0].arrayBuffer(),offset);
   return {blob:new Blob([image.file,shifted],{type:image.mime}),name:`${image.file.name.replace(/\.[^.]+$/,'')}-fusion.${image.ext}`};
  }
 }
 const extracting=id==='zip-extract'||id==='zip-open';
 const writer=new z.ZipWriter(new z.BlobWriter('application/zip'),{password:extracting?undefined:password,encryptionStrength:3,zipCrypto:false,offset,bufferedWrite:true});
 const used=new Set();let count=0;
 async function add(name,blob,directory=false){
  safeName(name);if(used.has(name))throw new Error(`Nombre duplicado en el ZIP: ${name}`);used.add(name);
  if(++count>1000)throw new Error('El contenido supera 1.000 entradas.');
  await writer.add(name,blob?new z.BlobReader(blob):undefined,{directory});
 }
 try{
 for(let i=0;i<payload.length;i++){
  const file=payload[i];progress(i/payload.length*90,'Preparando ZIP…');
  if(extracting||(id==='zip-fuse'&&/\.zip$/i.test(file.name))){
   const reader=new z.ZipReader(new z.BlobReader(file));
   try{
    const entries=await reader.getEntries();if(!entries.length)throw new Error('No se encontraron archivos ZIP.');
    if(entries.length>1000)throw new Error('El ZIP supera el límite de 1.000 entradas.');
    for(const entry of entries){safeName(entry.filename);
     if(!extracting&&entry.encrypted)throw new Error('Extrae primero el ZIP cifrado con su contraseña original.');
     const blob=entry.directory?null:await entry.getData(new z.BlobWriter(),{password:extracting?password:undefined});
     await add(entry.filename,blob,entry.directory);
    }
   }finally{await reader.close();}
  }else await add(file.name,file);
 }
 const blob=await writer.close();
 return image?{blob:new Blob([image.file,blob],{type:image.mime}),name:`${image.file.name.replace(/\.[^.]+$/,'')}-fusion.${image.ext}`}:{blob,name:extracting?'archivos-extraidos.zip':'archivos.zip',note:extracting?'ZIP extraído sin contraseña. Puedes abrirlo con el gestor de archivos de tu dispositivo.':password?'ZIP protegido con AES-256. Conserva la contraseña para poder recuperarlo.':''};
 }catch(error){try{await writer.close();}catch{}throw new Error(/password|encrypted|Invalid signature/i.test(error.message)?'Contraseña incorrecta o archivo cifrado dañado.':error.message);}
}
