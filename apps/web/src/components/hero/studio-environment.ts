import * as THREE from 'three';

// Reflection cards, not visible scene decoration. Shared by web and video.
export function createHeroEnvironment(renderer: THREE.WebGLRenderer, model?: string): THREE.WebGLRenderTarget {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#15191c');
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const index = (y * 64 + x) * 4;
    const luminance = Math.round(255 * Math.pow(Math.sin(Math.PI * (x + 0.5) / 64) * Math.sin(Math.PI * (y + 0.5) / 64), 0.6));
    pixels[index] = pixels[index + 1] = pixels[index + 2] = luminance;
    pixels[index + 3] = 255;
  }
  const diffusion = new THREE.DataTexture(pixels, 64, 64);
  diffusion.magFilter = diffusion.minFilter = THREE.LinearFilter;
  diffusion.needsUpdate = true;
  const cards: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  const card = (width: number, height: number, position: [number, number, number], intensity: number) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity), map: diffusion, side: THREE.DoubleSide }),
    );
    mesh.position.set(...position);
    mesh.lookAt(0, 1, 0);
    studio.add(mesh);
    cards.push(mesh);
  };
  card(5, 7, [-4, 1, 5], 2.4);
  card(2, 5, [5, 2, 2], 1.7);
  card(4, 2, [0, -2, 4], 1);
  card(6, 1.5, [0, 5, 0], 4);
  card(1.5, 4, [-2, 2, -5], 2.5);
  // Narrow rear reflection preserves the Card's silver-face gradient through its turn.
  if (model === '/heroes/creditCard.glb') {
    card(1.5, 3, [3.73215474204762, -2.468225341834624, 3.997359709025046], 1.2);
  }
  let pmrem: THREE.PMREMGenerator | undefined;
  try {
    pmrem = new THREE.PMREMGenerator(renderer);
    return pmrem.fromScene(studio, 0.025, 0.1, 30);
  } finally {
    pmrem?.dispose();
    diffusion.dispose();
    for (const mesh of cards) { mesh.geometry.dispose(); mesh.material.dispose(); }
  }
}
