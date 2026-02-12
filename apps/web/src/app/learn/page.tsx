'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import Link from 'next/link';

/* ──────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────── */

interface Quiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Lesson {
  id: number;
  title: string;
  subtitle: string;
  duration: string;
  icon: string;
  color: string; // tailwind color prefix e.g. 'emerald', 'blue'
  content: string[];
  keyTakeaway: string;
  deepDive: string;
  quiz: Quiz;
  investopediaUrl: string;
  investopediaLabel: string;
}

interface GlossaryItem {
  term: string;
  definition: string;
  url: string;
}

/* ──────────────────────────────────────────────────────────
   DATA
   ────────────────────────────────────────────────────────── */

const lessons: Lesson[] = [
  {
    id: 1,
    title: 'Cash Flow: Your #1 Prerequisite',
    subtitle: 'Why positive cash flow powers everything',
    duration: '5 min',
    icon: '💰',
    color: 'emerald',
    content: [
      'Cash flow is simply your income minus your expenses each month. If you earn $5,000 and spend $4,800, your cash flow is $200. That number — however small — is the fuel that drives the entire velocity banking engine. Without positive cash flow, velocity banking cannot work. Period.',
      'Here\'s what most people miss: even $200/month of cash flow, when deployed strategically through a Line of Credit, can shave years off a 30-year mortgage. That\'s because velocity banking doesn\'t just make extra payments — it restructures how interest is calculated on your debt by leveraging the difference between amortized interest and average daily balance interest.',
      'The "Cash Flow Multiplier" effect is where it gets exciting. As you pay off debts using velocity banking, those minimum payments you were making become available cash flow. Pay off a $300/month car payment? Your cash flow just jumped from $200 to $500. That acceleration compounds — each debt eliminated feeds the next cycle faster.',
      'Think of cash flow as water pressure in a hose. The more pressure (cash flow), the faster you can fill the bucket (pay off debt). But even a trickle will get there — it just takes more cycles. The key is knowing your exact number, tracking it religiously, and protecting it from lifestyle creep.',
    ],
    keyTakeaway: 'Positive cash flow is non-negotiable. Know your exact monthly surplus. Even $200/month can accelerate debt payoff by years when used in the velocity banking cycle.',
    deepDive: 'To calculate your true cash flow: add up every recurring income source (net pay, side income, dividends). Then subtract every expense — fixed (rent, insurance, subscriptions) and variable (groceries, gas, entertainment). Use the last 3 months of bank statements for accuracy. The number you get is your "velocity fuel." If it\'s negative, you must fix that first through expense reduction or income increase before starting velocity banking.',
    quiz: {
      question: 'What happens to your cash flow when you pay off a debt using velocity banking?',
      options: [
        'It stays the same — you still owe on the LOC',
        'It increases because that debt\'s minimum payment is now available',
        'It decreases because you\'re paying LOC interest',
        'It only changes if interest rates drop',
      ],
      correctIndex: 1,
      explanation: 'When a debt is paid off, its minimum payment becomes available cash flow. This is the "Cash Flow Multiplier" — each eliminated debt accelerates the next cycle.',
    },
    investopediaUrl: 'https://www.investopedia.com/terms/c/cashflow.asp',
    investopediaLabel: 'Cash Flow Definition — Investopedia',
  },
  {
    id: 2,
    title: 'The Money Loop',
    subtitle: 'The core cycle that makes velocity banking work',
    duration: '6 min',
    icon: '🔄',
    color: 'blue',
    content: [
      'The Money Loop is the heartbeat of velocity banking. It\'s a simple but powerful cycle: your entire paycheck deposits directly into your Line of Credit (LOC), immediately reducing the balance. Then, throughout the month, you pay your living expenses from the LOC. At the end of the month, the net effect is that your LOC balance dropped by your cash flow amount — but the average daily balance was lower the entire month.',
      'Here\'s the step-by-step: Say your LOC balance is $5,000. On the 1st, your $4,000 paycheck deposits in — balance drops to $1,000. Over 30 days, you draw $3,500 for expenses. End-of-month balance: $4,500 (down $500 — your cash flow). But here\'s the magic: your average daily balance was roughly $2,800 instead of $5,000 because the income sat in the LOC for days before being drawn out.',
      'Why does the average daily balance matter? Because LOCs charge interest on the average daily balance, not the ending balance. A traditional bank account separates your income from your debt — money sits in checking earning nothing while your LOC accrues interest on the full balance. The Money Loop eliminates that gap.',
      'This is the core innovation of velocity banking: using the same dollars to both reduce interest AND pay your bills. Your money works double-duty. The cycle repeats every pay period, creating a perpetual interest-reduction machine powered by your income flow.',
    ],
    keyTakeaway: 'Deposit income into LOC first, pay expenses from LOC. Your money reduces your average daily balance before it gets spent — making every dollar work double duty.',
    deepDive: 'The efficiency of the Money Loop depends on how your expenses are distributed throughout the month. If all expenses hit on day 1, the ADB benefit is minimal. If expenses trickle out evenly (which is typical — rent on the 1st, utilities mid-month, groceries weekly), the ADB stays low for longer. Some advanced practitioners even time bill payments to maximize the ADB reduction effect, though this is an optimization that adds complexity.',
    quiz: {
      question: 'In the Money Loop, why does depositing your paycheck into the LOC reduce interest?',
      options: [
        'Because the LOC has a lower interest rate than your mortgage',
        'Because it reduces the average daily balance the LOC charges interest on',
        'Because the bank gives you a bonus for direct deposits',
        'Because you earn interest on the deposited money',
      ],
      correctIndex: 1,
      explanation: 'LOCs charge interest based on average daily balance. Depositing income immediately drops the balance, keeping the average lower throughout the month even as you draw expenses back out.',
    },
    investopediaUrl: 'https://www.investopedia.com/terms/l/lineofcredit.asp',
    investopediaLabel: 'Line of Credit — Investopedia',
  },
  {
    id: 3,
    title: 'Interest Timing',
    subtitle: 'How ADB interest differs from amortized interest',
    duration: '6 min',
    icon: '⏱️',
    color: 'purple',
    content: [
      'Understanding interest timing is what separates velocity banking from simple "pay extra on your mortgage" advice. There are two fundamentally different ways lenders calculate interest: amortized (your mortgage) and average daily balance (your LOC). Exploiting the difference between them is the entire strategy.',
      'Amortized debt (mortgages, auto loans) calculates interest on the scheduled principal balance at each payment. Your mortgage doesn\'t care if you had $10,000 sitting in your checking account all month — it charges the same interest. The balance only changes when your monthly payment is applied. Early in a mortgage, 70-80% of each payment goes to interest.',
      'LOC interest works on average daily balance (ADB). Let\'s do the math: You have a $5,000 LOC balance at 10% APR. If income of $4,000 deposits on day 1 and $3,500 in expenses draws out evenly over 30 days, your ADB calculation looks like this: Day 1 balance drops to $1,000. Each day, about $117 is drawn. By day 30, you\'re at $4,500. The ADB across the month is roughly $2,750 — meaning you paid interest on $2,750 instead of $5,000. That\'s a 45% reduction in the interest-bearing balance.',
      'Compare this to the alternative: income goes to checking, LOC stays at $5,000 all month, and you pay interest on the full $5,000. Same money, same expenses, but dramatically different interest charges. This timing advantage is what the Money Loop exploits every single month.',
      'The monthly interest difference might seem small ($18.75 savings in our example at 10% APR), but it compounds. Over years of cycling, these savings accumulate — and more importantly, they allow the LOC to be paid down faster, creating room for larger "chunks" against your primary debt.',
    ],
    keyTakeaway: 'Amortized debt charges interest on scheduled balance regardless of your cash position. LOC charges on average daily balance. Parking income in the LOC — even temporarily — reduces the average and saves interest.',
    deepDive: 'Detailed ADB math: Starting balance $5,000. Day 1: deposit $4,000 → $1,000. Daily expenses: $3,500 ÷ 30 = $116.67/day. Day 1: $1,000. Day 15: $1,000 + (14 × $116.67) = $2,633. Day 30: $4,500. Sum of daily balances ≈ $82,500. ADB = $82,500 ÷ 30 = $2,750. Monthly interest at 10% APR = $2,750 × (0.10 ÷ 12) = $22.92. Without the loop (flat $5,000): $5,000 × (0.10 ÷ 12) = $41.67. Monthly savings: $18.75. Annual savings: $225. Over 5 years of cycling: $1,125+ in interest saved — just from the timing of your deposits.',
    quiz: {
      question: 'If your LOC has a $5,000 balance and you deposit $4,000 income on day 1, what approximately is your average daily balance for the month?',
      options: [
        '$5,000 — the deposit doesn\'t matter',
        '$1,000 — that\'s what it dropped to',
        '~$2,750 — average of the daily balances as expenses draw back out',
        '$4,500 — the ending balance',
      ],
      correctIndex: 2,
      explanation: 'The ADB is the average of every day\'s balance. It starts at $1,000 after the deposit, then gradually rises as expenses are drawn. The average across 30 days is approximately $2,750.',
    },
    investopediaUrl: 'https://www.investopedia.com/terms/a/averagedailybalance.asp',
    investopediaLabel: 'Average Daily Balance — Investopedia',
  },
  {
    id: 4,
    title: 'The Chunk Strategy',
    subtitle: 'Lump-sum attacks on your primary debt',
    duration: '5 min',
    icon: '🎯',
    color: 'orange',
    content: [
      'While the Money Loop handles the LOC efficiently, the Chunk Strategy is where the real mortgage-killing power lives. A "chunk" is a large lump-sum payment from your LOC directly to your primary amortized debt\'s principal. It\'s the offensive weapon in your velocity banking arsenal.',
      'Here\'s how it works: As you cycle income through the Money Loop, your cash flow gradually pays down the LOC. When the LOC balance drops enough to have significant available credit, you deploy a chunk. For example, if your $15,000 LOC has been paid down to $5,000 through income cycling, you have $10,000 of available credit. You might deploy a $8,000 chunk to your mortgage principal.',
      'The impact of a chunk on amortized debt is dramatic. On a $200,000 mortgage at 6% interest, a single $3,000 chunk payment in year 3 saves approximately $6,400 in interest over the life of the loan and eliminates roughly 4 months of payments from the end of your term. Why? Because every dollar of principal reduction means less interest is calculated at the next payment — and that compounds for the remaining 27 years.',
      'The cycle then repeats: after the chunk, your LOC balance is back up ($13,000 in our example). The Money Loop begins paying it down again with your cash flow. When there\'s room, you deploy another chunk. Each cycle accelerates the timeline — it\'s not linear, it\'s exponential because the chunks compound against the amortization schedule.',
    ],
    keyTakeaway: 'Chunks are large lump-sum attacks on your mortgage principal using LOC credit. A single $3,000 chunk can save $6,000+ in interest and cut months off your mortgage. Repeat the cycle for exponential acceleration.',
    deepDive: 'Chunk sizing is critical. A chunk should leave enough LOC capacity for emergencies (keep at least 20% available) and should be recoverable by your cash flow within a reasonable timeframe. If your monthly cash flow is $500, a $5,000 chunk takes 10 months to recover. That\'s fine for a steady income. But a $12,000 chunk with $500/month cash flow takes 24 months — you might need that LOC capacity for emergencies during that time. A general rule: chunk size should be recoverable in 6-12 months of cash flow cycling.',
    quiz: {
      question: 'Why does a $3,000 principal chunk on a 30-year mortgage save more than $3,000 in interest?',
      options: [
        'Because the bank rewards large payments',
        'Because reducing principal means less interest accrues for the remaining years, and that compounds',
        'Because the interest rate drops when you make extra payments',
        'It doesn\'t — you only save exactly $3,000',
      ],
      correctIndex: 1,
      explanation: 'When you reduce principal, every future payment has less interest to cover and more going to principal. This compounds over the remaining life of the loan, creating savings far exceeding the chunk amount.',
    },
    investopediaUrl: 'https://www.investopedia.com/terms/p/principal.asp',
    investopediaLabel: 'Principal vs Interest — Investopedia',
  },
  {
    id: 5,
    title: 'When It Works Best',
    subtitle: 'The conditions that make velocity banking thrive',
    duration: '4 min',
    icon: '✅',
    color: 'green',
    content: [
      'Velocity banking isn\'t magic — it\'s math. And the math works best under specific conditions. Understanding these conditions helps you set realistic expectations and avoid frustration. The single most important factor is positive cash flow. Without it, the strategy cannot function.',
      'Ideal conditions include: a LOC interest rate lower than your primary debt rate (this maximizes the arbitrage), consistent and predictable income (makes cycling reliable), front-loaded amortized debt like mortgages where early payments are mostly interest (this is where chunks have maximum impact), and financial discipline to avoid increasing spending as credit becomes available.',
      'Velocity banking still works even if your LOC rate is slightly higher than your mortgage rate — because the ADB calculation on the LOC means you\'re not paying the full rate on the full balance. However, the margin shrinks, and the strategy becomes less powerful. The sweet spot is a LOC rate 2-4% below your primary debt rate.',
      'When does it NOT work? If your cash flow is negative (you\'re spending more than you earn), if your LOC rate is significantly higher than your debt rate with low cash flow, if you can\'t maintain spending discipline (using the LOC for lifestyle inflation defeats the purpose), or if your debt is already near the end of its amortization schedule (most payments are already going to principal, so chunks have less impact).',
    ],
    keyTakeaway: 'Velocity banking thrives with: positive cash flow, LOC rate lower than debt rate, front-loaded amortized debt, and spending discipline. It fails without positive cash flow or spending control.',
    deepDive: 'Rate comparison nuance: A 10% LOC vs 6% mortgage might seem like a losing proposition. But remember — you\'re paying 10% on the average daily balance (which is much lower than the actual balance), and the chunks are hitting principal on a front-loaded amortization where 70%+ of payments are interest. Run the numbers in the simulator with your actual rates to see if the math works for your situation. For many people, even a higher-rate LOC provides net savings because of the ADB advantage and the compounding effect of principal reduction.',
    quiz: {
      question: 'Which of the following would make velocity banking LEAST effective?',
      options: [
        'Having a 10% LOC rate when your mortgage is 6%',
        'Having negative cash flow (spending more than you earn)',
        'Being in year 2 of a 30-year mortgage',
        'Having $300/month cash flow instead of $1,000',
      ],
      correctIndex: 1,
      explanation: 'Negative cash flow means the LOC balance grows instead of shrinking. The Money Loop requires positive cash flow to function — without it, you\'re just adding debt.',
    },
    investopediaUrl: 'https://www.investopedia.com/mortgage/heloc/',
    investopediaLabel: 'HELOC Guide — Investopedia',
  },
  {
    id: 6,
    title: 'Common Mistakes to Avoid',
    subtitle: 'Pitfalls that derail velocity banking success',
    duration: '5 min',
    icon: '⚠️',
    color: 'amber',
    content: [
      'The most dangerous mistake in velocity banking is over-utilizing your LOC. Using more than 80% of your credit limit does two harmful things: it leaves no emergency buffer, and it can damage your credit score. If an unexpected expense hits when your LOC is maxed, you\'re forced to use high-interest alternatives. Always maintain at least 20% available credit.',
      'Not tracking expenses accurately is the silent killer. Velocity banking math assumes your cash flow is real and consistent. If you estimate $500/month cash flow but actually only have $200 because of forgotten subscriptions and impulse purchases, your chunks take 2.5x longer to recover and your LOC interest costs eat into the savings. Track every dollar for at least 3 months before starting.',
      'Making chunks too large is tempting but risky. A massive chunk feels great — your mortgage balance drops dramatically. But if that chunk maxes your LOC and your income dips (job change, medical expense, car repair), you can\'t recover. Stick to chunks that leave 20% LOC headroom and can be recovered within 6-12 months of cash flow.',
      'Two more critical mistakes: ignoring LOC interest (it\'s not free money — every month the LOC carries a balance, you\'re paying interest, so the cycle must be efficient), and treating the LOC as spending money. The LOC is a tool for debt elimination, not a lifestyle enhancer. The moment you use available LOC credit for vacations or gadgets, you\'ve broken the strategy.',
    ],
    keyTakeaway: 'Stay under 80% LOC utilization, track every expense, size chunks conservatively, remember LOC interest is real cost, and never use the LOC for lifestyle spending.',
    deepDive: 'A real-world example of mistake cascading: Sarah has $500/month cash flow, a $15,000 LOC, and deploys a $12,000 chunk (80% utilization). Two months later, her car needs $2,000 in repairs. LOC is at $11,000 (only recovered $1,000). She has $4,000 available but needs it for emergencies. She uses a credit card at 24% APR for the car. Now she has LOC interest AND credit card interest eating her cash flow. The chunk savings are neutralized. If she had chunked $8,000 instead, she\'d have had $7,000 available and handled the emergency easily.',
    quiz: {
      question: 'What is the recommended maximum LOC utilization for velocity banking?',
      options: [
        '100% — use every dollar available',
        '90% — leave a small buffer',
        '80% — maintain 20% emergency headroom',
        '50% — only use half your LOC',
      ],
      correctIndex: 2,
      explanation: 'Keeping utilization under 80% protects your credit score and ensures you have emergency capacity. Over-utilizing the LOC is one of the most common mistakes in velocity banking.',
    },
    investopediaUrl: 'https://www.investopedia.com/articles/pf/12/good-debt-bad-debt.asp',
    investopediaLabel: 'Good vs Bad Debt — Investopedia',
  },
];

const glossary: GlossaryItem[] = [
  { term: 'Principal', definition: 'The original amount borrowed, not including interest. In velocity banking, reducing principal through chunks is the primary goal.', url: 'https://www.investopedia.com/terms/p/principal.asp' },
  { term: 'Interest', definition: 'The cost of borrowing money, expressed as APR. Different debt types calculate interest differently — this difference is key to velocity banking.', url: 'https://www.investopedia.com/terms/i/interest.asp' },
  { term: 'Cash Flow', definition: 'Monthly income minus expenses. The "fuel" for velocity banking. Must be positive for the strategy to work.', url: 'https://www.investopedia.com/terms/c/cashflow.asp' },
  { term: 'Amortization', definition: 'A payment schedule where early payments are mostly interest. Velocity banking exploits this front-loading by attacking principal early.', url: 'https://www.investopedia.com/terms/a/amortization.asp' },
  { term: 'LOC / HELOC', definition: 'Line of Credit / Home Equity Line of Credit. The vehicle for the Money Loop — charges interest on average daily balance, not the fixed balance.', url: 'https://www.investopedia.com/mortgage/heloc/' },
  { term: 'Average Daily Balance', definition: 'The average of your account balance across each day of the billing period. LOCs use this to calculate interest — the core of why velocity banking works.', url: 'https://www.investopedia.com/terms/a/averagedailybalance.asp' },
  { term: 'Chunk', definition: 'A large lump-sum payment from your LOC to your primary debt\'s principal. The offensive weapon in velocity banking.', url: '#' },
  { term: 'Money Loop', definition: 'The cycle of depositing income into LOC and paying expenses from it, keeping the average daily balance low and minimizing interest.', url: '#' },
];

/* ──────────────────────────────────────────────────────────
   PROGRESS STORE (localStorage)
   ────────────────────────────────────────────────────────── */

function useProgress() {
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number | null>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem('learn-progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCompleted(new Set(parsed.completed || []));
        setQuizAnswers(parsed.quizAnswers || {});
      }
    } catch { /* ignore */ }
  }, []);

  const save = (c: Set<number>, q: Record<number, number | null>) => {
    localStorage.setItem('learn-progress', JSON.stringify({ completed: [...c], quizAnswers: q }));
  };

  const toggleComplete = (id: number) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      save(next, quizAnswers);
      return next;
    });
  };

  const answerQuiz = (lessonId: number, answerIndex: number) => {
    setQuizAnswers(prev => {
      const next = { ...prev, [lessonId]: answerIndex };
      save(completed, next);
      return next;
    });
  };

  return { completed, quizAnswers, toggleComplete, answerQuiz };
}

/* ──────────────────────────────────────────────────────────
   VISUALIZATION COMPONENTS
   ────────────────────────────────────────────────────────── */

function CashFlowViz() {
  return (
    <div className="relative w-full p-4">
      <div className="flex items-end justify-center gap-6 h-40">
        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ height: 0 }} animate={{ height: 128 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="w-16 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-white/10"
              animate={{ y: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
          <span className="text-xs text-emerald-400 font-medium">Income</span>
          <span className="text-xs text-gray-500">$5,000</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ height: 0 }} animate={{ height: 104 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="w-16 bg-gradient-to-t from-red-600 to-red-400 rounded-t-lg"
          />
          <span className="text-xs text-red-400 font-medium">Expenses</span>
          <span className="text-xs text-gray-500">$4,200</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ height: 0 }} animate={{ height: 24 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="w-16 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg relative"
          >
            <motion.div
              className="absolute inset-0 bg-white/20"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
          <span className="text-xs text-yellow-400 font-medium">Cash Flow</span>
          <span className="text-xs text-gray-500">$800</span>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-center mt-4 text-sm text-emerald-400/80"
      >
        ↑ This $800/mo is your velocity fuel
      </motion.div>
    </div>
  );
}

function MoneyLoopViz() {
  const steps = [
    { label: 'Paycheck', icon: '💵', desc: '$4,000 income' },
    { label: 'Into LOC', icon: '📥', desc: 'Balance: $5K → $1K' },
    { label: 'ADB Drops', icon: '📉', desc: 'Less interest accrues' },
    { label: 'Pay Bills', icon: '🧾', desc: '$3,500 expenses' },
    { label: 'Net Result', icon: '✨', desc: 'LOC down by $500' },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-2 p-4">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 * i }}
          className="flex items-center gap-2"
        >
          <div className="flex flex-col items-center bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 w-24 text-center">
            <span className="text-2xl mb-1">{step.icon}</span>
            <span className="text-xs font-semibold text-blue-300">{step.label}</span>
            <span className="text-[10px] text-gray-500 mt-1">{step.desc}</span>
          </div>
          {i < steps.length - 1 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 * i + 0.15 }}
              className="text-blue-500/60 text-lg"
            >→</motion.span>
          )}
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="w-full text-center mt-3"
      >
        <span className="text-xs text-blue-400/70 italic">↻ Cycle repeats every pay period</span>
      </motion.div>
    </div>
  );
}

function InterestTimingViz() {
  const withLoop = [
    { day: '1', bal: 1000, pct: 20 },
    { day: '8', bal: 1817, pct: 36 },
    { day: '15', bal: 2633, pct: 53 },
    { day: '22', bal: 3450, pct: 69 },
    { day: '30', bal: 4500, pct: 90 },
  ];
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-purple-400 font-semibold mb-2 text-center">With Money Loop</p>
          <div className="space-y-1">
            {withLoop.map((d, i) => (
              <motion.div
                key={i}
                initial={{ width: 0 }}
                animate={{ width: `${d.pct}%` }}
                transition={{ duration: 0.8, delay: 0.2 * i }}
                className="h-5 bg-gradient-to-r from-purple-600 to-purple-400 rounded-r-md flex items-center justify-end px-2"
              >
                <span className="text-[10px] text-white font-mono">${d.bal.toLocaleString()}</span>
              </motion.div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-1 text-center">ADB ≈ $2,750</p>
        </div>
        <div>
          <p className="text-xs text-red-400 font-semibold mb-2 text-center">Without Loop</p>
          <div className="space-y-1">
            {[5000, 5000, 5000, 5000, 5000].map((_, i) => (
              <motion.div
                key={i}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, delay: 0.2 * i }}
                className="h-5 bg-gradient-to-r from-red-600 to-red-400 rounded-r-md flex items-center justify-end px-2"
              >
                <span className="text-[10px] text-white font-mono">$5,000</span>
              </motion.div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-1 text-center">ADB = $5,000</p>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
        className="text-center bg-purple-500/10 border border-purple-500/20 rounded-lg p-2"
      >
        <span className="text-xs text-purple-300">Monthly interest saved: <strong>$18.75</strong> at 10% APR</span>
      </motion.div>
    </div>
  );
}

function ChunkStrategyViz() {
  const stages = [
    { label: 'Start', amount: 200000 },
    { label: 'Chunk 1', amount: 197000 },
    { label: 'Chunk 2', amount: 193500 },
    { label: 'Chunk 3', amount: 189500 },
    { label: 'Chunk 4', amount: 185000 },
    { label: 'Chunk 5', amount: 180000 },
  ];
  const max = stages[0].amount;
  return (
    <div className="p-4">
      <div className="space-y-2">
        {stages.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 * i }}
            className="flex items-center gap-3"
          >
            <span className="text-[10px] text-gray-500 w-16 text-right">{s.label}</span>
            <div className="flex-1 h-6 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: `${(s.amount / max) * 100}%` }}
                transition={{ duration: 1, delay: 0.3 * i }}
                className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full flex items-center justify-end px-2"
              >
                <span className="text-[10px] text-white font-mono">${(s.amount / 1000).toFixed(0)}K</span>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
        className="text-center text-xs text-orange-400/80 mt-3"
      >
        Each $3K chunk saves ~$6,400 in interest over the loan life
      </motion.p>
    </div>
  );
}

function WhenItWorksViz() {
  const items = [
    { label: 'Positive cash flow', good: true, icon: '💰' },
    { label: 'LOC rate < debt rate', good: true, icon: '📊' },
    { label: 'Consistent income', good: true, icon: '💼' },
    { label: 'Spending discipline', good: true, icon: '🎯' },
    { label: 'Front-loaded amortized debt', good: true, icon: '🏠' },
    { label: 'Negative cash flow', good: false, icon: '🚫' },
    { label: 'LOC rate much higher', good: false, icon: '📈' },
    { label: 'Uncontrolled spending', good: false, icon: '💸' },
  ];
  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: item.good ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 * i }}
          className={`flex items-center gap-3 p-2 rounded-lg border ${
            item.good
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}
        >
          <span className="text-lg">{item.icon}</span>
          <span className={`text-xs font-medium ${item.good ? 'text-emerald-400' : 'text-red-400'}`}>
            {item.label}
          </span>
          <span className="ml-auto text-sm">{item.good ? '✅' : '❌'}</span>
        </motion.div>
      ))}
    </div>
  );
}

function CommonMistakesViz() {
  const mistakes = [
    { title: 'Over-utilizing LOC', desc: 'Stay under 80% to maintain emergency buffer', icon: '🔴' },
    { title: 'Not tracking expenses', desc: 'Estimated cash flow ≠ real cash flow', icon: '📋' },
    { title: 'Chunks too large', desc: 'Can\'t recover if income dips', icon: '💣' },
    { title: 'Ignoring LOC interest', desc: 'It\'s not free money — every day costs you', icon: '💸' },
    { title: 'LOC as spending money', desc: 'Available credit ≠ available income', icon: '🛍️' },
  ];
  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {mistakes.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 * i }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3"
        >
          <div className="flex items-start gap-2">
            <span className="text-xl">{m.icon}</span>
            <div>
              <p className="text-sm font-semibold text-amber-300">{m.title}</p>
              <p className="text-xs text-gray-400 mt-1">{m.desc}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const visualizations: Record<number, () => React.ReactNode> = {
  1: CashFlowViz,
  2: MoneyLoopViz,
  3: InterestTimingViz,
  4: ChunkStrategyViz,
  5: WhenItWorksViz,
  6: CommonMistakesViz,
};

/* ──────────────────────────────────────────────────────────
   LESSON CARD
   ────────────────────────────────────────────────────────── */

function LessonCard({
  lesson,
  isComplete,
  quizAnswer,
  onToggleComplete,
  onAnswerQuiz,
  classes,
}: {
  lesson: Lesson;
  isComplete: boolean;
  quizAnswer: number | null | undefined;
  onToggleComplete: () => void;
  onAnswerQuiz: (idx: number) => void;
  classes: ReturnType<typeof themeClasses['original'] extends infer T ? () => T : never> extends () => infer R ? R : typeof themeClasses['original'];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const Viz = visualizations[lesson.id];
  const quizCorrect = quizAnswer === lesson.quiz.correctIndex;
  const quizAnswered = quizAnswer !== null && quizAnswer !== undefined;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      className={`${classes.glass} rounded-2xl overflow-hidden`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center gap-4 hover:bg-white/5 transition-colors"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
          isComplete ? 'bg-emerald-500/20 ring-2 ring-emerald-500/40' : 'bg-slate-700/50'
        }`}>
          {isComplete ? '✅' : lesson.icon}
        </div>
        <div className="flex-1 text-left">
          <h3 className={`font-semibold ${classes.text}`}>{lesson.title}</h3>
          <p className={`text-sm ${classes.textSecondary}`}>{lesson.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded-full ${classes.bgTertiary} ${classes.textSecondary}`}>
            {lesson.duration}
          </span>
          <motion.svg
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="w-5 h-5 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className={`px-5 pb-5 border-t ${classes.border}`}>
              {/* Visualization */}
              <div className="my-4 bg-slate-900/50 rounded-xl border border-slate-700/30 overflow-hidden">
                <Viz />
              </div>

              {/* Content */}
              <div className="space-y-3 mb-5">
                {lesson.content.map((p, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 * i }}
                    className={`${classes.textSecondary} text-sm leading-relaxed`}
                  >
                    {p}
                  </motion.p>
                ))}
              </div>

              {/* Key Takeaway */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-emerald-400 mb-1">💡 Key Takeaway</p>
                <p className="text-sm text-emerald-300/90">{lesson.keyTakeaway}</p>
              </div>

              {/* Deep Dive */}
              <div className="mb-4">
                <button
                  onClick={() => setShowDeepDive(!showDeepDive)}
                  className={`flex items-center gap-2 text-sm ${classes.textSecondary} hover:text-white transition-colors`}
                >
                  <span>{showDeepDive ? '▾' : '▸'}</span>
                  <span className="font-medium">Deep Dive</span>
                </button>
                <AnimatePresence>
                  {showDeepDive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className={`mt-2 text-sm ${classes.textSecondary} leading-relaxed bg-slate-800/30 rounded-lg p-3 border border-slate-700/20`}>
                        {lesson.deepDive}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quiz */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-blue-400 mb-2">📝 Quick Check</p>
                <p className="text-sm text-blue-200 mb-3">{lesson.quiz.question}</p>
                <div className="space-y-2">
                  {lesson.quiz.options.map((opt, i) => {
                    const isSelected = quizAnswer === i;
                    const isCorrect = i === lesson.quiz.correctIndex;
                    let style = 'bg-slate-700/30 border-slate-600/30 hover:border-blue-500/40';
                    if (quizAnswered && isSelected && isCorrect) style = 'bg-emerald-500/20 border-emerald-500/40';
                    else if (quizAnswered && isSelected && !isCorrect) style = 'bg-red-500/20 border-red-500/40';
                    else if (quizAnswered && isCorrect) style = 'bg-emerald-500/10 border-emerald-500/20';

                    return (
                      <button
                        key={i}
                        onClick={() => !quizAnswered && onAnswerQuiz(i)}
                        disabled={quizAnswered}
                        className={`w-full text-left text-sm p-2.5 rounded-lg border transition-all ${style} ${
                          quizAnswered ? 'cursor-default' : 'cursor-pointer'
                        }`}
                      >
                        <span className={quizAnswered && isCorrect ? 'text-emerald-300' : classes.textSecondary}>
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {quizAnswered && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-3 text-xs ${quizCorrect ? 'text-emerald-400' : 'text-amber-400'}`}
                  >
                    {quizCorrect ? '✅ Correct! ' : '❌ Not quite. '}
                    {lesson.quiz.explanation}
                  </motion.p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={onToggleComplete}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isComplete
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : `${classes.glassButton}`
                  }`}
                >
                  {isComplete ? '✅ Completed' : '☐ Mark Complete'}
                </button>
                <Link
                  href="/simulator"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
                >
                  📊 Try it in Simulator
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────────────────────── */

export default function LearnPage() {
  const [mounted, setMounted] = useState(false);
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);
  const { theme } = useThemeStore();
  const { completed, quizAnswers, toggleComplete, answerQuiz } = useProgress();

  useEffect(() => { setMounted(true); }, []);

  const classes = themeClasses[mounted ? theme : 'original'];
  const completedCount = completed.size;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className={`text-3xl font-bold ${classes.text} mb-2`}>Learn Center</h1>
        <p className={classes.textSecondary}>Master velocity banking — one concept at a time</p>

        {/* Progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${classes.textSecondary}`}>
              {completedCount} of {lessons.length} modules complete
            </span>
            <span className="text-sm text-emerald-400 font-medium">
              {Math.round((completedCount / lessons.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / lessons.length) * 100}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>
      </motion.header>

      {/* Lessons */}
      <section className="space-y-4 mb-12">
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            isComplete={completed.has(lesson.id)}
            quizAnswer={quizAnswers[lesson.id]}
            onToggleComplete={() => toggleComplete(lesson.id)}
            onAnswerQuiz={(idx) => answerQuiz(lesson.id, idx)}
            classes={classes}
          />
        ))}
      </section>

      {/* Glossary */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mb-12"
      >
        <h2 className={`text-xl font-semibold ${classes.text} mb-4`}>📖 Glossary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {glossary.map((item) => (
            <div
              key={item.term}
              className="relative"
              onMouseEnter={() => setHoveredTerm(item.term)}
              onMouseLeave={() => setHoveredTerm(null)}
            >
              <div className={`${classes.glass} rounded-xl p-3 cursor-pointer hover:border-emerald-500/30 transition-all text-center`}>
                <span className={`text-sm font-medium ${classes.text}`}>{item.term}</span>
              </div>
              <AnimatePresence>
                {hoveredTerm === item.term && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-800 border border-slate-600/50 rounded-xl p-3 shadow-xl pointer-events-none"
                  >
                    <p className="text-sm text-white font-semibold mb-1">{item.term}</p>
                    <p className="text-xs text-gray-400">{item.definition}</p>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-slate-800 border-b border-r border-slate-600/50 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Resources */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mb-12"
      >
        <h2 className={`text-xl font-semibold ${classes.text} mb-2`}>📚 Additional Resources</h2>
        <p className={`${classes.textSecondary} text-sm mb-4`}>
          Educational content supplemented by Investopedia — trusted financial education since 1999.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lessons.map((l) => (
            <a
              key={l.id}
              href={l.investopediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 p-3 ${classes.glassButton} rounded-xl`}
            >
              <span className="text-xl">{l.icon}</span>
              <div>
                <p className={`text-sm font-medium ${classes.text}`}>{l.investopediaLabel}</p>
                <p className={`text-xs ${classes.textSecondary}`}>Investopedia</p>
              </div>
              <svg className="w-4 h-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      </motion.section>

      {/* Footer */}
      <footer className={`text-center text-sm ${classes.textSecondary} pb-8`}>
        Educational tool. Not financial advice. Resources provided by{' '}
        <a href="https://www.investopedia.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
          Investopedia
        </a>.
      </footer>
    </div>
  );
}
