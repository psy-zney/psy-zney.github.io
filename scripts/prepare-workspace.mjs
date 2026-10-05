import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, flatten, join, weld, simplify, meshopt, textureCompress, getBounds, palette } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { bakeWorkspaceLighting } from './workspace-baking.mjs';
import { compressWorkspaceTextures, basisEncoderVersion } from './workspace-ktx.mjs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const original = await readFile('public/model/main.glb');
const originalDoc = await io.readBinary(original);
const definitions = { paper: ['StackOfPaper', 'Paper'], lanyard: ['id_key_lanyard_x-lab.glb'], bookshelf: ['bookshelf_cc0.glb'], screen: ['MY_SCREEN'] };
const anchors = {};
for (const [id, names] of Object.entries(definitions)) {
  const nodes = originalDoc.getRoot().listNodes().filter(node => names.includes(node.getName()));
  if (!nodes.length) throw new Error(`Missing ${id} anchor`);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const node of nodes) {
    const bounds = getBounds(node);
    for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], bounds.min[axis]); max[axis] = Math.max(max[axis], bounds.max[axis]); }
    node.traverse(child => child.setExtras({ ...child.getExtras(), workspaceItem: id }));
  }
  anchors[id] = { names, min, max, center: min.map((v, axis) => (v + max[axis]) / 2) };
}
await mkdir('public/model', { recursive: true });
const configs = { low: { size: 512, ratio: .20, error: .005, quality: 66 }, medium: { size: 768, ratio: .55, error: .001, quality: 78 }, high: { size: 2048, ratio: .65, error: .001, quality: 86 } };
const assets = {};
for (const [tier, config] of Object.entries(configs)) {
  const doc = await io.readBinary(await io.writeBinary(originalDoc));
  await doc.transform(dedup(), palette({ min: 3 }), flatten(), join({ filter: node => !node.getExtras().workspaceItem }),
    ...Object.keys(definitions).map(id => join({ filter: node => node.getExtras().workspaceItem === id })), weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: config.ratio, error: config.error, lockBorder: true }),
    prune({ keepLeaves: true }));
  bakeWorkspaceLighting(doc);
  const textures = await compressWorkspaceTextures(doc,config.size);
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const path = `public/model/workspace-${tier}.glb`;
  const bytes = await io.writeBinary(doc); await writeFile(path, bytes);
  const triangleCount = doc.getRoot().listMeshes().reduce((count, mesh) => count + mesh.listPrimitives().reduce((n, primitive) => n + (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION')?.getCount() ?? 0) / 3, 0), 0);
  assets[tier] = { path: `./model/workspace-${tier}.glb`, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), meshes: doc.getRoot().listMeshes().length, materials: doc.getRoot().listMaterials().length, triangles: Math.round(triangleCount), textureGPUBytesEstimate: textures.rgbaBytes, compressedTextureGPUBytesEstimate: textures.compressedGPUBytes, textureLimit: config.size, textureFormat: 'ktx2', compression: 'EXT_meshopt_compression', lighting: 'baked vertex AO and key-light contact shadow' };
  console.log(`${tier}: ${(bytes.length / 1e6).toFixed(2)} MB, ${assets[tier].meshes} meshes, ${Math.round(triangleCount)} triangles`);
}
await writeFile('src/data/workspaceAssets.json', JSON.stringify({ version: 1, original: { bytes: original.length, sha256: createHash('sha256').update(original).digest('hex') }, anchors, assets }, null, 2) + '\n');
await writeFile('public/model/workspace-manifest.json', JSON.stringify({ source: 'main.glb, existing owner-provided asset; original retained', optimizer: '@gltf-transform 4.5.1 / meshoptimizer / sharp / static BVH AO', textures: 'KTX2 ETC1S color / UASTC linear, mipmaps; local decoder selects GPU format with RGBA fallback', basisEncoderVersion, anchors, assets }, null, 2) + '\n');
if (await stat('docs/qa/room-poster-source.png').catch(() => null)) await sharp('docs/qa/room-poster-source.png').resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 70 }).toFile('public/img/workspace-poster.webp');
