'use client';

import { Canvas } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { MoneyLoopVisualArtifact, MoneyLoopVisualContract } from '@/app/artifact-visual-contract';
import MoneyLoopThreeScene from './MoneyLoopThreeScene';
import {
  getMoneyLoopCanvasSettings,
  useMoneyLoopRenderMode,
  type MoneyLoopCanvasSettings,
} from './useMoneyLoopRenderMode';

interface MoneyLoopThreeStageProps {
  visualContract: MoneyLoopVisualContract;
  activeArtifactId: MoneyLoopVisualArtifact['id'];
  onSelect: (id: MoneyLoopVisualArtifact['id']) => void;
}

interface ActiveMoneyLoopCanvasProps extends Pick<MoneyLoopThreeStageProps, 'visualContract' | 'activeArtifactId' | 'onSelect'> {
  renderMode: 'efficient' | 'full';
  canvasSettings: MoneyLoopCanvasSettings;
}

function ActiveMoneyLoopCanvas({
  visualContract,
  activeArtifactId,
  onSelect,
  renderMode,
  canvasSettings,
}: ActiveMoneyLoopCanvasProps) {
  const [hasFirstFrame, setHasFirstFrame] = useState(false);

  return (
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, 0, 7.2], fov: 42 }}
      dpr={[1, canvasSettings.dpr]}
      frameloop="demand"
      shadows={canvasSettings.shadows}
      gl={{ antialias: renderMode === 'full', powerPreference: renderMode === 'full' ? 'high-performance' : 'low-power' }}
      style={{ opacity: hasFirstFrame ? 1 : 0 }}
    >
      <MoneyLoopThreeScene
        artifacts={visualContract.artifacts}
        activeArtifactId={activeArtifactId}
        onSelect={onSelect}
        canvasSettings={canvasSettings}
        onFirstFrame={() => setHasFirstFrame(true)}
      />
    </Canvas>
  );
}

export default function MoneyLoopThreeStage({
  visualContract,
  activeArtifactId,
  onSelect,
}: MoneyLoopThreeStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const { renderMode, shouldRender } = useMoneyLoopRenderMode(visualContract.isComplete, stageRef);
  const canvasSettings = getMoneyLoopCanvasSettings(renderMode);

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      data-testid="money-loop-three-stage"
      data-render-mode={renderMode}
      data-should-render={shouldRender}
      className="pointer-events-auto absolute left-1/2 top-1/2 h-64 w-64 md:h-72 md:w-72 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
    >
      {shouldRender && renderMode !== 'static' ? (
        <ActiveMoneyLoopCanvas
          visualContract={visualContract}
          activeArtifactId={activeArtifactId}
          onSelect={onSelect}
          renderMode={renderMode}
          canvasSettings={canvasSettings}
        />
      ) : null}
    </div>
  );
}
