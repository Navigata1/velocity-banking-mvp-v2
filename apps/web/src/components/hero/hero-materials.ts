import * as THREE from 'three';

const refined = new WeakSet<THREE.Object3D>();

export function refineHeroMaterials(scene: THREE.Object3D, model: string): void {
  const car = model === '/heroes/car.glb', card = model === '/heroes/creditCard.glb';
  if ((!car && !card) || refined.has(scene)) return;
  const names = car ? ['Paint 1 Carmine', 'Paint 2 Carmine'] : ['CC-Brushed-Silver'];
  const materials = new Set<THREE.Material>();
  scene.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (names.includes(material.name)) materials.add(material);
    }
  });
  if (!names.every(name => [...materials].some(material => material.name === name))) {
    throw new Error(car ? 'Car paint material missing.' : 'Card silver material missing.');
  }
  const paint = [...materials];
  for (const material of paint) {
    if (car && (!(material instanceof THREE.MeshStandardMaterial) || !material.normalMap ||
        !material.normalScale.toArray().every(Number.isFinite))) throw new Error('Invalid Car paint normal binding.');
    if (card && (!(material instanceof THREE.MeshPhysicalMaterial) || !Number.isFinite(material.anisotropy) ||
        material.anisotropy < 0 || material.anisotropy > 1)) throw new Error('Invalid Card silver anisotropy.');
  }
  // Presentation adaptation only: retain authored maps, tiling, signs and zeros.
  for (const material of paint) {
    if (car) (material as THREE.MeshStandardMaterial).normalScale.multiplyScalar(0.5);
    else (material as THREE.MeshPhysicalMaterial).anisotropy = 0.3;
  }
  refined.add(scene);
}
