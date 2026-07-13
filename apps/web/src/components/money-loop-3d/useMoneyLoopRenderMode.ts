'use client';

import { useEffect, useState, type RefObject } from 'react';
import {
  selectMoneyLoopRenderMode,
  type MoneyLoopRenderCapabilities,
  type MoneyLoopRenderMode,
} from '@/app/artifact-visual-contract';

interface NetworkConnection extends EventTarget {
  saveData?: boolean;
}

export interface MoneyLoopRenderRuntime extends MoneyLoopRenderCapabilities {
  isIntersecting: boolean;
  isDocumentVisible: boolean;
}

export interface MoneyLoopCanvasSettings {
  dpr: number;
  shadows: boolean;
  radialSegments: number;
  detail: number;
}

export interface MoneyLoopRenderState {
  renderMode: MoneyLoopRenderMode;
  shouldRender: boolean;
}

function getConnection(): NetworkConnection | undefined {
  if (typeof navigator === 'undefined') return undefined;

  const networkNavigator = navigator as Navigator & {
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
  };

  return networkNavigator.connection ?? networkNavigator.mozConnection ?? networkNavigator.webkitConnection;
}

function detectWebglSupport(): boolean {
  if (typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function readCapabilities(contractComplete: boolean): MoneyLoopRenderCapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supportsWebgl: false, contractComplete };
  }

  const connection = getConnection();
  const deviceNavigator = navigator as Navigator & { deviceMemory?: number };

  return {
    supportsWebgl: detectWebglSupport(),
    contractComplete,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: connection?.saveData === true,
    deviceMemoryGb: deviceNavigator.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    viewportWidth: window.innerWidth,
  };
}

export function deriveMoneyLoopRenderState(runtime: MoneyLoopRenderRuntime): MoneyLoopRenderState {
  const renderMode = selectMoneyLoopRenderMode(runtime);

  return {
    renderMode,
    shouldRender: renderMode !== 'static' && runtime.isIntersecting && runtime.isDocumentVisible,
  };
}

export function getInitialMoneyLoopIntersectionState(intersectionObserverSupported: boolean): boolean {
  return !intersectionObserverSupported;
}

export function getMoneyLoopCanvasSettings(renderMode: MoneyLoopRenderMode): MoneyLoopCanvasSettings {
  if (renderMode === 'full') {
    return { dpr: 1.5, shadows: true, radialSegments: 24, detail: 2 };
  }

  return { dpr: 1, shadows: false, radialSegments: 12, detail: 1 };
}

export function useMoneyLoopRenderMode(
  contractComplete: boolean,
  stageRef: RefObject<HTMLElement | null>
): MoneyLoopRenderState {
  const [capabilities, setCapabilities] = useState<MoneyLoopRenderCapabilities>(() => readCapabilities(contractComplete));
  const [isIntersecting, setIsIntersecting] = useState(() => getInitialMoneyLoopIntersectionState(
    typeof IntersectionObserver !== 'undefined'
  ));
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden'
  );

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = getConnection();
    const updateCapabilities = () => setCapabilities(readCapabilities(contractComplete));
    const updateVisibility = () => setIsDocumentVisible(document.visibilityState !== 'hidden');
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => setIsIntersecting(entry?.isIntersecting ?? false));

    updateCapabilities();
    updateVisibility();
    if (stageRef.current) observer?.observe(stageRef.current);

    motionQuery.addEventListener('change', updateCapabilities);
    if (connection) connection.addEventListener('change', updateCapabilities);
    window.addEventListener('resize', updateCapabilities);
    document.addEventListener('visibilitychange', updateVisibility);

    return () => {
      motionQuery.removeEventListener('change', updateCapabilities);
      if (connection) connection.removeEventListener('change', updateCapabilities);
      window.removeEventListener('resize', updateCapabilities);
      document.removeEventListener('visibilitychange', updateVisibility);
      if (observer) observer.disconnect();
    };
  }, [contractComplete, stageRef]);

  return deriveMoneyLoopRenderState({
    ...capabilities,
    contractComplete,
    isIntersecting,
    isDocumentVisible,
  });
}
