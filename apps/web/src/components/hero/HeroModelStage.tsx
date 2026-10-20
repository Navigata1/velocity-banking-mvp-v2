'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { heroAngleAt, heroFrameDistance, HERO_CAMERA_FOV, HERO_TURN_SECONDS } from './turntable';

interface Props { model: string; replay: number; onError: () => void; }

export default function HeroModelStage({ model, replay, onError }: Props) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
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
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose(); pmrem.dispose();
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
    new GLTFLoader().load(model, (gltf) => {
      if (disposed) { disposeModel(gltf.scene); return; }
      object = gltf.scene; scene.add(object);
      const sphere = new THREE.Box3().setFromObject(object).getBoundingSphere(new THREE.Sphere());
      center = sphere.center; radius = sphere.radius; fitCamera();
      object.rotation.y = heroAngleAt(0); render();
      element.dataset.ready = 'true';
      if (!reduced.matches) frame = requestAnimationFrame(animate);
    }, undefined, () => { if (!disposed) onError(); });
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      if (object) disposeModel(object);
      environment.dispose(); renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [model, replay, onError]);
  return <div ref={host} data-testid="asset-hero-canvas" className="absolute inset-0 [&_canvas]:h-full [&_canvas]:w-full" aria-hidden="true" />;
}

function disposeModel(object: THREE.Object3D) {
  object.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach(material => material.dispose());
  });
}
