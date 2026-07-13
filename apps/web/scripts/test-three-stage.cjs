/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { findBrowserExecutable, getHeadlessChromiumArgs } = require('./browser-harness.cjs');
const { createGracefulShutdown, startBuiltServer, stopServer } = require('./built-server-harness.cjs');
const {
  MAX_SETTLED_SPATIAL_CELL_DISTANCE,
  MAX_SETTLED_SPATIAL_MEAN_DISTANCE,
  MIN_MATERIAL_SPATIAL_CELL_DISTANCE,
  MIN_MATERIAL_SPATIAL_CHANGED_CELL_COUNT,
  compareSpatialDescriptors,
  decodePngRgba,
  hasMaterialSpatialChange,
  samplePngPixels,
} = require('./png-pixel-proof.cjs');

const appRoot = path.resolve(__dirname, '..');
const evidenceDirectory = path.join(appRoot, 'test-results', 'three-stage');
const SELECTION_SETTLE_BUDGET_MS = 700;
const STABILITY_CONFIRMATION_BUDGET_MS = 300;
const normalViewports = [
  { viewportLabel: 'desktop', viewport: { width: 1440, height: 900 }, expectedRenderMode: 'full', expectedDpr: 1.5 },
  { viewportLabel: 'mobile', viewport: { width: 390, height: 844 }, expectedRenderMode: 'efficient', expectedDpr: 1 },
];
const artifacts = [
  ['loc', 'credit-aperture'],
  ['expenses', 'outflow-gate'],
  ['cash-flow', 'flow-core'],
  ['principal', 'principal-shield'],
  ['income', 'deposit-reservoir'],
];
let activeBrowser;
let activeServer;

const shutdown = createGracefulShutdown({
  closeBrowser: async () => {
    await activeBrowser?.close();
    activeBrowser = undefined;
  },
  stopServer: async () => {
    await stopServer(activeServer);
    activeServer = undefined;
  },
  exit: (code) => process.exit(code),
});

process.once('SIGINT', () => { void shutdown(130); });
process.once('SIGTERM', () => { void shutdown(143); });

function remainingTimeout(deadline) {
  return Math.max(1, deadline - Date.now());
}

async function waitForNormalStage(page, viewportLabel, expectedRenderMode, timeout = 15000) {
  const stage = page.getByTestId('money-loop-three-stage');
  await stage.waitFor({ state: 'visible', timeout });
  await stage.scrollIntoViewIfNeeded({ timeout });
  await page.waitForFunction((expectedMode) => {
    const stageNode = document.querySelector('[data-testid="money-loop-three-stage"]');
    const canvas = stageNode?.querySelector('canvas');
    return stageNode?.getAttribute('data-render-mode') === expectedMode &&
      stageNode.getAttribute('data-should-render') === 'true' &&
      canvas instanceof HTMLCanvasElement &&
      getComputedStyle(canvas).opacity === '1';
  }, expectedRenderMode, { timeout });
  const mode = await stage.getAttribute('data-render-mode');
  if (mode !== expectedRenderMode) throw new Error(`${viewportLabel} expected ${expectedRenderMode} render mode but received ${mode ?? 'no'}.`);
  return stage;
}

async function assertGenuineWebgl2(page, viewportLabel) {
  const webgl2 = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="money-loop-three-stage"] canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const context = canvas.getContext('webgl2');
    if (!context) return null;
    return {
      renderer: context.getParameter(context.RENDERER),
      vendor: context.getParameter(context.VENDOR),
      version: context.getParameter(context.VERSION),
    };
  });
  if (!webgl2) throw new Error(`${viewportLabel} did not expose a genuine WebGL2 context.`);
  return webgl2;
}

async function assertCanvasDpr(page, viewportLabel, expectedDpr) {
  const dimensions = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="money-loop-three-stage"] canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const rect = canvas.getBoundingClientRect();
    return { cssHeight: rect.height, cssWidth: rect.width, height: canvas.height, width: canvas.width };
  });
  if (!dimensions || !dimensions.cssWidth || !dimensions.cssHeight) throw new Error(`${viewportLabel} could not measure canvas DPR.`);
  const effectiveDpr = Math.max(dimensions.width / dimensions.cssWidth, dimensions.height / dimensions.cssHeight);
  if (effectiveDpr > expectedDpr + 0.05 || Math.abs(effectiveDpr - expectedDpr) > 0.15) {
    throw new Error(`${viewportLabel} expected effective DPR approximately ${expectedDpr}, received ${effectiveDpr.toFixed(3)}.`);
  }
  console.log(`PASS ${viewportLabel} canvas effective DPR ${effectiveDpr.toFixed(3)}`);
}

async function prepareStageAndTargetForClick(page, artifactId) {
  const prepared = await page.evaluate((targetId) => {
    const stage = document.querySelector('[data-testid="money-loop-three-stage"]');
    const target = document.querySelector(`[data-testid="money-loop-artifact-node-${targetId}"]`);
    if (!(stage instanceof HTMLElement) || !(target instanceof HTMLElement)) return null;

    const stageRect = stage.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top = window.scrollY + Math.min(stageRect.top, targetRect.top);
    const bottom = window.scrollY + Math.max(stageRect.bottom, targetRect.bottom);
    const combinedHeight = bottom - top;
    if (combinedHeight <= window.innerHeight) {
      window.scrollTo({ top: Math.max(0, top - (window.innerHeight - combinedHeight) / 2) });
    }
    const selectorViewport = document.querySelector('[data-testid="money-loop-artifact-selector-viewport"]');
    if (selectorViewport instanceof HTMLElement) {
      const selectorRect = selectorViewport.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const delta = targetRect.left < selectorRect.left
        ? targetRect.left - selectorRect.left
        : targetRect.right > selectorRect.right
          ? targetRect.right - selectorRect.right
          : 0;
      selectorViewport.style.scrollBehavior = 'auto';
      selectorViewport.scrollBy({ behavior: 'instant', left: delta });
    } else {
      target.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    const canvas = stage.querySelector('canvas');
    const canvasRect = canvas?.getBoundingClientRect();
    const refreshedTargetRect = target.getBoundingClientRect();
    const refreshedSelectorRect = selectorViewport instanceof HTMLElement ? selectorViewport.getBoundingClientRect() : null;
    return {
      canvasVisible: Boolean(canvasRect && canvasRect.left >= 0 && canvasRect.top >= 0 && canvasRect.right <= window.innerWidth && canvasRect.bottom <= window.innerHeight),
      combinedFits: combinedHeight <= window.innerHeight,
      selector: refreshedSelectorRect && { left: refreshedSelectorRect.left, right: refreshedSelectorRect.right },
      target: { bottom: refreshedTargetRect.bottom, left: refreshedTargetRect.left, right: refreshedTargetRect.right, top: refreshedTargetRect.top },
      targetVisible: refreshedTargetRect.top >= 0 && refreshedTargetRect.bottom <= window.innerHeight &&
        (refreshedSelectorRect
          ? refreshedTargetRect.left >= refreshedSelectorRect.left && refreshedTargetRect.right <= refreshedSelectorRect.right
          : refreshedTargetRect.left >= 0 && refreshedTargetRect.right <= window.innerWidth),
    };
  }, artifactId);
  if (!prepared?.canvasVisible) throw new Error(`Money Loop stage was not visible before selecting ${artifactId}.`);
  if (prepared.combinedFits && !prepared.targetVisible) throw new Error(`Money Loop ${artifactId} tab was not visible with the stage before selection: ${JSON.stringify(prepared)}.`);
}

function proveCanvasPng(screenshot, viewportLabel) {
  const image = decodePngRgba(screenshot);
  const proof = samplePngPixels(image, 9);
  if (!proof.opaquePixels) throw new Error(`${viewportLabel} canvas pixel sample was transparent or blank.`);
  if (proof.colorCount < 2) throw new Error(`${viewportLabel} canvas pixel sample was single-color (${proof.colorCount} sampled color).`);
  return proof;
}

async function resolveCanvasClip(page, viewportLabel) {
  const canvas = page.getByTestId('money-loop-three-stage').locator('canvas');
  const box = await canvas.boundingBox();
  const viewport = await page.evaluate(() => ({ height: window.innerHeight, scrollY: window.scrollY, width: window.innerWidth }));
  if (!box || box.width <= 0 || box.height <= 0 || box.x < 0 || box.y < 0 || box.x + box.width > viewport.width || box.y + box.height > viewport.height) {
    throw new Error(`${viewportLabel} canvas was not fully visible for clipped PNG capture.`);
  }
  return { box, scrollY: viewport.scrollY };
}

async function captureCanvasElementPng(page, viewportLabel, deadline, clip = null) {
  const canvasClip = clip ?? await resolveCanvasClip(page, viewportLabel);
  let screenshot;
  try {
    screenshot = await page.screenshot({ clip: canvasClip.box, scale: 'css', timeout: remainingTimeout(deadline) });
  } catch (error) {
    throw new Error(`${viewportLabel} clipped canvas PNG capture started with ${remainingTimeout(deadline)}ms remaining: ${error.message}`);
  }
  const completedAt = Date.now();
  if (completedAt > deadline) throw new Error(`${viewportLabel} canvas PNG capture completed after its deadline.`);
  return { canvasClip, completedAt, screenshot };
}

async function captureCanvasElementPngProof(page, viewportLabel, deadline, clip = null) {
  const capture = await captureCanvasElementPng(page, viewportLabel, deadline, clip);
  return { ...capture, ...proveCanvasPng(capture.screenshot, viewportLabel) };
}

async function restoreOrResolveCanvasClip(page, viewportLabel, previousClip) {
  const scrollY = await page.evaluate(() => window.scrollY);
  return Math.abs(scrollY - previousClip.scrollY) < 1
    ? previousClip
    : resolveCanvasClip(page, viewportLabel);
}

async function restoreStageForPixelSampling(page, viewportLabel, expectedRenderMode, deadline) {
  await waitForNormalStage(page, viewportLabel, expectedRenderMode, remainingTimeout(deadline));
}

async function waitForStageSettled(page, artifactId, deadline) {
  await page.waitForFunction((selectedId) => {
    const stage = document.querySelector('[data-testid="money-loop-three-stage"]');
    const canvas = stage?.querySelector('canvas');
    return stage?.getAttribute('data-active-artifact') === selectedId &&
      stage.getAttribute('data-selection-state') === 'settled' &&
      canvas instanceof HTMLCanvasElement;
  }, artifactId, { timeout: remainingTimeout(deadline) });
}

function writeCanvasDebugImages(viewportLabel, candidatePixels, confirmationPixels) {
  fs.writeFileSync(path.join(evidenceDirectory, `${viewportLabel}-candidate.png`), candidatePixels.screenshot);
  fs.writeFileSync(path.join(evidenceDirectory, `${viewportLabel}-confirmation.png`), confirmationPixels.screenshot);
}

function formatSpatialDistance(distance) {
  return `max ${distance.maxCellDistance.toFixed(2)}, mean ${distance.meanCellDistance.toFixed(2)}, changed cells ${distance.changedCellCount}`;
}

async function captureSelectionCanvasState(page, viewportLabel, selectionStartedAt, preClickFingerprint, preClickDescriptor, preClickClip) {
  const deadline = selectionStartedAt + SELECTION_SETTLE_BUDGET_MS;
  const canvasClip = await restoreOrResolveCanvasClip(page, viewportLabel, preClickClip);
  const candidateCapture = await captureCanvasElementPng(page, viewportLabel, deadline, canvasClip);
  const candidatePixels = { ...candidateCapture, ...proveCanvasPng(candidateCapture.screenshot, viewportLabel) };
  const candidateMaterialDistance = compareSpatialDescriptors(preClickDescriptor, candidatePixels.stabilityDescriptor);
  if (candidatePixels.identitySignature === preClickFingerprint || !hasMaterialSpatialChange(candidateMaterialDistance)) {
    throw new Error(`${viewportLabel} decoded candidate did not materially change from the pre-selection canvas: ${formatSpatialDistance(candidateMaterialDistance)}; material limits require max >= ${MIN_MATERIAL_SPATIAL_CELL_DISTANCE} and changed cells >= ${MIN_MATERIAL_SPATIAL_CHANGED_CELL_COUNT}.`);
  }
  const settledAt = Date.now();
  if (settledAt > deadline) {
    throw new Error(`${viewportLabel} decoded material canvas candidate settled in ${settledAt - selectionStartedAt}ms, beyond ${SELECTION_SETTLE_BUDGET_MS}ms.`);
  }
  const settledAtMs = settledAt - selectionStartedAt;
  const confirmationDeadline = settledAt + STABILITY_CONFIRMATION_BUDGET_MS;
  let confirmationCapture;
  try {
    confirmationCapture = await captureCanvasElementPng(page, viewportLabel, confirmationDeadline, canvasClip);
  } catch (error) {
    throw new Error(`${viewportLabel} candidate settled in ${settledAtMs}ms, but stability confirmation missed its ${STABILITY_CONFIRMATION_BUDGET_MS}ms bound: ${error.message}`);
  }
  const confirmationPixels = { ...confirmationCapture, ...proveCanvasPng(confirmationCapture.screenshot, viewportLabel) };
  const stableThrough = Date.now();
  if (stableThrough > confirmationDeadline) {
    throw new Error(`${viewportLabel} candidate settled in ${settledAtMs}ms, but stability confirmation completed ${stableThrough - settledAt}ms later, beyond ${STABILITY_CONFIRMATION_BUDGET_MS}ms.`);
  }
  const stableThroughMs = stableThrough - selectionStartedAt;
  const confirmationMaterialDistance = compareSpatialDescriptors(preClickDescriptor, confirmationPixels.stabilityDescriptor);
  if (confirmationPixels.identitySignature === preClickFingerprint || !hasMaterialSpatialChange(confirmationMaterialDistance)) {
    writeCanvasDebugImages(viewportLabel, candidatePixels, confirmationPixels);
    throw new Error(`${viewportLabel} stability confirmation did not materially retain the selected canvas state: ${formatSpatialDistance(confirmationMaterialDistance)}; material limits require max >= ${MIN_MATERIAL_SPATIAL_CELL_DISTANCE} and changed cells >= ${MIN_MATERIAL_SPATIAL_CHANGED_CELL_COUNT}.`);
  }
  const stabilityDistance = compareSpatialDescriptors(candidatePixels.stabilityDescriptor, confirmationPixels.stabilityDescriptor);
  if (stabilityDistance.maxCellDistance > MAX_SETTLED_SPATIAL_CELL_DISTANCE || stabilityDistance.meanCellDistance > MAX_SETTLED_SPATIAL_MEAN_DISTANCE) {
    writeCanvasDebugImages(viewportLabel, candidatePixels, confirmationPixels);
    throw new Error(`${viewportLabel} candidate settled in ${settledAtMs}ms was not stable through ${stableThroughMs}ms: ${formatSpatialDistance(stabilityDistance)}; limits max ${MAX_SETTLED_SPATIAL_CELL_DISTANCE}, mean ${MAX_SETTLED_SPATIAL_MEAN_DISTANCE}.`);
  }
  return { ...candidatePixels, settledAtMs, stableThroughMs, stabilityDistance };
}

async function waitForArtifactSelection(page, artifactId, geometry, timeout) {
  await page.waitForFunction(({ selectedId, expectedGeometry }) => {
    const tab = document.querySelector(`[data-testid="money-loop-artifact-node-${selectedId}"]`);
    const panel = document.querySelector('[data-testid="money-loop-artifact-active"]');
    return tab?.getAttribute('aria-selected') === 'true' && panel?.getAttribute('data-active-geometry') === expectedGeometry;
  }, { selectedId: artifactId, expectedGeometry: geometry }, { timeout });
}

async function exerciseSelection(page, viewportLabel, expectedRenderMode, artifactId, geometry, trigger) {
  const preClickDeadline = Date.now() + 5000;
  await restoreStageForPixelSampling(page, viewportLabel, expectedRenderMode, preClickDeadline);
  await prepareStageAndTargetForClick(page, artifactId);
  const before = await captureCanvasElementPngProof(page, viewportLabel, preClickDeadline);
  const selectionStartedAt = Date.now();
  await trigger();
  const deadline = selectionStartedAt + SELECTION_SETTLE_BUDGET_MS;
  const selectionProof = waitForArtifactSelection(page, artifactId, geometry, remainingTimeout(deadline));
  const restoredStage = restoreStageForPixelSampling(page, viewportLabel, expectedRenderMode, deadline);
  const settledStage = waitForStageSettled(page, artifactId, deadline);
  await Promise.all([selectionProof, restoredStage, settledStage]);
  const pixels = await captureSelectionCanvasState(page, viewportLabel, selectionStartedAt, before.identitySignature, before.stabilityDescriptor, before.canvasClip);
  return { pixels, pngProof: pixels, settledAtMs: pixels.settledAtMs, stableThroughMs: pixels.stableThroughMs };
}

async function waitForArtifact(page, artifactId, geometry, viewportLabel, expectedRenderMode, selectionFingerprints) {
  const tab = page.getByTestId(`money-loop-artifact-node-${artifactId}`);
  const result = await exerciseSelection(page, viewportLabel, expectedRenderMode, artifactId, geometry, () => tab.click());
  const matchingArtifact = selectionFingerprints.get(result.pixels.identitySignature);
  if (matchingArtifact) throw new Error(`${viewportLabel} ${artifactId} canvas fingerprint did not change after selection; it matches ${matchingArtifact}.`);
  selectionFingerprints.set(result.pixels.identitySignature, artifactId);
  console.log(`PASS ${viewportLabel} ${artifactId} ${geometry} ${result.pngProof.colorCount} PNG canvas colors; settled in ${result.settledAtMs}ms; stable through ${result.stableThroughMs}ms`);
}

async function assertStageContainment(page, viewportLabel) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const stage = document.querySelector('[data-testid="money-loop-three-stage"]');
    const orbit = document.querySelector('[data-testid="money-loop-payoff-orbit"]');
    const canvas = stage?.querySelector('canvas');
    if (!(stage instanceof HTMLElement) || !(orbit instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) return null;
    const stageRect = stage.getBoundingClientRect();
    const orbitRect = orbit.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return { canvasRect, clientWidth: root.clientWidth, orbitRect, scrollWidth: root.scrollWidth, stageRect };
  });
  if (!result) throw new Error(`${viewportLabel} could not measure the Money Loop stage and canvas.`);
  if (result.scrollWidth > result.clientWidth + 1) throw new Error(`${viewportLabel} document overflows ${result.scrollWidth}px beyond ${result.clientWidth}px.`);
  for (const [name, rect] of Object.entries({ stage: result.stageRect, canvas: result.canvasRect })) {
    if (rect.left < result.orbitRect.left - 1 || rect.right > result.orbitRect.right + 1 || rect.top < result.orbitRect.top - 1 || rect.bottom > result.orbitRect.bottom + 1) {
      throw new Error(`${viewportLabel} ${name} escapes its Money Loop orbit container.`);
    }
  }
}

async function ensureSelectedTabInView(page) {
  await page.evaluate(() => {
    const viewport = document.querySelector('[data-testid="money-loop-artifact-selector-viewport"]');
    const selectorGrid = document.querySelector('[data-testid="money-loop-artifact-selector-grid"]');
    const selected = selectorGrid instanceof HTMLElement
      ? selectorGrid.querySelector('[role="tab"][aria-selected="true"]')
      : null;
    if (!(viewport instanceof HTMLElement) || !(selected instanceof HTMLElement)) return;
    viewport.scrollLeft = Math.max(0, selected.offsetLeft - (viewport.clientWidth - selected.offsetWidth) / 2);
  });
}

async function positionFinalMoneyLoopViewport(page) {
  await page.evaluate(() => {
    const orbit = document.querySelector('[data-testid="money-loop-payoff-orbit"]');
    const selector = document.querySelector('[data-testid="money-loop-artifact-selector-viewport"]');
    const mobileNav = document.querySelector('[data-testid="primary-navigation"]');
    if (!(orbit instanceof HTMLElement) || !(selector instanceof HTMLElement)) return;
    const orbitRect = orbit.getBoundingClientRect();
    const selectorRect = selector.getBoundingClientRect();
    const navRect = mobileNav instanceof HTMLElement ? mobileNav.getBoundingClientRect() : null;
    const top = window.scrollY + Math.min(orbitRect.top, selectorRect.top);
    const bottom = window.scrollY + Math.max(orbitRect.bottom, selectorRect.bottom);
    const availableHeight = Math.max(1, navRect?.top ?? window.innerHeight);
    const regionHeight = bottom - top;
    if (regionHeight <= availableHeight) {
      window.scrollTo({ top: Math.max(0, top - (availableHeight - regionHeight) / 2) });
    }
  });
}

async function assertResponsiveGeometry(page, viewportLabel) {
  await positionFinalMoneyLoopViewport(page);
  await ensureSelectedTabInView(page);
  const result = await page.evaluate(() => {
    const getRect = (selector) => {
      const node = document.querySelector(selector);
      if (!(node instanceof HTMLElement)) return null;
      const rect = node.getBoundingClientRect();
      return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
    };
    const selectorGrid = document.querySelector('[data-testid="money-loop-artifact-selector-grid"]');
    const selected = selectorGrid instanceof HTMLElement
      ? selectorGrid.querySelector('[role="tab"][aria-selected="true"]')
      : null;
    const selectedRect = selected instanceof HTMLElement ? selected.getBoundingClientRect() : null;
    const selectedChildren = selected instanceof HTMLElement
      ? [...selected.querySelectorAll('p, span')].map((node) => node.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0)
      : [];
    const selectedTextOverflow = selected instanceof HTMLElement
      ? [...selected.querySelectorAll('p, span')]
        .filter((node) => node instanceof HTMLElement && node.scrollWidth > node.clientWidth + 1)
        .map((node) => ({ text: node.textContent?.trim(), clientWidth: node.clientWidth, scrollWidth: node.scrollWidth }))
      : [];
    const tabs = selectorGrid instanceof HTMLElement
      ? [...selectorGrid.querySelectorAll('[role="tab"]')]
      : [];
    const artifactTabs = tabs
      .filter((node) => node instanceof HTMLElement)
      .map((tab) => {
        const tabRect = tab.getBoundingClientRect();
        const textNodes = [...tab.querySelectorAll('p, span')]
          .filter((node) => node instanceof HTMLElement)
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              bottom: rect.bottom,
              clientWidth: node.clientWidth,
              left: rect.left,
              right: rect.right,
              scrollWidth: node.scrollWidth,
              text: node.textContent?.trim(),
              top: rect.top,
              visible: rect.width > 0 && rect.height > 0,
            };
          });
        return {
          id: tab.getAttribute('data-testid'),
          rect: { bottom: tabRect.bottom, left: tabRect.left, right: tabRect.right, top: tabRect.top, width: tabRect.width },
          textNodes,
        };
      });
    return {
      controls: getRect('[data-testid="money-loop-artifact-previous"]') && getRect('[data-testid="money-loop-artifact-next"]')
        ? (() => { const previous = getRect('[data-testid="money-loop-artifact-previous"]'); const next = getRect('[data-testid="money-loop-artifact-next"]'); return { bottom: Math.max(previous.bottom, next.bottom), left: Math.min(previous.left, next.left), right: Math.max(previous.right, next.right), top: Math.min(previous.top, next.top) }; })()
        : null,
      detail: getRect('[data-testid="money-loop-artifact-detail"]'),
      mobileNav: getRect('[data-testid="primary-navigation"]'),
      orbit: getRect('[data-testid="money-loop-payoff-orbit"]'),
      selector: getRect('[data-testid="money-loop-artifact-selector-viewport"]'),
      selectedChildren,
      selectedTextOverflow,
      selectedRect: selectedRect && { bottom: selectedRect.bottom, left: selectedRect.left, right: selectedRect.right, top: selectedRect.top },
      tabs: artifactTabs,
    };
  });
  const overlaps = (first, second) => first && second && first.left < second.right - 1 && first.right > second.left + 1 && first.top < second.bottom - 1 && first.bottom > second.top + 1;
  if (!result.orbit || !result.detail || !result.controls || !result.selector || !result.selectedRect) throw new Error(`${viewportLabel} is missing Money Loop geometry hooks.`);
  for (const [firstName, first, secondName, second] of [
    ['orbit', result.orbit, 'detail', result.detail],
    ['orbit', result.orbit, 'selector', result.selector],
    ['detail', result.detail, 'selector', result.selector],
    ['controls', result.controls, 'selector', result.selector],
  ]) {
    if (overlaps(first, second)) throw new Error(`${viewportLabel} ${firstName} overlaps ${secondName}.`);
  }
  if (result.selectedRect.left < result.selector.left - 1 || result.selectedRect.right > result.selector.right + 1) throw new Error(`${viewportLabel} selected artifact tab is not horizontally in view.`);
  for (const child of result.selectedChildren) {
    if (child.left < result.selectedRect.left - 1 || child.right > result.selectedRect.right + 1 || child.top < result.selectedRect.top - 1 || child.bottom > result.selectedRect.bottom + 1) {
      throw new Error(`${viewportLabel} selected artifact text escapes its tab.`);
    }
  }
  if (result.selectedTextOverflow.length > 0) {
    throw new Error(`${viewportLabel} selected artifact text overflows its card: ${JSON.stringify(result.selectedTextOverflow)}.`);
  }
  if (viewportLabel === 'mobile') {
    if (result.tabs.length !== 5) throw new Error(`mobile expected five artifact tabs, received ${result.tabs.length}.`);
    for (const tab of result.tabs) {
      if (tab.rect.width < 135) throw new Error(`mobile ${tab.id ?? 'artifact tab'} is too narrow at ${tab.rect.width.toFixed(1)}px; expected a stable 136px track.`);
      for (const textNode of tab.textNodes.filter((node) => node.visible)) {
        if (textNode.left < tab.rect.left - 1 || textNode.right > tab.rect.right + 1 || textNode.top < tab.rect.top - 1 || textNode.bottom > tab.rect.bottom + 1) {
          throw new Error(`mobile ${tab.id ?? 'artifact tab'} text escapes its card: ${JSON.stringify(textNode)}.`);
        }
        if (textNode.scrollWidth > textNode.clientWidth + 1) {
          throw new Error(`mobile ${tab.id ?? 'artifact tab'} text overflows its card: ${JSON.stringify(textNode)}.`);
        }
      }
    }
  }
  if (viewportLabel === 'mobile' && result.mobileNav && (overlaps(result.mobileNav, result.orbit) || overlaps(result.mobileNav, result.detail) || overlaps(result.mobileNav, result.controls) || overlaps(result.mobileNav, result.selector))) {
    throw new Error('mobile fixed navigation overlaps a tested Money Loop region.');
  }
  console.log(`PASS ${viewportLabel} Money Loop regions do not overlap`);
}

async function assertDomFocusAuthority(page, viewportLabel) {
  const income = page.getByTestId('money-loop-artifact-node-income');
  await income.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.activeElement?.id === 'money-loop-artifact-tab-loc' && document.querySelector('[data-testid="money-loop-artifact-node-loc"]')?.getAttribute('aria-selected') === 'true', { timeout: 10000 });
  const state = await page.evaluate(() => ({
    focusedId: document.activeElement?.id,
    selectedTabCount: document.querySelector('[role="tablist"]')?.querySelectorAll('[role="tab"][aria-selected="true"]').length,
    stageAriaHidden: document.querySelector('[data-testid="money-loop-three-stage"]')?.getAttribute('aria-hidden'),
  }));
  if (state.focusedId !== 'money-loop-artifact-tab-loc' || state.selectedTabCount !== 1 || state.stageAriaHidden !== 'true') throw new Error(`${viewportLabel} DOM tab authority or roving focus was not preserved: ${JSON.stringify(state)}.`);
  console.log(`PASS ${viewportLabel} DOM tabs retain authority and roving focus`);
}

async function assertStepControls(page, viewportLabel, expectedRenderMode) {
  const cases = [
    ['money-loop-artifact-next', 'Enter', 'loc', 'credit-aperture'],
    ['money-loop-artifact-next', 'Space', 'expenses', 'outflow-gate'],
    ['money-loop-artifact-previous', 'Enter', 'loc', 'credit-aperture'],
    ['money-loop-artifact-previous', 'Space', 'income', 'deposit-reservoir'],
  ];
  for (const [controlId, key, artifactId, geometry] of cases) {
    const control = page.getByTestId(controlId);
    await control.focus();
    await exerciseSelection(page, viewportLabel, expectedRenderMode, artifactId, geometry, () => page.keyboard.press(key));
    const focused = await page.evaluate((expectedControlId) => document.activeElement?.getAttribute('data-testid') === expectedControlId, controlId);
    if (!focused) throw new Error(`${viewportLabel} ${controlId} lost focus after ${key}.`);
    console.log(`PASS ${viewportLabel} ${controlId} ${key} selects ${artifactId} and retains focus`);
  }
}

async function writeVerifiedScreenshot(page, screenshotPath, width, height) {
  const screenshot = await page.screenshot({ scale: 'css' });
  const decoded = decodePngRgba(screenshot);
  if (decoded.width !== width || decoded.height !== height) throw new Error(`Screenshot ${path.basename(screenshotPath)} expected ${width}x${height}, received ${decoded.width}x${decoded.height}.`);
  fs.writeFileSync(screenshotPath, screenshot);
}

async function installCapableHardwareHints(context) {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 8 });
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 8 });
  });
}

async function verifyNormalViewport(browser, origin, viewportLabel, viewport, expectedRenderMode, expectedDpr) {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport, reducedMotion: 'no-preference' });
  await installCapableHardwareHints(context);
  const page = await context.newPage();
  const browserErrors = [];
  const onConsole = (message) => { if (message.type() === 'error') browserErrors.push(message.text()); };
  const onPageError = (error) => browserErrors.push(error.message);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  try {
    const response = await page.goto(origin, { waitUntil: 'networkidle' });
    if (!response || response.status() !== 200) throw new Error(`${viewportLabel} dashboard returned HTTP ${response?.status() ?? 'no response'}.`);
    await waitForNormalStage(page, viewportLabel, expectedRenderMode);
    await waitForStageSettled(page, 'income', Date.now() + 15000);
    const webgl2 = await assertGenuineWebgl2(page, viewportLabel);
    await assertCanvasDpr(page, viewportLabel, expectedDpr);
    const selectionFingerprints = new Map();
    for (const [artifactId, geometry] of artifacts) await waitForArtifact(page, artifactId, geometry, viewportLabel, expectedRenderMode, selectionFingerprints);
    await assertStepControls(page, viewportLabel, expectedRenderMode);
    await assertStageContainment(page, viewportLabel);
    await assertDomFocusAuthority(page, viewportLabel);
    await waitForStageSettled(page, 'loc', Date.now() + SELECTION_SETTLE_BUDGET_MS);
    await assertResponsiveGeometry(page, viewportLabel);
    if (browserErrors.length > 0) throw new Error(`${viewportLabel} browser errors: ${browserErrors.join(' | ')}`);
    const screenshotPath = path.join(evidenceDirectory, `${viewportLabel}.png`);
    await writeVerifiedScreenshot(page, screenshotPath, viewport.width, viewport.height);
    console.log(`PASS ${viewportLabel} ${expectedRenderMode} WebGL2 ${webgl2.renderer}; screenshot ${screenshotPath}`);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    await context.close();
  }
}

async function verifyReducedMotionFallback(browser, origin) {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    const response = await page.goto(origin, { waitUntil: 'networkidle' });
    if (!response || response.status() !== 200) throw new Error(`reduced-motion dashboard returned HTTP ${response?.status() ?? 'no response'}.`);
    const stage = page.getByTestId('money-loop-three-stage');
    await stage.waitFor({ state: 'visible', timeout: 15000 });
    await stage.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-testid="money-loop-three-stage"]')?.getAttribute('data-render-mode') === 'static', { timeout: 15000 });
    if (await stage.locator('canvas').count() !== 0) throw new Error('reduced-motion fallback mounted a WebGL canvas.');
    const loc = page.getByTestId('money-loop-artifact-node-loc');
    await loc.click();
    if ((await loc.getAttribute('aria-selected')) !== 'true') throw new Error('reduced-motion fallback did not preserve the DOM artifact controls.');
    await writeVerifiedScreenshot(page, path.join(evidenceDirectory, 'reduced-motion-static.png'), 1440, 900);
    console.log('PASS reduced-motion static fallback has no WebGL canvas and preserves DOM tabs');
  } finally {
    await context.close();
  }
}

async function run() {
  if (!fs.existsSync(path.join(appRoot, '.next', 'build-manifest.json'))) throw new Error('Run npm run build before npm run test:3d:built.');
  const executablePath = findBrowserExecutable();
  if (!executablePath) throw new Error('No system Chrome, Chromium, or Edge executable was found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to override discovery.');
  fs.rmSync(evidenceDirectory, { recursive: true, force: true });
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  try {
    const started = await startBuiltServer(appRoot);
    activeServer = started.server;
    activeBrowser = await chromium.launch({ executablePath, headless: true, args: getHeadlessChromiumArgs() });
    for (const { viewportLabel, viewport, expectedRenderMode, expectedDpr } of normalViewports) {
      await verifyNormalViewport(activeBrowser, started.origin, viewportLabel, viewport, expectedRenderMode, expectedDpr);
    }
    await verifyReducedMotionFallback(activeBrowser, started.origin);
    console.log(`Three-stage screenshots: ${evidenceDirectory}`);
  } finally {
    await activeBrowser?.close();
    activeBrowser = undefined;
    await stopServer(activeServer);
    activeServer = undefined;
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
