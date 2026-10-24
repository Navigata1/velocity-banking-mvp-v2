import * as THREE from 'three';
import type { HeroRotationBounds } from './turntable';

// Measure referenced static geometry once, before rotating the loaded scene about world origin.
export function measureHeroRotationBounds(root: THREE.Object3D): HeroRotationBounds {
  root.updateWorldMatrix(true, true);
  const referenced = new Map<THREE.BufferGeometry, number[]>();
  const batches: { mesh: THREE.Mesh; indices: number[]; instances: number }[] = [];
  let count = 0;
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    if (node instanceof THREE.SkinnedMesh || Object.values(node.geometry.morphAttributes).some(values => !Array.isArray(values) || values.length > 0)) {
      throw new RangeError('Hero framing requires static geometry.');
    }
    const position = node.geometry.getAttribute('position');
    if (!position || position.itemSize !== 3 || !position.count) throw new RangeError('Empty hero positions.');
    let indices = referenced.get(node.geometry);
    if (!indices) {
      const index = node.geometry.getIndex(), used = new Set<number>();
      for (let i = 0; i < (index?.count ?? position.count); i++) {
        const vertex = index ? index.getX(i) : i;
        if (!Number.isInteger(vertex) || vertex < 0 || vertex >= position.count) throw new RangeError('Invalid hero vertex reference.');
        used.add(vertex);
      }
      indices = [...used]; referenced.set(node.geometry, indices);
    }
    const instances = node instanceof THREE.InstancedMesh ? node.count : 1;
    batches.push({ mesh: node, indices, instances }); count += indices.length * instances;
  });
  if (!count) throw new RangeError('Empty hero geometry.');
  const profile = new Float64Array(count * 2), point = new THREE.Vector3();
  const world = new THREE.Matrix4(), instance = new THREE.Matrix4();
  let minY = Infinity, maxY = -Infinity, offset = 0;
  for (const { mesh, indices, instances } of batches) for (let i = 0; i < instances; i++) {
    world.copy(mesh.matrixWorld);
    if (mesh instanceof THREE.InstancedMesh) { mesh.getMatrixAt(i, instance); world.multiply(instance); }
    const position = mesh.geometry.getAttribute('position');
    for (const vertex of indices) {
      point.fromBufferAttribute(position, vertex).applyMatrix4(world);
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) throw new RangeError('Nonfinite hero geometry.');
      profile[offset++] = Math.hypot(point.x, point.z); profile[offset++] = point.y;
      minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
    }
  }
  return { minY, maxY, profile };
}
