import type { MonthResult, PortfolioSimulationResult } from './portfolio';

export interface PortfolioPathPoint {
  month: number;
  balance: number;
  interest: number;
  targetCount: number;
}

export interface PortfolioPathVisualModel {
  isProjected: boolean;
  statusLabel: string;
  startingBalance: number;
  endingBalance: number;
  payoffMonths: number;
  totalInterest: number;
  maxBalance: number;
  sampledPoints: PortfolioPathPoint[];
}

function sumBalances(month: MonthResult): number {
  return Object.values(month.balances).reduce((sum, balance) => sum + Math.max(0, balance), 0);
}

function sumInterest(month: MonthResult): number {
  return Object.values(month.interestCharges).reduce((sum, interest) => sum + Math.max(0, interest), 0);
}

function samplePathPoints(points: PortfolioPathPoint[], maxPoints = 9): PortfolioPathPoint[] {
  if (points.length <= maxPoints) return points;

  const lastIndex = points.length - 1;
  const sampledIndexes = new Set<number>([0, lastIndex]);

  for (let index = 1; index < maxPoints - 1; index++) {
    sampledIndexes.add(Math.round((index * lastIndex) / (maxPoints - 1)));
  }

  return Array.from(sampledIndexes)
    .sort((a, b) => a - b)
    .map((index) => points[index]);
}

export function buildPortfolioPathVisualModel(
  result: PortfolioSimulationResult | undefined,
  startingBalance: number
): PortfolioPathVisualModel {
  const safeStartingBalance = Math.max(0, startingBalance);

  if (!result || result.isPayoffPossible === false || result.monthResults.length === 0) {
    return {
      isProjected: false,
      statusLabel: 'Review inputs',
      startingBalance: safeStartingBalance,
      endingBalance: safeStartingBalance,
      payoffMonths: 0,
      totalInterest: 0,
      maxBalance: Math.max(1, safeStartingBalance),
      sampledPoints: [
        {
          month: 0,
          balance: safeStartingBalance,
          interest: 0,
          targetCount: 0,
        },
      ],
    };
  }

  const locInterestByMonth = new Map(
    result.moneyLoopMonthlyData.map((month) => [month.month, Math.max(0, month.locInterest)])
  );
  const monthPoints = result.monthResults.map((month) => ({
    month: month.month,
    balance: sumBalances(month),
    interest: sumInterest(month) + (locInterestByMonth.get(month.month) ?? 0),
    targetCount: month.targetIds.length,
  }));
  const allPoints = [
    {
      month: 0,
      balance: safeStartingBalance,
      interest: 0,
      targetCount: 0,
    },
    ...monthPoints,
  ];
  const endingBalance = monthPoints[monthPoints.length - 1]?.balance ?? safeStartingBalance;
  const maxBalance = Math.max(1, ...allPoints.map((point) => point.balance), safeStartingBalance);

  return {
    isProjected: true,
    statusLabel: 'Projected path',
    startingBalance: safeStartingBalance,
    endingBalance,
    payoffMonths: result.payoffMonths,
    totalInterest: result.totalInterest,
    maxBalance,
    sampledPoints: samplePathPoints(allPoints),
  };
}
