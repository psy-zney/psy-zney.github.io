import { MeshBVH } from 'three-mesh-bvh';
import { BufferGeometry, BufferAttribute, Matrix4, Matrix3, Vector3, Ray, DoubleSide } from 'three';

/** Static geometric occlusion, baked into vertex colors, including a subtle key-light shadow. */
export function bakeWorkspaceLighting(doc) {
  const records = [], triangles = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const world = new Matrix4().fromArray(node.getWorldMatrix()), normalMatrix = new Matrix3().getNormalMatrix(world);
    for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION'), normals = primitive.getAttribute('NORMAL');
      if (!positions || !normals) continue;
      const vertices = [], normalVectors = [];
      for (let i = 0; i < positions.getCount(); i++) {
        vertices.push(new Vector3().fromArray(positions.getArray(), i * 3).applyMatrix4(world));
        normalVectors.push(new Vector3().fromArray(normals.getArray(), i * 3).applyMatrix3(normalMatrix).normalize());
      }
      const indices = primitive.getIndices()?.getArray();
      for (let i = 0; i < (indices?.length ?? vertices.length); i++) triangles.push(...vertices[indices ? indices[i] : i].toArray());
      records.push({ primitive, positions, vertices, normalVectors });
    }
  }
  const geometry = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(triangles), 3));
  const bvh = new MeshBVH(geometry, { maxLeafSize: 12 });
  const done = new Set(), light = new Vector3(15,25,15), ray = new Ray();
  const offsets = [[0,0,1],[.65,0,.76],[-.65,0,.76],[0,.65,.76],[0,-.65,.76]];
  for (const { primitive, positions, vertices, normalVectors } of records) {
    if (done.has(primitive)) continue; done.add(primitive);
    const old = primitive.getAttribute('COLOR_0'), originalColor = [1,1,1,1], colors = new Float32Array(vertices.length * 3);
    for (let i = 0; i < vertices.length; i++) {
      const normal = normalVectors[i], tangent = new Vector3(0,1,0).cross(normal);
      if (tangent.lengthSq() < .01) tangent.set(1,0,0); tangent.normalize();
      const bitangent = normal.clone().cross(tangent).normalize();
      ray.origin.copy(vertices[i]).addScaledVector(normal,.018);
      let occluded = 0;
      for (const [x,y,z] of offsets) {
        ray.direction.copy(normal).multiplyScalar(z).addScaledVector(tangent,x).addScaledVector(bitangent,y).normalize();
        if (bvh.raycastFirst(ray,DoubleSide,.012,1.8)) occluded++;
      }
      ray.direction.copy(light).sub(ray.origin).normalize();
      const shadow = normal.dot(ray.direction) > 0 && bvh.raycastFirst(ray,DoubleSide,.025,light.distanceTo(ray.origin));
      const shade = 1 - .24 * occluded / offsets.length - (shadow ? .06 : 0);
      if (old) old.getElement(i,originalColor);
      for (let channel = 0; channel < 3; channel++) colors[i*3+channel] = shade * originalColor[channel];
    }
    primitive.setAttribute('COLOR_0',doc.createAccessor('Baked static AO').setType('VEC3').setArray(colors).setBuffer(positions.getBuffer()));
  }
  geometry.dispose();
}
