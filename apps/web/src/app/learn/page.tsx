'use client';

import { useState } from 'react';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  content: string;
}

interface GlossaryItem {
  term: string;
  definition: string;
}

const lessons: Lesson[] = [
  {
    id: '1',
    title: 'What is Cash Flow?',
    duration: '2 min',
    content: 'Cash flow is the difference between your income and expenses. Positive cash flow means you have money left over each month. This is the engine that powers velocity banking.',
  },
  {
    id: '2',
    title: 'The Money Loop Explained',
    duration: '3 min',
    content: 'Income deposits into a Line of Credit first, reducing the balance. Expenses are paid strategically. The difference (cash flow) accelerates debt payoff.',
  },
  {
    id: '3',
    title: 'Why Interest Timing Matters',
    duration: '2 min',
    content: 'Interest is calculated on your average daily balance. By parking income in your LOC, you reduce that average, lowering total interest paid.',
  },
  {
    id: '4',
    title: 'The Chunk Strategy',
    duration: '2 min',
    content: 'A chunk is a lump-sum payment from your LOC to your primary debt. It immediately reduces principal, which reduces future interest.',
  },
  {
    id: '5',
    title: 'When Velocity Banking Works Best',
    duration: '3 min',
    content: 'This strategy works best when you have: 1) Positive cash flow, 2) Access to a LOC or HELOC, 3) Debts with higher interest than your LOC.',
  },
  {
    id: '6',
    title: 'Common Mistakes to Avoid',
    duration: '3 min',
    content: 'Avoid: 1) Starting without positive cash flow, 2) Over-utilizing your LOC (stay under 80%), 3) Not tracking expenses carefully.',
  },
];

const glossary: GlossaryItem[] = [
  { term: 'Principal', definition: 'The original amount borrowed, not including interest.' },
  { term: 'Interest', definition: 'The cost of borrowing money, usually expressed as an annual percentage rate (APR).' },
  { term: 'Cash Flow', definition: 'Money coming in (income) minus money going out (expenses). Positive cash flow is essential for velocity banking.' },
  { term: 'Amortization', definition: 'A payment schedule where each payment covers interest first, then principal. Early payments are mostly interest.' },
  { term: 'LOC/HELOC', definition: 'Line of Credit / Home Equity Line of Credit. A flexible borrowing account where you only pay interest on what you use.' },
  { term: 'Average Daily Balance', definition: 'The average balance in your account over a billing period. Used to calculate interest on LOCs.' },
];

export default function LearnPage() {
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [activeGlossary, setActiveGlossary] = useState<string | null>(null);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Learn</h1>
        <p className="text-gray-400">Understand velocity banking step by step</p>
      </header>

      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-6 border border-blue-500/30 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-blue-500/30 flex items-center justify-center">
            <span className="text-3xl">🎬</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Debt Escape: The Money Loop</h2>
            <p className="text-gray-400">First Run Video - Coming Soon</p>
            <p className="text-sm text-blue-400 mt-1">Animated explainer series</p>
          </div>
        </div>
      </div>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Micro-Lessons</h2>
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <button
                onClick={() => setActiveLesson(activeLesson === lesson.id ? null : lesson.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                    {lesson.id}
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-white">{lesson.title}</h3>
                    <p className="text-sm text-gray-500">{lesson.duration}</p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${activeLesson === lesson.id ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {activeLesson === lesson.id && (
                <div className="p-4 pt-0 border-t border-slate-700">
                  <p className="text-gray-300 leading-relaxed">{lesson.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Glossary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {glossary.map((item) => (
            <div
              key={item.term}
              className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
            >
              <button
                onClick={() => setActiveGlossary(activeGlossary === item.term ? null : item.term)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
              >
                <span className="font-medium text-white">{item.term}</span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${activeGlossary === item.term ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {activeGlossary === item.term && (
                <div className="p-4 pt-0 border-t border-slate-700">
                  <p className="text-gray-300">{item.definition}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-12 text-center text-sm text-gray-500">
        Educational tool. Not financial advice.
      </footer>
    </div>
  );
}
