'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group, Vector3Tuple } from 'three';
import type { MoneyLoopVisualArtifact } from '@/app/artifact-visual-contract';
import { artifactMeshFactories } from './artifact-meshes';
import { createSelectionSettledNotifier, getSelectionMotionElapsedSeconds, getSelectionMotionFrame } from './selection-motion';
import type { MoneyLoopCanvasSettings } from './useMoneyLoopRenderMode';

interface MoneyLoopThreeSceneProps {
  artifacts: MoneyLoopVisualArtifact[];
  activeArtifactId: MoneyLoopVisualArtifact['id'];
  selectionStartedAt: number;
  onSelect: (id: MoneyLoopVisualArtifact['id']) => void;
  onSelectionSettled: (id: MoneyLoopVisualArtifact['id']) => void;
  canvasSettings: MoneyLoopCanvasSettings;
  onFirstFrame: () => void;
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

function SelectionRig({ activeArtifact, children, onSelectionSettled, selectionStartedAt }: { activeArtifact: MoneyLoopVisualArtifact; children: ReactNode; onSelectionSettled: (id: MoneyLoopVisualArtifact['id']) => boolean; selectionStartedAt: number }) {
  const groupRef = useRef<Group>(null);
  const previousArtifactId = useRef(activeArtifact.id);
  const transitionStartedAt = useRef<number | null>(null);
  const startingCameraPosition = useRef<Vector3Tuple>([0, 0, 7.2]);
  const startingRotation = useRef(0);
  const { camera, invalidate } = useThree();

  useLayoutEffect(() => {
    if (previousArtifactId.current === activeArtifact.id) return;

    previousArtifactId.current = activeArtifact.id;
    transitionStartedAt.current = selectionStartedAt || performance.now();
    startingCameraPosition.current = [camera.position.x, camera.position.y, camera.position.z];
    startingRotation.current = groupRef.current?.rotation.y ?? 0;
    invalidate();
  }, [activeArtifact.id, camera, invalidate, selectionStartedAt]);

  useFrame(({ camera, invalidate: requestFrame }) => {
    if (transitionStartedAt.current === null) return;

    const frame = getSelectionMotionFrame(
      activeArtifact.selectionMotion,
      getSelectionMotionElapsedSeconds(transitionStartedAt.current, performance.now())
    );
    const targetCameraPosition = cameraPositions[activeArtifact.id];

    camera.position.set(
      startingCameraPosition.current[0] + (targetCameraPosition[0] - startingCameraPosition.current[0]) * frame.progress,
      startingCameraPosition.current[1] + (targetCameraPosition[1] - startingCameraPosition.current[1]) * frame.progress,
      startingCameraPosition.current[2] + (targetCameraPosition[2] - startingCameraPosition.current[2]) * frame.progress
    );
    camera.lookAt(0, 0, 0);

    if (groupRef.current) {
      groupRef.current.rotation.y = startingRotation.current + frame.rotationRadians;
    }

    if (frame.shouldRequestFrame) requestFrame();
    else {
      transitionStartedAt.current = null;
      onSelectionSettled(activeArtifact.id);
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

export default function MoneyLoopThreeScene({
  artifacts,
  activeArtifactId,
  selectionStartedAt,
  onSelect,
  onSelectionSettled,
  canvasSettings,
  onFirstFrame,
}: MoneyLoopThreeSceneProps) {
  const activeArtifact = artifacts.find((artifact) => artifact.id === activeArtifactId) ?? artifacts[0];
  const firstFrameReported = useRef(false);
  const notifySelectionSettled = useMemo(
    () => createSelectionSettledNotifier(onSelectionSettled),
    [onSelectionSettled]
  );
  const { invalidate } = useThree();

  useEffect(() => {
    invalidate();
  }, [activeArtifactId, invalidate]);

  useFrame(() => {
    if (firstFrameReported.current) return;
    firstFrameReported.current = true;
    onFirstFrame();
    notifySelectionSettled(activeArtifact.id);
  });

  if (!activeArtifact) return null;

  return (
    <>
      <color attach="background" args={['#111827']} />
      <ambientLight intensity={0.72} />
      <directionalLight castShadow={canvasSettings.shadows} position={[2.5, 3.5, 4]} intensity={1.45} />
      <mesh receiveShadow={canvasSettings.shadows} position={[0, -2.15, -0.45]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#172033" roughness={0.92} metalness={0.1} />
      </mesh>
      <SelectionRig activeArtifact={activeArtifact} onSelectionSettled={notifySelectionSettled} selectionStartedAt={selectionStartedAt}>
        {artifacts.map((artifact) => {
          const ArtifactMesh = artifactMeshFactories[artifact.geometry];

          return (
            <ArtifactMesh
              key={artifact.id}
              artifact={artifact}
              isActive={artifact.id === activeArtifact.id}
              position={artifactPositions[artifact.id]}
              onSelect={onSelect}
              canvasSettings={canvasSettings}
            />
          );
        })}
      </SelectionRig>
    </>
  );
}
