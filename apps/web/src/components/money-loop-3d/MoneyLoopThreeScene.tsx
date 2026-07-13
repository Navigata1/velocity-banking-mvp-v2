'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group, Vector3Tuple } from 'three';
import type { MoneyLoopVisualArtifact } from '@/app/artifact-visual-contract';
import { artifactMeshFactories } from './artifact-meshes';

interface MoneyLoopThreeSceneProps {
  artifacts: MoneyLoopVisualArtifact[];
  activeArtifactId: MoneyLoopVisualArtifact['id'];
  onSelect: (id: MoneyLoopVisualArtifact['id']) => void;
}

const artifactPositions: Record<MoneyLoopVisualArtifact['id'], Vector3Tuple> = {
  income: [0, 1.4, 0],
  loc: [1.55, 0.42, 0],
  expenses: [0.94, -1.3, 0],
  'cash-flow': [-0.94, -1.3, 0],
  principal: [-1.55, 0.42, 0],
};

const cameraPositions: Record<MoneyLoopVisualArtifact['id'], Vector3Tuple> = {
  income: [0, 0.65, 7.2],
  loc: [0.58, 0.22, 7.2],
  expenses: [0.38, -0.38, 7.2],
  'cash-flow': [-0.38, -0.38, 7.2],
  principal: [-0.58, 0.22, 7.2],
};

function SelectionRig({ activeArtifact, children }: { activeArtifact: MoneyLoopVisualArtifact; children: ReactNode }) {
  const groupRef = useRef<Group>(null);
  const previousArtifactId = useRef(activeArtifact.id);
  const transitionStartedAt = useRef<number | null>(null);
  const pendingTransition = useRef(false);
  const startingCameraPosition = useRef<Vector3Tuple>([0, 0, 7.2]);
  const startingRotation = useRef(0);
  const { invalidate } = useThree();

  useEffect(() => {
    if (previousArtifactId.current === activeArtifact.id) return;

    previousArtifactId.current = activeArtifact.id;
    pendingTransition.current = true;
    invalidate();
  }, [activeArtifact.id, invalidate]);

  useFrame(({ camera, clock, invalidate: requestFrame }) => {
    if (pendingTransition.current) {
      pendingTransition.current = false;
      transitionStartedAt.current = clock.elapsedTime;
      startingCameraPosition.current = [camera.position.x, camera.position.y, camera.position.z];
      startingRotation.current = groupRef.current?.rotation.y ?? 0;
    }

    if (transitionStartedAt.current === null) return;

    const elapsed = Math.min((clock.elapsedTime - transitionStartedAt.current) / 0.65, 1);
    const progress = 1 - (1 - Math.max(0, elapsed)) ** 3;
    const targetCameraPosition = cameraPositions[activeArtifact.id];

    camera.position.set(
      startingCameraPosition.current[0] + (targetCameraPosition[0] - startingCameraPosition.current[0]) * progress,
      startingCameraPosition.current[1] + (targetCameraPosition[1] - startingCameraPosition.current[1]) * progress,
      startingCameraPosition.current[2] + (targetCameraPosition[2] - startingCameraPosition.current[2]) * progress
    );
    camera.lookAt(0, 0, 0);

    if (groupRef.current) {
      const turn = activeArtifact.selectionMotion === 'spin-once'
        ? Math.PI * 2
        : activeArtifact.selectionMotion === 'restrained-turn' ? Math.PI : 0;
      groupRef.current.rotation.y = startingRotation.current + turn * progress;
    }

    if (elapsed < 1) requestFrame();
    else transitionStartedAt.current = null;
  });

  return <group ref={groupRef}>{children}</group>;
}

export default function MoneyLoopThreeScene({ artifacts, activeArtifactId, onSelect }: MoneyLoopThreeSceneProps) {
  const activeArtifact = artifacts.find((artifact) => artifact.id === activeArtifactId) ?? artifacts[0];

  if (!activeArtifact) return null;

  return (
    <>
      <color attach="background" args={['#111827']} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[2.5, 3.5, 4]} intensity={1.45} />
      <mesh position={[0, -2.15, -0.45]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#172033" roughness={0.92} metalness={0.1} />
      </mesh>
      <SelectionRig activeArtifact={activeArtifact}>
        {artifacts.map((artifact) => {
          const ArtifactMesh = artifactMeshFactories[artifact.geometry];

          return (
            <ArtifactMesh
              key={artifact.id}
              artifact={artifact}
              isActive={artifact.id === activeArtifact.id}
              position={artifactPositions[artifact.id]}
              onSelect={onSelect}
            />
          );
        })}
      </SelectionRig>
    </>
  );
}
