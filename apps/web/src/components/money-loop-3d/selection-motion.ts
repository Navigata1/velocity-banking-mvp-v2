import type {
  MoneyLoopSelectionMotion,
  MoneyLoopVisualArtifact,
} from '@/app/artifact-visual-contract';

export const MONEY_LOOP_SELECTION_DURATION_SECONDS = 0.65;

export function getSelectionRotationRadians(motion: MoneyLoopSelectionMotion): number {
  if (motion === 'spin-once') return Math.PI * 2;
  if (motion === 'restrained-turn') return Math.PI;
  return 0;
}

export function getSelectionMotionFrame(motion: MoneyLoopSelectionMotion, elapsedSeconds: number) {
  const elapsed = Number.isFinite(elapsedSeconds)
    ? Math.min(Math.max(0, elapsedSeconds), MONEY_LOOP_SELECTION_DURATION_SECONDS)
    : MONEY_LOOP_SELECTION_DURATION_SECONDS;
  const linearProgress = elapsed / MONEY_LOOP_SELECTION_DURATION_SECONDS;
  const progress = 1 - (1 - linearProgress) ** 3;

  return {
    progress,
    rotationRadians: getSelectionRotationRadians(motion) * progress,
    shouldRequestFrame: elapsed < MONEY_LOOP_SELECTION_DURATION_SECONDS,
  };
}

export function createArtifactSelectionHandler(
  id: MoneyLoopVisualArtifact['id'],
  onSelect: (id: MoneyLoopVisualArtifact['id']) => void
) {
  return () => onSelect(id);
}
