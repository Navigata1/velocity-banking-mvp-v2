'use client';

import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { themeClasses } from '@/stores/theme-store';
import { ConfettiExplosion } from './celebration-canvases';

export interface Quiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: number;
  title: string;
  subtitle: string;
  duration: string;
  icon: string;
  color: string;
  content: string[];
  keyTakeaway: string;
  deepDive: string;
  quiz: Quiz;
  investopediaUrl: string;
  investopediaLabel: string;
  simulatorFocus: string;
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
        <span className="text-xs text-blue-400/70 italic">↻ Model can repeat each pay period</span>
      </motion.div>
    </div>
  );
}

function InterestTimingViz() {
  const withLoop = [
    { day: '1', bal: 1117, pct: 22 },
    { day: '8', bal: 1933, pct: 39 },
    { day: '15', bal: 2750, pct: 55 },
    { day: '22', bal: 3567, pct: 71 },
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
          <p className="text-[10px] text-gray-500 mt-1 text-center">ADB ≈ $2,808</p>
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
        <span className="text-xs text-purple-300">Monthly modeled interest difference: <strong>≈ $18.01</strong> at 10% APR</span>
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
        Sample chunk outcomes depend on rate, timing, LOC cost, and recovery
      </motion.p>
    </div>
  );
}

function WhenItWorksViz() {
  const items = [
    { label: 'Positive cash flow', good: true, icon: '💰' },
    { label: 'LOC rate < debt rate', good: true, icon: '📊' },
    { label: 'Consistent income', good: true, icon: '💼' },
    { label: 'Spending control', good: true, icon: '🎯' },
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
    { title: 'Ignoring LOC interest', desc: 'LOC interest accrues daily in the model', icon: '💸' },
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

const visualizations: Record<number, () => ReactNode> = {
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

export function LessonCard({
  lesson,
  isComplete,
  quizAnswer,
  onToggleComplete,
  onAnswerQuiz,
  classes,
  justCompleted,
  index,
  isLast,
  forceExpand,
  cardRef,
  expanded,
  onToggleExpand,
}: {
  lesson: Lesson;
  isComplete: boolean;
  quizAnswer: number | null | undefined;
  onToggleComplete: () => void;
  onAnswerQuiz: (idx: number) => void;
  classes: ReturnType<typeof themeClasses['original'] extends infer T ? () => T : never> extends () => infer R ? R : typeof themeClasses['original'];
  justCompleted: boolean;
  index: number;
  isLast: boolean;
  forceExpand?: boolean;
  cardRef?: Ref<HTMLDivElement>;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [confetti, setConfetti] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const Viz = visualizations[lesson.id];

  // Force expand from query param
  useEffect(() => {
    if (forceExpand && !expanded) onToggleExpand();
  }, [forceExpand]); // eslint-disable-line react-hooks/exhaustive-deps
  const quizCorrect = quizAnswer === lesson.quiz.correctIndex;
  const quizAnswered = quizAnswer !== null && quizAnswer !== undefined;

  const handleComplete = () => {
    if (!isComplete && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setConfetti({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setTimeout(() => setConfetti(null), 2500);
    }
    onToggleComplete();
  };

  return (
    <div className="relative" ref={cardRef}>
      {/* Learning path connector line */}
      {!isLast && (
        <div className="absolute left-6 top-[4.5rem] bottom-0 w-px z-0">
          <div className={`w-full h-full ${isComplete ? 'bg-emerald-500/40' : 'border-l border-dashed border-slate-600/40'}`} />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
        className={`relative z-10 rounded-2xl overflow-hidden transition-all duration-500 ${classes.glass} ${
          isComplete
            ? 'border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
            : ''
        } ${justCompleted ? 'animate-[glow-pulse_0.6s_ease-out]' : ''}`}
        style={isComplete ? { borderColor: 'rgba(16,185,129,0.3)' } : undefined}
      >
        {/* Header */}
        <button
          onClick={onToggleExpand}
          className="w-full p-5 flex items-center gap-4 hover:bg-white/5 transition-colors"
        >
          {/* Module number / checkmark */}
          <motion.div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl relative ${
              isComplete ? 'bg-emerald-500/20 ring-2 ring-emerald-500/40' : 'bg-slate-700/50'
            }`}
            animate={justCompleted ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.4 }}
          >
            {isComplete ? (
              <motion.span
                initial={justCompleted ? { scale: 0, rotate: -180 } : {}}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                ✓
              </motion.span>
            ) : (
              <span className="text-base font-bold text-slate-400">{index + 1}</span>
            )}
          </motion.div>
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
                  <motion.button
                    ref={btnRef}
                    onClick={handleComplete}
                    whileTap={{ scale: 0.95 }}
                    animate={justCompleted ? {
                      boxShadow: [
                        '0 0 0 rgba(16,185,129,0)',
                        '0 0 20px rgba(16,185,129,0.5)',
                        '0 0 0 rgba(16,185,129,0)',
                      ],
                    } : {}}
                    transition={{ duration: 0.6 }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isComplete
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : `${classes.glassButton}`
                    }`}
                  >
                    {isComplete ? '✅ Completed' : '☐ Mark Complete'}
                  </motion.button>
                  <Link
                    href={`/simulator?focus=${lesson.simulatorFocus}`}
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

      {/* Confetti on complete */}
      {confetti && (
        <ConfettiExplosion
          originX={confetti.x}
          originY={confetti.y}
          count={35}
          duration={2000}
          onDone={() => setConfetti(null)}
        />
      )}
    </div>
  );
}

