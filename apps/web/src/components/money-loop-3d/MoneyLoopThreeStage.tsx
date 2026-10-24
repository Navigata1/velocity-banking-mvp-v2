'use client';

import { Canvas, type GLProps } from '@react-three/fiber';
import { WebGLRenderer } from 'three';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MoneyLoopRenderMode, MoneyLoopVisualArtifact, MoneyLoopVisualContract } from '@/app/artifact-visual-contract';
import MoneyLoopThreeScene from './MoneyLoopThreeScene';
import { isMoneyLoopSelectionSettled, type MoneyLoopSelectionIdentity } from './selection-motion';
import {
  bindMoneyLoopCanvasContextEvents,
  createMoneyLoopGlFactory,
  getMoneyLoopCanvasSettings,
  useMoneyLoopRenderMode,
  type MoneyLoopCanvasSettings,
  type MoneyLoopRenderController,
} from './useMoneyLoopRenderMode';

interface MoneyLoopThreeStageProps {
  visualContract: MoneyLoopVisualContract;
  activeArtifactId: MoneyLoopVisualArtifact['id'];
  selectionStartedAt: number;
  selectionRevision: number;
  onSelect: (id: MoneyLoopVisualArtifact['id']) => void;
  onRenderModeChange: (renderMode: MoneyLoopRenderMode) => void;
}

interface ActiveMoneyLoopCanvasProps extends Pick<MoneyLoopThreeStageProps, 'visualContract' | 'activeArtifactId' | 'selectionStartedAt' | 'selectionRevision' | 'onSelect'> {
  onSelectionSettled: (id: MoneyLoopVisualArtifact['id'], revision: number) => void;
  renderMode: 'efficient' | 'full';
  canvasSettings: MoneyLoopCanvasSettings;
  canvasVisible: boolean;
  controller: MoneyLoopRenderController;
}

type MoneyLoopRendererDefaults = Parameters<Extract<GLProps, (defaultProps: never) => unknown>>[0];

function ActiveMoneyLoopCanvas({
  visualContract,
  activeArtifactId,
  selectionStartedAt,
  selectionRevision,
  onSelect,
  onSelectionSettled,
  renderMode,
  canvasSettings,
  canvasVisible,
  controller,
}: ActiveMoneyLoopCanvasProps) {
  const contextCleanupRef = useRef<(() => void) | null>(null);
  const gl = useMemo(
    () => createMoneyLoopGlFactory(
      controller,
      (defaultProps: MoneyLoopRendererDefaults) => new WebGLRenderer({
        ...defaultProps,
        antialias: renderMode === 'full',
        powerPreference: renderMode === 'full' ? 'high-performance' : 'low-power',
      })
    ),
    [controller, renderMode]
  );

  useEffect(() => () => contextCleanupRef.current?.(), []);

  return (
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, 0, 7.2], fov: 42 }}
      dpr={[1, canvasSettings.dpr]}
      frameloop="demand"
      shadows={canvasSettings.shadows}
      gl={gl}
      style={{ opacity: canvasVisible ? 1 : 0 }}
      onCreated={({ gl }) => {
        contextCleanupRef.current?.();
        contextCleanupRef.current = bindMoneyLoopCanvasContextEvents(gl.domElement, controller);
      }}
    >
      <MoneyLoopThreeScene
        artifacts={visualContract.artifacts}
        activeArtifactId={activeArtifactId}
        selectionStartedAt={selectionStartedAt}
        selectionRevision={selectionRevision}
        onSelect={onSelect}
        onSelectionSettled={onSelectionSettled}
        canvasSettings={canvasSettings}
        onFirstFrame={controller.markFirstFrame}
      />
    </Canvas>
  );
}

export default function MoneyLoopThreeStage({
  visualContract,
  activeArtifactId,
  selectionStartedAt,
  selectionRevision,
  onSelect,
  onRenderModeChange,
}: MoneyLoopThreeStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [settledSelection, setSettledSelection] = useState<MoneyLoopSelectionIdentity | null>(null);
  const activeSelectionRef = useRef<MoneyLoopSelectionIdentity>({ id: activeArtifactId, revision: selectionRevision });
  const { renderMode, shouldRender, canvasVisible, controller } = useMoneyLoopRenderMode(visualContract.isComplete, stageRef);
  const canvasSettings = getMoneyLoopCanvasSettings(renderMode);
  useLayoutEffect(() => {
    activeSelectionRef.current = { id: activeArtifactId, revision: selectionRevision };
  }, [activeArtifactId, selectionRevision]);
  const onSelectionSettled = useCallback((id: MoneyLoopVisualArtifact['id'], revision: number) => {
    const completed = { id, revision };
    if (!isMoneyLoopSelectionSettled(completed, activeSelectionRef.current)) return;
    setSettledSelection(previous => isMoneyLoopSelectionSettled(previous, completed) ? previous : completed);
  }, []);

  useEffect(() => onRenderModeChange(renderMode), [onRenderModeChange, renderMode]);

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      data-testid="money-loop-three-stage"
      data-render-mode={renderMode}
      data-should-render={shouldRender}
      data-active-artifact={activeArtifactId}
      data-selection-revision={selectionRevision}
      data-selection-state={isMoneyLoopSelectionSettled(settledSelection, { id: activeArtifactId, revision: selectionRevision }) ? 'settled' : 'transitioning'}
      className="pointer-events-auto absolute left-1/2 top-1/2 h-64 w-64 md:h-72 md:w-72 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
    >
      {shouldRender && renderMode !== 'static' ? (
        <ActiveMoneyLoopCanvas
          visualContract={visualContract}
          activeArtifactId={activeArtifactId}
          selectionStartedAt={selectionStartedAt}
          selectionRevision={selectionRevision}
          onSelect={onSelect}
          onSelectionSettled={onSelectionSettled}
          renderMode={renderMode}
          canvasSettings={canvasSettings}
          canvasVisible={canvasVisible}
          controller={controller}
        />
      ) : null}
    </div>
  );
}
