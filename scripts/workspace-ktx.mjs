import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { KHRTextureBasisu } from '@gltf-transform/extensions';
import { listTextureSlots } from '@gltf-transform/functions';
import sharp from 'sharp';

const commit = '99f52d63aa6799cbdaecfe977111dc5ec3b31d47';
const files = { 'basis_encoder.cjs': ['basis_encoder.js','d225ce1e7012609bcfbe338351c8778d95eb1c19d404314d513b2b2df94a6ffb'], 'basis_encoder.wasm': ['basis_encoder.wasm','48d4e39ccaa1e290a17d00c13b353a728227bb439108d5e6c944fe6ab80552db'] };
const folder = new URL('./.cache/basis/',import.meta.url);
await mkdir(folder,{recursive:true});
for (const [name,[remote,hash]] of Object.entries(files)) {
  const path = new URL(name,folder); let bytes = await readFile(path).catch(()=>null);
  if (!bytes) { const response = await fetch(`https://raw.githubusercontent.com/BinomialLLC/basis_universal/${commit}/webgl/encoder/build/${remote}`); if (!response.ok) throw new Error('Basis encoder download failed'); bytes=Buffer.from(await response.arrayBuffer()); }
  if(createHash('sha256').update(bytes).digest('hex')!==hash) throw new Error(`Basis checksum mismatch: ${name}`);
  await writeFile(path,bytes);
}
const factory = createRequire(import.meta.url)(new URL('basis_encoder.cjs',folder).pathname.replace(/^\/(\w:)/,'$1'));
const basis = await factory({wasmBinary:await readFile(new URL('basis_encoder.wasm',folder)),print(){}}); basis.initializeBasis();
export const basisEncoderVersion = commit;
export async function compressWorkspaceTextures(doc,size) {
  let rgbaBytes = 0, compressedGPUBytes = 0;
  for (const texture of doc.getRoot().listTextures()) {
    const { data, info } = await sharp(texture.getImage()).resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const slots = listTextureSlots(texture), linear = slots.some(slot=>/normal|occlusion|metallicRoughness/i.test(slot)) && !slots.some(slot=>/baseColor|emissive/i.test(slot));
    const encoder = new basis.BasisEncoder();
    try {
      encoder.setCreateKTX2File(true); encoder.setUASTC(linear); encoder.setKTX2UASTCSupercompression(true);
      encoder.setStatusOutput(false); encoder.setPrintStats(false); encoder.setDebug(false);
      encoder.setQualityLevel(180); encoder.setETC1SCompressionLevel(1); encoder.setPerceptual(!linear); encoder.setKTX2AndBasisSRGBTransferFunc(!linear);
      encoder.setMipGen(true); encoder.setMipSRGB(!linear); encoder.setCheckForAlpha(true);
      encoder.setSliceSourceImage(0,data,info.width,info.height,false);
      const output = new Uint8Array(info.width*info.height*8+65536), length=encoder.encode(output);
      if (!length) throw new Error(`KTX2 encoding failed: ${texture.getName()}`);
      texture.setImage(output.slice(0,length)).setMimeType('image/ktx2');
      rgbaBytes += info.width*info.height*4*4/3;
      // Conservative 8-bit block-compressed estimate; unsupported GPUs may use RGBA.
      compressedGPUBytes += Math.ceil(info.width/4)*Math.ceil(info.height/4)*16*4/3;
    } finally { encoder.delete(); }
  }
  doc.createExtension(KHRTextureBasisu).setRequired(true);
  return { rgbaBytes:Math.round(rgbaBytes), compressedGPUBytes:Math.round(compressedGPUBytes) };
}
