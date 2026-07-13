import React from 'react';
import { Composition, Still } from 'remotion';

import scenariosData from '../data/scenarios.v1.json';
import { ScenarioExplainer } from './ScenarioExplainer';
import { scenarioBundleSchema, scenarioCompositionPropsSchema } from './scenario-schema';
import type { ScenarioCompositionProps, ScenarioId } from './scenario-types';

const bundle = scenarioBundleSchema.parse(scenariosData);
const scenario = (id: ScenarioId) => {
  const found = bundle.scenarios.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing Remotion scenario: ${id}`);
  return found;
};

const ScenarioVideo: React.FC<ScenarioCompositionProps> = (props) => (
  <ScenarioExplainer {...props} />
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition<typeof scenarioCompositionPropsSchema, ScenarioCompositionProps> schema={scenarioCompositionPropsSchema} id="Baseline-Landscape" component={ScenarioVideo} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={{ scenario: scenario('baseline-comparison'), frameKind: 'landscape', reducedMotion: false }} />
    <Composition<typeof scenarioCompositionPropsSchema, ScenarioCompositionProps> schema={scenarioCompositionPropsSchema} id="Baseline-Portrait" component={ScenarioVideo} durationInFrames={240} fps={30} width={1080} height={1920} defaultProps={{ scenario: scenario('baseline-comparison'), frameKind: 'portrait', reducedMotion: false }} />
    <Composition<typeof scenarioCompositionPropsSchema, ScenarioCompositionProps> schema={scenarioCompositionPropsSchema} id="Baseline-Square" component={ScenarioVideo} durationInFrames={240} fps={30} width={1080} height={1080} defaultProps={{ scenario: scenario('baseline-comparison'), frameKind: 'square', reducedMotion: false }} />
    <Composition<typeof scenarioCompositionPropsSchema, ScenarioCompositionProps> schema={scenarioCompositionPropsSchema} id="MoneyLoopMonth-Landscape" component={ScenarioVideo} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={{ scenario: scenario('money-loop-month'), frameKind: 'landscape', reducedMotion: false }} />
    <Composition<typeof scenarioCompositionPropsSchema, ScenarioCompositionProps> schema={scenarioCompositionPropsSchema} id="MoneyLoopMonth-Portrait" component={ScenarioVideo} durationInFrames={240} fps={30} width={1080} height={1920} defaultProps={{ scenario: scenario('money-loop-month'), frameKind: 'portrait', reducedMotion: false }} />
    <Composition<typeof scenarioCompositionPropsSchema, ScenarioCompositionProps> schema={scenarioCompositionPropsSchema} id="MoneyLoopMonth-Square" component={ScenarioVideo} durationInFrames={240} fps={30} width={1080} height={1080} defaultProps={{ scenario: scenario('money-loop-month'), frameKind: 'square', reducedMotion: false }} />
    <Composition<typeof scenarioCompositionPropsSchema, ScenarioCompositionProps> schema={scenarioCompositionPropsSchema} id="BlockedPlan-Landscape" component={ScenarioVideo} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={{ scenario: scenario('blocked-plan'), frameKind: 'landscape', reducedMotion: false }} />
    <Composition<typeof scenarioCompositionPropsSchema, ScenarioCompositionProps> schema={scenarioCompositionPropsSchema} id="BlockedPlan-Portrait" component={ScenarioVideo} durationInFrames={240} fps={30} width={1080} height={1920} defaultProps={{ scenario: scenario('blocked-plan'), frameKind: 'portrait', reducedMotion: false }} />
    <Composition<typeof scenarioCompositionPropsSchema, ScenarioCompositionProps> schema={scenarioCompositionPropsSchema} id="BlockedPlan-Square" component={ScenarioVideo} durationInFrames={240} fps={30} width={1080} height={1080} defaultProps={{ scenario: scenario('blocked-plan'), frameKind: 'square', reducedMotion: false }} />
    <Still<typeof scenarioCompositionPropsSchema, ScenarioCompositionProps> schema={scenarioCompositionPropsSchema} id="InterestShield-Scenario-Still" component={ScenarioVideo} width={1920} height={1080} defaultProps={{ scenario: scenario('money-loop-month'), frameKind: 'landscape', reducedMotion: true, settled: true }} />
  </>
);
