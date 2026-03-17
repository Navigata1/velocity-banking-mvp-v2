'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AccentColor } from '@/stores/theme-store';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt: string | null;
}

export interface MilestoneEvent {
  id: string;
  eventType: 'debt_paid_off' | 'freed_payment' | 'streak';
  title: string;
  amount?: number;
  createdAt: string;
}

interface DailyCheckIn {
  opened: boolean;
  reviewedPlan: boolean;
}

interface GamificationState {
  streakDays: number;
  lastCheckInDate: string | null;
  dailyCheckIns: Record<string, DailyCheckIn>;
  quests: Quest[];
  achievements: Achievement[];
  milestones: MilestoneEvent[];
  unlockedThemeAccents: AccentColor[];
  unlockedShowroomEffects: string[];

  registerAppOpened: () => Achievement | null;
  registerPlanReviewed: () => Achievement | null;
  registerDebtAdded: () => Achievement | null;
  registerLocConfigured: () => Achievement | null;
  registerSimulationRun: () => Achievement | null;
  registerDebtPaidOff: (debtName: string, freedPayment: number) => Achievement | null;
  registerFreedPaymentMilestone: (amount: number) => Achievement | null;
  unlockThemeAccent: (accent: AccentColor) => void;
  unlockShowroomEffect: (effect: string) => void;
}

const starterQuests: Quest[] = [
  {
    id: 'add-all-debts',
    title: 'Add all debts',
    description: 'List every active debt in your portfolio.',
    completed: false,
    completedAt: null,
  },
  {
    id: 'set-loc-limit',
    title: 'Set LOC limit',
    description: 'Configure a line of credit limit and APR.',
    completed: false,
    completedAt: null,
  },
  {
    id: 'run-first-simulation',
    title: 'Run first simulation',
    description: 'Compare baseline and velocity payoff timelines.',
    completed: false,
    completedAt: null,
  },
  {
    id: 'daily-review',
    title: 'Daily plan review',
    description: 'Open the app and review your plan in one day.',
    completed: false,
    completedAt: null,
  },
];

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildAchievement(id: string, title: string, description: string): Achievement {
  return {
    id,
    title,
    description,
    unlockedAt: new Date().toISOString(),
  };
}

function hasAchievement(achievements: Achievement[], id: string): boolean {
  return achievements.some((item) => item.id === id);
}

function completeQuest(quests: Quest[], questId: string): Quest[] {
  return quests.map((quest) =>
    quest.id === questId
      ? { ...quest, completed: true, completedAt: quest.completedAt ?? new Date().toISOString() }
      : quest,
  );
}

function maybeUnlock(
  achievements: Achievement[],
  id: string,
  title: string,
  description: string,
): Achievement | null {
  if (hasAchievement(achievements, id)) return null;
  return buildAchievement(id, title, description);
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      streakDays: 0,
      lastCheckInDate: null,
      dailyCheckIns: {},
      quests: starterQuests,
      achievements: [],
      milestones: [],
      unlockedThemeAccents: ['emerald'],
      unlockedShowroomEffects: ['standard'],

      registerAppOpened: () => {
        const today = formatDateKey(new Date());
        let unlocked: Achievement | null = null;

        set((state) => {
          const previousDate = state.lastCheckInDate;
          const yesterday = formatDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
          const existing = state.dailyCheckIns[today] ?? { opened: false, reviewedPlan: false };
          const nextCheckIns = {
            ...state.dailyCheckIns,
            [today]: { ...existing, opened: true },
          };

          let nextStreak = state.streakDays;
          if (previousDate !== today) {
            if (previousDate === yesterday) {
              nextStreak += 1;
            } else {
              nextStreak = 1;
            }
          }

          if (nextStreak >= 7) {
            unlocked = maybeUnlock(
              state.achievements,
              'streak-7',
              '7-Day Consistency',
              'Checked in seven days in a row.',
            );
          }

          const nextAchievements = unlocked ? [...state.achievements, unlocked] : state.achievements;

          return {
            dailyCheckIns: nextCheckIns,
            lastCheckInDate: today,
            streakDays: nextStreak,
            achievements: nextAchievements,
            milestones:
              nextStreak > state.streakDays
                ? [
                    ...state.milestones,
                    {
                      id: `streak-${today}`,
                      eventType: 'streak' as const,
                      title: `Streak reached ${nextStreak} day${nextStreak === 1 ? '' : 's'}`,
                      createdAt: new Date().toISOString(),
                    },
                  ]
                : state.milestones,
          };
        });

        return unlocked;
      },

      registerPlanReviewed: () => {
        const today = formatDateKey(new Date());
        let unlocked: Achievement | null = null;

        set((state) => {
          const existing = state.dailyCheckIns[today] ?? { opened: false, reviewedPlan: false };
          const nextCheckIns = {
            ...state.dailyCheckIns,
            [today]: { ...existing, reviewedPlan: true },
          };

          const bothComplete = nextCheckIns[today].opened && nextCheckIns[today].reviewedPlan;
          const nextQuests = bothComplete ? completeQuest(state.quests, 'daily-review') : state.quests;

          if (bothComplete) {
            unlocked = maybeUnlock(
              state.achievements,
              'daily-review-complete',
              'Daily Review Complete',
              'Opened the app and reviewed your plan today.',
            );
          }

          return {
            dailyCheckIns: nextCheckIns,
            quests: nextQuests,
            achievements: unlocked ? [...state.achievements, unlocked] : state.achievements,
          };
        });

        return unlocked;
      },

      registerDebtAdded: () => {
        const state = get();
        if (state.quests.find((quest) => quest.id === 'add-all-debts')?.completed) {
          return null;
        }

        let unlocked: Achievement | null = null;
        set((current) => {
          unlocked = maybeUnlock(
            current.achievements,
            'quest-add-debts',
            'Portfolio Mapped',
            'Added your debts and established a clear starting point.',
          );

          return {
            quests: completeQuest(current.quests, 'add-all-debts'),
            achievements: unlocked ? [...current.achievements, unlocked] : current.achievements,
          };
        });
        return unlocked;
      },

      registerLocConfigured: () => {
        let unlocked: Achievement | null = null;
        set((state) => {
          unlocked = maybeUnlock(
            state.achievements,
            'quest-loc',
            'LOC Ready',
            'Configured your line of credit guardrails.',
          );
          return {
            quests: completeQuest(state.quests, 'set-loc-limit'),
            achievements: unlocked ? [...state.achievements, unlocked] : state.achievements,
          };
        });
        return unlocked;
      },

      registerSimulationRun: () => {
        let unlocked: Achievement | null = null;
        set((state) => {
          unlocked = maybeUnlock(
            state.achievements,
            'quest-sim',
            'Simulation Started',
            'Ran your first velocity simulation.',
          );
          return {
            quests: completeQuest(state.quests, 'run-first-simulation'),
            achievements: unlocked ? [...state.achievements, unlocked] : state.achievements,
          };
        });
        return unlocked;
      },

      registerDebtPaidOff: (debtName, freedPayment) => {
        let unlocked: Achievement | null = null;
        set((state) => {
          const milestones = [
            ...state.milestones,
            {
              id: `paid-${Date.now()}`,
              eventType: 'debt_paid_off' as const,
              title: `${debtName} paid off`,
              amount: freedPayment,
              createdAt: new Date().toISOString(),
            },
          ];

          unlocked = maybeUnlock(
            state.achievements,
            `paid-${debtName.toLowerCase().replace(/\s+/g, '-')}`,
            `${debtName} Cleared`,
            `Unlocked ${freedPayment.toFixed(0)} per month in freed cash flow.`,
          );

          const nextAccents: AccentColor[] =
            freedPayment >= 250 && !state.unlockedThemeAccents.includes('blue')
              ? [...state.unlockedThemeAccents, 'blue']
              : state.unlockedThemeAccents;

          return {
            milestones,
            achievements: unlocked ? [...state.achievements, unlocked] : state.achievements,
            unlockedThemeAccents: nextAccents,
          };
        });
        return unlocked;
      },

      registerFreedPaymentMilestone: (amount) => {
        let unlocked: Achievement | null = null;
        set((state) => {
          const milestones = [
            ...state.milestones,
            {
              id: `freed-${Date.now()}`,
              eventType: 'freed_payment' as const,
              title: 'Freed payment capacity increased',
              amount,
              createdAt: new Date().toISOString(),
            },
          ];

          if (amount >= 1000) {
            unlocked = maybeUnlock(
              state.achievements,
              'freed-1000',
              'Momentum Builder',
              'Freed $1,000+ monthly payment capacity.',
            );
          }

          const nextEffects =
            amount >= 1500 && !state.unlockedShowroomEffects.includes('gold-glow')
              ? [...state.unlockedShowroomEffects, 'gold-glow']
              : state.unlockedShowroomEffects;

          const nextAccents: AccentColor[] =
            amount >= 2000 && !state.unlockedThemeAccents.includes('violet')
              ? [...state.unlockedThemeAccents, 'violet']
              : state.unlockedThemeAccents;

          return {
            milestones,
            achievements: unlocked ? [...state.achievements, unlocked] : state.achievements,
            unlockedShowroomEffects: nextEffects,
            unlockedThemeAccents: nextAccents,
          };
        });
        return unlocked;
      },

      unlockThemeAccent: (accent) => {
        set((state) => {
          if (state.unlockedThemeAccents.includes(accent)) return state;
          return { unlockedThemeAccents: [...state.unlockedThemeAccents, accent] };
        });
      },

      unlockShowroomEffect: (effect) => {
        set((state) => {
          if (state.unlockedShowroomEffects.includes(effect)) return state;
          return { unlockedShowroomEffects: [...state.unlockedShowroomEffects, effect] };
        });
      },
    }),
    {
      name: 'interestshield-gamification-v1',
    },
  ),
);
