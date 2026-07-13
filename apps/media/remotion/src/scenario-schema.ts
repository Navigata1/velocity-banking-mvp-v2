import { z } from 'zod';

const money = z.number().finite().nonnegative();
const signedMoney = z.number().finite();
const modeledPathSchema = z.object({
  monthlyPayment: money,
  payoffMonths: z.number().int().positive(),
  totalInterest: money,
  isPayoffPossible: z.literal(true),
  failureReason: z.null(),
});
const cardSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  detail: z.string().min(1),
  tone: z.enum(['progress', 'information', 'caution', 'blocked']),
});
const transactionSchema = z.object({
  day: z.number().int().min(1).max(31),
  type: z.enum(['deposit', 'expense']),
  amount: money,
});
const dailyEventSchema = transactionSchema.extend({
  closingBalance: money,
});
const storyStepSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  detail: z.string().min(1),
  tone: z.enum(['progress', 'information', 'caution', 'blocked']),
});
const commonStory = {
  status: z.enum(['modeled', 'blocked']),
  kicker: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  cards: z.array(cardSchema).length(2),
  assumption: z.string().min(1),
  closing: z.string().min(1),
};

const baselineComparisonSchema = z.object({
  ...commonStory,
  id: z.literal('baseline-comparison'),
  status: z.literal('modeled'),
  visual: z.literal('baseline-comparison'),
  inputs: z.object({
    principalBalance: money.positive(),
    apr: money,
    baselineMonthlyPayment: money.positive(),
    modeledMonthlyPayment: money.positive(),
    maxMonths: z.number().int().positive(),
  }),
  output: z.object({
    compatible: z.literal(true),
    baseline: modeledPathSchema,
    modeledPlan: modeledPathSchema,
  }),
});

const moneyLoopMonthSchema = z.object({
  ...commonStory,
  id: z.literal('money-loop-month'),
  status: z.literal('modeled'),
  visual: z.literal('money-loop'),
  inputs: z.object({
    month: z.literal(1),
    debtBalance: money,
    debtApr: money,
    debtPayment: money,
    loc: z.object({ limit: money, apr: money, balance: money }),
    locBalance: money,
    chunkAmount: money,
    cashFlowPaydown: money,
    locDepositAmount: money,
    locExpenseAmount: money,
    monthlyIncome: money,
    monthlyExpenses: money,
    locAccrualCalendar: z.object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      transactions: z.array(transactionSchema).min(1),
    }),
    monthsSinceChunk: z.number().int().nonnegative(),
  }),
  output: z.object({
    cashFlow: signedMoney,
    debtBalance: money,
    locBalance: money,
    debtInterest: money,
    locInterest: money,
    locInterestMethod: z.literal('transaction-calendar'),
    didChunk: z.literal(true),
    dailyEvents: z.array(dailyEventSchema).min(1),
    storySteps: z.array(storyStepSchema).length(6),
  }),
});

const blockedPlanSchema = z.object({
  ...commonStory,
  id: z.literal('blocked-plan'),
  status: z.literal('blocked'),
  visual: z.literal('blocked'),
  inputs: z.object({
    monthlyIncome: money,
    monthlyExpenses: money,
    lenderTerms: z.object({ rateMode: z.literal('variable') }),
  }),
  output: z.object({
    projectionReady: z.literal(false),
    payoffMonths: z.null(),
    cashFlow: signedMoney,
    confidence: z.literal('incomplete'),
    failureReason: z.literal('missing-lender-terms-and-negative-cash-flow'),
    missingFields: z.array(z.string().min(1)).min(1),
    assumptions: z.array(z.string().min(1)).min(1),
  }),
});

export const scenarioStorySchema = z.discriminatedUnion('id', [
  baselineComparisonSchema,
  moneyLoopMonthSchema,
  blockedPlanSchema,
]);

export const scenarioBundleSchema = z.object({
  version: z.literal(1),
  engineContractVersion: z.string().regex(/^source-sha256:[a-f0-9]{12}$/),
  lenderTermsContractVersion: z.literal('2.0.0'),
  engineSourceDigest: z.string().regex(/^[a-f0-9]{64}$/),
  generatedBy: z.array(z.string().min(1)).min(1),
  scenarios: z.array(scenarioStorySchema).length(3),
});

export const scenarioCompositionPropsSchema = z.object({
  scenario: scenarioStorySchema,
  frameKind: z.enum(['landscape', 'portrait', 'square']),
  reducedMotion: z.boolean(),
  settled: z.boolean().optional(),
});
