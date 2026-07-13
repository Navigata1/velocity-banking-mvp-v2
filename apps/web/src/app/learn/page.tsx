'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import { useSearchParams } from 'next/navigation';
import PageTransition from '@/components/PageTransition';
import { useIsClient } from '@/hooks/useIsClient';
import { AnimatedCounter } from './animated-counter';
import { ConfettiExplosion, GrandFinale } from './celebration-canvases';
import { LessonCard, type Lesson } from './lesson-card';
import { parseTargetModule, useLearnProgress } from './use-learn-progress';

/* ──────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────── */

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
    simulatorFocus: 'cashflow',
    content: [
      'Cash flow is simply your income minus your expenses each month. If you earn $5,000 and spend $4,800, your cash flow is $200. That number, however small, is the fuel the model uses to test whether a LOC-based payoff plan can recover safely.',
      'A small surplus is not a guarantee, but it can change a modeled payoff timeline when the debt rate, LOC cost, fees, timing, and spending control line up. Velocity banking does more than model extra payments: it changes when balances are reduced and how much interest-bearing balance remains.',
      'The "Cash Flow Multiplier" effect is where the model can show momentum. As debts are paid off, minimum payments that are no longer required can become available cash flow. Pay off a $300/month car payment? The modeled cash flow can move from $200 to $500 when that payment truly disappears from the budget. Each debt eliminated can feed the next cycle faster when the freed-up cash flow is preserved.',
      'Think of cash flow as water pressure in a hose. More pressure gives the model more room to work. A smaller surplus can still be modeled, but it takes more cycles and may keep LOC moves in review mode until the recovery path is stable.',
    ],
    keyTakeaway: 'Positive cash flow is the first gate. Know your exact monthly surplus. A $200/month surplus may help in the velocity banking cycle, but the payoff impact depends on your actual inputs.',
    deepDive: 'To calculate your true cash flow: add up every recurring income source (net pay, side income, dividends). Then subtract every expense — fixed (rent, insurance, subscriptions) and variable (groceries, gas, entertainment). Review recent statements or spending records so the number is grounded. The number you get is your "velocity fuel." If it\'s negative, keep a LOC-based payoff plan in learning mode while you work on expense reduction or income increase.',
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
    simulatorFocus: 'loc',
    content: [
      'The Money Loop is the core cycle this app models for velocity banking: income is routed into a Line of Credit (LOC) when real account terms support that setup, reducing the balance before planned expenses draw back out. At the end of the month, the modeled LOC balance drops by the cash-flow amount when income is greater than expenses, while the average daily balance may stay lower during the month.',
      'Here\'s the step-by-step model: Say your LOC balance is $5,000. On the 1st, $4,000 of income enters the LOC — balance drops to $1,000. Over 30 days, $3,500 of planned expenses draws out evenly. End-of-month balance: $4,500 (down $500 — your cash flow). The important part: the modeled average daily balance was roughly $2,800 instead of $5,000 because the income reduced the LOC balance for days before expenses cleared.',
      'Why does the average daily balance matter? Because LOCs charge interest on the average daily balance, not the ending balance. A traditional bank account separates your income from your debt — money sits in checking while your LOC accrues interest on the full balance. The Money Loop narrows that timing gap.',
      'This is the core mechanic of velocity banking in the model: the same planned dollars can temporarily reduce interest-bearing balance and still cover planned bills when timing, terms, and cash flow line up. The cycle can repeat each pay period as an interest-management loop powered by income flow.',
    ],
    keyTakeaway: 'When real account terms support it, the Money Loop models income entering the LOC and planned expenses leaving it so the average daily balance can fall before bills clear.',
    deepDive: 'The efficiency of the Money Loop depends on how your expenses are distributed throughout the month. If all expenses hit on day 1, the ADB benefit is minimal. If expenses trickle out evenly (which is typical — rent on the 1st, utilities mid-month, groceries weekly), the ADB stays low for longer. Some advanced practitioners even time bill payments to maximize the ADB reduction effect, though this is an optimization that adds complexity.',
    quiz: {
      question: 'In the Money Loop, why can modeled income-to-LOC routing reduce LOC interest?',
      options: [
        'Because the LOC has a lower interest rate than your mortgage',
        'Because it reduces the average daily balance the LOC charges interest on',
        'Because the bank gives you a bonus for direct deposits',
        'Because you earn interest on the deposited money',
      ],
      correctIndex: 1,
      explanation: 'LOCs may charge interest based on average daily balance. Income-to-LOC routing can lower the modeled average when expense timing, fees, and repayment rules support the plan.',
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
    simulatorFocus: 'results',
    content: [
      'Understanding interest timing is what separates velocity banking modeling from simple "pay extra on your mortgage" advice. There are two fundamentally different ways lenders calculate interest: amortized (your mortgage) and average daily balance (your LOC). The strategy tests whether that timing difference helps under the entered assumptions.',
      'Amortized debt (mortgages, auto loans) calculates interest on the scheduled principal balance at each payment. Your mortgage doesn\'t care if you had $10,000 sitting in your checking account all month — it charges the same interest. The balance only changes when your monthly payment is applied. Early in a mortgage, 70-80% of each payment goes to interest.',
      'LOC interest works on average daily balance (ADB). Let\'s do the math: You have a $5,000 LOC balance at 10% APR. If income of $4,000 enters the LOC on day 1 and $3,500 in expenses draws out evenly over 30 days, this app samples daily closing balances: day 1 closes near $1,117 after that day\'s expense draw, and day 30 closes at $4,500. The modeled ADB across the month is roughly $2,808 — meaning the LOC interest is estimated on about $2,808 instead of $5,000. That\'s about a 44% reduction in the modeled interest-bearing balance.',
      'Compare this to the alternative: income goes to checking, LOC stays at $5,000 all month, and you pay interest on the full $5,000. Same money, same expenses, but different modeled interest charges. This timing advantage is what the Money Loop tries to use when the LOC cost and cash-flow timing are favorable.',
      'The monthly interest difference might seem small (about $18 in this example at 10% APR), but repeated timing differences can matter when the assumptions hold. Over years of cycling, the model can show cumulative interest differences and LOC recovery room for tested chunks against the primary debt.',
    ],
    keyTakeaway: 'Amortized debt charges interest on scheduled balance regardless of your cash position. LOC charges on average daily balance. Modeled income-to-LOC routing can reduce the average and lower interest when the LOC cost and timing work in your favor.',
    deepDive: 'Detailed ADB math using the app engine convention: Starting balance $5,000. Day 1: deposit $4,000, then the first daily expense draw closes the day near $1,117. Daily expenses: $3,500 ÷ 30 = $116.67/day. Day 15: $1,000 + (15 × $116.67) = $2,750. Day 30: $4,500. Sum of daily closing balances ≈ $84,250. ADB = $84,250 ÷ 30 = $2,808. Monthly interest at 10% APR with daily accrual = $2,808 × (0.10 ÷ 365) × 30 = $23.08. Without the loop (flat $5,000): $5,000 × (0.10 ÷ 365) × 30 = $41.10. Monthly modeled interest difference: about $18.01. Annualized teaching example: about $216. Over 5 years of cycling: about $1,081 in modeled interest difference — just from the timing of your deposits.',
    quiz: {
      question: 'If your LOC has a $5,000 balance and you deposit $4,000 income on day 1, what approximately is your average daily balance for the month?',
      options: [
        '$5,000 — the deposit doesn\'t matter',
        '$1,000 — that\'s what it dropped to',
        '~$2,808 — average of the daily closing balances as expenses draw back out',
        '$4,500 — the ending balance',
      ],
      correctIndex: 2,
      explanation: 'The ADB is the average of every day\'s balance. With daily closing-balance sampling, it starts near $1,117 after the first expense draw, then gradually rises as expenses are drawn. The average across 30 days is approximately $2,808.',
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
    simulatorFocus: 'chunk',
    content: [
      'While the Money Loop handles the LOC efficiently, the Chunk Strategy is where principal reduction becomes visible. A "chunk" is a large lump-sum payment from your LOC directly to your primary amortized debt\'s principal. Treat it as a planning move that needs enough cash flow to recover the LOC safely.',
      'Here\'s how it works in the model: as income and planned expenses cycle through the Money Loop, positive cash flow can gradually pay down the LOC. When the LOC balance drops enough to leave meaningful headroom, the plan can test a chunk. For example, if a $15,000 LOC has been paid down to $5,000 through income cycling, the model has $10,000 of available credit to evaluate. A planner might test an $8,000 chunk to mortgage principal only if the recovery path and buffer still look healthy.',
      'The impact of a chunk on amortized debt depends on timing and rate. In one sample $200,000 mortgage at 6% interest, a $3,000 chunk payment in year 3 is modeled to reduce lifetime interest by approximately $6,400 and remove roughly 4 months from the end of the term. Why? Because every modeled dollar of principal reduction means less interest is calculated at the next payment — and that timing difference can extend across the remaining 27 years.',
      'The cycle can repeat in the model: after the chunk, the LOC balance is back up ($13,000 in our example). The Money Loop begins paying it down again with positive cash flow. When there is enough room, the plan can evaluate another chunk. Each cycle can improve the timeline when the chunk size, LOC recovery time, and interest spread remain healthy.',
    ],
    keyTakeaway: 'Chunks are large lump-sum payments toward principal using LOC credit. A sample $3,000 chunk may save more than the chunk amount in interest, but only when the debt rate, LOC cost, timing, and recovery plan support it.',
    deepDive: 'Chunk sizing is a recovery-window test. A modeled chunk needs enough LOC capacity for emergencies and enough cash flow to recover the LOC without crowding bills. If monthly cash flow is $500, a $5,000 chunk takes about 10 months to recover before interest and fees. A $12,000 chunk at the same cash flow takes about 24 months, which can leave less room for emergencies. Compare chunk sizes by recovery time, LOC headroom, fees, and cash-flow stability before trusting the plan.',
    quiz: {
      question: 'Why does a $3,000 principal chunk on a 30-year mortgage save more than $3,000 in interest?',
      options: [
        'Because the bank rewards large payments',
        'Because reducing principal means less interest accrues for the remaining years, and that compounds',
        'Because the interest rate drops when you make extra payments',
        'It doesn\'t — you only save exactly $3,000',
      ],
      correctIndex: 1,
      explanation: 'When principal is reduced, future payments can have less interest to cover and more going to principal. That can create interest differences beyond the chunk amount when rate, timing, and recovery assumptions support it.',
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
    simulatorFocus: 'overview',
    content: [
      'Velocity banking is a math model, not a promise. The math works best under specific conditions. Understanding these conditions helps you set realistic expectations and avoid frustration. The single most important factor is positive cash flow. Without it, keep LOC-based payoff moves in review mode.',
      'Useful conditions include: a LOC interest rate lower than your primary debt rate, consistent and predictable income, front-loaded amortized debt where early payments are interest-heavy, and spending control as credit becomes available.',
      'If your LOC rate is close to or higher than the debt rate, do not assume the strategy works. The ADB benefit, chunk timing, fees, recovery window, and cash-flow stability all need to be modeled together before trusting the spread.',
      'Pause and review when cash flow is negative, when LOC cost is meaningfully higher than the debt rate with low cash flow, when spending control is not stable yet, or when the debt is already near the end of its amortization schedule.',
    ],
    keyTakeaway: 'Velocity banking models best with positive cash flow, a LOC rate lower than the target debt rate, front-loaded amortized debt, and spending control. Positive cash flow and stable spending control are required before payoff claims are trustworthy.',
    deepDive: 'Rate comparison nuance: A 10% LOC vs 6% mortgage might seem like a losing proposition. But remember — you\'re paying 10% on the average daily balance, and chunks may hit principal on a front-loaded amortization where early payments are interest-heavy. Run the numbers in the simulator with your actual rates, cash flow, fees, and payoff timing before assuming the spread works in your situation.',
    quiz: {
      question: 'Which of the following would make velocity banking LEAST effective?',
      options: [
        'Having a 10% LOC rate when your mortgage is 6%',
        'Having negative cash flow (spending more than you earn)',
        'Being in year 2 of a 30-year mortgage',
        'Having $300/month cash flow instead of $1,000',
      ],
      correctIndex: 1,
      explanation: 'Negative cash flow means the LOC balance can grow instead of shrinking. Keep the Money Loop in review mode until positive cash flow can support payoff progress.',
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
    simulatorFocus: 'loc',
    content: [
      'A common LOC mistake is using too much of the available line at once. If utilization moves above 80%, the plan has less emergency room and may affect credit. Keep at least 20% available credit as a planning buffer before making another chunk.',
      'Not tracking expenses accurately can make the plan look stronger than it is. Velocity banking math assumes your cash flow is real and consistent. If estimated $500/month cash flow is actually $200 after subscriptions and unplanned spending, chunks take 2.5x longer to recover and LOC interest can erase the modeled difference. Track spending long enough to trust the surplus before modeling chunks.',
      'Large chunks can feel encouraging because the mortgage balance falls quickly. The tradeoff is recovery risk: if income dips or an emergency hits before LOC recovery, the plan can strain cash flow. Size chunks to leave 20% LOC headroom and a recovery window you can sustain.',
      'Two more checks: include LOC interest in the plan, and avoid treating LOC credit as spendable income. The LOC is a planning tool for a modeled debt strategy, not extra monthly income.',
    ],
    keyTakeaway: 'Keep LOC utilization under 80%, track expenses, size chunks conservatively, include LOC interest, and avoid treating LOC credit as spendable income.',
    deepDive: 'Planning example: a household has $500/month cash flow, a $15,000 LOC, and deploys a $12,000 chunk (80% utilization). Two months later, the car needs $2,000 in repairs. The LOC is at $11,000 (only recovered $1,000). The household has $4,000 available but needs it for emergencies, so a credit card at 24% APR enters the picture. Now LOC interest and credit card interest both pressure cash flow. If the household had chunked $8,000 instead, it would have had $8,000 available and handled the emergency more easily.',
    quiz: {
      question: 'What is the recommended maximum LOC utilization for velocity banking?',
      options: [
        '100% — use every dollar available',
        '90% — leave a small buffer',
        '80% — maintain 20% emergency headroom',
        '50% — only use half your LOC',
      ],
      correctIndex: 2,
      explanation: 'Keeping utilization under 80% helps preserve emergency capacity and keeps the plan from depending on every available dollar of credit.',
    },
    investopediaUrl: 'https://www.investopedia.com/articles/pf/12/good-debt-bad-debt.asp',
    investopediaLabel: 'Good vs Bad Debt — Investopedia',
  },
];

const glossary: GlossaryItem[] = [
  { term: 'Principal', definition: 'The original amount borrowed, not including interest. In velocity banking, reducing principal through chunks is the primary goal.', url: 'https://www.investopedia.com/terms/p/principal.asp' },
  { term: 'Interest', definition: 'The cost of borrowing money, expressed as APR. Different debt types calculate interest differently — this difference is key to velocity banking.', url: 'https://www.investopedia.com/terms/i/interest.asp' },
  { term: 'Cash Flow', definition: 'Monthly income minus expenses. The "fuel" for velocity banking. Must be positive for the strategy to work.', url: 'https://www.investopedia.com/terms/c/cashflow.asp' },
  { term: 'Amortization', definition: 'A payment schedule where early payments are mostly interest. Velocity banking compares whether earlier principal reduction can improve the payoff path.', url: 'https://www.investopedia.com/terms/a/amortization.asp' },
  { term: 'LOC / HELOC', definition: 'Line of Credit / Home Equity Line of Credit. The vehicle for the Money Loop — charges interest on average daily balance, not the fixed balance.', url: 'https://www.investopedia.com/mortgage/heloc/' },
  { term: 'Average Daily Balance', definition: 'The average of your account balance across each day of the billing period. LOCs use this to calculate interest — the core of why velocity banking works.', url: 'https://www.investopedia.com/terms/a/averagedailybalance.asp' },
  { term: 'Chunk', definition: 'A large lump-sum payment from your LOC to your primary debt\'s principal. It needs enough cash flow to recover the LOC safely.', url: '#' },
  { term: 'Money Loop', definition: 'The cycle of depositing income into LOC and paying expenses from it, aiming to lower the average daily balance when the timing and LOC terms are favorable.', url: '#' },
];

/* ──────────────────────────────────────────────────────────
   PROGRESS STORE (localStorage)
   ────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────
   MAIN PAGE
   ────────────────────────────────────────────────────────── */

function LearnPageInner() {
  const mounted = useIsClient();
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);
  const { theme } = useThemeStore();
  const { completed, quizAnswers, toggleComplete, answerQuiz, justCompleted, milestone, clearMilestone } = useLearnProgress(lessons.length);
  const searchParams = useSearchParams();
  const targetModule = parseTargetModule(searchParams.get('module'), lessons.length);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(targetModule);
  const lessonRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Handle ?module=X query param
  useEffect(() => {
    if (targetModule) {
      const timeout = setTimeout(() => {
        const el = lessonRefs.current[targetModule];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [targetModule]);

  const classes = themeClasses[mounted ? theme : 'original'];
  const completedCount = completed.size;
  const allComplete = completedCount === lessons.length;
  const pct = Math.round((completedCount / lessons.length) * 100);

  return (
    <PageTransition>
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Milestone celebrations */}
      {milestone === 'half' && (
        <ConfettiExplosion
          originX={typeof window !== 'undefined' ? window.innerWidth / 2 : 400}
          originY={120}
          count={60}
          duration={2500}
          spread={1.5}
          onDone={clearMilestone}
        />
      )}
      {milestone === 'full' && (
        <GrandFinale onDone={clearMilestone} />
      )}

      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className={`text-3xl font-bold ${classes.text} mb-2`}>Learn Center</h1>
        <p className={classes.textSecondary}>Master velocity banking — one concept at a time</p>

        {/* Progress — achievement tracker style */}
        <motion.div
          className={`mt-5 p-4 rounded-2xl transition-all duration-700 ${
            allComplete
              ? 'bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.15)]'
              : milestone === 'half'
              ? 'bg-emerald-500/5 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
              : ''
          }`}
          animate={milestone === 'half' ? {
            boxShadow: [
              '0 0 0px rgba(16,185,129,0)',
              '0 0 25px rgba(16,185,129,0.3)',
              '0 0 0px rgba(16,185,129,0)',
            ],
          } : {}}
          transition={{ duration: 1.5 }}
        >
          <div className="flex items-center justify-between mb-2">
            {allComplete ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-sm font-semibold text-yellow-400"
                style={{ animation: 'glow-text 2s ease-in-out infinite' }}
              >
                🎉 All Modules Complete! You&apos;re a Velocity Banking Expert!
              </motion.span>
            ) : (
              <span className={`text-sm ${classes.textSecondary}`}>
                <AnimatedCounter value={completedCount} className="font-bold text-emerald-400" /> of {lessons.length} modules complete
              </span>
            )}
            <motion.span
              className={`text-sm font-medium ${allComplete ? 'text-yellow-400' : 'text-emerald-400'}`}
              key={pct}
              initial={{ scale: 1.4, color: '#4ade80' }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {pct}%
            </motion.span>
          </div>
          <div className={`h-3 rounded-full overflow-hidden ${allComplete ? 'bg-yellow-900/30' : 'bg-slate-700/50'}`}>
            <motion.div
              className={`h-full rounded-full relative ${
                allComplete
                  ? 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              {/* Sparkle shimmer on progress bar */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
              />
            </motion.div>
          </div>

          {/* Module checkpoint dots */}
          <div className="flex justify-between mt-2 px-1">
            {lessons.map((l, i) => (
              <motion.div
                key={l.id}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${
                  completed.has(l.id)
                    ? 'bg-emerald-500 text-white shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                    : 'bg-slate-700/60 text-slate-500'
                }`}
                animate={justCompleted === l.id ? { scale: [1, 1.5, 1] } : {}}
                transition={{ duration: 0.4 }}
              >
                {completed.has(l.id) ? '✓' : i + 1}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.header>

      {/* Lessons */}
      <section className="space-y-4 mb-12 relative">
        {lessons.map((lesson, i) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            isComplete={completed.has(lesson.id)}
            quizAnswer={quizAnswers[lesson.id]}
            onToggleComplete={() => toggleComplete(lesson.id)}
            onAnswerQuiz={(idx) => answerQuiz(lesson.id, idx)}
            classes={classes}
            justCompleted={justCompleted === lesson.id}
            index={i}
            isLast={i === lessons.length - 1}
            forceExpand={targetModule === lesson.id}
            expanded={expandedLesson === lesson.id}
            onToggleExpand={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
            cardRef={(el: HTMLDivElement | null) => { lessonRefs.current[lesson.id] = el; }}
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

      {/* Global CSS for glow animations */}
      <style jsx global>{`
        @keyframes glow-pulse {
          0% { box-shadow: 0 0 0 rgba(16,185,129,0); }
          50% { box-shadow: 0 0 25px rgba(16,185,129,0.4); }
          100% { box-shadow: 0 0 0 rgba(16,185,129,0); }
        }
        @keyframes glow-text {
          0%, 100% { text-shadow: 0 0 10px rgba(234,179,8,0.3); }
          50% { text-shadow: 0 0 20px rgba(234,179,8,0.6), 0 0 40px rgba(234,179,8,0.3); }
        }
      `}</style>
    </div>
    </PageTransition>
  );
}

export default function LearnPage() {
  return (
    <Suspense>
      <LearnPageInner />
    </Suspense>
  );
}
