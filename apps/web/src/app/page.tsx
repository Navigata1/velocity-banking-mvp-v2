'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DomainTabs from '@/components/DomainTabs';
import HeroVisual from '@/components/HeroVisual';
import VitalsGrid from '@/components/VitalsGrid';
import ActionFeed from '@/components/ActionFeed';
import { EditableCurrency, EditablePercentage, EditableNumber } from '@/components/EditableNumber';
import { formatCurrency } from '@/engine/calculations';
import { useFinancialStore, Domain } from '@/stores/financial-store';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import ScrollReveal from '@/components/ScrollReveal';
import GlassCard from '@/components/GlassCard';
import CountUp from '@/components/CountUp';
import PageTransition from '@/components/PageTransition';

type VitalsCategory = 'cashflow' | 'analytics' | 'goals' | 'velocity';
type ActionFilter = 'all' | 'action' | 'tip' | 'milestone';

interface InsightDetail {
  title: string;
  description: string;
  metrics: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }[];
  tips: string[];
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [vitalsCategory, setVitalsCategory] = useState<VitalsCategory>('cashflow');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [expandedVital, setExpandedVital] = useState<number | null>(null);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [cycleIndex, setCycleIndex] = useState(0);
  const [showWealthTimeline, setShowWealthTimeline] = useState(true);
  const store = useFinancialStore();
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];

  const wealthMetrics = useMemo(() => {
    const houseDebt = store.debts.house;
    const cashFlow = store.getCashFlow();
    const monthlyRate = houseDebt.interestRate / 12;
    const balance = houseDebt.balance;
    const termMonths = houseDebt.termMonths;
    
    const monthlyPayment = (balance * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
      (Math.pow(1 + monthlyRate, termMonths) - 1);
    const totalPaid = monthlyPayment * termMonths;
    const totalInterest = totalPaid - balance;
    const payoffAge = store.currentAge + Math.ceil(termMonths / 12);
    
    const chunkedMonths = Math.ceil(balance / (monthlyPayment + Math.max(0, cashFlow * 0.5)));
    const velocityPayoffAge = store.currentAge + Math.ceil(Math.min(chunkedMonths, termMonths) / 12);
    const yearsGained = payoffAge - velocityPayoffAge;
    const moneySaved = Math.max(0, totalInterest * (yearsGained / 30) * 0.5);
    const yearsOfInvesting = 65 - velocityPayoffAge;
    const investmentGrowth = moneySaved * Math.pow(1.07, Math.max(0, yearsOfInvesting));
    
    return {
      totalInterest,
      yearsGained: Math.max(1, yearsGained),
      moneySaved: Math.max(0, moneySaved),
      investmentGrowth: Math.max(0, investmentGrowth),
    };
  }, [store]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCycleIndex(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getCategoryIcon = (cat: VitalsCategory) => {
    const icons = { cashflow: '💰', analytics: '📊', goals: '🎯', velocity: '⚡' };
    return icons[cat];
  };

  const getCategoryVitals = useCallback(() => {
    const domain = store.activeDomain;
    const debtType = store.getActiveDebtType();
    const debt = store.debts[debtType];
    const dailyInterest = store.getDailyInterest(debtType);
    const velocity = store.getVelocityPayoff(debtType);
    const baseline = store.getBaselinePayoff(debtType);
    const cashFlow = store.getCashFlow();

    const categoryVitals: Record<VitalsCategory, {
      vitals: { icon: string; label: string; value: number | string; sublabel: string; isEditable?: boolean; onEdit?: (val: number) => void; insight: InsightDetail }[];
    }> = {
      cashflow: {
        vitals: [
          { 
            icon: '💵', 
            label: 'Monthly Income', 
            value: store.monthlyIncome, 
            sublabel: 'Total earnings',
            isEditable: true,
            onEdit: store.setMonthlyIncome,
            insight: {
              title: 'Your Income Power',
              description: 'This is your gross monthly income. Increasing this accelerates your velocity strategy.',
              metrics: [
                { label: 'Annual Income', value: formatCurrency(store.monthlyIncome * 12), trend: 'neutral' },
                { label: 'Per Day', value: formatCurrency(store.monthlyIncome / 30), trend: 'neutral' },
                { label: 'vs Expenses', value: `${((store.monthlyIncome / store.monthlyExpenses - 1) * 100).toFixed(0)}% surplus`, trend: 'up' },
              ],
              tips: ['Side income directly boosts your chunk power', 'Salary increases compound your velocity gains', 'Consider passive income streams'],
            },
          },
          { 
            icon: '🛒', 
            label: 'Monthly Expenses', 
            value: store.monthlyExpenses, 
            sublabel: 'Total outflow',
            isEditable: true,
            onEdit: store.setMonthlyExpenses,
            insight: {
              title: 'Expense Analysis',
              description: 'Your total monthly expenses. Reducing these increases your chunk capacity.',
              metrics: [
                { label: 'Daily Average', value: formatCurrency(store.monthlyExpenses / 30), trend: 'neutral' },
                { label: 'Annual Total', value: formatCurrency(store.monthlyExpenses * 12), trend: 'neutral' },
                { label: 'Expense Ratio', value: `${((store.monthlyExpenses / store.monthlyIncome) * 100).toFixed(0)}%`, trend: 'neutral' },
              ],
              tips: ['Track subscriptions for quick wins', 'Meal planning reduces food costs', 'Review recurring charges monthly'],
            },
          },
          { 
            icon: '💰', 
            label: 'Cash Flow', 
            value: cashFlow, 
            sublabel: 'Available surplus',
            isEditable: true,
            onEdit: (val: number) => store.setMonthlyIncome(val + store.monthlyExpenses),
            insight: {
              title: 'Your Cash Flow Engine',
              description: 'Cash flow is the fuel for velocity banking. This is what pays down your LOC each month.',
              metrics: [
                { label: 'Annual Surplus', value: formatCurrency(cashFlow * 12), trend: cashFlow > 0 ? 'up' : 'down' },
                { label: 'Weekly Available', value: formatCurrency(cashFlow / 4.33), trend: 'neutral' },
                { label: 'Chunk Capacity', value: `${Math.floor(cashFlow / 500)} chunks/mo`, trend: 'up' },
              ],
              tips: ['Cash flow is the #1 factor in velocity success', 'Even $100/mo extra accelerates payoff', 'Automate transfers on payday'],
            },
          },
          { 
            icon: '🏦', 
            label: 'LOC Available', 
            value: formatCurrency(store.loc.limit - store.loc.balance), 
            sublabel: `of ${formatCurrency(store.loc.limit)} limit`,
            insight: {
              title: 'Line of Credit Buffer',
              description: 'Your available credit acts as a financial shock absorber and chunk reservoir.',
              metrics: [
                { label: 'Utilization', value: `${((store.loc.balance / store.loc.limit) * 100).toFixed(0)}%`, trend: store.loc.balance / store.loc.limit < 0.3 ? 'up' : 'down' },
                { label: 'Current Balance', value: formatCurrency(store.loc.balance), trend: 'neutral' },
                { label: 'Interest Rate', value: `${(store.loc.interestRate * 100).toFixed(1)}%`, trend: 'neutral' },
              ],
              tips: ['Keep utilization under 30% for flexibility', 'Higher limits improve chunk capacity', 'Shop for lower LOC rates periodically'],
            },
          },
        ],
      },
      analytics: {
        vitals: [
          { 
            icon: '🔥', 
            label: 'Daily Interest Burn', 
            value: formatCurrency(dailyInterest) + '/day', 
            sublabel: formatCurrency(dailyInterest * 30) + '/month',
            insight: {
              title: 'Interest Burn Rate',
              description: 'Every day, this amount is added to your debt. Velocity banking reduces this faster.',
              metrics: [
                { label: 'Weekly Cost', value: formatCurrency(dailyInterest * 7), trend: 'down' },
                { label: 'Annual Drain', value: formatCurrency(dailyInterest * 365), trend: 'down' },
                { label: 'vs Last Month', value: '-3.2%', trend: 'up' },
              ],
              tips: ['Each chunk reduces tomorrow\'s interest', 'Focus on highest-rate debt first', 'Daily interest compounds against you'],
            },
          },
          { 
            icon: '📈', 
            label: 'Baseline Interest', 
            value: formatCurrency(baseline.totalInterest), 
            sublabel: 'Without velocity strategy',
            insight: {
              title: 'Traditional Path Cost',
              description: 'This is what you\'d pay in interest following the standard payment schedule.',
              metrics: [
                { label: 'Per Month', value: formatCurrency(baseline.totalInterest / baseline.months), trend: 'down' },
                { label: 'Payoff Time', value: `${baseline.months} months`, trend: 'neutral' },
                { label: 'Total Paid', value: formatCurrency(debt.balance + baseline.totalInterest), trend: 'down' },
              ],
              tips: ['This is your benchmark to beat', 'Every dollar saved here builds wealth', 'Compare with velocity results'],
            },
          },
          { 
            icon: '📉', 
            label: 'Velocity Interest', 
            value: formatCurrency(velocity.totalInterest), 
            sublabel: 'With your strategy',
            insight: {
              title: 'Velocity Strategy Cost',
              description: 'Your projected interest with the velocity banking approach.',
              metrics: [
                { label: 'Monthly Average', value: formatCurrency(velocity.totalInterest / velocity.months), trend: 'up' },
                { label: 'Payoff Time', value: `${velocity.months} months`, trend: 'up' },
                { label: 'You Keep', value: formatCurrency(velocity.savings), trend: 'up' },
              ],
              tips: ['Consistent chunks maximize savings', 'Larger chunks = bigger impact', 'Time in strategy matters most'],
            },
          },
          { 
            icon: '💎', 
            label: 'Your Savings', 
            value: formatCurrency(velocity.savings), 
            sublabel: 'Interest avoided',
            insight: {
              title: 'Money You Keep',
              description: 'This is real money that stays in your pocket instead of going to the bank.',
              metrics: [
                { label: 'Per Month Saved', value: formatCurrency(velocity.savings / Math.max(1, baseline.months - velocity.months)), trend: 'up' },
                { label: 'Invested at 7%', value: formatCurrency(velocity.savings * 1.07), trend: 'up' },
                { label: 'In 10 Years', value: formatCurrency(velocity.savings * Math.pow(1.07, 10)), trend: 'up' },
              ],
              tips: ['These savings can be invested', 'Compound interest works for you now', 'Track this number monthly'],
            },
          },
        ],
      },
      goals: {
        vitals: [
          { 
            icon: '🎯', 
            label: `${domain === 'creditCard' ? 'Credit Card' : domain === 'studentLoan' ? 'Student Loan' : domain.charAt(0).toUpperCase() + domain.slice(1)} Balance`, 
            value: debt.balance, 
            sublabel: `@ ${(debt.interestRate * 100).toFixed(1)}% APR`,
            isEditable: true,
            onEdit: (val: number) => store.updateDebt(debtType, { balance: val }),
            insight: {
              title: 'Your Target Balance',
              description: 'This is the principal amount remaining. Every chunk directly attacks this number.',
              metrics: [
                { label: 'Original Loan', value: formatCurrency(debt.balance * 1.1), trend: 'neutral' },
                { label: 'Paid So Far', value: formatCurrency(debt.balance * 0.1), trend: 'up' },
                { label: 'Progress', value: '10%', trend: 'up' },
              ],
              tips: ['Watch this number shrink with each chunk', 'Celebrate every $1,000 milestone', 'Set mini-goals along the way'],
            },
          },
          { 
            icon: '⏱️', 
            label: 'Time to Freedom', 
            value: `${velocity.months} months`, 
            sublabel: `${Math.round(velocity.months / 12)} years ${velocity.months % 12} months`,
            insight: {
              title: 'Your Freedom Date',
              description: 'When you\'ll be debt-free on this account using velocity banking.',
              metrics: [
                { label: 'Freedom Date', value: new Date(Date.now() + velocity.months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), trend: 'up' },
                { label: 'Time Saved', value: `${baseline.months - velocity.months} months`, trend: 'up' },
                { label: 'Years Ahead', value: `${((baseline.months - velocity.months) / 12).toFixed(1)} yrs`, trend: 'up' },
              ],
              tips: ['Mark this date on your calendar', 'Share your goal with accountability partner', 'Visualize your debt-free life'],
            },
          },
          { 
            icon: '💳', 
            label: 'Min Payment', 
            value: debt.minimumPayment, 
            sublabel: 'Required monthly',
            isEditable: true,
            onEdit: (val: number) => store.updateDebt(debtType, { minimumPayment: val }),
            insight: {
              title: 'Your Base Payment',
              description: 'The minimum payment keeps you current. Velocity chunks go above this.',
              metrics: [
                { label: 'To Principal', value: formatCurrency(debt.minimumPayment - (debt.balance * debt.interestRate / 12)), trend: 'up' },
                { label: 'To Interest', value: formatCurrency(debt.balance * debt.interestRate / 12), trend: 'down' },
                { label: 'Ratio', value: `${((1 - (debt.balance * debt.interestRate / 12) / debt.minimumPayment) * 100).toFixed(0)}% principal`, trend: 'up' },
              ],
              tips: ['Chunk payments are separate from this', 'Never miss the minimum', 'Extra principal = faster payoff'],
            },
          },
          { 
            icon: '🚀', 
            label: 'Chunk Power', 
            value: store.chunkAmount, 
            sublabel: `${store.chunkFrequency} deployment`,
            isEditable: true,
            onEdit: store.setChunkAmount,
            insight: {
              title: 'Your Velocity Weapon',
              description: 'Chunk payments are the secret sauce. This is what accelerates your payoff.',
              metrics: [
                { label: 'Annual Chunks', value: formatCurrency(store.chunkAmount * (store.chunkFrequency === 'monthly' ? 12 : store.chunkFrequency === 'biweekly' ? 26 : 52)), trend: 'up' },
                { label: 'vs Cash Flow', value: `${((store.chunkAmount / cashFlow) * 100).toFixed(0)}%`, trend: 'neutral' },
                { label: 'Impact/Month', value: formatCurrency(store.chunkAmount * 0.07 / 12), trend: 'up' },
              ],
              tips: ['Bigger chunks = faster freedom', 'Consistency beats size', 'Automate on payday'],
            },
          },
        ],
      },
      velocity: {
        vitals: [
          { 
            icon: '⚡', 
            label: 'Velocity Score', 
            value: `${Math.min(100, Math.round((velocity.savings / Math.max(1, baseline.totalInterest)) * 100))}%`, 
            sublabel: 'Strategy effectiveness',
            insight: {
              title: 'Your Strategy Score',
              description: 'How effectively you\'re using velocity banking. 100% means maximum interest savings.',
              metrics: [
                { label: 'Efficiency', value: `${Math.min(100, Math.round((velocity.savings / Math.max(1, baseline.totalInterest)) * 100))}%`, trend: 'up' },
                { label: 'Rank', value: velocity.savings > 5000 ? 'Expert' : velocity.savings > 1000 ? 'Intermediate' : 'Beginner', trend: 'up' },
                { label: 'Potential', value: formatCurrency(baseline.totalInterest * 0.7), trend: 'neutral' },
              ],
              tips: ['Higher cash flow = higher score', 'Larger chunks boost efficiency', 'Consistency is key'],
            },
          },
          { 
            icon: '🏃', 
            label: 'Acceleration', 
            value: `${baseline.months - velocity.months} mo`, 
            sublabel: 'Faster than baseline',
            insight: {
              title: 'Time Acceleration',
              description: 'How many months sooner you\'ll be debt-free compared to traditional payments.',
              metrics: [
                { label: 'Months Saved', value: `${baseline.months - velocity.months}`, trend: 'up' },
                { label: 'Years Saved', value: `${((baseline.months - velocity.months) / 12).toFixed(1)}`, trend: 'up' },
                { label: 'Speed Boost', value: `${Math.round(((baseline.months - velocity.months) / baseline.months) * 100)}%`, trend: 'up' },
              ],
              tips: ['Every chunk adds more months', 'Time saved = life gained', 'Compound the acceleration'],
            },
          },
          { 
            icon: '🔄', 
            label: 'LOC Cycles', 
            value: `${Math.ceil(velocity.months / 3)}`, 
            sublabel: 'Chunk deployments',
            insight: {
              title: 'Velocity Cycles',
              description: 'Number of times you\'ll deploy chunks through your LOC over the payoff period.',
              metrics: [
                { label: 'Per Quarter', value: store.chunkFrequency === 'monthly' ? '3' : store.chunkFrequency === 'biweekly' ? '6' : '13', trend: 'neutral' },
                { label: 'Total Volume', value: formatCurrency(store.chunkAmount * Math.ceil(velocity.months)), trend: 'up' },
                { label: 'Avg LOC Use', value: formatCurrency(store.chunkAmount * 0.7), trend: 'neutral' },
              ],
              tips: ['More cycles = more acceleration', 'Track each cycle\'s impact', 'Celebrate completed cycles'],
            },
          },
          { 
            icon: '📊', 
            label: 'Efficiency', 
            value: `${Math.round((velocity.savings / Math.max(1, store.chunkAmount * velocity.months)) * 100)}%`, 
            sublabel: 'Return on chunks',
            insight: {
              title: 'Chunk Efficiency',
              description: 'How much interest you save per dollar of chunks deployed.',
              metrics: [
                { label: 'ROI', value: `${Math.round((velocity.savings / Math.max(1, store.chunkAmount * velocity.months)) * 100)}%`, trend: 'up' },
                { label: 'Per $100', value: formatCurrency((velocity.savings / Math.max(1, store.chunkAmount * velocity.months)) * 100), trend: 'up' },
                { label: 'Leverage', value: `${(velocity.savings / store.chunkAmount).toFixed(1)}x`, trend: 'up' },
              ],
              tips: ['Higher rate debts = higher efficiency', 'Track this monthly', 'Optimize chunk timing'],
            },
          },
        ],
      },
    };

    return categoryVitals[vitalsCategory];
  }, [store, vitalsCategory]);

  const getActions = useCallback(() => {
    const domain = store.activeDomain;
    const debtType = store.getActiveDebtType();
    const debt = store.debts[debtType];
    const velocity = store.getVelocityPayoff(debtType);
    const baseline = store.getBaselinePayoff(debtType);
    const cashFlow = store.getCashFlow();
    const chunkAmount = store.chunkAmount;
    
    const creditCard = store.debts.creditCard || { balance: 0, interestRate: 0.20, minimumPayment: 0, termMonths: 60 };
    const studentLoan = store.debts.studentLoan || { balance: 0, interestRate: 0.068, minimumPayment: 0, termMonths: 120 };
    
    interface ActionInsight {
      description: string;
      metrics: { label: string; value: string; trend: 'up' | 'down' | 'neutral' }[];
      tips: string[];
    }
    
    interface ActionItem {
      id: string;
      type: 'action' | 'tip' | 'milestone';
      title: string;
      subtitle: string;
      icon: string;
      chart?: 'line' | 'bars';
      insight: ActionInsight;
      actionRoute?: string;
      learnRoute?: string;
      inlineChecklist?: { label: string; key: string }[];
    }
    
    const domainActions: Record<string, ActionItem[]> = {
      car: [
        { id: 'car-1', type: 'action', title: 'Payday Incoming', subtitle: 'Deposit to LOC tomorrow', icon: '💵', chart: 'line',
          actionRoute: '/cockpit',
          learnRoute: '/learn?module=2',
          insight: { description: `Your next paycheck of ${formatCurrency(store.monthlyIncome / 2)} can reduce LOC balance and interest.`,
            metrics: [
              { label: 'Deposit Amount', value: formatCurrency(store.monthlyIncome / 2), trend: 'up' },
              { label: 'Interest Saved', value: formatCurrency((store.monthlyIncome / 2) * store.loc.interestRate / 12), trend: 'up' },
              { label: 'Days Until', value: '1', trend: 'neutral' },
            ],
            tips: ['Route income through LOC first', 'Automate deposits on payday', 'Track each deposit\'s impact'],
          },
        },
        { id: 'car-2', type: 'tip', title: 'Car Insurance Check', subtitle: 'Compare rates quarterly', icon: '🚗', chart: 'bars',
          learnRoute: '/learn?module=1',
          inlineChecklist: [
            { label: 'Bundle home & auto policies', key: 'bundle' },
            { label: 'Raise deductibles to $1,000', key: 'deductible' },
            { label: 'Check low-mileage discounts', key: 'mileage' },
            { label: 'Compare 3+ quotes online', key: 'quotes' },
            { label: 'Ask about safe-driver discount', key: 'safe-driver' },
          ],
          insight: { description: 'Reducing car expenses increases your chunk power for faster loan payoff.',
            metrics: [
              { label: 'Potential Savings', value: '$50-100/mo', trend: 'up' },
              { label: 'Annual Impact', value: formatCurrency(900), trend: 'up' },
              { label: 'Last Checked', value: '90+ days', trend: 'down' },
            ],
            tips: ['Bundle policies for discounts', 'Raise deductibles if you can afford it', 'Check for low-mileage discounts'],
          },
        },
        { id: 'car-3', type: 'milestone', title: 'Engine Revving!', subtitle: `${formatCurrency(velocity.savings)} in interest avoided`, icon: '🏎️',
          actionRoute: '/portfolio',
          learnRoute: '/learn?module=3',
          insight: { description: 'Your car loan is accelerating faster than a traditional payoff schedule.',
            metrics: [
              { label: 'Months Saved', value: `${baseline.months - velocity.months}`, trend: 'up' },
              { label: 'Interest Avoided', value: formatCurrency(velocity.savings), trend: 'up' },
              { label: 'Car Equity', value: formatCurrency(debt.balance * 0.15), trend: 'up' },
            ],
            tips: ['Maintain the car to preserve value', 'Consider refinancing if rates drop', 'Celebrate each milestone!'],
          },
        },
        { id: 'car-4', type: 'action', title: 'Chunk Ready', subtitle: `Deploy ${formatCurrency(store.chunkAmount)} this week`, icon: '🎯',
          actionRoute: '/simulator?focus=chunk',
          learnRoute: '/learn?module=4',
          insight: { description: `This chunk will save approximately ${formatCurrency(store.chunkAmount * debt.interestRate * 0.5)} in interest.`,
            metrics: [
              { label: 'Chunk Amount', value: formatCurrency(store.chunkAmount), trend: 'neutral' },
              { label: 'Principal Impact', value: formatCurrency(store.chunkAmount * 0.95), trend: 'up' },
              { label: 'Days Faster', value: `${Math.round(store.chunkAmount / (debt.minimumPayment / 30))}`, trend: 'up' },
            ],
            tips: ['Deploy chunks early in statement cycle', 'Track LOC balance after chunking', 'Consistency beats timing'],
          },
        },
      ],
      house: [
        { id: 'house-1', type: 'action', title: 'HELOC Payment Due', subtitle: `Interest-only: ${formatCurrency(store.loc.balance * store.loc.interestRate / 12)}`, icon: '🏠', chart: 'line',
          actionRoute: '/cockpit',
          learnRoute: '/learn?module=2',
          insight: { description: 'Your HELOC interest payment keeps the strategy running smoothly.',
            metrics: [
              { label: 'Payment Amount', value: formatCurrency(store.loc.balance * store.loc.interestRate / 12), trend: 'neutral' },
              { label: 'LOC Utilization', value: `${((store.loc.balance / store.loc.limit) * 100).toFixed(0)}%`, trend: store.loc.balance / store.loc.limit < 0.5 ? 'up' : 'down' },
              { label: 'Available Credit', value: formatCurrency(store.loc.limit - store.loc.balance), trend: 'up' },
            ],
            tips: ['Keep LOC utilization under 50%', 'Pay more than minimum when possible', 'Monitor rate changes'],
          },
        },
        { id: 'house-2', type: 'milestone', title: 'Roof Over Your Head!', subtitle: `${Math.round((baseline.months - velocity.months) / 12)} years faster`, icon: '🏡',
          actionRoute: '/portfolio',
          learnRoute: '/learn?module=3',
          insight: { description: 'You\'re building home equity at an accelerated rate compared to traditional payments.',
            metrics: [
              { label: 'Years Saved', value: `${((baseline.months - velocity.months) / 12).toFixed(1)}`, trend: 'up' },
              { label: 'Interest Avoided', value: formatCurrency(velocity.savings), trend: 'up' },
              { label: 'Home Equity', value: formatCurrency(debt.balance * 0.2), trend: 'up' },
            ],
            tips: ['Home equity grows with each chunk', 'Consider home improvements that add value', 'Track your LTV ratio'],
          },
        },
        { id: 'house-3', type: 'tip', title: 'Property Tax Prep', subtitle: 'Escrow review coming up', icon: '📋', chart: 'bars',
          learnRoute: '/learn?module=1',
          insight: { description: 'Understanding your escrow helps you plan for larger expenses.',
            metrics: [
              { label: 'Est. Annual Tax', value: formatCurrency(debt.balance * 0.012), trend: 'neutral' },
              { label: 'Monthly Escrow', value: formatCurrency(debt.balance * 0.012 / 12), trend: 'neutral' },
              { label: 'Appeal Deadline', value: 'Check locally', trend: 'neutral' },
            ],
            tips: ['Appeal assessments if overvalued', 'Check for homestead exemptions', 'Budget for escrow shortfalls'],
          },
        },
        { id: 'house-4', type: 'action', title: 'Deploy Chunk', subtitle: `${formatCurrency(store.chunkAmount)} to mortgage principal`, icon: '💰',
          actionRoute: '/simulator?focus=chunk',
          learnRoute: '/learn?module=4',
          insight: { description: `Each chunk attacks your principal directly, saving ${formatCurrency(store.chunkAmount * debt.interestRate * 5)} over time.`,
            metrics: [
              { label: 'Chunk Amount', value: formatCurrency(store.chunkAmount), trend: 'neutral' },
              { label: 'Lifetime Savings', value: formatCurrency(store.chunkAmount * debt.interestRate * 10), trend: 'up' },
              { label: 'Freedom Date', value: 'Moves closer', trend: 'up' },
            ],
            tips: ['Specify payment to principal only', 'Verify lender applies it correctly', 'Keep receipts for records'],
          },
        },
      ],
      land: [
        { id: 'land-1', type: 'action', title: 'Land Payment Due', subtitle: `${formatCurrency(debt.minimumPayment)} due soon`, icon: '🌄', chart: 'line',
          actionRoute: '/cockpit', learnRoute: '/learn?module=2',
          insight: { description: 'Your land investment payment keeps you on track for ownership.',
            metrics: [
              { label: 'Payment Amount', value: formatCurrency(debt.minimumPayment), trend: 'neutral' },
              { label: 'Principal Portion', value: formatCurrency(debt.minimumPayment - (debt.balance * debt.interestRate / 12)), trend: 'up' },
              { label: 'Remaining Balance', value: formatCurrency(debt.balance), trend: 'down' },
            ],
            tips: ['Land appreciates over time', 'Consider future development options', 'Track local market values'],
          },
        },
        { id: 'land-2', type: 'tip', title: 'Land Appreciation', subtitle: 'Up 4% in your area this year', icon: '📈', chart: 'bars',
          learnRoute: '/learn?module=5',
          insight: { description: 'Your land is gaining value while you pay it down - double benefit!',
            metrics: [
              { label: 'Est. Current Value', value: formatCurrency(debt.balance * 1.25), trend: 'up' },
              { label: 'Equity Built', value: formatCurrency(debt.balance * 0.25), trend: 'up' },
              { label: 'Area Growth', value: '+4% YoY', trend: 'up' },
            ],
            tips: ['Hold land for long-term gains', 'Research zoning changes', 'Consider timber or farming income'],
          },
        },
        { id: 'land-3', type: 'milestone', title: 'Territory Claimed!', subtitle: `${velocity.months} months to full ownership`, icon: '🏞️',
          actionRoute: '/portfolio', learnRoute: '/learn?module=3',
          insight: { description: 'You\'re on track to own this land free and clear.',
            metrics: [
              { label: 'Payoff ETA', value: `${velocity.months} mo`, trend: 'up' },
              { label: 'Interest Saved', value: formatCurrency(velocity.savings), trend: 'up' },
              { label: 'Ownership %', value: `${(100 - (debt.balance / (debt.balance * 1.25)) * 100).toFixed(0)}%`, trend: 'up' },
            ],
            tips: ['Land ownership opens opportunities', 'Build credit history with payments', 'Plan for property taxes'],
          },
        },
        { id: 'land-4', type: 'action', title: 'Next Chunk', subtitle: `${formatCurrency(store.chunkAmount)} in 5 days`, icon: '💵',
          actionRoute: '/simulator?focus=chunk', learnRoute: '/learn?module=4',
          insight: { description: `This chunk accelerates your land ownership by ${Math.round(store.chunkAmount / (debt.minimumPayment / 30))} days.`,
            metrics: [
              { label: 'Chunk Amount', value: formatCurrency(store.chunkAmount), trend: 'neutral' },
              { label: 'Days Accelerated', value: `${Math.round(store.chunkAmount / (debt.minimumPayment / 30))}`, trend: 'up' },
              { label: 'Cumulative Savings', value: formatCurrency(velocity.savings), trend: 'up' },
            ],
            tips: ['Raw land chunks have high impact', 'Track each chunk\'s effect', 'Consider increasing chunk size'],
          },
        },
      ],
      creditCard: [
        { id: 'cc-1', type: 'action', title: 'High-Interest Attack!', subtitle: `Chunk ${formatCurrency(chunkAmount)} to credit card`, icon: '🎯', chart: 'bars',
          actionRoute: '/simulator?focus=chunk', learnRoute: '/learn?module=4',
          insight: { description: 'Credit cards have the highest interest rates - crushing this first saves the most money.',
            metrics: [
              { label: 'Daily Interest', value: formatCurrency(store.getDailyInterest('creditCard')), trend: 'down' },
              { label: 'Interest Rate', value: `${(creditCard.interestRate * 100).toFixed(1)}%`, trend: 'down' },
              { label: 'Payoff Impact', value: `${baseline.months - velocity.months} mo faster`, trend: 'up' },
            ],
            tips: ['Always pay more than minimum', 'Consider balance transfer options', 'Stop using card until paid off'],
          },
        },
        { id: 'cc-2', type: 'milestone', title: 'Interest Crusher!', subtitle: `Saving ${formatCurrency(velocity.savings)} vs minimum payments`, icon: '💪',
          actionRoute: '/portfolio', learnRoute: '/learn?module=3',
          insight: { description: 'By using velocity banking on credit cards, you\'re avoiding massive interest charges.',
            metrics: [
              { label: 'Interest Avoided', value: formatCurrency(velocity.savings), trend: 'up' },
              { label: 'APR Defeated', value: `${(creditCard.interestRate * 100).toFixed(1)}%`, trend: 'up' },
              { label: 'Freedom Date', value: `${velocity.months} mo`, trend: 'up' },
            ],
            tips: ['Credit card payoff is your first priority', 'Each payment reduces compounding damage', 'Track your shrinking balance'],
          },
        },
        { id: 'cc-3', type: 'tip', title: 'Freeze the Card', subtitle: 'Prevent new charges while paying off', icon: '🧊',
          learnRoute: '/learn?module=6',
          insight: { description: 'Stop adding to your balance while aggressively paying it down.',
            metrics: [
              { label: 'Current Balance', value: formatCurrency(creditCard.balance), trend: 'down' },
              { label: 'Monthly Interest', value: formatCurrency(creditCard.balance * creditCard.interestRate / 12), trend: 'down' },
              { label: 'Break-Even', value: 'In progress', trend: 'neutral' },
            ],
            tips: ['Use debit or cash temporarily', 'Unlink card from subscriptions', 'Remove from online shopping sites'],
          },
        },
        { id: 'cc-4', type: 'action', title: 'Statement Date Tip', subtitle: 'Time your chunks strategically', icon: '📅',
          actionRoute: '/cockpit', learnRoute: '/learn?module=4',
          insight: { description: 'Making payments before statement date reduces reported balance and interest.',
            metrics: [
              { label: 'Best Time', value: 'Before closing date', trend: 'neutral' },
              { label: 'Credit Utilization', value: `${Math.round((creditCard.balance / 10000) * 100)}%`, trend: 'down' },
              { label: 'Score Impact', value: 'Positive', trend: 'up' },
            ],
            tips: ['Pay twice monthly for best results', 'Note your statement closing date', 'Reduce utilization below 30%'],
          },
        },
      ],
      studentLoan: [
        { id: 'sl-1', type: 'action', title: 'Chunk to Principal', subtitle: `Apply ${formatCurrency(chunkAmount)} to student loan`, icon: '🎓',
          actionRoute: '/simulator?focus=chunk', learnRoute: '/learn?module=4',
          insight: { description: 'Extra payments on student loans go directly to principal - accelerating freedom.',
            metrics: [
              { label: 'Principal Attack', value: formatCurrency(chunkAmount), trend: 'up' },
              { label: 'Interest Rate', value: `${(studentLoan.interestRate * 100).toFixed(1)}%`, trend: 'neutral' },
              { label: 'Time Saved', value: `${baseline.months - velocity.months} mo`, trend: 'up' },
            ],
            tips: ['Specify payments go to principal', 'Consider refinancing if rate is high', 'Stay consistent with chunks'],
          },
        },
        { id: 'sl-2', type: 'milestone', title: 'Degree Paid Off Faster!', subtitle: `${velocity.months} months to freedom`, icon: '🏆',
          actionRoute: '/portfolio', learnRoute: '/learn?module=3',
          insight: { description: 'Your education investment is being reclaimed faster than the standard plan.',
            metrics: [
              { label: 'Velocity Payoff', value: `${velocity.months} months`, trend: 'up' },
              { label: 'Standard Payoff', value: `${baseline.months} months`, trend: 'neutral' },
              { label: 'Interest Saved', value: formatCurrency(velocity.savings), trend: 'up' },
            ],
            tips: ['Visualize being loan-free', 'Plan what to do with freed payments', 'Celebrate balance milestones'],
          },
        },
        { id: 'sl-3', type: 'tip', title: 'Tax Deduction Check', subtitle: 'Student loan interest may be deductible', icon: '📋',
          learnRoute: '/learn?module=1',
          insight: { description: 'Up to $2,500 in student loan interest may be tax deductible annually.',
            metrics: [
              { label: 'Annual Interest', value: formatCurrency(studentLoan.balance * studentLoan.interestRate), trend: 'neutral' },
              { label: 'Max Deduction', value: '$2,500', trend: 'neutral' },
              { label: 'Potential Savings', value: formatCurrency(500), trend: 'up' },
            ],
            tips: ['Keep interest statements', 'Consult tax professional', 'Use refund for extra chunk'],
          },
        },
        { id: 'sl-4', type: 'action', title: 'Income-Driven Backup', subtitle: 'Know your options if income changes', icon: '🛡️',
          learnRoute: '/learn?module=5',
          insight: { description: 'Federal loans offer income-driven plans as a safety net if needed.',
            metrics: [
              { label: 'Current Payment', value: formatCurrency(studentLoan.minimumPayment), trend: 'neutral' },
              { label: 'Loan Type', value: 'Federal', trend: 'neutral' },
              { label: 'Flexibility', value: 'High', trend: 'up' },
            ],
            tips: ['Understand IDR plan options', 'Keep employment docs handy', 'Don\'t default - adjust instead'],
          },
        },
      ],
      medical: [
        { id: 'med-1', type: 'action', title: 'Medical Bill Attack', subtitle: `Chunk ${formatCurrency(chunkAmount)} to medical debt`, icon: '🏥',
          actionRoute: '/simulator?focus=chunk', learnRoute: '/learn?module=4',
          insight: { description: 'Medical debt can often be negotiated - attack it aggressively while exploring options.',
            metrics: [
              { label: 'Chunk Power', value: formatCurrency(chunkAmount), trend: 'up' },
              { label: 'Current Balance', value: formatCurrency(debt?.balance || 0), trend: 'down' },
              { label: 'Time Saved', value: `${baseline.months - velocity.months} mo`, trend: 'up' },
            ],
            tips: ['Ask about financial assistance programs', 'Request itemized bills', 'Negotiate before paying'],
          },
        },
        { id: 'med-2', type: 'tip', title: 'Negotiate Your Bills', subtitle: 'Medical debt is often negotiable', icon: '💬',
          learnRoute: '/learn?module=1',
          insight: { description: 'Healthcare providers often accept reduced payments - always ask.',
            metrics: [
              { label: 'Potential Savings', value: '20-50%', trend: 'up' },
              { label: 'Success Rate', value: 'High', trend: 'up' },
              { label: 'Time to Negotiate', value: '1-2 calls', trend: 'neutral' },
            ],
            tips: ['Call billing department directly', 'Ask for hardship discount', 'Offer lump sum for discount'],
          },
        },
        { id: 'med-3', type: 'milestone', title: 'Healing Your Finances!', subtitle: `${velocity.months} months to debt-free health`, icon: '💚',
          actionRoute: '/portfolio', learnRoute: '/learn?module=3',
          insight: { description: 'You\'re healing financially while conquering medical debt.',
            metrics: [
              { label: 'Velocity Payoff', value: `${velocity.months} mo`, trend: 'up' },
              { label: 'Interest Saved', value: formatCurrency(velocity.savings), trend: 'up' },
              { label: 'Progress', value: 'On Track', trend: 'up' },
            ],
            tips: ['Check for billing errors', 'Set up payment plan if needed', 'Document all communications'],
          },
        },
        { id: 'med-4', type: 'action', title: 'Check for Errors', subtitle: 'Medical bills often have mistakes', icon: '🔍',
          learnRoute: '/learn?module=6',
          insight: { description: 'Studies show up to 80% of medical bills contain errors.',
            metrics: [
              { label: 'Error Rate', value: 'Up to 80%', trend: 'neutral' },
              { label: 'Avg Overcharge', value: '$200-$1,000', trend: 'neutral' },
              { label: 'Action', value: 'Review bills', trend: 'neutral' },
            ],
            tips: ['Request itemized statement', 'Compare to EOB', 'Dispute discrepancies'],
          },
        },
      ],
      personal: [
        { id: 'pl-1', type: 'action', title: 'Crush Personal Loan', subtitle: `Apply ${formatCurrency(chunkAmount)} extra payment`, icon: '💵',
          actionRoute: '/simulator?focus=chunk', learnRoute: '/learn?module=4',
          insight: { description: 'Personal loans often have fixed terms - extra payments accelerate freedom.',
            metrics: [
              { label: 'Extra Payment', value: formatCurrency(chunkAmount), trend: 'up' },
              { label: 'Interest Rate', value: `${((debt?.interestRate || 0.11) * 100).toFixed(1)}%`, trend: 'down' },
              { label: 'Months Saved', value: `${baseline.months - velocity.months}`, trend: 'up' },
            ],
            tips: ['Verify no prepayment penalty', 'Direct extra to principal', 'Consider refinancing options'],
          },
        },
        { id: 'pl-2', type: 'tip', title: 'Refinance Check', subtitle: 'Lower rate = more savings', icon: '🔄',
          learnRoute: '/learn?module=5',
          insight: { description: 'If your credit improved, you may qualify for a lower rate.',
            metrics: [
              { label: 'Current Rate', value: `${((debt?.interestRate || 0.11) * 100).toFixed(1)}%`, trend: 'neutral' },
              { label: 'Potential Savings', value: 'Significant', trend: 'up' },
              { label: 'Credit Check', value: 'Soft pull available', trend: 'neutral' },
            ],
            tips: ['Check rates without hard inquiry', 'Compare multiple lenders', 'Factor in fees vs savings'],
          },
        },
        { id: 'pl-3', type: 'milestone', title: 'Loan Liberation!', subtitle: `Saving ${formatCurrency(velocity.savings)} with velocity`, icon: '🎉',
          actionRoute: '/portfolio', learnRoute: '/learn?module=3',
          insight: { description: 'Your velocity strategy is crushing this personal loan.',
            metrics: [
              { label: 'Total Savings', value: formatCurrency(velocity.savings), trend: 'up' },
              { label: 'Original Term', value: `${baseline.months} mo`, trend: 'neutral' },
              { label: 'New Term', value: `${velocity.months} mo`, trend: 'up' },
            ],
            tips: ['Track your progress monthly', 'Celebrate milestones', 'Plan for post-payoff'],
          },
        },
        { id: 'pl-4', type: 'action', title: 'Consolidation Review', subtitle: 'Could you combine high-rate debts?', icon: '🔗',
          learnRoute: '/learn?module=6',
          insight: { description: 'Consolidating multiple debts can simplify and potentially lower costs.',
            metrics: [
              { label: 'Number of Debts', value: 'Multiple', trend: 'neutral' },
              { label: 'Strategy', value: 'Consolidate', trend: 'up' },
              { label: 'Benefit', value: 'Simplify', trend: 'up' },
            ],
            tips: ['Compare total costs', 'Watch for hidden fees', 'Don\'t extend term too much'],
          },
        },
      ],
      recreation: [
        { id: 'rec-1', type: 'action', title: 'Luxury Payoff Power', subtitle: `Chunk ${formatCurrency(chunkAmount)} to recreation loan`, icon: '🚤',
          actionRoute: '/simulator?focus=chunk', learnRoute: '/learn?module=4',
          insight: { description: 'Recreational vehicles depreciate - paying faster preserves value.',
            metrics: [
              { label: 'Chunk Applied', value: formatCurrency(chunkAmount), trend: 'up' },
              { label: 'Depreciation', value: 'Active', trend: 'down' },
              { label: 'Equity Building', value: 'Accelerated', trend: 'up' },
            ],
            tips: ['Pay before value drops', 'Consider selling if underwater', 'Maintain for resale value'],
          },
        },
        { id: 'rec-2', type: 'tip', title: 'Seasonal Strategy', subtitle: 'Time your payments strategically', icon: '📅',
          learnRoute: '/learn?module=5',
          insight: { description: 'Recreation vehicles have seasonal value - optimize timing.',
            metrics: [
              { label: 'Peak Season', value: 'Summer', trend: 'up' },
              { label: 'Best Sale Time', value: 'Spring', trend: 'up' },
              { label: 'Strategy', value: 'Pay or sell high', trend: 'up' },
            ],
            tips: ['Sell in peak demand', 'Winterize properly', 'Consider rental income'],
          },
        },
        { id: 'rec-3', type: 'milestone', title: 'Adventure Awaits!', subtitle: `${velocity.months} months to owned freedom`, icon: '🌊',
          actionRoute: '/portfolio', learnRoute: '/learn?module=3',
          insight: { description: 'Own your adventure vehicle outright and enjoy payment-free fun.',
            metrics: [
              { label: 'Freedom Date', value: `${velocity.months} mo`, trend: 'up' },
              { label: 'Interest Saved', value: formatCurrency(velocity.savings), trend: 'up' },
              { label: 'True Ownership', value: 'Coming soon', trend: 'up' },
            ],
            tips: ['Picture debt-free adventures', 'Maintain during payoff', 'Plan celebration trip'],
          },
        },
        { id: 'rec-4', type: 'action', title: 'Rental Income Option', subtitle: 'Could your asset generate income?', icon: '💰',
          learnRoute: '/learn?module=1',
          insight: { description: 'Many boats, RVs, and vehicles can be rented when not in use.',
            metrics: [
              { label: 'Rental Potential', value: '$100-500/day', trend: 'up' },
              { label: 'Platforms', value: 'Multiple available', trend: 'neutral' },
              { label: 'Strategy', value: 'Offset payments', trend: 'up' },
            ],
            tips: ['Research peer-to-peer platforms', 'Check insurance requirements', 'Start small to test'],
          },
        },
      ],
      custom: [
        { id: 'cust-1', type: 'action', title: 'Custom Chunk Attack', subtitle: `Apply ${formatCurrency(chunkAmount)} to your asset`, icon: '➕',
          actionRoute: '/simulator?focus=chunk', learnRoute: '/learn?module=4',
          insight: { description: 'Your custom debt follows the same velocity principles.',
            metrics: [
              { label: 'Chunk Power', value: formatCurrency(chunkAmount), trend: 'up' },
              { label: 'Balance', value: formatCurrency(debt?.balance || 0), trend: 'down' },
              { label: 'Time Saved', value: `${baseline.months - velocity.months} mo`, trend: 'up' },
            ],
            tips: ['Stay consistent with chunks', 'Track progress weekly', 'Adjust strategy as needed'],
          },
        },
        { id: 'cust-2', type: 'tip', title: 'Personalize Your Plan', subtitle: 'Tailor strategy to your asset', icon: '⚙️',
          learnRoute: '/learn?module=5',
          insight: { description: 'Different assets may benefit from different approaches.',
            metrics: [
              { label: 'Asset Type', value: 'Custom', trend: 'neutral' },
              { label: 'Flexibility', value: 'High', trend: 'up' },
              { label: 'Optimization', value: 'Available', trend: 'up' },
            ],
            tips: ['Research your specific asset', 'Consider appreciation/depreciation', 'Adjust chunk frequency'],
          },
        },
        { id: 'cust-3', type: 'milestone', title: 'Custom Victory!', subtitle: `${velocity.months} months to freedom`, icon: '🏆',
          actionRoute: '/portfolio', learnRoute: '/learn?module=3',
          insight: { description: 'Your unique debt is being conquered with velocity banking.',
            metrics: [
              { label: 'Velocity Payoff', value: `${velocity.months} mo`, trend: 'up' },
              { label: 'Standard Payoff', value: `${baseline.months} mo`, trend: 'neutral' },
              { label: 'Savings', value: formatCurrency(velocity.savings), trend: 'up' },
            ],
            tips: ['Celebrate your progress', 'Document your journey', 'Share your success'],
          },
        },
        { id: 'cust-4', type: 'action', title: 'Track Your Asset', subtitle: 'Upload custom image for motivation', icon: '📸',
          learnRoute: '/learn?module=5',
          insight: { description: 'Seeing your actual asset keeps you motivated.',
            metrics: [
              { label: 'Motivation', value: 'Visual reminder', trend: 'up' },
              { label: 'Progress', value: 'Trackable', trend: 'up' },
              { label: 'Goal', value: 'Ownership', trend: 'up' },
            ],
            tips: ['Take a photo of your asset', 'Display it prominently', 'Update as you progress'],
          },
        },
      ],
    };
    
    const allActions = domainActions[domain] || domainActions.car;

    if (actionFilter === 'all') return allActions;
    return allActions.filter(a => a.type === actionFilter);
  }, [store, actionFilter]);

  if (!mounted) {
    return (
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-500/30 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-gray-500/20 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const { vitals } = getCategoryVitals();
  const actions = getActions();
  const displayedActions = actions.slice(0, 4);

  const domain = store.activeDomain;
  const debtType = store.getActiveDebtType();
  const debt = store.debts[debtType];
  const velocity = store.getVelocityPayoff(debtType);

  const getDomainLabel = () => {
    const labels: Record<string, string> = {
      car: 'Auto',
      house: 'House',
      land: 'Land',
      creditCard: 'Credit Card',
      studentLoan: 'Student Loan',
      medical: 'Medical',
      personal: 'Personal Loan',
      recreation: 'Recreation',
      custom: 'Custom Asset',
    };
    return labels[domain] || domain.charAt(0).toUpperCase() + domain.slice(1);
  };

  const heroData = {
    hotspots: [
      { label: `${getDomainLabel()} Rate`, value: `${(debt.interestRate * 100).toFixed(1)}% APR`, position: { top: '20%', left: '80%' }, color: 'bg-emerald-500' },
      { label: 'Interest Burn', value: `${formatCurrency(store.getDailyInterest(debtType))}/day`, position: { top: '60%', left: '10%' }, color: 'bg-amber-500' },
      { label: 'ETA', value: `${velocity.months} months`, position: { top: '80%', left: '75%' }, color: 'bg-blue-500' },
      { label: 'LOC Available', value: formatCurrency(store.loc.limit - store.loc.balance), position: { top: '40%', left: '5%' }, color: 'bg-cyan-500' },
    ],
    trendValue: formatCurrency(debt.balance),
    trendLabel: 'remaining balance',
  };

  return (
    <PageTransition>
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      {showWealthTimeline && (
        <ScrollReveal variant="fadeUp" as="section">
        <section className={`${classes.glass} rounded-2xl p-5 mb-6 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-amber-500/5 to-emerald-500/5 pointer-events-none" />
          <button 
            onClick={() => setShowWealthTimeline(false)}
            className={`absolute top-3 right-3 ${classes.textSecondary} hover:${classes.text} text-xl`}
            title="Hide"
          >
            ×
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <div>
                <h2 className={`text-lg font-bold ${classes.text}`}>Wealth Timeline</h2>
                <p className={`text-xs ${classes.textSecondary}`}>Your generational wealth potential</p>
              </div>
            </div>
            
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className={`${theme === 'light' ? 'bg-white/60' : 'bg-gray-500/20'} rounded-xl p-3 text-center`}>
                <div className={`text-xs ${classes.textSecondary}`}>Interest to Save</div>
                <div className="text-lg font-bold text-red-500"><CountUp value={wealthMetrics.totalInterest} /></div>
              </div>
              <div className={`${theme === 'light' ? 'bg-white/60' : 'bg-gray-500/20'} rounded-xl p-3 text-center`}>
                <div className={`text-xs ${classes.textSecondary}`}>Years Gained</div>
                <div className="text-lg font-bold text-emerald-500"><CountUp value={wealthMetrics.yearsGained} prefix="" suffix="+ yrs" /></div>
              </div>
              <div className={`${theme === 'light' ? 'bg-white/60' : 'bg-gray-500/20'} rounded-xl p-3 text-center`}>
                <div className={`text-xs ${classes.textSecondary}`}>Money Saved</div>
                <div className="text-lg font-bold text-blue-500"><CountUp value={wealthMetrics.moneySaved} /></div>
              </div>
              <div className={`${theme === 'light' ? 'bg-white/60' : 'bg-gray-500/20'} rounded-xl p-3 text-center`}>
                <div className={`text-xs ${classes.textSecondary}`}>Potential Growth</div>
                <div className="text-lg font-bold text-amber-500"><CountUp value={wealthMetrics.investmentGrowth} /></div>
              </div>
            </div>
            
            <Link 
              href="/vault" 
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20 text-sm whitespace-nowrap"
            >
              View Full Timeline →
            </Link>
          </div>
        </section>
        </ScrollReveal>
      )}
      
      <ScrollReveal variant="fadeUp" as="header">
      <header className="mb-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <p className={`${classes.textSecondary} text-sm`}>Check your</p>
            <h1 className={`text-3xl font-bold ${classes.text}`}>Financial Health</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${classes.glass} rounded-xl px-4 py-2`}>
              <button className={`${classes.textSecondary} hover:${classes.text}`}>&lt;</button>
              <span className={`${classes.text} font-medium px-4`}>February 2026</span>
              <button className={`${classes.textSecondary} hover:${classes.text}`}>&gt;</button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center relative z-50">
          <DomainTabs 
            activeTab={store.activeDomain} 
            onTabChange={(tab) => store.setActiveDomain(tab as Domain)} 
          />
        </div>
      </header>
      </ScrollReveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <ScrollReveal variant="scaleIn" className="lg:col-span-5">
          <HeroVisual
            domain={store.activeDomain}
            hotspots={heroData.hotspots}
            trendValue={heroData.trendValue}
            trendLabel={heroData.trendLabel}
          />
        </ScrollReveal>

        <ScrollReveal variant="fadeUp" delay={0.1} className="lg:col-span-3">
          <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
            <div className="flex gap-2">
              {(['cashflow', 'analytics', 'goals', 'velocity'] as VitalsCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setVitalsCategory(cat); setExpandedVital(null); }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    vitalsCategory === cat 
                      ? 'bg-blue-500 scale-110 shadow-lg shadow-blue-500/30' 
                      : `${classes.glassButton}`
                  }`}
                  title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                >
                  {getCategoryIcon(cat)}
                </button>
              ))}
            </div>
          </div>
          
          <div className={`text-sm ${classes.textSecondary} mb-3 capitalize text-center lg:text-left`}>{vitalsCategory} Insights</div>
          
          <div className="space-y-3">
            {vitals.map((vital, i) => (
              <div 
                key={i} 
                className={`${classes.glass} rounded-2xl p-4 transition-all cursor-pointer ${
                  expandedVital === i 
                    ? 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10' 
                    : 'hover:ring-1 hover:ring-emerald-500/50'
                }`}
                onClick={() => setExpandedVital(expandedVital === i ? null : i)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{vital.icon}</div>
                  <div className="flex-1">
                    <div className={`text-sm ${classes.textSecondary} mb-1`}>{vital.label}</div>
                    {vital.isEditable && vital.onEdit && typeof vital.value === 'number' ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <EditableCurrency value={vital.value} onChange={vital.onEdit} size="lg" />
                      </div>
                    ) : (
                      <div className={`text-xl font-bold ${classes.text}`}>
                        {typeof vital.value === 'number' ? formatCurrency(vital.value) : vital.value}
                      </div>
                    )}
                    {vital.sublabel && <div className={`text-xs ${classes.textSecondary} mt-1`}>{vital.sublabel}</div>}
                  </div>
                  <div className={`${classes.textSecondary} transition-transform ${expandedVital === i ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </div>
                
                {expandedVital === i && (
                  <div className={`mt-4 pt-4 border-t ${classes.border} animate-fadeIn`}>
                    <h4 className="text-emerald-500 font-semibold mb-2">{vital.insight.title}</h4>
                    <p className={`${classes.textSecondary} text-sm mb-3`}>{vital.insight.description}</p>
                    
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {vital.insight.metrics.map((m, j) => (
                        <div key={j} className={`${classes.bgSecondary} rounded-lg p-2 text-center`}>
                          <div className={`text-xs ${classes.textSecondary}`}>{m.label}</div>
                          <div className={`text-sm font-semibold ${
                            m.trend === 'up' ? 'text-emerald-500' : 
                            m.trend === 'down' ? 'text-red-500' : classes.text
                          }`}>
                            {m.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-1">
                      {vital.insight.tips.map((tip, j) => (
                        <div key={j} className={`flex items-center gap-2 text-xs ${classes.textSecondary}`}>
                          <span className="text-emerald-500">•</span> {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal variant="fadeUp" delay={0.2} className="lg:col-span-4">
          <div className="flex justify-center lg:justify-start gap-2 mb-4">
            {([
              { key: 'all', label: 'All' },
              { key: 'action', label: 'Actions' },
              { key: 'tip', label: 'Tips' },
              { key: 'milestone', label: 'Wins' },
            ] as { key: ActionFilter; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActionFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  actionFilter === key 
                    ? 'bg-blue-500 text-white' 
                    : `${classes.glassButton} ${classes.textSecondary}`
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          
          <div className="space-y-3">
            {displayedActions.map((action, i) => (
              <div 
                key={action.id}
                className={`${classes.glass} rounded-2xl p-4 transition-all cursor-pointer ${
                  expandedAction === action.id 
                    ? 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10' 
                    : 'hover:ring-1 hover:ring-emerald-500/50'
                } ${displayedActions.length > 0 && i === (cycleIndex % displayedActions.length) ? 'ring-2 ring-blue-500/30' : ''}`}
                onClick={() => setExpandedAction(expandedAction === action.id ? null : action.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    action.type === 'action' ? 'bg-blue-500/20' :
                    action.type === 'tip' ? 'bg-amber-500/20' :
                    action.type === 'milestone' ? 'bg-emerald-500/20' :
                    'bg-red-500/20'
                  }`}>
                    <span className="text-xl">{action.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${classes.text}`}>{action.title}</div>
                    <div className={`text-sm ${classes.textSecondary}`}>{action.subtitle}</div>
                  </div>
                  {action.chart && (
                    <div className="flex items-end gap-0.5 h-6">
                      {action.chart === 'line' ? (
                        <svg className="w-8 h-6 text-emerald-500" viewBox="0 0 32 24">
                          <polyline points="0,20 8,16 16,12 24,8 32,4" fill="none" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      ) : (
                        [1, 2, 3, 4].map((h, j) => (
                          <div key={j} className="w-1.5 bg-emerald-500 rounded-sm" style={{ height: `${h * 5}px` }}></div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                {expandedAction === action.id && (
                  <div className={`mt-4 pt-4 border-t ${classes.border} animate-fadeIn`}>
                    <p className={`${classes.textSecondary} text-sm mb-3`}>{action.insight.description}</p>
                    
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {action.insight.metrics.map((m, j) => (
                        <div key={j} className={`${classes.bgSecondary} rounded-lg p-2 text-center`}>
                          <div className={`text-xs ${classes.textSecondary}`}>{m.label}</div>
                          <div className={`text-sm font-semibold ${
                            m.trend === 'up' ? 'text-emerald-500' : 
                            m.trend === 'down' ? 'text-red-500' : classes.text
                          }`}>
                            {m.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      {action.insight.tips.map((tip, j) => (
                        <div key={j} className={`flex items-center gap-2 text-xs ${classes.textSecondary}`}>
                          <span className="text-emerald-500">•</span> {tip}
                        </div>
                      ))}
                    </div>
                    
                    {/* Inline checklist for insurance-type cards */}
                    {action.inlineChecklist && (
                      <div className={`mb-3 p-3 rounded-lg ${classes.bgSecondary} space-y-2`}>
                        <div className={`text-xs font-semibold ${classes.text} mb-2`}>📋 Quick Checklist</div>
                        {action.inlineChecklist.map((item) => (
                          <label key={item.key} className={`flex items-center gap-2 text-xs ${classes.textSecondary} cursor-pointer`}>
                            <input
                              type="checkbox"
                              checked={checklistState[`${action.id}-${item.key}`] || false}
                              onChange={(e) => {
                                e.stopPropagation();
                                setChecklistState(prev => ({ ...prev, [`${action.id}-${item.key}`]: !prev[`${action.id}-${item.key}`] }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-gray-600 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5"
                            />
                            <span className={checklistState[`${action.id}-${item.key}`] ? 'line-through opacity-50' : ''}>
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {action.actionRoute ? (
                        <Link
                          href={action.actionRoute}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 bg-emerald-500/20 text-emerald-500 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-colors"
                        >
                          Take Action →
                        </Link>
                      ) : action.inlineChecklist ? (
                        <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-500 rounded-lg text-xs font-medium">
                          ✓ Use Checklist Above
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500/60 rounded-lg text-xs font-medium">
                          Coming Soon
                        </span>
                      )}
                      {action.learnRoute ? (
                        <Link
                          href={action.learnRoute}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-3 py-1.5 ${classes.glassButton} ${classes.textSecondary} rounded-lg text-xs font-medium transition-colors`}
                        >
                          Learn More →
                        </Link>
                      ) : (
                        <Link
                          href="/learn"
                          onClick={(e) => e.stopPropagation()}
                          className={`px-3 py-1.5 ${classes.glassButton} ${classes.textSecondary} rounded-lg text-xs font-medium transition-colors`}
                        >
                          Learn More
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {actions.length > 4 && (
            <div className="mt-3 text-center">
              <span className={`${classes.textSecondary} text-sm`}>+{actions.length - 4} more items</span>
            </div>
          )}
        </ScrollReveal>
      </div>

      <ScrollReveal variant="fadeUp">
      <div className={`mt-8 ${classes.glass} rounded-2xl p-6`}>
        <h3 className={`text-lg font-semibold ${classes.text} mb-4`}>Quick Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm ${classes.textSecondary} mb-2`}>Monthly Income</label>
            <EditableCurrency value={store.monthlyIncome} onChange={store.setMonthlyIncome} size="md" />
          </div>
          <div>
            <label className={`block text-sm ${classes.textSecondary} mb-2`}>Monthly Expenses</label>
            <EditableCurrency value={store.monthlyExpenses} onChange={store.setMonthlyExpenses} size="md" />
          </div>
          <div>
            <label className={`block text-sm ${classes.textSecondary} mb-2`}>Chunk Amount</label>
            <EditableCurrency value={store.chunkAmount} onChange={store.setChunkAmount} size="md" />
          </div>
          <div>
            <label className={`block text-sm ${classes.textSecondary} mb-2`}>LOC Rate</label>
            <EditablePercentage value={store.loc.interestRate} onChange={(val) => store.updateLOC({ interestRate: val })} size="md" />
          </div>
        </div>
      </div>
      </ScrollReveal>

      <ScrollReveal variant="fadeUp">
      <div className="mt-8 bg-gradient-to-r from-emerald-500/20 to-transparent rounded-2xl p-6 border border-emerald-500/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/30 flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-emerald-400">Run a What-If Simulation</h3>
              <p className="text-gray-400">See how changes affect your payoff timeline</p>
            </div>
          </div>
          <a
            href="/simulator"
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
          >
            Open Simulator
          </a>
        </div>
      </div>
      </ScrollReveal>

      <footer className={`mt-8 text-center text-sm ${classes.textSecondary}`}>
        Educational tool. Click any number to edit. Not financial advice.
      </footer>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
    </PageTransition>
  );
}
