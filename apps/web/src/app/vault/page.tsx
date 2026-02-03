'use client';

import { useState, useEffect } from 'react';

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

const calculateAmortization = (principal: number, annualRate: number, years: number) => {
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const totalPaid = monthlyPayment * numPayments;
  const totalInterest = totalPaid - principal;
  return { monthlyPayment, totalPaid, totalInterest };
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
    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
      <div 
        className={`h-full ${colors[color]} transition-all duration-1000 ease-out rounded-full`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}

interface FormData {
  age: number;
  mortgageBalance: number;
  interestRate: number;
  yearsRemaining: number;
}

interface Calculations {
  traditional: { monthlyPayment: number; totalPaid: number; totalInterest: number };
  velocityInterest: number;
  moneySaved: number;
  futureValueOfInterest: number;
  parentsMortgageInterest: number;
  childMortgageInterest: number;
  totalGenerational: number;
  generationalFutureValue: number;
  investmentGrowth: number;
  payoffAge: number;
  velocityPayoffAge: number;
  yearsOfInvesting: number;
}

export default function VaultPage() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    age: 32,
    mortgageBalance: 350000,
    interestRate: 6.5,
    yearsRemaining: 28
  });
  const [calculations, setCalculations] = useState<Calculations | null>(null);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const calculateAll = () => {
    const { age, mortgageBalance, interestRate, yearsRemaining } = formData;
    const rate = interestRate / 100;
    
    const traditional = calculateAmortization(mortgageBalance, rate, yearsRemaining);
    const velocityYears = Math.min(7, yearsRemaining);
    const velocityInterest = mortgageBalance * rate * velocityYears * 0.4;
    const investmentReturn = 0.07;
    const futureValueOfInterest = calculateFutureValue(traditional.totalInterest, investmentReturn, yearsRemaining);
    
    const parentsMortgageInterest = traditional.totalInterest * 0.73;
    const childMortgageInterest = traditional.totalInterest * 1.56;
    const totalGenerational = parentsMortgageInterest + traditional.totalInterest + childMortgageInterest;
    const generationalFutureValue = calculateFutureValue(totalGenerational, investmentReturn, 50);
    
    const moneySaved = traditional.totalInterest - velocityInterest;
    const yearsOfInvesting = yearsRemaining - velocityYears;
    const monthlyInvestment = traditional.monthlyPayment;
    
    let investmentGrowth = 0;
    for (let i = 0; i < yearsOfInvesting * 12; i++) {
      investmentGrowth = (investmentGrowth + monthlyInvestment) * (1 + investmentReturn / 12);
    }
    
    setCalculations({
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
    });
  };

  const nextStep = () => {
    if (step === 0) {
      calculateAll();
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const restart = () => {
    setStep(0);
    setCalculations(null);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Your Current Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-xl font-mono text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Mortgage Balance</label>
              <input
                type="number"
                value={formData.mortgageBalance}
                onChange={(e) => handleInputChange('mortgageBalance', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-xl font-mono text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Interest Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.interestRate}
                onChange={(e) => handleInputChange('interestRate', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-xl font-mono text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Years Remaining</label>
              <input
                type="number"
                value={formData.yearsRemaining}
                onChange={(e) => handleInputChange('yearsRemaining', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-xl font-mono text-white focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        );

      case 1:
        return calculations && (
          <div className="space-y-6">
            <div className="text-center py-4">
              <div className="text-gray-400 mb-2">Your monthly payment</div>
              <div className="text-3xl font-mono text-white">
                {formatCurrency(calculations.traditional.monthlyPayment)}
              </div>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total you&apos;ll pay over {formData.yearsRemaining} years</span>
                <span className="text-2xl font-mono text-white">
                  <AnimatedNumber value={calculations.traditional.totalPaid} />
                </span>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Your home (principal)</span>
                  <span className="text-emerald-400 font-mono">{formatCurrency(formData.mortgageBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Bank&apos;s cut (interest)</span>
                  <span className="text-red-400 font-mono text-xl">
                    <AnimatedNumber value={calculations.traditional.totalInterest} />
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <ProgressBar progress={(calculations.traditional.totalInterest / calculations.traditional.totalPaid) * 100} color="red" />
              <p className="text-gray-500 mt-2 text-sm">
                {Math.round((calculations.traditional.totalInterest / calculations.traditional.totalPaid) * 100)}% of your payments go to the bank
              </p>
            </div>
          </div>
        );

      case 2:
        return calculations && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-gray-400 mb-2">Traditional path: You&apos;ll be debt-free at age</div>
              <div className="text-5xl font-bold text-red-400">{calculations.payoffAge}</div>
            </div>
            
            <div className="relative py-8">
              <div className="mb-8">
                <div className="text-sm text-gray-400 mb-2">Traditional Path (30-year mortgage)</div>
                <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-400 rounded-full" />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>Age {formData.age}</span>
                  <span>Age {calculations.payoffAge}</span>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-emerald-400 mb-2">Velocity Banking Path</div>
                <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                    style={{ width: `${((calculations.velocityPayoffAge - formData.age) / (calculations.payoffAge - formData.age)) * 100}%` }}
                  />
                  <div 
                    className="absolute inset-y-0 bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                    style={{ left: `${((calculations.velocityPayoffAge - formData.age) / (calculations.payoffAge - formData.age)) * 100}%`, right: 0 }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-gray-500">Age {formData.age}</span>
                  <span className="text-emerald-400">Debt-free at {calculations.velocityPayoffAge}</span>
                  <span className="text-amber-400">Building wealth</span>
                </div>
              </div>
            </div>
            
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
              <div className="text-gray-400 mb-2">Years of freedom you&apos;d gain</div>
              <div className="text-4xl font-bold text-emerald-400">
                {calculations.payoffAge - calculations.velocityPayoffAge} years
              </div>
            </div>
          </div>
        );

      case 3:
        return calculations && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">The Generational Picture</h3>
              <p className="text-gray-400">What banks extract over 3 generations</p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-gray-400">Your parents&apos; mortgage interest</span>
                <span className="text-red-400 font-mono">{formatCurrency(calculations.parentsMortgageInterest)}</span>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-gray-400">Your mortgage interest</span>
                <span className="text-red-400 font-mono">{formatCurrency(calculations.traditional.totalInterest)}</span>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-gray-400">Your child&apos;s projected interest</span>
                <span className="text-red-400 font-mono">{formatCurrency(calculations.childMortgageInterest)}</span>
              </div>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <div className="text-gray-400 mb-2">Total transferred to banks (3 generations)</div>
              <div className="text-4xl font-bold text-red-400">
                <AnimatedNumber value={calculations.totalGenerational} />
              </div>
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
              <div className="text-gray-400 mb-2">If invested instead (50 years @ 7%)</div>
              <div className="text-4xl font-bold text-amber-400">
                <AnimatedNumber value={calculations.generationalFutureValue} />
              </div>
              <p className="text-sm text-gray-500 mt-2">This could have been generational wealth</p>
            </div>
          </div>
        );

      case 4:
        return calculations && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Your Alternative Future</h3>
              <p className="text-gray-400">With velocity banking strategy</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
                <div className="text-gray-400 text-sm mb-2">Interest Saved</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(calculations.moneySaved)}
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 text-center">
                <div className="text-gray-400 text-sm mb-2">Years of Investing</div>
                <div className="text-2xl font-bold text-blue-400">
                  {calculations.yearsOfInvesting} years
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-500/20 to-amber-500/20 rounded-xl p-8 text-center border border-emerald-500/30">
              <div className="text-gray-400 mb-2">Potential Portfolio Value</div>
              <div className="text-5xl font-bold text-emerald-400">
                <AnimatedNumber value={calculations.investmentGrowth} />
              </div>
              <p className="text-sm text-gray-500 mt-4">
                By investing your freed-up mortgage payment for {calculations.yearsOfInvesting} years @ 7% return
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-gray-400">
                This is wealth you can pass on to the next generation, 
                <span className="text-emerald-400"> breaking the cycle.</span>
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
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Wealth Transfer Timeline</h1>
        <p className="text-gray-400">See the true cost of your mortgage</p>
      </header>

      <div className="flex gap-2 mb-8">
        {stepTitles.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full ${i <= step ? 'bg-emerald-500' : 'bg-slate-700'}`}
          />
        ))}
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700 mb-8">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-white">{stepTitles[step].title}</h2>
          <p className="text-gray-400">{stepTitles[step].subtitle}</p>
        </div>
        
        {renderStep()}
      </div>

      <div className="flex gap-4">
        {step > 0 && (
          <button
            onClick={prevStep}
            className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
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

      <footer className="mt-12 text-center text-sm text-gray-500">
        Educational estimate. Assumptions shown in the tool. Not financial advice.
      </footer>
    </div>
  );
}
