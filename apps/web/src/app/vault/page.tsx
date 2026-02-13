'use client';

import { useState, useEffect, useMemo } from 'react';
import { EditableCurrency, EditableNumber, EditablePercentage } from '@/components/EditableNumber';
import { useFinancialStore } from '@/stores/financial-store';
import { useThemeStore, themeClasses } from '@/stores/theme-store';
import ScrollReveal from '@/components/ScrollReveal';
import PageTransition from '@/components/PageTransition';

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

const calculateFutureValue = (presentValue: number, annualRate: number, years: number) => {
  return presentValue * Math.pow(1 + annualRate, years);
};

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
}

function AnimatedNumber({ value, duration = 2000, prefix = "$" }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(value * easeOut));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);
  
  return <span>{prefix}{displayValue.toLocaleString()}</span>;
}

interface ProgressBarProps {
  progress: number;
  color?: 'green' | 'red' | 'gold' | 'blue';
}

function ProgressBar({ progress, color = 'green' }: ProgressBarProps) {
  const colors = {
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    gold: 'bg-amber-500',
    blue: 'bg-blue-500'
  };
  
  return (
    <div className="w-full bg-gray-400/30 rounded-full h-3 overflow-hidden">
      <div 
        className={`h-full ${colors[color]} transition-all duration-1000 ease-out rounded-full`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}

export default function VaultPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [investmentRate, setInvestmentRate] = useState(0.07);
  const store = useFinancialStore();
  const { theme } = useThemeStore();
  const classes = themeClasses[mounted ? theme : 'original'];

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculations = useMemo(() => {
    const debt = store.debts.house;
    const rate = debt.interestRate;
    const yearsRemaining = Math.ceil(debt.termMonths / 12);
    const age = store.currentAge;
    
    const monthlyRate = rate / 12;
    const numPayments = yearsRemaining * 12;
    const monthlyPayment = debt.balance * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    const totalPaid = monthlyPayment * numPayments;
    const totalInterest = totalPaid - debt.balance;
    
    const traditional = { monthlyPayment, totalPaid, totalInterest };
    
    const velocityYears = Math.min(7, yearsRemaining);
    const velocityInterest = debt.balance * rate * velocityYears * 0.4;
    const futureValueOfInterest = calculateFutureValue(totalInterest, investmentRate, yearsRemaining);
    
    const parentsMortgageInterest = totalInterest * 0.73;
    const childMortgageInterest = totalInterest * 1.56;
    const totalGenerational = parentsMortgageInterest + totalInterest + childMortgageInterest;
    const generationalFutureValue = calculateFutureValue(totalGenerational, investmentRate, 50);
    
    const moneySaved = totalInterest - velocityInterest;
    const yearsOfInvesting = yearsRemaining - velocityYears;
    
    let investmentGrowth = 0;
    for (let i = 0; i < yearsOfInvesting * 12; i++) {
      investmentGrowth = (investmentGrowth + monthlyPayment) * (1 + investmentRate / 12);
    }
    
    return {
      traditional,
      velocityInterest,
      moneySaved,
      futureValueOfInterest,
      parentsMortgageInterest,
      childMortgageInterest,
      totalGenerational,
      generationalFutureValue,
      investmentGrowth,
      payoffAge: age + yearsRemaining,
      velocityPayoffAge: age + velocityYears,
      yearsOfInvesting
    };
  }, [store.debts.house, store.currentAge, investmentRate]);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 0));
  const restart = () => setStep(0);

  if (!mounted) {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-500/30 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-gray-500/20 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className={`block text-sm ${classes.textSecondary} mb-2`}>Your Current Age</label>
              <EditableNumber
                value={store.currentAge}
                onChange={store.setCurrentAge}
                size="xl"
                className="w-full"
              />
            </div>
            <div>
              <label className={`block text-sm ${classes.textSecondary} mb-2`}>Mortgage Balance</label>
              <EditableCurrency
                value={store.debts.house.balance}
                onChange={(val) => store.updateDebt('house', { balance: val })}
                size="xl"
              />
            </div>
            <div>
              <label className={`block text-sm ${classes.textSecondary} mb-2`}>Interest Rate</label>
              <EditablePercentage
                value={store.debts.house.interestRate}
                onChange={(val) => store.updateDebt('house', { interestRate: val })}
                size="xl"
              />
            </div>
            <div>
              <label className={`block text-sm ${classes.textSecondary} mb-2`}>Years Remaining</label>
              <EditableNumber
                value={Math.ceil(store.debts.house.termMonths / 12)}
                onChange={(val) => store.updateDebt('house', { termMonths: val * 12 })}
                suffix=" years"
                size="xl"
              />
            </div>
            <p className={`text-sm ${classes.textMuted} text-center`}>Click any number to edit</p>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center py-4">
              <div className={`${classes.textSecondary} mb-2`}>Your monthly payment</div>
              <div className={`text-3xl font-mono ${classes.text}`}>
                {formatCurrency(calculations.traditional.monthlyPayment)}
              </div>
            </div>
            
            <div className={`${classes.glass} rounded-xl p-6 space-y-4`}>
              <div className="flex justify-between items-center">
                <span className={classes.textSecondary}>Total you&apos;ll pay over {Math.ceil(store.debts.house.termMonths / 12)} years</span>
                <span className={`text-2xl font-mono ${classes.text}`}>
                  <AnimatedNumber value={calculations.traditional.totalPaid} />
                </span>
              </div>
              <div className="border-t border-gray-400/30 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className={classes.textSecondary}>Your home (principal)</span>
                  <span className="text-emerald-500 font-mono">{formatCurrency(store.debts.house.balance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={classes.textSecondary}>Bank&apos;s cut (interest)</span>
                  <span className="text-red-500 font-mono text-xl">
                    <AnimatedNumber value={calculations.traditional.totalInterest} />
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <ProgressBar progress={(calculations.traditional.totalInterest / calculations.traditional.totalPaid) * 100} color="red" />
              <p className={`${classes.textMuted} mt-2 text-sm`}>
                {Math.round((calculations.traditional.totalInterest / calculations.traditional.totalPaid) * 100)}% of your payments go to the bank
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className={`${classes.textSecondary} mb-2`}>Traditional path: You&apos;ll be debt-free at age</div>
              <div className="text-5xl font-bold text-red-500">{calculations.payoffAge}</div>
            </div>
            
            <div className="relative py-8">
              <div className="mb-8">
                <div className={`text-sm ${classes.textSecondary} mb-2`}>Traditional Path (30-year mortgage)</div>
                <div className="relative h-4 bg-gray-400/30 rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-400 rounded-full" />
                </div>
                <div className={`flex justify-between mt-1 text-xs ${classes.textMuted}`}>
                  <span>Age {store.currentAge}</span>
                  <span>Age {calculations.payoffAge}</span>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-emerald-500 mb-2">Velocity Banking Path</div>
                <div className="relative h-4 bg-gray-400/30 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                    style={{ width: `${((calculations.velocityPayoffAge - store.currentAge) / (calculations.payoffAge - store.currentAge)) * 100}%` }}
                  />
                  <div 
                    className="absolute inset-y-0 bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                    style={{ left: `${((calculations.velocityPayoffAge - store.currentAge) / (calculations.payoffAge - store.currentAge)) * 100}%`, right: 0 }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs">
                  <span className={classes.textMuted}>Age {store.currentAge}</span>
                  <span className="text-emerald-500">Debt-free at {calculations.velocityPayoffAge}</span>
                  <span className="text-amber-500">Building wealth</span>
                </div>
              </div>
            </div>
            
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
              <div className={`${classes.textSecondary} mb-2`}>Years of freedom you&apos;d gain</div>
              <div className="text-4xl font-bold text-emerald-500">
                {calculations.payoffAge - calculations.velocityPayoffAge} years
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className={`text-2xl font-bold ${classes.text} mb-2`}>The Generational Picture</h3>
              <p className={classes.textSecondary}>What banks extract over 3 generations</p>
            </div>
            
            <div className="space-y-4">
              <div className={`${classes.glass} rounded-xl p-4 flex justify-between items-center`}>
                <span className={classes.textSecondary}>Your parents&apos; mortgage interest</span>
                <span className="text-red-500 font-mono">{formatCurrency(calculations.parentsMortgageInterest)}</span>
              </div>
              <div className={`${classes.glass} rounded-xl p-4 flex justify-between items-center`}>
                <span className={classes.textSecondary}>Your mortgage interest</span>
                <span className="text-red-500 font-mono">{formatCurrency(calculations.traditional.totalInterest)}</span>
              </div>
              <div className={`${classes.glass} rounded-xl p-4 flex justify-between items-center`}>
                <span className={classes.textSecondary}>Your child&apos;s projected interest</span>
                <span className="text-red-500 font-mono">{formatCurrency(calculations.childMortgageInterest)}</span>
              </div>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <div className={`${classes.textSecondary} mb-2`}>Total transferred to banks (3 generations)</div>
              <div className="text-4xl font-bold text-red-500">
                <AnimatedNumber value={calculations.totalGenerational} />
              </div>
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
              <div className={`${classes.textSecondary} mb-2`}>If invested instead (50 years @ {(investmentRate * 100).toFixed(0)}%)</div>
              <div className="text-4xl font-bold text-amber-500">
                <AnimatedNumber value={calculations.generationalFutureValue} />
              </div>
              <p className={`text-sm ${classes.textMuted} mt-2`}>This could have been generational wealth</p>
              <div className="mt-4">
                <EditablePercentage 
                  value={investmentRate} 
                  onChange={setInvestmentRate}
                  size="sm"
                  label="Adjust return rate"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className={`text-2xl font-bold ${classes.text} mb-2`}>Your Alternative Future</h3>
              <p className={classes.textSecondary}>With velocity banking strategy</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
                <div className={`${classes.textSecondary} text-sm mb-2`}>Interest Saved</div>
                <div className="text-2xl font-bold text-emerald-500">
                  {formatCurrency(calculations.moneySaved)}
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 text-center">
                <div className={`${classes.textSecondary} text-sm mb-2`}>Years of Investing</div>
                <div className="text-2xl font-bold text-blue-500">
                  {calculations.yearsOfInvesting} years
                </div>
              </div>
            </div>
            
            <div className={`${classes.glass} rounded-xl p-8 text-center border border-emerald-500/30`}>
              <div className={`${classes.textSecondary} mb-2`}>Potential Portfolio Value</div>
              <div className="text-5xl font-bold text-emerald-500">
                <AnimatedNumber value={calculations.investmentGrowth} />
              </div>
              <p className={`text-sm ${classes.textMuted} mt-4`}>
                By investing your freed-up mortgage payment for {calculations.yearsOfInvesting} years @ {(investmentRate * 100).toFixed(0)}% return
              </p>
            </div>
            
            <div className="text-center">
              <p className={classes.textSecondary}>
                This is wealth you can pass on to the next generation, 
                <span className="text-emerald-500"> breaking the cycle.</span>
              </p>
            </div>

            <div className="bg-gray-500/20 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">
                These calculations use your shared data. 
                <a href="/" className="text-emerald-500 hover:underline ml-1">
                  View Dashboard
                </a>
                {" "}or{" "}
                <a href="/simulator" className="text-blue-500 hover:underline">
                  Run Simulator
                </a>
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = [
    { title: "Your Numbers", subtitle: "Let's see what your mortgage is really costing you" },
    { title: "The Wealth Transfer", subtitle: "Here's what your bank didn't tell you" },
    { title: "Two Timelines", subtitle: "Same home, different futures" },
    { title: "The Bigger Picture", subtitle: "It's not just about you" },
    { title: "Breaking Free", subtitle: "Your path to generational wealth" },
  ];

  return (
    <PageTransition>
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <ScrollReveal as="header" className="mb-8">
        <h1 className={`text-3xl font-bold ${classes.text} mb-2`}>Wealth Transfer Timeline</h1>
        <p className={classes.textSecondary}>See the true cost of your mortgage</p>
      </ScrollReveal>

      <div className="flex gap-2 mb-8">
        {stepTitles.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full cursor-pointer transition-colors ${i <= step ? 'bg-emerald-500' : `${classes.bgSecondary} hover:opacity-80`}`}
            onClick={() => setStep(i)}
          />
        ))}
      </div>

      <ScrollReveal variant="scaleIn">
      <div className={`${classes.glass} rounded-3xl p-8 mb-8`}>
        <div className="text-center mb-6">
          <h2 className={`text-xl font-semibold ${classes.text}`}>{stepTitles[step].title}</h2>
          <p className={classes.textSecondary}>{stepTitles[step].subtitle}</p>
        </div>
        
        {renderStep()}
      </div>
      </ScrollReveal>

      <div className="flex gap-4">
        {step > 0 && (
          <button
            onClick={prevStep}
            className={`flex-1 px-6 py-3 ${classes.glassButton} ${classes.text} rounded-xl transition-colors`}
          >
            Back
          </button>
        )}
        {step < 4 ? (
          <button
            onClick={nextStep}
            className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
          >
            {step === 0 ? "Calculate" : "Continue"}
          </button>
        ) : (
          <button
            onClick={restart}
            className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
          >
            Start Over
          </button>
        )}
      </div>

      <footer className={`mt-12 text-center text-sm ${classes.textSecondary}`}>
        Educational estimate. Click any number to edit. Not financial advice.
      </footer>
    </div>
    </PageTransition>
  );
}
