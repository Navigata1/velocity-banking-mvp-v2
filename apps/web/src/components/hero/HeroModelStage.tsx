'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createHeroEnvironment } from './studio-environment';
import { measureHeroRotationBounds } from './hero-geometry-bounds';
import { refineHeroMaterials } from './hero-materials';
import { configureHouseInstances } from './house-instances';
import { heroAngleAt, heroFrameDistance, HERO_CAMERA_FOV, HERO_CAMERA_OFFSET, HERO_CAMERA_NEAR, HERO_CAMERA_FAR, HERO_TURN_SECONDS, type HeroRotationBounds } from './turntable';

interface Props { model: string; replay: number; onError: () => void; onReady: (ready: boolean) => void; }

export default function HeroModelStage({ model, replay, onError, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const restartTurn = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    onReady(false);
    let disposed = false, frame = 0;
    let object: THREE.Group | undefined;
    let releaseInstances: (() => void) | undefined;
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
    try { environment = createHeroEnvironment(renderer, model); }
    catch {
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      onError(); return;
    }
    scene.environment = environment.texture;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x414d52, 2.5));
    const key = new THREE.DirectionalLight(0xffffff, 4); key.position.set(-3, 6, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xb8d9e6, 3); rim.position.set(4, 3, -4); scene.add(rim);
    const camera = new THREE.PerspectiveCamera(HERO_CAMERA_FOV, 1, HERO_CAMERA_NEAR, HERO_CAMERA_FAR);
    const center = new THREE.Vector3(0,1,0);
    let bounds: HeroRotationBounds | undefined;
    const fitCamera = () => {
      if (!bounds) return true;
      try {
        center.set(0, (bounds.minY + bounds.maxY) / 2, 0);
        camera.position.copy(center).add(new THREE.Vector3(...HERO_CAMERA_OFFSET).normalize().multiplyScalar(heroFrameDistance(bounds,camera.aspect)));
        camera.lookAt(center);
        return true;
      } catch { onError(); return false; }
    };
    camera.position.set(3.3, 2.5, 4.8); camera.lookAt(0, 1.15, 0);
    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false); camera.aspect = width / height;
      if (!fitCamera()) return;
      camera.updateProjectionMatrix(); render();
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contextLost = (event: Event) => { event.preventDefault(); onError(); };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    let elapsedMs = 0, previous: number | undefined;
    const visibilityChanged = () => { previous = undefined; };
    document.addEventListener('visibilitychange', visibilityChanged);
    const animate = (now: number) => {
      if (disposed || !object) return;
      if (!document.hidden && previous !== undefined) elapsedMs += Math.max(now - previous, 0);
      previous = now;
      object.rotation.y = heroAngleAt(elapsedMs / 1000); render();
      if (elapsedMs < HERO_TURN_SECONDS * 1000 && !reduced.matches) frame = requestAnimationFrame(animate);
    };
    const restart = () => {
      if (disposed || !object) return;
      cancelAnimationFrame(frame);
      elapsedMs = 0; previous = undefined;
      object.rotation.y = heroAngleAt(0); render();
      if (!reduced.matches) frame = requestAnimationFrame(animate);
    };
    restartTurn.current = restart;
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
      try {
        refineHeroMaterials(gltf.scene, model); bounds = measureHeroRotationBounds(gltf.scene);
        releaseInstances = configureHouseInstances({ THREE, scene: gltf.scene, model });
      }
      catch { disposeModel(gltf.scene); onError(); return; }
      object = gltf.scene; scene.add(object);
      if (!fitCamera()) return;
      restart();
      element.dataset.ready = 'true';
      onReady(true);
    }, undefined, () => { if (!disposed) onError(); });
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      restartTurn.current = undefined;
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      try { releaseInstances?.(); }
      finally {
        if (object) disposeModel(object);
        environment.dispose(); renderer.dispose(); renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };
  }, [model, onError, onReady]);
  useEffect(() => { restartTurn.current?.(); }, [replay]);
  return <div ref={host} data-testid="asset-hero-canvas" className="absolute inset-0 [&_canvas]:h-full [&_canvas]:w-full" aria-hidden="true" />;
}

function disposeModel(object: THREE.Object3D) {
  const instances = new Set<THREE.InstancedMesh>();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const images = new Set<{ close: () => void }>();
  object.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    if (node instanceof THREE.InstancedMesh) instances.add(node);
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
  instances.forEach(instance => instance.dispose());
}
