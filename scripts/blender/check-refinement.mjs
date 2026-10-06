import assert from 'node:assert/strict';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const before = await io.read('public/model/main.glb');
const after = await io.read('artifacts/blender/workspace-refined-source.glb');
const names = ['Cube001', 'Cube002', 'Cube006', 'Cube007', 'Cube008', 'Cube009', 'Cube010', 'MY_SCREEN', 'StackOfPaper', 'Paper', 'bookshelf_cc0.glb', 'id_key_lanyard_x-lab.glb'];
for (const name of names) {
  const original = before.getRoot().listNodes().find(n => n.getName() === name);
  const refined = after.getRoot().listNodes().find(n => n.getName() === name);
  assert(original && refined, `Preserved node ${name}`);
  const a = getBounds(original), b = getBounds(refined);
  for (const key of ['min', 'max']) for (let axis=0; axis<3; axis++) {
    assert(Math.abs(a[key][axis]-b[key][axis]) < .002, `${name} ${key}[${axis}] remains in place`);
  }
}
const screen = doc => {
  const root = doc.getRoot().listNodes().find(n => n.getName() === 'MY_SCREEN');
  let primitive;
  root.traverse(n => { if (n.getMesh()) primitive = n.getMesh().listPrimitives()[0]; });
  return primitive;
};
for (const attribute of ['POSITION', 'TEXCOORD_0']) {
  const a=screen(before).getAttribute(attribute).getArray(), b=screen(after).getAttribute(attribute).getArray();
  assert.equal(a.length, b.length, `Preserved screen ${attribute} length`);
  assert(a.every((v,i)=>Math.abs(v-b[i])<.00001), `Preserved screen ${attribute} values`);
}
console.log('Blender refinement: 12 object bounds and screen geometry/UVs preserved.');
