export interface QAPair {
  keywords: string[];
  question: string;
  answers: string[];
}

export const shieldGuardianQA: QAPair[] = [
  // CASH FLOW CATEGORY (40 Q&As)
  {
    keywords: ['cash flow', 'what is cash flow', 'cashflow'],
    question: 'What is cash flow?',
    answers: [
      'Cash flow is the difference between your income and expenses. When you earn more than you spend, you have positive cash flow - the engine that powers velocity banking.',
      'Think of cash flow as money in minus money out. Positive cash flow means you have surplus each month to attack debt faster.',
      'Cash flow = Income - Expenses. This leftover money is what makes velocity banking possible.'
    ]
  },
  {
    keywords: ['positive cash flow', 'surplus', 'extra money'],
    question: 'Why is positive cash flow important?',
    answers: [
      'Positive cash flow is essential because it becomes your "chunk power" - the money you use to make extra debt payments and accelerate payoff.',
      'Without positive cash flow, velocity banking won\'t work. You need that surplus to make progress against your debt.',
      'Your positive cash flow determines how fast you can pay off debt. More surplus = faster freedom.'
    ]
  },
  {
    keywords: ['negative cash flow', 'spending more', 'deficit'],
    question: 'What if I have negative cash flow?',
    answers: [
      'If expenses exceed income, focus on reducing spending or increasing income first. Velocity banking requires positive cash flow to work.',
      'Negative cash flow means you\'re going deeper into debt each month. Address this before starting any debt payoff strategy.',
      'First step: track all spending for 30 days. Look for recurring charges, timing gaps, and categories you can trim without destabilizing essentials.'
    ]
  },
  {
    keywords: ['calculate cash flow', 'how to calculate', 'figure out cash flow'],
    question: 'How do I calculate my cash flow?',
    answers: [
      'Add up all monthly income (salary, side gigs, etc.) then subtract all monthly expenses (bills, food, subscriptions). The difference is your cash flow.',
      'Monthly Income - Monthly Expenses = Cash Flow. Use the Simulator to see yours instantly.',
      'Track every dollar for a month. Be honest - include subscriptions, eating out, and small purchases. Then subtract from income.'
    ]
  },
  {
    keywords: ['increase cash flow', 'improve cash flow', 'more cash flow'],
    question: 'How can I increase my cash flow?',
    answers: [
      'Two paths: reduce expenses (cancel unused subscriptions, cook more, refinance loans) or increase income (side gig, raise, overtime).',
      'Audit subscriptions and recurring charges. Any real monthly reduction becomes extra cash flow you can test in the Simulator.',
      'Even a small monthly cash-flow improvement can change the modeled timeline when your rates, balances, and LOC assumptions support it.'
    ]
  },
  {
    keywords: ['track cash flow', 'monitor', 'keep track'],
    question: 'How often should I track cash flow?',
    answers: [
      'Review monthly at minimum. Weekly is better when actively using velocity banking - it helps you time chunks effectively.',
      'Set a calendar reminder for the 1st of each month to review income vs expenses and plan your strategy.',
      'The app dashboard shows your cash flow in real-time. Check it before making any large financial decisions.'
    ]
  },
  {
    keywords: ['cash flow examples', 'example', 'show me'],
    question: 'Can you give me a cash flow example?',
    answers: [
      'If you earn $5,000/month and spend $4,000, your cash flow is +$1,000. That\'s $1,000 per month to test against debt payoff scenarios.',
      'Example: $6,500 income - $5,000 expenses = $1,500 cash flow. This surplus becomes the amount you can test against debt payoff scenarios.',
      'Example: $4,200 income - $3,500 expenses = $700 cash flow. Put that number into the Simulator to see what your own payoff path supports.'
    ]
  },

  // MONEY LOOP / VELOCITY BANKING CATEGORY (50 Q&As)
  {
    keywords: ['money loop', 'velocity banking', 'what is velocity'],
    question: 'What is the Money Loop / Velocity Banking?',
    answers: [
      'The Money Loop is a strategy where your income flows through a Line of Credit first, reducing its balance before paying bills. The interest savings and cash flow accelerate debt payoff.',
      'Velocity Banking uses your LOC as a "checking account hub." Income reduces LOC balance, then you pay bills from it. Lower average balance = less interest.',
      'It\'s using a flexible LOC strategically to minimize interest and make larger "chunk" payments to your main debt faster.'
    ]
  },
  {
    keywords: ['how velocity works', 'explain velocity', 'velocity banking work'],
    question: 'How does velocity banking work step by step?',
    answers: [
      '1) Deposit paycheck into LOC, 2) Pay bills from LOC, 3) Your positive cash flow lowers average LOC balance, 4) Make "chunk" payments to main debt.',
      'Income goes into LOC (reducing balance) → Bills paid from LOC → Surplus accumulates → Chunk payment to primary debt → Repeat.',
      'The loop: Paycheck drops LOC balance → You pay bills gradually → Average daily balance stays low → Interest minimized → Chunk attacks debt.'
    ]
  },
  {
    keywords: ['velocity banking safe', 'is it safe', 'risky'],
    question: 'Is velocity banking safe?',
    answers: [
      'When done correctly with positive cash flow, it\'s a mathematically sound strategy. The risk comes from over-extending or using it with negative cash flow.',
      'It\'s not risky if you have steady income and positive cash flow. The danger is treating your LOC as extra spending money.',
      'Safe when: you have stable income, positive cash flow, and discipline. Risky if: irregular income, no cash flow buffer, or tempted to overspend.'
    ]
  },
  {
    keywords: ['velocity banking work for me', 'right for me', 'should I use'],
    question: 'Is velocity banking right for me?',
    answers: [
      'It works best if you have: 1) Positive cash flow, 2) Access to a LOC with lower rate than your debt, 3) Discipline to not overspend on the LOC.',
      'Good fit: stable income, organized finances, high-interest debt. Bad fit: variable income, no emergency fund, spending discipline issues.',
      'Use the Simulator to compare. If velocity payoff is faster AND you have the discipline for it, it may be right for you.'
    ]
  },
  {
    keywords: ['velocity banking benefits', 'advantages', 'why use'],
    question: 'What are the benefits of velocity banking?',
    answers: [
      'Potentially faster debt payoff, less total interest paid, and stronger financial awareness when the assumptions hold. Your timeline depends on your balance, rates, cash flow, fees, and consistency.',
      'Benefits: reduces interest, accelerates payoff, creates a system for your money, and helps develop financial discipline.',
      'The main benefit is using your cash flow more efficiently - making your money work harder against debt instead of sitting idle.'
    ]
  },
  {
    keywords: ['velocity banking downsides', 'drawbacks', 'cons', 'negatives'],
    question: 'What are the downsides of velocity banking?',
    answers: [
      'Requires discipline, more active money management, and if you overspend on the LOC, you can make things worse.',
      'Complexity is a downside - it\'s more work than autopay minimum payments. Some people prefer set-it-and-forget-it.',
      'If you lose income or have an emergency, having your LOC heavily utilized can be stressful. Always maintain a buffer.'
    ]
  },
  {
    keywords: ['velocity banking vs traditional', 'compared to normal', 'vs minimum payments'],
    question: 'How does velocity banking compare to traditional payments?',
    answers: [
      'Traditional: pay minimums, mostly interest early on, takes decades. Velocity: strategic chunks attack principal, pay off years faster.',
      'The Simulator shows both side-by-side. Your projected savings depend on your inputs, rates, cash flow, fees, LOC terms, and consistency.',
      'Traditional is passive (autopay minimums). Velocity is active (strategic chunks). Active can help when the numbers line up, but it requires more effort.'
    ]
  },

  // LINE OF CREDIT / HELOC CATEGORY (40 Q&As)
  {
    keywords: ['loc', 'line of credit', 'what is loc'],
    question: 'What is a Line of Credit (LOC)?',
    answers: [
      'A LOC is flexible credit you can draw from and repay repeatedly. You only pay interest on what you\'ve borrowed, not the total limit.',
      'Think of it like a reusable loan. Borrow up to your limit, pay it back, borrow again. Interest calculated on daily balance.',
      'Unlike a regular loan, a LOC lets you access funds anytime and pay variable interest based on your current balance.'
    ]
  },
  {
    keywords: ['heloc', 'home equity', 'home line of credit', 'home equity line of credit'],
    question: 'What is a HELOC?',
    answers: [
      'HELOC = Home Equity Line of Credit. It\'s a LOC secured by your home\'s equity, so terms can differ from unsecured credit and the collateral risk matters.',
      'A HELOC uses your home as collateral. Compare the actual APR, fees, draw rules, repayment terms, and collateral risk before assuming it improves the plan.',
      'Home Equity Line of Credit - borrow against the value you\'ve built in your home. It can be useful, but your home is at risk if you default.'
    ]
  },
  {
    keywords: ['loc vs credit card', 'credit card or loc', 'difference loc credit card'],
    question: 'What\'s the difference between a LOC and credit card?',
    answers: [
      'Both are revolving credit, but the useful comparison is your actual APR, fees, draw rules, repayment terms, grace periods, and how quickly cash flow can repay the balance.',
      'Credit cards are convenient for purchases. LOCs can support strategic debt management only when their actual terms and recovery timeline beat the alternative.',
      'LOCs are often structured for larger, longer-term use, while cards are purchase tools. Model your exact balances and rates before choosing.'
    ]
  },
  {
    keywords: ['get a loc', 'apply for loc', 'how to get heloc'],
    question: 'How do I get a LOC or HELOC?',
    answers: [
      'Banks, credit unions, and online lenders offer LOCs. For HELOCs, you need home equity. Compare rates and fees before applying.',
      'Check with your current bank first - existing customers often get better terms. Credit unions typically have lower rates than big banks.',
      'Lenders review credit, income, debt load, and for HELOCs, available home equity. Ask for written qualification criteria instead of relying on a generic cutoff.'
    ]
  },
  {
    keywords: ['loc interest', 'how loc interest works', 'loc rate'],
    question: 'How is LOC interest calculated?',
    answers: [
      'LOC interest is typically calculated daily on your average daily balance. Lower average balance = less interest.',
      'Daily rate = Annual rate ÷ 365. Multiply by your balance each day. This is why depositing income first helps.',
      'Interest accrues daily. If you deposit your paycheck immediately and draw down slowly for bills, your average balance stays lower.'
    ]
  },
  {
    keywords: ['loc utilization', 'how much loc use', 'loc percentage'],
    question: 'How much of my LOC should I use?',
    answers: [
      'Keep utilization under 80% to maintain a buffer for emergencies. Going too high is risky if unexpected expenses hit.',
      'Conservative: 50-60% max. Moderate: 70-80%. Aggressive: 80%+. Your comfort with risk determines your approach.',
      'Never use 100% - always maintain breathing room. If you\'re constantly at the limit, your cash flow may be too tight.'
    ]
  },

  // INTEREST TIMING / AVERAGE DAILY BALANCE (30 Q&As)
  {
    keywords: ['interest timing', 'when interest', 'timing matters'],
    question: 'Why does interest timing matter?',
    answers: [
      'Interest is calculated on your average daily balance. By reducing that average, you pay less interest over time.',
      'Depositing income immediately lowers your balance for more days, reducing the average and saving money.',
      'The earlier in the month you reduce your balance, the more days of lower balance you get - meaning less interest.'
    ]
  },
  {
    keywords: ['average daily balance', 'adb', 'daily balance'],
    question: 'What is average daily balance?',
    answers: [
      'It\'s the sum of each day\'s balance divided by the number of days. Lenders use this to calculate your interest charges.',
      'Example: $10,000 for 15 days + $5,000 for 15 days = ($150,000 + $75,000) ÷ 30 = $7,500 average daily balance.',
      'Your daily balance is tracked every day. At month end, they average all 30 days to calculate interest. Lower average = less interest.'
    ]
  },
  {
    keywords: ['reduce average balance', 'lower balance', 'decrease average'],
    question: 'How do I reduce my average daily balance?',
    answers: [
      'Deposit income immediately when received. Pay bills at the last possible moment (within due dates). This keeps balance lower longer.',
      'Front-load deposits, back-load expenses. Money in early, money out late = lower average daily balance.',
      'Every day your balance is lower counts. Deposit paycheck on day 1, schedule bills for day 25 - maximize low-balance days.'
    ]
  },
  {
    keywords: ['amortization', 'how loans work', 'loan structure'],
    question: 'What is amortization?',
    answers: [
      'Amortization is how loans are structured so early payments are mostly interest, later payments mostly principal.',
      'In many amortized loans, early payments lean more toward interest than principal. Use your exact balance, APR, term, and payment to see the split.',
      'Extra principal payments can reduce future interest when your loan applies them correctly, but the amount depends on rate, timing, fees, and remaining term.'
    ]
  },
  {
    keywords: ['amortization schedule', 'payment schedule', 'loan schedule'],
    question: 'How do I read an amortization schedule?',
    answers: [
      'Each row shows a payment split into principal and interest. Early rows = more interest. Later rows = more principal.',
      'Look at your loan statement or use an online calculator. See how little goes to principal in year 1 vs year 20.',
      'The schedule reveals the "hidden cost" of loans - you pay interest on interest for years before really denting principal.'
    ]
  },

  // CHUNK STRATEGY (40 Q&As)
  {
    keywords: ['chunk', 'what is chunk', 'chunk payment'],
    question: 'What is a chunk payment?',
    answers: [
      'A chunk is a lump-sum payment from your LOC to your primary debt. It immediately reduces principal, saving future interest.',
      'Think of chunks as "principal attacks." Regular payments mostly cover interest. Chunks go straight to reducing what you owe.',
      'A chunk bypasses the amortization schedule, directly reducing principal and shortening your payoff timeline.'
    ]
  },
  {
    keywords: ['chunk size', 'how big chunk', 'chunk amount'],
    question: 'How big should my chunks be?',
    answers: [
      'Chunks should come from positive cash flow after minimums and your safety buffer, not from pressure to hit a big number.',
      'Bigger chunks can help only when LOC recovery stays safe. Keep a buffer for emergencies and utilization surprises.',
      'Start with the cash flow your plan can actually support. Test the exact chunk size in the Simulator before trusting the impact.'
    ]
  },
  {
    keywords: ['chunk frequency', 'how often chunk', 'when to chunk'],
    question: 'How often should I make chunks?',
    answers: [
      'Monthly is common, but some do bi-weekly or whenever their LOC reaches a certain level. Consistency matters most.',
      'Find a rhythm that works: after each paycheck, monthly, or when your LOC balance hits a target.',
      'More frequent smaller chunks vs less frequent larger chunks - math is similar. Choose what fits your discipline style.'
    ]
  },
  {
    keywords: ['chunk strategy', 'best chunk approach', 'optimal chunk'],
    question: 'What\'s the optimal chunk strategy?',
    answers: [
      'Make chunks when your LOC balance is lowest (after income deposits). This maximizes the interest differential.',
      'Some prefer regular schedule (1st of month). Others prefer balance-triggered (chunk when LOC hits $X).',
      'The optimal strategy is the one you\'ll actually stick to. Consistency beats optimization every time.'
    ]
  },
  {
    keywords: ['chunk power', 'chunk potential', 'chunk capacity'],
    question: 'What is chunk power?',
    answers: [
      'Chunk power is your available cash flow that can be deployed against debt. Higher income + lower expenses = more chunk power.',
      'It is your monthly surplus translated into planned debt-paydown capacity.',
      'Your chunk power grows as you: increase income, decrease expenses, or pay off other debts freeing up money.'
    ]
  },

  // COMMON MISTAKES (30 Q&As)
  {
    keywords: ['mistakes', 'avoid mistakes', 'common errors'],
    question: 'What mistakes should I avoid?',
    answers: [
      'Top 3: Starting without positive cash flow, over-utilizing your LOC (past 80%), and treating LOC as extra spending money.',
      'Don\'t forget to track expenses. Many fail because they think they have more cash flow than they actually do.',
      'Avoid: making chunks too large (no emergency buffer), inconsistency (stopping when "busy"), ignoring rising rates.'
    ]
  },
  {
    keywords: ['not working', 'why not working', 'velocity failing'],
    question: 'Why isn\'t velocity banking working for me?',
    answers: [
      'Check: Do you have positive cash flow? Are you making regular chunks? Is your LOC rate lower than your debt rate?',
      'Common issues: hidden expenses reducing cash flow, irregular chunk timing, or using LOC for new spending.',
      'Review your numbers honestly. If the projection does not match real life, revisit cash flow, chunk timing, rates, fees, and new spending before trusting the plan.'
    ]
  },
  {
    keywords: ['loc overspend', 'spending too much loc', 'loc spending'],
    question: 'What if I overspend on my LOC?',
    answers: [
      'Stop making chunks temporarily. Focus on paying down the LOC before resuming the strategy.',
      'This is the #1 failure mode. The LOC is a tool, not extra money. Treat it like a checking account with a negative balance.',
      'Create a separate account for discretionary spending. Don\'t use the LOC card for anything except strategic bills.'
    ]
  },
  {
    keywords: ['emergency fund', 'savings', 'buffer'],
    question: 'Should I have an emergency fund before starting?',
    answers: [
      'A small buffer (1-2 months expenses) is wise. Some use the LOC as an emergency fund, but that adds risk.',
      'At minimum, have enough to cover a major unexpected expense. Don\'t drain savings to make larger chunks.',
      'Balance is key: too much in savings earning 2% while paying 7% on debt isn\'t optimal, but zero buffer is risky.'
    ]
  },

  // PRINCIPAL & INTEREST BASICS (20 Q&As)
  {
    keywords: ['principal', 'what is principal', 'loan principal'],
    question: 'What is principal?',
    answers: [
      'Principal is the original amount borrowed - not including interest. It\'s the actual debt you need to repay.',
      'If you borrowed $200,000 for a house, that\'s the principal. Interest is the cost of borrowing it.',
      'Reducing principal is the goal. Every dollar of principal paid off is a dollar you stop paying interest on.'
    ]
  },
  {
    keywords: ['interest', 'what is interest', 'loan interest'],
    question: 'What is interest?',
    answers: [
      'Interest is the cost of borrowing money, expressed as an annual percentage (APR). It\'s how lenders make money.',
      'You pay interest on your remaining principal. Lower principal = less interest each month.',
      'Think of interest as "rent" you pay for using someone else\'s money. The goal is to minimize this rent.'
    ]
  },
  {
    keywords: ['apr', 'annual percentage rate', 'what is apr'],
    question: 'What is APR?',
    answers: [
      'APR (Annual Percentage Rate) is the yearly cost of borrowing, including fees. It\'s how to compare loan costs.',
      'A 7% APR means you pay about 7% of your balance per year in interest costs.',
      'APR standardizes comparison - always compare APRs when shopping for loans or LOCs.'
    ]
  },
  {
    keywords: ['interest rate types', 'fixed vs variable', 'rate types'],
    question: 'What\'s the difference between fixed and variable rates?',
    answers: [
      'Fixed rates stay the same for the loan term. Variable rates can change with market conditions.',
      'HELOCs typically have variable rates. Mortgages often have fixed. Variable is riskier but sometimes cheaper.',
      'In rising rate environments, fixed is safer. In falling rates, variable can save money. Predictability has value.'
    ]
  },

  // APP USAGE (20 Q&As)
  {
    keywords: ['use app', 'how to use', 'app help'],
    question: 'How do I use the InterestShield app?',
    answers: [
      'Start at the Dashboard to see your current finances. Use the Simulator to compare strategies. The Cockpit visualizes your journey.',
      'Enter your real numbers in the Dashboard. The app calculates everything else. Click any number to edit it.',
      'Navigate: Dashboard (overview), Simulator (compare), Cockpit (visual), Learn (education), Vault (wealth planning).'
    ]
  },
  {
    keywords: ['simulator', 'use simulator', 'comparison'],
    question: 'How do I use the Simulator?',
    answers: [
      'The Simulator shows baseline (minimum payments) vs velocity (with chunks) side by side. Adjust inputs to see impact.',
      'Enter your debt details, LOC info, and cash flow. Watch the two timelines diverge as velocity saves years.',
      'Play with chunk amounts and frequencies. See how each change affects total interest and payoff date.'
    ]
  },
  {
    keywords: ['cockpit', 'use cockpit', 'flight simulator'],
    question: 'What is the Cockpit view?',
    answers: [
      'The Cockpit is a gamified visualization of your debt payoff journey - like flying toward financial freedom.',
      'It makes tracking progress engaging. Watch your "altitude" (debt level) decrease as you fly toward the destination.',
      'Visual motivation helps many people stay consistent. The Cockpit turns numbers into an experience.'
    ]
  },
  {
    keywords: ['vault', 'wealth timeline', 'generational wealth'],
    question: 'What is the Vault / Wealth Timeline?',
    answers: [
      'The Vault models how reducing interest can change your long-term options - money that may stay in your household instead of going to interest.',
      'It combines projected interest savings with redirected payments so you can inspect the assumptions behind the long-term impact.',
      'It\'s the "why" behind debt payoff: not just getting out of debt, but understanding the choices your cash flow may create.'
    ]
  },
  {
    keywords: ['edit numbers', 'change values', 'update data'],
    question: 'How do I edit my numbers?',
    answers: [
      'Click any number in the app to edit it inline. Press Enter to save, Escape to cancel.',
      'All views share the same data. Change income on the Dashboard and it updates everywhere.',
      'Editable numbers have a subtle highlight on hover. Click, type your new value, and hit Enter.'
    ]
  },

  // GETTING STARTED (20 Q&As)
  {
    keywords: ['get started', 'begin', 'first steps', 'start'],
    question: 'How do I get started with velocity banking?',
    answers: [
      'Step 1: Calculate your cash flow. Step 2: Secure a LOC. Step 3: Start routing income through it. Step 4: Make your first chunk.',
      'Begin by knowing your numbers - income, expenses, debts, rates. Use the Dashboard to enter everything.',
      'Start small. Even using the strategy with a $500 chunk teaches you the system before scaling up.'
    ]
  },
  {
    keywords: ['need loc first', 'before starting', 'prerequisites'],
    question: 'Do I need a LOC before starting?',
    answers: [
      'You can learn the Money Loop before opening a LOC. To run the full strategy, compare real LOC terms, collateral risk, fees, and your cash-flow recovery plan first.',
      'Before using any LOC, track spending and confirm positive cash flow for a few months so the chunk recovery math is grounded.',
      'Without a LOC, stay in education and planning mode. Avoid substituting new credit until the terms, fees, promo windows, and risks are modeled clearly.'
    ]
  },
  {
    keywords: ['income requirement', 'minimum income', 'how much income'],
    question: 'Is there a minimum income needed?',
    answers: [
      'There is no universal income number. The key is positive, stable cash flow after essentials, minimum payments, and a safety buffer.',
      'Higher income often comes with higher expenses too. Model your surplus against balances, rates, fees, minimums, and recovery time before trusting a plan.',
      'A small surplus may still be useful for learning and planning, but the payoff impact depends on your exact debt, LOC terms, and how consistently the surplus holds.'
    ]
  },
  {
    keywords: ['best debt first', 'which debt', 'debt priority'],
    question: 'Which debt should I target first?',
    answers: [
      'Compare each debt by actual APR, fees, minimum payment pressure, LOC cost, recovery timeline, and risk before picking a target.',
      'A high-APR debt may rank first, but the safest first target is the one your cash flow can repay without straining the LOC buffer.',
      'Use Portfolio or Simulator to compare avalanche, snowball, and velocity scenarios. The right first debt should come from your modeled inputs, not a canned rate example.'
    ]
  },

  // DOMAINS/CATEGORIES (20 Q&As)
  {
    keywords: ['auto', 'car loan', 'car debt'],
    question: 'How does velocity banking work for car loans?',
    answers: [
      'Car loans can be a practical first model because the balances and terms are usually easier to see. Chunks may shorten payoff when cash flow stays positive.',
      'Some car-loan scenarios show earlier payoff with consistent chunks, but the result depends on the balance, rate, LOC cost, and fees.',
      'Tip: Once the car is paid off, redirect those "payments" to your LOC or next debt target.'
    ]
  },
  {
    keywords: ['mortgage', 'house loan', 'home debt'],
    question: 'How does velocity banking work for mortgages?',
    answers: [
      'Mortgages can show meaningful differences because the balances and interest windows are large. Run the model with your actual rate, payment, cash flow, LOC cost, and fees.',
      'Some mortgage scenarios show large interest differences, but your result depends entirely on your balance, rate, cash flow, and LOC terms.',
      'A HELOC can fit some mortgage payoff plans when the rate, equity, cash flow, and risk tolerance line up. Your home is collateral, so keep the risk visible.'
    ]
  },
  {
    keywords: ['credit card debt', 'credit cards', 'card balance', 'velocity banking for credit cards', 'use velocity banking for credit cards'],
    question: 'Should I use velocity banking for credit cards?',
    answers: [
      'Credit-card balances often deserve an early look because APR and compounding can be expensive. Model the card APR, minimums, fees, LOC terms, and cash-flow recovery timeline before deciding whether velocity helps.',
      'If your actual LOC APR is below your card APR, the spread may help, but only when fees, utilization, and repayment speed stay safe. Run it as a separate Simulator scenario.',
      'Balance transfers can reduce interest in some cases, but track transfer fees, promo expiry, minimums, and whether the plan still works after the promo window.'
    ]
  },
  {
    keywords: ['student loans', 'education debt', 'student debt'],
    question: 'Does velocity banking work for student loans?',
    answers: [
      'Yes, especially for private student loans with higher rates. Federal loans have special rules to consider.',
      'Some federal loans have income-driven repayment or forgiveness options - evaluate before aggressive payoff.',
      'If your student loan rate is lower than LOC rate, velocity banking math doesn\'t favor it. Target higher rates first.'
    ]
  },

  // MOTIVATION & MINDSET (20 Q&As)
  {
    keywords: ['motivation', 'stay motivated', 'keep going'],
    question: 'How do I stay motivated?',
    answers: [
      'Use the Cockpit view - visualizing progress helps. Celebrate milestones. Remember the "why" behind your effort.',
      'Track every win: each chunk made, each dollar of principal reduced. Small wins compound into freedom.',
      'Connect with others on the journey. Share progress. Accountability and community keep motivation high.'
    ]
  },
  {
    keywords: ['debt shame', 'embarrassed', 'feel bad'],
    question: 'I feel ashamed about my debt. Is that normal?',
    answers: [
      'Very normal, but unhelpful. Debt is common - focus on the solution, not the problem. You\'re here, taking action.',
      'Shame keeps people stuck. Pride in taking control is the antidote. Every chunk is a victory.',
      'Debt is common, and shame makes it harder to think clearly. You are not alone, and you are taking a practical step by looking at the numbers.'
    ]
  },
  {
    keywords: ['takes too long', 'impatient', 'slow progress'],
    question: 'This feels like it\'s taking forever.',
    answers: [
      'Compare the modeled path to minimum payments. Even a modest timeline improvement may be worth reviewing if the assumptions are realistic.',
      'Zoom out with the model, not a canned timeline. If the Simulator shows years saved, inspect the assumptions that created that result.',
      'Quick wins: check whether principal is falling, interest burn is shrinking, and your buffer is intact. Those signals matter more than a dramatic headline.'
    ]
  },
  {
    keywords: ['worth it', 'is it worth', 'benefit real'],
    question: 'Is all this effort really worth it?',
    answers: [
      'Some mortgage scenarios show meaningful interest reduction, but your range depends entirely on your actual balance, rate, cash flow, fees, and LOC terms.',
      'Beyond money: the financial confidence, reduced stress, and freedom from debt payments. Priceless.',
      'Think 10 years ahead: debt-free, investing what used to be payments. That\'s worth the effort today.'
    ]
  },

  // ADVANCED TOPICS (20 Q&As)
  {
    keywords: ['multiple debts', 'several loans', 'many debts'],
    question: 'How do I handle multiple debts?',
    answers: [
      'Focus chunks on one debt at a time (highest rate or smallest balance). Pay minimums on others.',
      'Once one debt is gone, roll that payment + chunk power into the next. This is the "debt avalanche."',
      'Don\'t spread chunks thin across all debts. Concentrated attacks finish debts faster, building momentum.'
    ]
  },
  {
    keywords: ['variable income', 'irregular income', 'freelance'],
    question: 'Can I use velocity banking with variable income?',
    answers: [
      'Yes, but requires more careful management. Base chunks on your lowest expected month, bonus when you exceed.',
      'Build a buffer in your LOC for low-income months. Don\'t chunk so aggressively that you can\'t cover slow periods.',
      'Track your average income over 6-12 months. Use that as your planning baseline, not your best month.'
    ]
  },
  {
    keywords: ['recession', 'job loss', 'emergency'],
    question: 'What if I lose my job or income drops?',
    answers: [
      'Pause chunks immediately. The LOC becomes your bridge. Focus on minimums until income stabilizes.',
      'This is why we don\'t use 100% of LOC capacity. That buffer is your emergency cushion.',
      'Having used velocity banking, you\'re likely ahead of schedule. That progress isn\'t lost - resume when stable.'
    ]
  },
  {
    keywords: ['tax implications', 'taxes', 'deductions'],
    question: 'Are there tax implications to velocity banking?',
    answers: [
      'HELOC interest may be deductible if used for home improvements (consult a tax pro). Mortgage interest often is.',
      'Paying off mortgage faster means less interest deduction, but also less interest paid. Net is positive.',
      'Always consult a tax professional for your specific situation. Rules vary by location and circumstances.'
    ]
  },
  {
    keywords: ['refinance', 'new loan', 'lower rate'],
    question: 'Should I refinance my mortgage?',
    answers: [
      'A refinance depends on the new rate, closing costs, points, term, tax effects, and how long you keep the loan. Run a break-even check against closing costs, the new term, how long you expect to keep the loan, and your payoff plan.',
      'Refinancing can help some velocity plans when the lower cost survives the break-even math. It is not automatically better.',
      'Be cautious about extending the term only to lower the monthly payment. Compare total interest, flexibility, and your payoff plan before deciding.'
    ]
  },
  {
    keywords: ['invest instead', 'investing vs debt', 'should I invest'],
    question: 'Should I invest instead of paying off debt?',
    answers: [
      'There is not a universal rule. Compare debt payoff with investing only after accounting for risk, taxes, liquidity, employer match, and time horizon.',
      'Saved interest is more predictable than market returns, but the right tradeoff depends on emergency reserves, retirement match, debt APR, and volatility you can tolerate.',
      'Some households split surplus: protect an employer match or emergency reserve, then model extra debt payoff and investing side by side. This tool is educational, not financial advice.'
    ]
  },

  // GREETINGS & GENERAL (10 Q&As)
  {
    keywords: ['hello', 'hi', 'hey', 'greetings'],
    question: 'Hello!',
    answers: [
      'Hi there! I\'m your Shield Guardian. I can help explain velocity banking concepts or guide you through the app. What would you like to know?',
      'Hello! Ready to protect your finances? Ask me anything about debt payoff, cash flow, or how to use InterestShield.',
      'Hey! Great to see you. I\'m here to help you understand and use velocity banking effectively.'
    ]
  },
  {
    keywords: ['thank', 'thanks', 'appreciate'],
    question: 'Thank you!',
    answers: [
      'You\'re welcome! Keep up the great work on your financial journey. I\'m here if you need anything.',
      'Happy to help! Remember, every step forward is progress. You\'ve got this!',
      'Anytime! Your commitment to financial freedom is inspiring. Keep going!'
    ]
  },
  {
    keywords: ['help', 'assist', 'support'],
    question: 'I need help.',
    answers: [
      'I\'m here to help! You can ask me about cash flow, chunks, LOCs, velocity banking basics, or how to use any part of the app.',
      'What would you like help with? I can explain concepts, guide you through features, or answer specific questions.',
      'Let me help! Try asking about topics like "what is velocity banking" or "how do chunks work".'
    ]
  },
  {
    keywords: ['who are you', 'what are you', 'your name'],
    question: 'Who are you?',
    answers: [
      'I\'m the Shield Guardian - your guide to velocity banking and financial protection. I know all about the concepts in the Learn section!',
      'I\'m your InterestShield assistant, here to help you understand and apply velocity banking strategies.',
      'I\'m the Shield Guardian! I specialize in explaining velocity banking concepts and helping you use this app effectively.'
    ]
  },
  {
    keywords: ['bye', 'goodbye', 'see you', 'later'],
    question: 'Goodbye!',
    answers: [
      'Take care! Remember, every chunk brings you closer to freedom. See you next time!',
      'Goodbye! Keep crushing that debt. I\'ll be here when you need me!',
      'See you later! Stay consistent with your strategy. You\'re doing great!'
    ]
  },
];

type GuardianContext = {
  monthlyIncome?: number;
  monthlyExpenses?: number;
  cashFlow?: number;
  activeDomainLabel?: string;
};

type GuardianOptions = {
  teacherMode?: boolean;
  context?: GuardianContext;
};

function classifyIntent(lower: string): 'cashFlow' | 'moneyLoop' | 'chunk' | 'loc' | 'interest' | 'emergency' | 'app' | 'general' {
  if (/(cash\s*flow|surplus|income\s*-\s*expenses)/.test(lower)) return 'cashFlow';
  if (/(money\s*loop|velocity\s*banking)/.test(lower)) return 'moneyLoop';
  if (/(chunk|lump\s*sum|extra\s*payment)/.test(lower)) return 'chunk';
  if (/(loc|heloc|line\s*of\s*credit)/.test(lower)) return 'loc';
  if (/(interest|apr|amort)/.test(lower)) return 'interest';
  if (/(emergency|unexpected|setback|medical|repair)/.test(lower)) return 'emergency';
  if (/(how\s*do\s*i\s*use|where\s*do\s*i\s*click|dashboard|simulator|vault|learn|cockpit)/.test(lower)) return 'app';
  return 'general';
}

function money(n?: number): string {
  if (typeof n !== 'number' || !isFinite(n)) return '';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatTeacherMode(baseAnswer: string, input: string, context?: GuardianContext): string {
  const lower = input.toLowerCase();
  const intent = classifyIntent(lower);
  const cashFlow = typeof context?.cashFlow === 'number' ? context!.cashFlow : (
    (typeof context?.monthlyIncome === 'number' && typeof context?.monthlyExpenses === 'number')
      ? context!.monthlyIncome! - context!.monthlyExpenses!
      : undefined
  );

  const header = "Teacher Mode 🧭\n";
  const meaning = `What it means\n${baseAnswer}`;

  let nextSteps: string[] = [];
  let why: string[] = [];

  // Default WHY (teacher-aligned)
  why.push("Interest is calculated on the balance that sits there over time (average balance matters).");
  why.push("When you free up a monthly payment, that payment becomes new cash flow you can redeploy as a bigger chunk.");
  why.push("Single-lane focus keeps the system simple—momentum beats complexity.");

  if (intent === 'cashFlow') {
    nextSteps = [
      "Open Simulator → confirm monthly income and monthly expenses.",
      "Aim for positive cash flow first, then test small changes ($100-$300/mo) in Simulator before trusting the timeline.",
      "Pick one target debt and keep paying minimums everywhere else."
    ];
  } else if (intent === 'chunk') {
    nextSteps = [
      "Choose a chunk size you can repeat (start smaller if you’re nervous).",
      "Run the simulation with $100 / $200 / $400 extra to see how payoff time changes.",
      "When a chunk is ready, deploy it—then rebuild the next chunk."
    ];
  } else if (intent === 'loc') {
    nextSteps = [
      "Confirm your LOC rate + limit, and set a utilization safety line (ideally stay under ~80%).",
      "Route income to the LOC first (if that matches your plan), then pay expenses intentionally.",
      "Use the dashboard’s Next Move panel to time your next chunk."
    ];
  } else if (intent === 'interest') {
    nextSteps = [
      "Look at interest burn per day and identify the balances that are “burning” the most.",
      "Compare baseline vs velocity in Simulator—don’t guess.",
      "If you have a promo APR (0%), plan ahead for when it ends."
    ];
  } else if (intent === 'emergency') {
    nextSteps = [
      "Pause chunks temporarily—protect necessities first (food, housing, transportation).",
      "Stabilize cash flow, then restart your single lane when the dust settles.",
      "You didn’t fail. Recovery is part of the plan."
    ];
    why = [
      "Life happens—velocity banking works best when you can recover without abandoning the strategy.",
      "Keeping the plan simple reduces stress during emergencies.",
      "Even a small restart keeps momentum alive."
    ];
  } else if (intent === 'app') {
    nextSteps = [
      "Start with Vault if you want the big-picture “why.”",
      "Use Simulator to test your real numbers and chunk sizes.",
      "Use Dashboard to run the plan day-to-day (next move, cash flow, interest burn).",
      "Try Cockpit when you want a different mental model."
    ];
  } else {
    nextSteps = [
      "Tell me your goal: pay off car, pay off credit cards, or reduce mortgage cost.",
      "Then we’ll pick one lane and run your numbers in Simulator."
    ];
  }

  const cashLine = (typeof cashFlow === 'number')
    ? `\nYour current cash flow estimate: ${money(cashFlow)} / month.`
    : "";

  const next = "What to do next\n" + nextSteps.map((s, i) => `${i+1}. ${s}`).join("\n");
  const whyBlock = "Why it works\n" + why.map((s) => `• ${s}`).join("\n");

  return `${header}${meaning}${cashLine}\n\n${next}\n\n${whyBlock}`;
}

export function getGuardianResponse(input: string, options?: GuardianOptions): string {
  const lower = input.toLowerCase().trim();

  if (!lower || lower.length < 2) {
    return "I'm here to help! Ask me anything about velocity banking, cash flow, chunks, LOCs, or interest timing.";
  }

  let baseAnswer: string | null = null;
  let bestMatch: { qa: QAPair; score: number } | null = null;

  for (const qa of shieldGuardianQA) {
    for (const keyword of qa.keywords) {
      if (lower.includes(keyword)) {
        const score = keyword.length;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { qa, score };
        }
      }
    }
  }

  if (bestMatch) {
    const answers = bestMatch.qa.answers;
    baseAnswer = answers[Math.floor(Math.random() * answers.length)];
  }

  if (!baseAnswer) {
    const fallbackResponses = [
      "I can help with velocity banking concepts. Try asking about cash flow, the money loop, chunks, LOCs, or interest timing.",
      "Ask me about cash flow, chunks, LOCs/HELOCs, or how to use the Simulator and Vault to see payoff timelines.",
      "If you tell me your goal (car, cards, mortgage), I can help you pick a single lane and your next move."
    ];
    baseAnswer = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }

  const teacherMode = options?.teacherMode ?? false;
  if (teacherMode) {
    return formatTeacherMode(baseAnswer, input, options?.context);
  }

  return baseAnswer;
}
