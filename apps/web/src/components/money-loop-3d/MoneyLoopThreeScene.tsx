'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Group, Vector3Tuple } from 'three';
import type { MoneyLoopVisualArtifact } from '@/app/artifact-visual-contract';
import { artifactMeshFactories } from './artifact-meshes';
import { createSelectionSettledNotifier, getSelectionMotionElapsedSeconds, getSelectionMotionFrame, isMoneyLoopSelectionSettled } from './selection-motion';
import type { MoneyLoopCanvasSettings } from './useMoneyLoopRenderMode';

interface MoneyLoopThreeSceneProps {
  artifacts: MoneyLoopVisualArtifact[];
  activeArtifactId: MoneyLoopVisualArtifact['id'];
  selectionStartedAt: number;
  selectionRevision: number;
  onSelect: (id: MoneyLoopVisualArtifact['id']) => void;
  onSelectionSettled: (id: MoneyLoopVisualArtifact['id'], revision: number) => void;
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

function SelectionRig({ activeArtifact, children, onSelectionSettled, selectionStartedAt, selectionRevision }: { activeArtifact: MoneyLoopVisualArtifact; children: ReactNode; onSelectionSettled: (id: MoneyLoopVisualArtifact['id'], revision: number) => boolean; selectionStartedAt: number; selectionRevision: number }) {
  const groupRef = useRef<Group>(null);
  const previousSelection = useRef({ id: activeArtifact.id, revision: selectionRevision });
  const transitionStartedAt = useRef<number | null>(null);
  const startingCameraPosition = useRef<Vector3Tuple>([0, 0, 7.2]);
  const startingRotation = useRef(0);
  const { camera, invalidate } = useThree();

  useLayoutEffect(() => {
    const active = { id: activeArtifact.id, revision: selectionRevision };
    if (isMoneyLoopSelectionSettled(previousSelection.current, active)) return;
    previousSelection.current = active;
    transitionStartedAt.current = selectionStartedAt || performance.now();
    startingCameraPosition.current = [camera.position.x, camera.position.y, camera.position.z];
    startingRotation.current = groupRef.current?.rotation.y ?? 0;
    invalidate();
  }, [activeArtifact.id, camera, invalidate, selectionStartedAt, selectionRevision]);

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
      onSelectionSettled(activeArtifact.id, selectionRevision);
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

export default function MoneyLoopThreeScene({
  artifacts,
  activeArtifactId,
  selectionStartedAt,
  selectionRevision,
  onSelect,
  onSelectionSettled,
  canvasSettings,
  onFirstFrame,
}: MoneyLoopThreeSceneProps) {
  const activeArtifact = artifacts.find((artifact) => artifact.id === activeArtifactId) ?? artifacts[0];
  const firstFrameReported = useRef(false);
  const initialSelectionRef = useRef(activeArtifact ? { id: activeArtifact.id, revision: selectionRevision } : null);
  const notifySelectionSettled = useMemo(
    () => createSelectionSettledNotifier(onSelectionSettled),
    [onSelectionSettled]
  );
  const { invalidate } = useThree();

  useEffect(() => {
    invalidate();
  }, [activeArtifactId, invalidate]);

  useFrame(() => {
    if (firstFrameReported.current || !activeArtifact) return;
    firstFrameReported.current = true;
    onFirstFrame();
    if (isMoneyLoopSelectionSettled(initialSelectionRef.current, { id: activeArtifact.id, revision: selectionRevision })) {
      notifySelectionSettled(activeArtifact.id, selectionRevision);
    }
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
      <SelectionRig activeArtifact={activeArtifact} onSelectionSettled={notifySelectionSettled} selectionStartedAt={selectionStartedAt} selectionRevision={selectionRevision}>
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
