import React, { useLayoutEffect, useRef } from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import type { ScenarioCompositionProps } from './scenario-types';
import { ScenarioVisual, toneColor } from './visuals';

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const SAFE_AREAS = {
  landscape: { top: 100, right: 96, bottom: 100, left: 96 },
  portrait: { top: 140, right: 72, bottom: 220, left: 72 },
  square: { top: 100, right: 88, bottom: 120, left: 88 },
} as const;
const TYPE_MIN = { headline: 84, supporting: 44, label: 32 } as const;

function assertLayout(root: HTMLElement, frameKind: ScenarioCompositionProps['frameKind']) {
  const frameRect = root.getBoundingClientRect();
  const safe = SAFE_AREAS[frameKind];
  const bounds = {
    top: frameRect.top + safe.top,
    right: frameRect.right - safe.right,
    bottom: frameRect.bottom - safe.bottom,
    left: frameRect.left + safe.left,
  };
  const failures: string[] = [];
  if (root.scrollWidth > root.clientWidth + 1 || root.scrollHeight > root.clientHeight + 1) {
    failures.push(`root overflow ${root.scrollWidth}x${root.scrollHeight} > ${root.clientWidth}x${root.clientHeight}`);
  }
  root.querySelectorAll<HTMLElement>('[data-layout-zone], [data-safe-content]').forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1) {
      failures.push(`${element.dataset.layoutZone ?? element.dataset.safeContent} escapes the ${frameKind} safe area`);
    }
  });
  const zones = [...root.querySelectorAll<HTMLElement>(':scope > [data-layout-zone]')];
  for (let leftIndex = 0; leftIndex < zones.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < zones.length; rightIndex += 1) {
      const left = zones[leftIndex].getBoundingClientRect();
      const right = zones[rightIndex].getBoundingClientRect();
      const overlaps = left.left < right.right - 1
        && left.right > right.left + 1
        && left.top < right.bottom - 1
        && left.bottom > right.top + 1;
      if (overlaps) failures.push(`${zones[leftIndex].dataset.layoutZone} overlaps ${zones[rightIndex].dataset.layoutZone}`);
    }
  }
  root.querySelectorAll<HTMLElement>('[data-layout-item]').forEach((element) => {
    if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) {
      const label = element.dataset.layoutItem === 'true'
        ? `${element.tagName.toLowerCase()} "${element.textContent?.trim().slice(0, 48)}"`
        : element.dataset.layoutItem ?? element.tagName;
      failures.push(`${label} overflows ${element.clientWidth}x${element.clientHeight} with ${element.scrollWidth}x${element.scrollHeight}`);
    }
  });
  if (failures.length > 0) throw new Error(`Remotion layout contract failed: ${failures.join('; ')}`);
}

export const ScenarioExplainer: React.FC<ScenarioCompositionProps> = ({
  scenario,
  frameKind,
  reducedMotion,
  settled = false,
}) => {
  const currentFrame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const rootRef = useRef<HTMLElement>(null);
  const frame = settled ? 220 : currentFrame;
  const portrait = frameKind === 'portrait';
  const safe = SAFE_AREAS[frameKind];
  const phase = frame < 30 ? 'intro' : frame < 210 ? 'story' : 'resolve';
  const enterY = reducedMotion ? 0 : interpolate(frame, [6, 27], [36, 0], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const introOpacity = interpolate(frame, [6, 18], [0, 1], clamp);
  const visualProgress = interpolate(frame, [30, 51], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const resultOpacity = interpolate(frame, [210, 216], [0, 1], clamp);
  const fontCss = `
    @font-face { font-family: "Literata Variable"; src: url("${staticFile('fonts/literata-variable.woff2')}") format("woff2"); font-weight: 200 900; }
    @font-face { font-family: "Geist Variable"; src: url("${staticFile('fonts/geist-variable.woff2')}") format("woff2"); font-weight: 100 900; }
    @font-face { font-family: "Geist Mono Variable"; src: url("${staticFile('fonts/geist-mono-variable.woff2')}") format("woff2"); font-weight: 100 900; }
  `;

  useLayoutEffect(() => {
    if (rootRef.current) assertLayout(rootRef.current, frameKind);
  }, [frame, frameKind, height, scenario.id, width]);

  return (
    <AbsoluteFill style={{ width, height, overflow: 'hidden', background: '#07111F', color: '#F5F7F2', fontFamily: 'Geist Variable' }}>
      <style>{fontCss}</style>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.34, background: 'radial-gradient(circle at 76% 28%, rgba(56,189,248,.18), transparent 34%), linear-gradient(135deg, #07111F 0%, #07111F 60%, #102235 100%)' }} />
      <main
        ref={rootRef}
        style={{
          position: 'relative',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: `${safe.top}px ${safe.right}px ${safe.bottom}px ${safe.left}px`,
          gap: portrait ? 28 : 22,
          overflow: 'hidden',
        }}
      >
        <header data-layout-zone="header" data-layout-item style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, minHeight: 40, color: '#C6D0D8', fontSize: TYPE_MIN.label }}>
          <strong style={{ color: '#38BDF8', fontSize: TYPE_MIN.label }}>INTERESTSHIELD</strong>
          <span>Educational tool. Not financial advice.</span>
        </header>

        {phase === 'intro' ? (
          <section data-layout-zone="intro" data-layout-item style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', minHeight: 0, opacity: introOpacity }}>
            <div data-safe-content="intro-content" data-layout-item style={{ translate: `0 ${enterY}px` }}>
              <span style={{ color: scenario.status === 'blocked' ? '#FB7185' : '#38BDF8', fontSize: TYPE_MIN.label, fontWeight: 700, textTransform: 'uppercase' }}>{scenario.kicker}</span>
              <h1 style={{ maxWidth: 1200, margin: '12px 0 16px', fontFamily: 'Literata Variable', fontSize: TYPE_MIN.headline, lineHeight: 1.04, letterSpacing: 0 }}>{scenario.title}</h1>
              <p style={{ maxWidth: 1320, margin: 0, color: '#C6D0D8', fontSize: TYPE_MIN.supporting, lineHeight: 1.45 }}>{scenario.summary}</p>
            </div>
          </section>
        ) : null}

        {phase === 'story' ? (
          <section data-layout-zone="story" data-layout-item style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, gap: 18 }}>
            <span style={{ color: scenario.status === 'blocked' ? '#FB7185' : '#38BDF8', fontSize: TYPE_MIN.label, fontWeight: 700, textTransform: 'uppercase' }}>{scenario.kicker}</span>
            <div data-layout-item style={{ display: 'flex', flex: 1, alignItems: 'center', width: portrait ? '100%' : frameKind === 'square' ? '100%' : '86%', margin: '0 auto', minWidth: 0, minHeight: 0 }}>
              <ScenarioVisual scenario={scenario} frameKind={frameKind} frame={frame} progress={reducedMotion ? 1 : visualProgress} />
            </div>
          </section>
        ) : null}

        {phase === 'resolve' ? (
          <section data-layout-zone="resolve" data-layout-item style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', minHeight: 0, gap: portrait ? 22 : 18, opacity: settled ? 1 : resultOpacity }}>
            <div>
              <span style={{ color: scenario.status === 'blocked' ? '#FB7185' : '#38BDF8', fontSize: TYPE_MIN.label, fontWeight: 700, textTransform: 'uppercase' }}>{scenario.kicker}</span>
              <h1 style={{ margin: '8px 0 0', fontFamily: 'Literata Variable', fontSize: TYPE_MIN.headline, lineHeight: 1.04, letterSpacing: 0 }}>{scenario.title}</h1>
            </div>
            {scenario.id === 'money-loop-month' && !reducedMotion ? (
              <p data-layout-item style={{ margin: 0, color: '#C6D0D8', fontSize: TYPE_MIN.label, lineHeight: 1.45 }}>
                Order: {scenario.output.storySteps.map((step) => step.label).join(' > ')}.
              </p>
            ) : null}
            {scenario.id === 'money-loop-month' && reducedMotion ? (
              <div data-layout-item="reduced-motion-fact-sheet" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                {scenario.output.storySteps.map((step, index) => (
                  <div key={step.id} data-layout-item style={{ display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr)', columnGap: 10, minWidth: 0, padding: '10px 12px', background: '#102235', borderTop: `6px solid ${toneColor(step.tone)}` }}>
                    <strong style={{ color: '#38BDF8', fontFamily: 'Geist Mono Variable', fontSize: TYPE_MIN.label }}>{index + 1}</strong>
                    <div data-layout-item style={{ display: 'grid', gap: 3, minWidth: 0 }}>
                      <span style={{ color: '#C6D0D8', fontSize: TYPE_MIN.label, lineHeight: 1.1 }}>{step.label}</span>
                      <strong style={{ color: '#F5F7F2', fontFamily: 'Geist Mono Variable', fontSize: 36, lineHeight: 1.05 }}>{step.value}</strong>
                      <span style={{ color: '#C6D0D8', fontSize: TYPE_MIN.label, lineHeight: 1.15 }}>{step.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div data-layout-item style={{ display: 'grid', gridTemplateColumns: portrait ? '1fr' : '1fr 1fr', gap: 14 }}>
              {scenario.cards.map((card) => (
                <div key={card.label} data-layout-item style={{ display: 'grid', gap: 7, minWidth: 0, padding: '16px 20px', background: '#102235', borderLeft: `8px solid ${toneColor(card.tone)}` }}>
                  <span style={{ color: '#C6D0D8', fontSize: TYPE_MIN.label }}>{card.label}</span>
                  <strong style={{ color: '#F5F7F2', fontFamily: 'Geist Mono Variable', fontSize: 40, lineHeight: 1.05 }}>{card.value}</strong>
                  <span style={{ color: '#C6D0D8', fontSize: TYPE_MIN.label, lineHeight: 1.45 }}>{card.detail}</span>
                </div>
              ))}
            </div>
            <footer data-layout-item style={{ display: 'grid', gridTemplateColumns: portrait ? '1fr' : 'minmax(0, 3fr) minmax(260px, 2fr)', alignItems: 'center', gap: portrait ? 12 : 26, paddingTop: 14, borderTop: '2px solid #183247' }}>
              <span style={{ color: '#C6D0D8', fontSize: TYPE_MIN.label, lineHeight: 1.45 }}>{scenario.assumption}</span>
              <strong style={{ color: scenario.status === 'blocked' ? '#FB7185' : '#34D399', fontSize: TYPE_MIN.label, lineHeight: 1.35, textAlign: portrait ? 'left' : 'right' }}>
                {scenario.status === 'blocked' ? 'Projection blocked. ' : 'Modeled. '}{scenario.closing}
              </strong>
            </footer>
          </section>
        ) : null}
      </main>
    </AbsoluteFill>
  );
};
