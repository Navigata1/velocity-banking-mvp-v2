import type { ComponentType } from 'react';
import type { MoneyLoopGeometry, MoneyLoopVisualArtifact } from '@/app/artifact-visual-contract';
import { createArtifactSelectionHandler } from './selection-motion';
import type { MoneyLoopCanvasSettings } from './useMoneyLoopRenderMode';

export interface ArtifactMeshProps {
  artifact: MoneyLoopVisualArtifact;
  isActive: boolean;
  position: [number, number, number];
  onSelect: (id: MoneyLoopVisualArtifact['id']) => void;
  canvasSettings: MoneyLoopCanvasSettings;
}

function ArtifactMaterial({ artifact, isActive }: Pick<ArtifactMeshProps, 'artifact' | 'isActive'>) {
  return (
    <meshStandardMaterial
      color={artifact.palette.primary}
      emissive={artifact.palette.emissive}
      emissiveIntensity={isActive ? 0.55 : 0.2}
      metalness={0.45}
      roughness={0.32 + artifact.channels.risk * 0.28}
    />
  );
}

export function DepositReservoirMesh({ artifact, isActive, position, onSelect, canvasSettings }: ArtifactMeshProps) {
  return (
    <mesh castShadow={canvasSettings.shadows} receiveShadow={canvasSettings.shadows} position={position} scale={isActive ? 1.1 : 0.82} onPointerDown={createArtifactSelectionHandler(artifact.id, onSelect)}>
      <cylinderGeometry args={[0.58, 0.78, 1.25 + artifact.channels.progress * 0.65, canvasSettings.radialSegments]} />
      <ArtifactMaterial artifact={artifact} isActive={isActive} />
    </mesh>
  );
}

export function CreditApertureMesh({ artifact, isActive, position, onSelect, canvasSettings }: ArtifactMeshProps) {
  return (
    <mesh castShadow={canvasSettings.shadows} receiveShadow={canvasSettings.shadows} position={position} rotation={[Math.PI / 2, 0, 0]} scale={isActive ? 1.1 : 0.82} onPointerDown={createArtifactSelectionHandler(artifact.id, onSelect)}>
      <torusGeometry args={[0.72, 0.16 + artifact.channels.risk * 0.08, canvasSettings.radialSegments, canvasSettings.radialSegments]} />
      <ArtifactMaterial artifact={artifact} isActive={isActive} />
    </mesh>
  );
}

export function OutflowGateMesh({ artifact, isActive, position, onSelect, canvasSettings }: ArtifactMeshProps) {
  return (
    <mesh castShadow={canvasSettings.shadows} receiveShadow={canvasSettings.shadows} position={position} scale={isActive ? 1.1 : 0.82} onPointerDown={createArtifactSelectionHandler(artifact.id, onSelect)}>
      <boxGeometry args={[1.1, 0.56 + artifact.channels.progress * 0.72, 0.38]} />
      <ArtifactMaterial artifact={artifact} isActive={isActive} />
    </mesh>
  );
}

export function FlowCoreMesh({ artifact, isActive, position, onSelect, canvasSettings }: ArtifactMeshProps) {
  return (
    <mesh castShadow={canvasSettings.shadows} receiveShadow={canvasSettings.shadows} position={position} scale={(isActive ? 1.1 : 0.82) * (0.8 + artifact.channels.energy * 0.28)} onPointerDown={createArtifactSelectionHandler(artifact.id, onSelect)}>
      <icosahedronGeometry args={[0.72, canvasSettings.detail]} />
      <ArtifactMaterial artifact={artifact} isActive={isActive} />
    </mesh>
  );
}

export function PrincipalShieldMesh({ artifact, isActive, position, onSelect, canvasSettings }: ArtifactMeshProps) {
  return (
    <mesh castShadow={canvasSettings.shadows} receiveShadow={canvasSettings.shadows} position={position} rotation={[0, 0, Math.PI / 4]} scale={isActive ? 1.1 : 0.82} onPointerDown={createArtifactSelectionHandler(artifact.id, onSelect)}>
      <octahedronGeometry args={[0.82 + artifact.channels.progress * 0.22, canvasSettings.detail - 1]} />
      <ArtifactMaterial artifact={artifact} isActive={isActive} />
    </mesh>
  );
}

export const artifactMeshFactories: Record<MoneyLoopGeometry, ComponentType<ArtifactMeshProps>> = {
  'deposit-reservoir': DepositReservoirMesh,
  'credit-aperture': CreditApertureMesh,
  'outflow-gate': OutflowGateMesh,
  'flow-core': FlowCoreMesh,
  'principal-shield': PrincipalShieldMesh,
};
