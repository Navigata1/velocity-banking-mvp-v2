import React from 'react';

import type { FrameKind, ScenarioStory, ScenarioTone } from './scenario-types';

const tones: Record<ScenarioTone, string> = {
  progress: '#34D399',
  information: '#38BDF8',
  caution: '#FBBF24',
  blocked: '#FB7185',
};
const wholeUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

interface VisualProps {
  scenario: ScenarioStory;
  frameKind: FrameKind;
  frame: number;
  progress: number;
}

type BaselineStory = Extract<ScenarioStory, { id: 'baseline-comparison' }>;
type MoneyLoopStory = Extract<ScenarioStory, { id: 'money-loop-month' }>;
type BlockedStory = Extract<ScenarioStory, { id: 'blocked-plan' }>;

const BaselineVisual: React.FC<Omit<VisualProps, 'scenario'> & { scenario: BaselineStory }> = ({ scenario, frameKind, progress }) => {
  const compact = frameKind !== 'landscape';
  const paths = [
    { label: 'Fixed payment', value: scenario.output.baseline, tone: 'information' as const },
    { label: 'Higher payment', value: scenario.output.modeledPlan, tone: 'progress' as const },
  ];
  const longest = Math.max(...paths.map((path) => path.value.payoffMonths));

  return (
    <div data-layout-item style={{ display: 'grid', gap: compact ? 20 : 26, width: '100%' }}>
      {paths.map((path) => (
        <div key={path.label} style={{ display: 'grid', gap: 10, padding: compact ? 18 : 22, background: '#102235', borderLeft: `8px solid ${tones[path.tone]}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 18, color: '#C6D0D8', fontSize: 32 }}>
            <strong style={{ color: '#F5F7F2', fontSize: 32 }}>{path.label}</strong>
            <span>{wholeUsd.format(path.value.monthlyPayment)}/month</span>
          </div>
          <div style={{ height: 18, overflow: 'hidden', background: '#183247' }}>
            <div style={{ width: `${(path.value.payoffMonths / longest) * 100}%`, height: '100%', background: tones[path.tone], scale: `${progress} 1`, transformOrigin: 'left center' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, color: '#C6D0D8', fontFamily: 'Geist Mono Variable', fontSize: compact ? 32 : 36 }}>
            <strong style={{ color: '#F5F7F2' }}>{path.value.payoffMonths} months</strong>
            <span>{wholeUsd.format(path.value.totalInterest)} interest</span>
          </div>
        </div>
      ))}
      <span style={{ color: '#C6D0D8', fontSize: 32 }}>
        Same {wholeUsd.format(scenario.inputs.principalBalance)} balance and {scenario.inputs.apr}% APR.
      </span>
    </div>
  );
};

const MoneyLoopVisual: React.FC<Omit<VisualProps, 'scenario'> & { scenario: MoneyLoopStory }> = ({ scenario, frame, progress }) => {
  const activeIndex = Math.min(scenario.output.storySteps.length - 1, Math.max(0, Math.floor((frame - 30) / 30)));
  const active = scenario.output.storySteps[activeIndex];

  return (
    <div data-layout-item style={{ display: 'grid', gap: 18, width: '100%', minWidth: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, minWidth: 0 }}>
        {scenario.output.storySteps.map((step, index) => {
          const reached = index <= activeIndex;
          return (
            <div key={step.id} style={{ boxSizing: 'border-box', minWidth: 0, minHeight: 82, padding: '12px 14px', background: reached ? '#183247' : '#102235', borderTop: `7px solid ${toneColor(step.tone)}`, opacity: progress }}>
              <span style={{ display: 'block', color: '#C6D0D8', fontSize: 32, overflowWrap: 'anywhere' }}>{index + 1}. {step.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ minHeight: 166, padding: '20px 22px', background: '#102235', borderLeft: `8px solid ${toneColor(active.tone)}` }}>
        <span style={{ display: 'block', color: '#C6D0D8', fontSize: 32 }}>
          Step {activeIndex + 1} of {scenario.output.storySteps.length}
          {active.id.includes('calendar') ? ` / ${scenario.output.dailyEvents.length} dated moves` : ''}
        </span>
        <strong style={{ display: 'block', marginTop: 8, color: '#F5F7F2', fontFamily: 'Geist Mono Variable', fontSize: 44, lineHeight: 1.1 }}>{active.value}</strong>
        <span style={{ display: 'block', marginTop: 10, color: '#C6D0D8', fontSize: 32, lineHeight: 1.45 }}>{active.detail}</span>
      </div>
    </div>
  );
};

const BlockedVisual: React.FC<Omit<VisualProps, 'scenario'> & { scenario: BlockedStory }> = ({ scenario, frameKind, progress }) => {
  const compact = frameKind !== 'landscape';
  return (
    <div data-layout-item style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: compact ? 24 : 42, width: '100%', opacity: progress }}>
      <svg aria-hidden="true" viewBox="0 0 300 360" style={{ flex: '0 0 auto', width: compact ? 170 : 220, height: compact ? 204 : 264 }}>
        <path d="M150 18 L272 66 L250 258 L150 338 L50 258 L28 66 Z" fill="#102235" stroke="#FB7185" strokeWidth="10" />
        <path d="M82 178 H218" stroke="#FB7185" strokeWidth="18" strokeLinecap="square" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <strong style={{ color: '#FB7185', fontFamily: 'Geist Mono Variable', fontSize: compact ? 84 : 108, lineHeight: 1 }}>{scenario.output.missingFields.length}</strong>
        <span style={{ maxWidth: 380, color: '#F5F7F2', fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>lender terms still needed</span>
        <span style={{ maxWidth: 420, color: '#C6D0D8', fontSize: 32, lineHeight: 1.45 }}>No payoff date is shown.</span>
      </div>
    </div>
  );
};

export const ScenarioVisual: React.FC<VisualProps> = (props) => {
  if (props.scenario.id === 'baseline-comparison') return <BaselineVisual {...props} scenario={props.scenario} />;
  if (props.scenario.id === 'money-loop-month') return <MoneyLoopVisual {...props} scenario={props.scenario} />;
  return <BlockedVisual {...props} scenario={props.scenario} />;
};

export const toneColor = (tone: ScenarioTone) => tones[tone];
