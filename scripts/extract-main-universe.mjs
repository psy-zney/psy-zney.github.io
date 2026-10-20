import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const bytes = await readFile('public/model/main.glb');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.readBinary(bytes), root = doc.getRoot();
const sky = root.listNodes().find(n => n.getName() === 'Sphere_0');
if (!sky || sky.listChildren()[0]?.getMesh()?.listPrimitives()[0]?.getMaterial()?.getName() !== 'material') throw new Error('Original sky anchor changed; inspect it before extraction.');
const scene = root.listScenes()[0];
for (const node of scene.listChildren()) scene.removeChild(node);
sky.getParentNode()?.removeChild(sky);
scene.addChild(sky);
sky.setTranslation([0,0,0]).setRotation([0,0,0,1]).setScale([1,1,1]);
for (const material of root.listMaterials()) {
  if (material.getName() !== 'material') continue;
  const image = material.getEmissiveTexture(); if (!image) throw new Error('Original sky map is missing.');
  const source = image.getImage(), metadata = await sharp(source).metadata();
  const compressed = await sharp(source).resize({width:4096,withoutEnlargement:true}).png().toBuffer();
  image.setImage(compressed).setMimeType('image/png');
  await mkdir('artifacts/blender-universe',{recursive:true});
  await writeFile('artifacts/blender-universe/source.json',JSON.stringify({source:'public/model/main.glb',sourceSha256:createHash('sha256').update(bytes).digest('hex'),anchor:'Sphere_0',textureSource:{width:metadata.width,height:metadata.height},removed:'All other scene branches; original asset unchanged'},null,2));
}
await doc.transform(prune());
await io.write('artifacts/blender-universe/sky-input.glb',doc);
console.log('Extracted the original Sphere_0 and its UV/texture for Blender.');
