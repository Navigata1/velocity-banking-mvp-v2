import type {
  MoneyLoopSelectionMotion,
  MoneyLoopVisualArtifact,
} from '@/app/artifact-visual-contract';

export const MONEY_LOOP_SELECTION_DURATION_SECONDS = 0.45;

export interface MoneyLoopSelectionIdentity {
  id: MoneyLoopVisualArtifact['id'];
  revision: number;
}

export interface MoneyLoopSelectionState extends MoneyLoopSelectionIdentity {
  startedAt: number;
}

export function advanceMoneyLoopSelection(current: MoneyLoopSelectionState, id: MoneyLoopVisualArtifact['id'], startedAt: number): MoneyLoopSelectionState {
  return current.id === id ? current : { id, startedAt, revision: current.revision + 1 };
}

export function isMoneyLoopSelectionSettled(completed: MoneyLoopSelectionIdentity | null, active: MoneyLoopSelectionIdentity): boolean {
  return completed?.id === active.id && completed.revision === active.revision;
}

export function getSelectionMotionElapsedSeconds(selectionStartedAtMs: number, nowMs: number): number {
  if (!Number.isFinite(selectionStartedAtMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, (nowMs - selectionStartedAtMs) / 1000);
}

export function createSelectionSettledNotifier(onSelectionSettled: (id: MoneyLoopVisualArtifact['id'], revision: number) => void) {
  let lastSettled: MoneyLoopSelectionIdentity | null = null;
  return (id: MoneyLoopVisualArtifact['id'], revision: number) => {
    const completed = { id, revision };
    if (isMoneyLoopSelectionSettled(lastSettled, completed)) return false;
    lastSettled = completed;
    onSelectionSettled(id, revision);
    return true;
  };
}

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
