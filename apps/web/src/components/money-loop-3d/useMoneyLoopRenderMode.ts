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

interface WebglProbeContext {
  getExtension?: (name: string) => { loseContext?: () => void } | null;
}

interface WebglProbeCanvas {
  getContext: (contextId: 'webgl2') => WebglProbeContext | null;
}

interface CanvasContextEventTarget {
  addEventListener: (type: 'webglcontextlost' | 'webglcontextcreationerror', listener: (event: Event) => void) => void;
  removeEventListener: (type: 'webglcontextlost' | 'webglcontextcreationerror', listener: (event: Event) => void) => void;
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
  canvasVisible: boolean;
}

export interface MoneyLoopFallbackAnimationPolicy {
  flow: boolean;
  pulse: boolean;
  selection: boolean;
  sweep: boolean;
}

type MoneyLoopCapabilityHints = Omit<MoneyLoopRenderCapabilities, 'supportsWebgl'>;

export interface MoneyLoopRenderLifecycleAdapter {
  readCapabilities: () => MoneyLoopCapabilityHints;
  readDocumentVisible: () => boolean;
  subscribeReducedMotion: (listener: () => void) => () => void;
  subscribeConnection: (listener: () => void) => () => void;
  subscribeResize: (listener: () => void) => () => void;
  subscribeVisibility: (listener: (visible: boolean) => void) => () => void;
  observeIntersection: (listener: (intersecting: boolean) => void) => () => void;
}

export interface MoneyLoopRenderController {
  getState: () => MoneyLoopRenderState;
  markFirstFrame: () => void;
  markWebglUnavailable: () => void;
  setDocumentVisible: (isDocumentVisible: boolean) => void;
  setIntersecting: (isIntersecting: boolean) => void;
  subscribe: (listener: (state: MoneyLoopRenderState) => void) => () => void;
  updateCapabilities: (capabilities: MoneyLoopCapabilityHints) => void;
}

export function createMoneyLoopGlFactory<TDefaultProps, TRenderer>(
  controller: MoneyLoopRenderController,
  createRenderer: (defaultProps: TDefaultProps) => TRenderer
): (defaultProps: TDefaultProps) => TRenderer {
  return (defaultProps) => {
    try {
      return createRenderer(defaultProps);
    } catch (error) {
      controller.markWebglUnavailable();
      throw error;
    }
  };
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

export function probeMoneyLoopWebglSupport(
  createCanvas: () => WebglProbeCanvas | null = () => document.createElement('canvas') as unknown as WebglProbeCanvas
): boolean {
  try {
    const canvas = createCanvas();
    const context = canvas?.getContext('webgl2');
    if (!context) return false;

    try {
      return true;
    } finally {
      context.getExtension?.('WEBGL_lose_context')?.loseContext?.();
    }
  } catch {
    return false;
  }
}

function readBrowserCapabilityHints(contractComplete: boolean): MoneyLoopCapabilityHints {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { contractComplete };
  }

  const connection = getConnection();
  const deviceNavigator = navigator as Navigator & { deviceMemory?: number };

  return {
    contractComplete,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: connection?.saveData === true,
    deviceMemoryGb: deviceNavigator.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    viewportWidth: window.innerWidth,
  };
}

function getInitialRuntime(contractComplete: boolean): MoneyLoopRenderRuntime {
  const supportsWebgl = typeof document !== 'undefined' && probeMoneyLoopWebglSupport();

  return {
    supportsWebgl,
    ...readBrowserCapabilityHints(contractComplete),
    isIntersecting: typeof IntersectionObserver === 'undefined',
    isDocumentVisible: typeof document === 'undefined' || document.visibilityState !== 'hidden',
  };
}

export function deriveMoneyLoopRenderState(runtime: MoneyLoopRenderRuntime, hasFirstFrame = false): MoneyLoopRenderState {
  const renderMode = selectMoneyLoopRenderMode(runtime);
  const shouldRender = renderMode !== 'static' && runtime.isIntersecting && runtime.isDocumentVisible;

  return {
    renderMode,
    shouldRender,
    canvasVisible: shouldRender && hasFirstFrame,
  };
}

export function getMoneyLoopFallbackAnimationPolicy(renderMode: MoneyLoopRenderMode): MoneyLoopFallbackAnimationPolicy {
  const enabled = renderMode !== 'static';
  return { flow: enabled, pulse: enabled, selection: enabled, sweep: enabled };
}

export function getMoneyLoopCanvasSettings(renderMode: MoneyLoopRenderMode): MoneyLoopCanvasSettings {
  if (renderMode === 'full') {
    return { dpr: 1.5, shadows: true, radialSegments: 24, detail: 2 };
  }

  return { dpr: 1, shadows: false, radialSegments: 12, detail: 1 };
}

export function createMoneyLoopRenderController(initialRuntime: MoneyLoopRenderRuntime): MoneyLoopRenderController {
  let runtime = initialRuntime;
  let hasFirstFrame = false;
  const listeners = new Set<(state: MoneyLoopRenderState) => void>();

  function getState() {
    return deriveMoneyLoopRenderState(runtime, hasFirstFrame);
  }

  function notify() {
    const state = getState();
    if (!state.shouldRender) hasFirstFrame = false;
    const nextState = getState();
    listeners.forEach((listener) => listener(nextState));
  }

  return {
    getState,
    markFirstFrame() {
      if (!getState().shouldRender || hasFirstFrame) return;
      hasFirstFrame = true;
      notify();
    },
    markWebglUnavailable() {
      runtime = { ...runtime, supportsWebgl: false };
      notify();
    },
    setDocumentVisible(isDocumentVisible) {
      if (runtime.isDocumentVisible === isDocumentVisible) return;
      runtime = { ...runtime, isDocumentVisible };
      notify();
    },
    setIntersecting(isIntersecting) {
      if (runtime.isIntersecting === isIntersecting) return;
      runtime = { ...runtime, isIntersecting };
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    updateCapabilities(capabilities) {
      runtime = { ...runtime, ...capabilities };
      notify();
    },
  };
}

export function bindMoneyLoopRenderLifecycle(
  controller: MoneyLoopRenderController,
  adapter: MoneyLoopRenderLifecycleAdapter
): () => void {
  const refreshCapabilities = () => controller.updateCapabilities(adapter.readCapabilities());
  const cleanups = [
    adapter.subscribeReducedMotion(refreshCapabilities),
    adapter.subscribeConnection(refreshCapabilities),
    adapter.subscribeResize(refreshCapabilities),
    adapter.subscribeVisibility((visible) => controller.setDocumentVisible(visible)),
    adapter.observeIntersection((intersecting) => controller.setIntersecting(intersecting)),
  ];

  refreshCapabilities();
  controller.setDocumentVisible(adapter.readDocumentVisible());

  return () => cleanups.forEach((cleanup) => cleanup());
}

export function bindMoneyLoopCanvasContextEvents(
  canvas: CanvasContextEventTarget,
  controller: MoneyLoopRenderController
): () => void {
  const handleContextFailure = (event: Event) => {
    event.preventDefault();
    controller.markWebglUnavailable();
  };

  canvas.addEventListener('webglcontextlost', handleContextFailure);
  canvas.addEventListener('webglcontextcreationerror', handleContextFailure);

  return () => {
    canvas.removeEventListener('webglcontextlost', handleContextFailure);
    canvas.removeEventListener('webglcontextcreationerror', handleContextFailure);
  };
}

function createBrowserLifecycleAdapter(
  contractComplete: boolean,
  stageRef: RefObject<HTMLElement | null>
): MoneyLoopRenderLifecycleAdapter {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = getConnection();

  return {
    readCapabilities: () => readBrowserCapabilityHints(contractComplete),
    readDocumentVisible: () => document.visibilityState !== 'hidden',
    subscribeReducedMotion(listener) {
      motionQuery.addEventListener('change', listener);
      return () => motionQuery.removeEventListener('change', listener);
    },
    subscribeConnection(listener) {
      if (!connection) return () => {};
      connection.addEventListener('change', listener);
      return () => connection.removeEventListener('change', listener);
    },
    subscribeResize(listener) {
      window.addEventListener('resize', listener);
      return () => window.removeEventListener('resize', listener);
    },
    subscribeVisibility(listener) {
      const handleVisibilityChange = () => listener(document.visibilityState !== 'hidden');
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    },
    observeIntersection(listener) {
      if (typeof IntersectionObserver === 'undefined') return () => {};
      const observer = new IntersectionObserver(([entry]) => listener(entry?.isIntersecting ?? false));
      if (stageRef.current) observer.observe(stageRef.current);
      return () => observer.disconnect();
    },
  };
}

export interface UseMoneyLoopRenderModeResult extends MoneyLoopRenderState {
  controller: MoneyLoopRenderController;
}

export function useMoneyLoopRenderMode(
  contractComplete: boolean,
  stageRef: RefObject<HTMLElement | null>
): UseMoneyLoopRenderModeResult {
  const [controller] = useState(() => createMoneyLoopRenderController(getInitialRuntime(contractComplete)));
  const [state, setState] = useState<MoneyLoopRenderState>(() => controller.getState());

  useEffect(() => controller.subscribe(setState), [controller]);
  useEffect(
    () => bindMoneyLoopRenderLifecycle(controller, createBrowserLifecycleAdapter(contractComplete, stageRef)),
    [contractComplete, controller, stageRef]
  );

  return { ...state, controller };
}
