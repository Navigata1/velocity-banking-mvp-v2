import type { z } from 'zod';

import type {
  scenarioBundleSchema,
  scenarioCompositionPropsSchema,
  scenarioStorySchema,
} from './scenario-schema';

export type ScenarioId = 'baseline-comparison' | 'money-loop-month' | 'blocked-plan';
export type FrameKind = 'landscape' | 'portrait' | 'square';
export type ScenarioTone = 'progress' | 'information' | 'caution' | 'blocked';
export type ScenarioStory = z.infer<typeof scenarioStorySchema>;
export type ScenarioBundle = z.infer<typeof scenarioBundleSchema>;
export type ScenarioCompositionProps = z.infer<typeof scenarioCompositionPropsSchema> & Record<string, unknown>;
