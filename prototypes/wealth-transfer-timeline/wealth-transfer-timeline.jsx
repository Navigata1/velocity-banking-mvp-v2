import React, { useState, useEffect } from "react";

// Utility functions for financial calculations
const calculateAmortization = (principal, annualRate, years) => {
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const totalPaid = monthlyPayment * numPayments;
  const totalInterest = totalPaid - principal;
  return { monthlyPayment, totalPaid, totalInterest };
};

const calculateFutureValue = (presentValue, annualRate, years) => {
  return presentValue * Math.pow(1 + annualRate, years);
};

const formatCurrency = (num) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
};

// Animated counter component
const AnimatedNumber = ({ value, duration = 2000, prefix = "$" }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTime;
    let animationFrame;
    
    const animate = (timestamp) => {
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
};

// Progress bar component
const ProgressBar = ({ progress, color = "green" }) => {
  const colors = {
    green: "bg-emerald-500",
    red: "bg-red-500",
    gold: "bg-amber-500",
    blue: "bg-blue-500"
  };
  
  return (
    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
      <div 
        className={`h-full ${colors[color]} transition-all duration-1000 ease-out rounded-full`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
};

// Timeline visualization
const Timeline = ({ currentAge, payoffAge, velocityAge, milestones }) => {
  const totalYears = payoffAge - currentAge;
  const velocityYears = velocityAge - currentAge;
  
  return (
    <div className="relative py-8">
      {/* Traditional timeline */}
      <div className="mb-8">
        <div className="text-sm text-gray-400 mb-2">Traditional Path (30-year mortgage)</div>
        <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-400 rounded-full" />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>Age {currentAge}</span>
          <span>Age {payoffAge}</span>
        </div>
      </div>
      
      {/* Velocity timeline */}
      <div>
        <div className="text-sm text-emerald-400 mb-2">Velocity Banking Path</div>
        <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
            style={{ width: `${(velocityYears / totalYears) * 100}%` }}
          />
          <div 
            className="absolute inset-y-0 bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
            style={{ left: `${(velocityYears / totalYears) * 100}%`, right: 0 }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs">
          <span className="text-gray-500">Age {currentAge}</span>
          <span className="text-emerald-400">Debt-free at {velocityAge}</span>
          <span className="text-amber-400">Building wealth →</span>
        </div>
      </div>
    </div>
  );
};

// Money flow animation
const MoneyFlow = ({ amount, direction }) => {
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: i * 100,
      x: Math.random() * 20 - 10
    }));
    setParticles(newParticles);
  }, [amount]);
  
  return (
    <div className="relative h-32 flex items-center justify-center overflow-hidden">
      <div className="text-4xl font-bold text-red-500">
        <AnimatedNumber value={amount} duration={3000} />
      </div>
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute w-2 h-2 rounded-full ${direction === 'out' ? 'bg-red-500' : 'bg-emerald-500'} opacity-60`}
          style={{
            animation: `float-${direction} 2s ease-in-out infinite`,
            animationDelay: `${p.delay}ms`,
            left: `calc(50% + ${p.x}px)`
          }}
        />
      ))}
    </div>
  );
};

// Main component
export default function WealthTransferTimeline() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    age: 32,
    mortgageBalance: 350000,
    interestRate: 6.5,
    yearsRemaining: 28
  });
  const [calculations, setCalculations] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const calculateAll = () => {
    const { age, mortgageBalance, interestRate, yearsRemaining } = formData;
    const rate = interestRate / 100;
    
    // Traditional mortgage calculation
    const traditional = calculateAmortization(mortgageBalance, rate, yearsRemaining);
    
    // Velocity banking estimate (7 years average based on case studies)
    const velocityYears = Math.min(7, yearsRemaining);
    const velocityInterest = mortgageBalance * rate * velocityYears * 0.4; // Simplified estimate
    
    // What the interest could have become if invested
    const investmentReturn = 0.07; // 7% average market return
    const futureValueOfInterest = calculateFutureValue(traditional.totalInterest, investmentReturn, yearsRemaining);
    
    // Generational calculation (3 generations)
    const parentsMortgageInterest = traditional.totalInterest * 0.73; // Historical adjustment
    const childMortgageInterest = traditional.totalInterest * 1.56; // Future projection
    const totalGenerational = parentsMortgageInterest + traditional.totalInterest + childMortgageInterest;
    const generationalFutureValue = calculateFutureValue(totalGenerational, investmentReturn, 50);
    
    // Velocity alternative
    const moneySaved = traditional.totalInterest - velocityInterest;
    const yearsOfInvesting = yearsRemaining - velocityYears;
    const monthlyInvestment = traditional.monthlyPayment;
    
    // Future value of investing the mortgage payment for remaining years
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
    setIsAnimating(true);
    setTimeout(() => {
      setStep(prev => prev + 1);
      setIsAnimating(false);
    }, 300);
  };

  const prevStep = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setStep(prev => prev - 1);
      setIsAnimating(false);
    }, 300);
  };

  const restart = () => {
    setStep(0);
    setCalculations(null);
  };

  // Step content
  const steps = [
    // Step 0: Input
    {
      title: "Your Numbers",
      subtitle: "Let's see what your mortgage is really costing you",
      content: (
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Your Current Age</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-xl font-mono text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Mortgage Balance</label>
            <input
              type="number"
              value={formData.mortgageBalance}
              onChange={(e) => handleInputChange('mortgageBalance', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-xl font-mono text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Interest Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.interestRate}
              onChange={(e) => handleInputChange('interestRate', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-xl font-mono text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Years Remaining</label>
            <input
              type="number"
              value={formData.yearsRemaining}
              onChange={(e) => handleInputChange('yearsRemaining', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-xl font-mono text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
      )
    },
    // Step 1: The Revelation
    {
      title: "The Wealth Transfer",
      subtitle: "Here's what your bank didn't tell you",
      content: calculations && (
        <div className="space-y-6">
          <div className="text-center py-4">
            <div className="text-gray-400 mb-2">Your monthly payment</div>
            <div className="text-3xl font-mono text-white">
              {formatCurrency(calculations.traditional.monthlyPayment)}
            </div>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total you'll pay over {formData.yearsRemaining} years</span>
              <span className="text-2xl font-mono text-white">
                <AnimatedNumber value={calculations.traditional.totalPaid} duration={2000} />
              </span>
            </div>
            <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Your home (principal)</span>
                <span className="font-mono text-emerald-400">{formatCurrency(formData.mortgageBalance)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">The bank's take (interest)</span>
                <span className="font-mono text-red-400 text-xl">
                  <AnimatedNumber value={calculations.traditional.totalInterest} duration={2500} />
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-6 text-center">
            <div className="text-red-400 text-sm mb-2">THE WEALTH TRANSFER</div>
            <div className="text-4xl font-bold text-red-500 mb-2">
              <AnimatedNumber value={calculations.traditional.totalInterest} duration={3000} />
            </div>
            <div className="text-gray-400 text-sm">
              That's {Math.round((calculations.traditional.totalInterest / formData.mortgageBalance) * 100)}% of your home's value
            </div>
          </div>
        </div>
      )
    },
    // Step 2: The Stolen Future
    {
      title: "The Stolen Future",
      subtitle: "What that money could have become",
      content: calculations && (
        <div className="space-y-6">
          <div className="text-center py-2">
            <div className="text-gray-400 mb-1">If you had invested {formatCurrency(calculations.traditional.totalInterest)}</div>
            <div className="text-gray-400 text-sm">at 7% average return over {formData.yearsRemaining} years...</div>
          </div>
          
          <div className="bg-gradient-to-b from-amber-900/30 to-amber-900/10 border border-amber-700 rounded-xl p-8 text-center">
            <div className="text-amber-400 text-sm mb-3">IT WOULD HAVE BECOME</div>
            <div className="text-5xl font-bold text-amber-400 mb-4">
              <AnimatedNumber value={calculations.futureValueOfInterest} duration={3000} />
            </div>
            <div className="text-gray-300">
              That's nearly <span className="text-amber-400 font-bold">${Math.round(calculations.futureValueOfInterest / 1000000 * 10) / 10} MILLION</span> you're giving away.
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 text-xs mb-1">Interest Paid</div>
              <div className="text-red-400 font-mono">{formatCurrency(calculations.traditional.totalInterest)}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 text-xs mb-1">Potential Growth</div>
              <div className="text-amber-400 font-mono">{formatCurrency(calculations.futureValueOfInterest - calculations.traditional.totalInterest)}</div>
            </div>
          </div>
        </div>
      )
    },
    // Step 3: Generational Impact
    {
      title: "The Generational Death Pledge",
      subtitle: "It's not just your wealth being extracted",
      content: calculations && (
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-lg p-4 flex justify-between items-center">
              <div>
                <div className="text-gray-400 text-sm">Your Parents' Mortgage</div>
                <div className="text-gray-500 text-xs">1985-2015 (estimated)</div>
              </div>
              <div className="text-red-400 font-mono text-lg">{formatCurrency(calculations.parentsMortgageInterest)}</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4 flex justify-between items-center border-2 border-red-800">
              <div>
                <div className="text-white text-sm font-medium">Your Mortgage</div>
                <div className="text-gray-500 text-xs">Now - {2024 + formData.yearsRemaining}</div>
              </div>
              <div className="text-red-400 font-mono text-lg">{formatCurrency(calculations.traditional.totalInterest)}</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4 flex justify-between items-center">
              <div>
                <div className="text-gray-400 text-sm">Your Child's Mortgage</div>
                <div className="text-gray-500 text-xs">2045-2075 (projected)</div>
              </div>
              <div className="text-red-400 font-mono text-lg">{formatCurrency(calculations.childMortgageInterest)}</div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-300">Three Generations Total</span>
              <span className="text-2xl font-mono text-red-500">
                <AnimatedNumber value={calculations.totalGenerational} duration={2000} />
              </span>
            </div>
          </div>
          
          <div className="bg-red-900/20 border border-red-900 rounded-xl p-5 text-center">
            <div className="text-red-400 text-sm mb-2">IF THIS MONEY STAYED IN YOUR FAMILY</div>
            <div className="text-4xl font-bold text-red-400 mb-2">
              <AnimatedNumber value={calculations.generationalFutureValue} duration={3000} />
            </div>
            <div className="text-gray-400 text-sm">
              Over $4 million in generational wealth... extracted.
            </div>
          </div>
        </div>
      )
    },
    // Step 4: The Alternative
    {
      title: "But What If You Broke The Cycle?",
      subtitle: "The same home. The same income. A different strategy.",
      content: calculations && (
        <div className="space-y-6">
          <Timeline 
            currentAge={formData.age}
            payoffAge={calculations.payoffAge}
            velocityAge={calculations.velocityPayoffAge}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-center">
              <div className="text-red-400 text-xs mb-1">TRADITIONAL</div>
              <div className="text-2xl font-bold text-red-400">{formData.yearsRemaining} years</div>
              <div className="text-gray-400 text-sm mt-2">Interest paid:</div>
              <div className="text-red-400 font-mono">{formatCurrency(calculations.traditional.totalInterest)}</div>
            </div>
            
            <div className="bg-emerald-900/20 border border-emerald-700 rounded-xl p-4 text-center">
              <div className="text-emerald-400 text-xs mb-1">VELOCITY BANKING</div>
              <div className="text-2xl font-bold text-emerald-400">~7 years</div>
              <div className="text-gray-400 text-sm mt-2">Interest paid:</div>
              <div className="text-emerald-400 font-mono">{formatCurrency(calculations.velocityInterest)}</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-emerald-900/30 to-amber-900/30 border border-emerald-700 rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="text-emerald-400 text-sm">MONEY KEPT IN YOUR FAMILY</div>
              <div className="text-3xl font-bold text-emerald-400">
                <AnimatedNumber value={calculations.moneySaved} duration={2000} />
              </div>
            </div>
            
            <div className="border-t border-gray-700 pt-4 text-center">
              <div className="text-gray-400 text-sm mb-1">
                Then invest mortgage payments for {calculations.yearsOfInvesting} years...
              </div>
              <div className="text-amber-400 text-2xl font-bold">
                <AnimatedNumber value={calculations.investmentGrowth} duration={2500} />
              </div>
              <div className="text-gray-400 text-xs mt-1">at age {calculations.payoffAge}</div>
            </div>
          </div>
        </div>
      )
    },
    // Step 5: Call to Action
    {
      title: "The Death Pledge Ends With You",
      subtitle: "You're not poor. You've been getting robbed. Now you know.",
      content: calculations && (
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-6 text-center border border-gray-700">
            <div className="text-gray-400 mb-4">YOUR TRANSFORMATION</div>
            
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div>
                <div className="text-red-400 text-xs">INTEREST SAVED</div>
                <div className="text-emerald-400 font-mono font-bold">{formatCurrency(calculations.moneySaved)}</div>
              </div>
              <div>
                <div className="text-red-400 text-xs">YEARS SAVED</div>
                <div className="text-emerald-400 font-mono font-bold">{formData.yearsRemaining - 7}</div>
              </div>
              <div>
                <div className="text-red-400 text-xs">WEALTH BUILT</div>
                <div className="text-amber-400 font-mono font-bold">{formatCurrency(calculations.investmentGrowth)}</div>
              </div>
            </div>
            
            <div className="text-lg text-white mb-2">
              Debt-free at <span className="text-emerald-400 font-bold">{calculations.velocityPayoffAge}</span> instead of <span className="text-red-400">{calculations.payoffAge}</span>
            </div>
            <div className="text-gray-400 text-sm">
              With <span className="text-amber-400 font-bold">{formatCurrency(calculations.investmentGrowth)}</span> in investments
            </div>
          </div>
          
          <div className="space-y-3">
            <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 px-6 rounded-xl transition-colors">
              Start Your Velocity Plan
            </button>
            <button className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
              </svg>
              Share My Wealth Transfer
            </button>
          </div>
          
          <div className="text-center">
            <div className="inline-block bg-gray-800 rounded-full px-4 py-2 text-sm text-gray-400">
              📱 velocitybank.app
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float-out {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          100% { transform: translateY(-60px) scale(0.5); opacity: 0; }
        }
        @keyframes float-in {
          0% { transform: translateY(60px) scale(0.5); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 0.6; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
          50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); }
        }
      `}</style>
      
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gray-800 rounded-full px-4 py-1 text-sm text-gray-400 mb-4">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            VelocityBank
          </div>
          
          {/* Progress indicator */}
          <div className="flex justify-center gap-1 mb-6">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? 'w-8 bg-emerald-500' : 
                  i < step ? 'w-4 bg-emerald-700' : 'w-4 bg-gray-700'
                }`}
              />
            ))}
          </div>
          
          <h1 className="text-2xl font-bold mb-2">{currentStep.title}</h1>
          <p className="text-gray-400">{currentStep.subtitle}</p>
        </div>
        
        {/* Content */}
        <div className={`transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          {currentStep.content}
        </div>
        
        {/* Navigation */}
        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <button
              onClick={prevStep}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Back
            </button>
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={nextStep}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {step === 0 ? 'Calculate My Transfer' : 'Continue'}
            </button>
          ) : (
            <button
              onClick={restart}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
        
        {/* Footer quote */}
        <div className="mt-8 text-center text-gray-600 text-xs italic">
          "Mort-gage" = Death Pledge. Named in 1929 for what it is.
        </div>
      </div>
    </div>
  );
}
