'use client';

import { useState } from 'react';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  content: string;
  learnMoreUrl: string;
  learnMoreLabel: string;
}

interface GlossaryItem {
  term: string;
  definition: string;
  learnMoreUrl: string;
}

const lessons: Lesson[] = [
  {
    id: '1',
    title: 'What is Cash Flow?',
    duration: '2 min',
    content: 'Cash flow is the difference between your income and expenses. Positive cash flow means you have money left over each month. This is the engine that powers velocity banking.',
    learnMoreUrl: 'https://www.investopedia.com/terms/c/cashflow.asp',
    learnMoreLabel: 'Cash Flow Definition',
  },
  {
    id: '2',
    title: 'The Money Loop Explained',
    duration: '3 min',
    content: 'Income deposits into a Line of Credit first, reducing the balance. Expenses are paid strategically. The difference (cash flow) accelerates debt payoff.',
    learnMoreUrl: 'https://www.investopedia.com/terms/l/lineofcredit.asp',
    learnMoreLabel: 'Line of Credit Explained',
  },
  {
    id: '3',
    title: 'Why Interest Timing Matters',
    duration: '2 min',
    content: 'Interest is calculated on your average daily balance. By parking income in your LOC, you reduce that average, lowering total interest paid.',
    learnMoreUrl: 'https://www.investopedia.com/terms/a/averagedailybalance.asp',
    learnMoreLabel: 'Average Daily Balance',
  },
  {
    id: '4',
    title: 'The Chunk Strategy',
    duration: '2 min',
    content: 'A chunk is a lump-sum payment from your LOC to your primary debt. It immediately reduces principal, which reduces future interest.',
    learnMoreUrl: 'https://www.investopedia.com/terms/p/principal.asp',
    learnMoreLabel: 'Principal vs Interest',
  },
  {
    id: '5',
    title: 'When Velocity Banking Works Best',
    duration: '3 min',
    content: 'This strategy works best when you have: 1) Positive cash flow, 2) Access to a LOC or HELOC, 3) Debts with higher interest than your LOC.',
    learnMoreUrl: 'https://www.investopedia.com/mortgage/heloc/',
    learnMoreLabel: 'HELOC Guide',
  },
  {
    id: '6',
    title: 'Common Mistakes to Avoid',
    duration: '3 min',
    content: 'Avoid: 1) Starting without positive cash flow, 2) Over-utilizing your LOC (stay under 80%), 3) Not tracking expenses carefully.',
    learnMoreUrl: 'https://www.investopedia.com/articles/pf/12/good-debt-bad-debt.asp',
    learnMoreLabel: 'Good vs Bad Debt',
  },
];

const glossary: GlossaryItem[] = [
  { term: 'Principal', definition: 'The original amount borrowed, not including interest.', learnMoreUrl: 'https://www.investopedia.com/terms/p/principal.asp' },
  { term: 'Interest', definition: 'The cost of borrowing money, usually expressed as an annual percentage rate (APR).', learnMoreUrl: 'https://www.investopedia.com/terms/i/interest.asp' },
  { term: 'Cash Flow', definition: 'Money coming in (income) minus money going out (expenses). Positive cash flow is essential for velocity banking.', learnMoreUrl: 'https://www.investopedia.com/terms/c/cashflow.asp' },
  { term: 'Amortization', definition: 'A payment schedule where each payment covers interest first, then principal. Early payments are mostly interest.', learnMoreUrl: 'https://www.investopedia.com/terms/a/amortization.asp' },
  { term: 'LOC/HELOC', definition: 'Line of Credit / Home Equity Line of Credit. A flexible borrowing account where you only pay interest on what you use.', learnMoreUrl: 'https://www.investopedia.com/mortgage/heloc/' },
  { term: 'Average Daily Balance', definition: 'The average balance in your account over a billing period. Used to calculate interest on LOCs.', learnMoreUrl: 'https://www.investopedia.com/terms/a/averagedailybalance.asp' },
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
                  <p className="text-gray-300 leading-relaxed mb-3">{lesson.content}</p>
                  <a 
                    href={lesson.learnMoreUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <span>Learn more: {lesson.learnMoreLabel}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
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
                  <p className="text-gray-300 mb-2">{item.definition}</p>
                  <a 
                    href={item.learnMoreUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>Investopedia</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Additional Resources</h2>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <p className="text-gray-400 mb-4">
            All educational content in this app is supplemented by articles from Investopedia, 
            a trusted source for financial education since 1999.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a 
              href="https://www.investopedia.com/terms/d/debtmanagement.asp" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <span className="text-2xl">📚</span>
              <div>
                <p className="text-white font-medium">Debt Management Guide</p>
                <p className="text-xs text-gray-400">Investopedia</p>
              </div>
            </a>
            <a 
              href="https://www.investopedia.com/mortgage/heloc/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <span className="text-2xl">🏠</span>
              <div>
                <p className="text-white font-medium">HELOC Complete Guide</p>
                <p className="text-xs text-gray-400">Investopedia</p>
              </div>
            </a>
            <a 
              href="https://www.investopedia.com/terms/i/interestrate.asp" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <span className="text-2xl">📈</span>
              <div>
                <p className="text-white font-medium">Understanding Interest Rates</p>
                <p className="text-xs text-gray-400">Investopedia</p>
              </div>
            </a>
            <a 
              href="https://www.investopedia.com/articles/pf/12/good-debt-bad-debt.asp" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <span className="text-2xl">⚖️</span>
              <div>
                <p className="text-white font-medium">Good Debt vs Bad Debt</p>
                <p className="text-xs text-gray-400">Investopedia</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      <footer className="mt-12 text-center text-sm text-gray-500">
        Educational tool. Not financial advice. Resources provided by{' '}
        <a href="https://www.investopedia.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
          Investopedia
        </a>.
      </footer>
    </div>
  );
}
