'use client';

import { Canvas } from '@react-three/fiber';
import type { MoneyLoopVisualArtifact, MoneyLoopVisualContract } from '@/app/artifact-visual-contract';
import MoneyLoopThreeScene from './MoneyLoopThreeScene';
import { resolveMoneyLoopStageRenderMode } from './selection-motion';

interface MoneyLoopThreeStageProps {
  visualContract: MoneyLoopVisualContract;
  activeArtifactId: MoneyLoopVisualArtifact['id'];
  onSelect: (id: MoneyLoopVisualArtifact['id']) => void;
}

export default function MoneyLoopThreeStage({
  visualContract,
  activeArtifactId,
  onSelect,
}: MoneyLoopThreeStageProps) {
  const renderMode = resolveMoneyLoopStageRenderMode(visualContract);

  return (
    <div
      aria-hidden="true"
      data-testid="money-loop-three-stage"
      data-render-mode={renderMode}
      className="pointer-events-auto absolute left-1/2 top-1/2 h-64 w-64 md:h-72 md:w-72 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
    >
      {renderMode !== 'static' ? (
        <Canvas
          aria-hidden="true"
          camera={{ position: [0, 0, 7.2], fov: 42 }}
          dpr={[1, 1]}
          frameloop="demand"
          gl={{ antialias: false, powerPreference: 'low-power' }}
        >
          <MoneyLoopThreeScene
            artifacts={visualContract.artifacts}
            activeArtifactId={activeArtifactId}
            onSelect={onSelect}
          />
        </Canvas>
      ) : null}
    </div>
  );
}
