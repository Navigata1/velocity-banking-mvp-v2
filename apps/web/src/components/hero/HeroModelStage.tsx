'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createHeroEnvironment } from './studio-environment';
import { heroAngleAt, heroFrameDistance, HERO_CAMERA_FOV, HERO_TURN_SECONDS } from './turntable';

interface Props { model: string; replay: number; onError: () => void; onReady: (ready: boolean) => void; }

export default function HeroModelStage({ model, replay, onError, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    onReady(false);
    let disposed = false, frame = 0;
    let object: THREE.Group | undefined;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { onError(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    let environment: THREE.WebGLRenderTarget;
    try { environment = createHeroEnvironment(renderer); }
    catch {
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      onError(); return;
    }
    scene.environment = environment.texture;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x414d52, 2.5));
    const key = new THREE.DirectionalLight(0xffffff, 4); key.position.set(-3, 6, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xb8d9e6, 3); rim.position.set(4, 3, -4); scene.add(rim);
    const camera = new THREE.PerspectiveCamera(HERO_CAMERA_FOV, 1, 0.1, 50);
    let center = new THREE.Vector3(0,1,0), radius = 1.8;
    const fitCamera = () => {
      camera.position.copy(center).add(new THREE.Vector3(3.3,1.35,4.8).normalize().multiplyScalar(heroFrameDistance(radius,camera.aspect)));
      camera.lookAt(center);
    };
    camera.position.set(3.3, 2.5, 4.8); camera.lookAt(0, 1.15, 0);
    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1);
      fitCamera();
      camera.updateProjectionMatrix(); render();
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contextLost = (event: Event) => { event.preventDefault(); onError(); };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    let elapsed = 0, previous = 0;
    const animate = (now: number) => {
      if (disposed || !object) return;
      if (!document.hidden && previous) elapsed += Math.min((now - previous) / 1000, 0.1);
      previous = now;
      object.rotation.y = heroAngleAt(elapsed); render();
      if (elapsed < HERO_TURN_SECONDS && !reduced.matches) frame = requestAnimationFrame(animate);
    };
    const manager = new THREE.LoadingManager();
    let assetFailed = false;
    manager.onError = url => {
      assetFailed = true;
      // Three revokes embedded-image URLs on success, but not on decode failure.
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    };
    new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).load(model, (gltf) => {
      // GLTFLoader can resolve a scene after a texture decode has failed.
      if (disposed || assetFailed) {
        disposeModel(gltf.scene);
        if (!disposed) onError();
        return;
      }
      object = gltf.scene; scene.add(object);
      const sphere = new THREE.Box3().setFromObject(object).getBoundingSphere(new THREE.Sphere());
      center = sphere.center; radius = sphere.radius; fitCamera();
      object.rotation.y = heroAngleAt(0); render();
      element.dataset.ready = 'true';
      onReady(true);
      if (!reduced.matches) frame = requestAnimationFrame(animate);
    }, undefined, () => { if (!disposed) onError(); });
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      if (object) disposeModel(object);
      environment.dispose(); renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [model, replay, onError, onReady]);
  return <div ref={host} data-testid="asset-hero-canvas" className="absolute inset-0 [&_canvas]:h-full [&_canvas]:w-full" aria-hidden="true" />;
}

function disposeModel(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const images = new Set<{ close: () => void }>();
  object.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  for (const texture of textures) {
    const data = texture.source.data;
    if (data && typeof data === 'object' && 'close' in data && typeof data.close === 'function') {
      images.add(data as { close: () => void });
    }
    texture.dispose();
  }
  images.forEach(image => image.close());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}
