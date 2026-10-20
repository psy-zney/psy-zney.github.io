import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, textureCompress } from '@gltf-transform/functions';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const path='public/model/universe-only.glb';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read(path);
await doc.transform(textureCompress({encoder:sharp,targetFormat:'webp',quality:90}),prune());
await io.write(path,doc);
const source=JSON.parse(await readFile('artifacts/blender-universe/source.json','utf8'));
const bytes=await readFile(path);
const manifest={source:source.source,sourceSha256:source.sourceSha256,asset:'./model/universe-only.glb',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),mesh:'MainUniverseSky',meshCount:1,camera:[0,0,0],radius:1000};
await writeFile('public/model/universe-only.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Universe sky: ${(bytes.length/1024**2).toFixed(2)} MiB; original main.glb preserved.`);
