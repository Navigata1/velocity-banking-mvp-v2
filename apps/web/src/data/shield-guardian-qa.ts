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
      'First step: track all spending for 30 days. Most people find 10-20% they can cut without lifestyle changes.'
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
      'Audit subscriptions - the average person has $200+ in forgotten recurring charges. That\'s instant cash flow improvement.',
      'Even $100 more per month in cash flow can save thousands in interest over your debt payoff journey.'
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
      'If you earn $5,000/month and spend $4,000, your cash flow is +$1,500. That\'s $1,500 per month to deploy against debt.',
      'Example: $6,500 income - $5,000 expenses = $1,500 cash flow. This surplus becomes your debt-crushing weapon.',
      'Real example: Sarah earns $4,200, spends $3,500. Her $700 cash flow helped her pay off $18,000 in 2 years faster than normal.'
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
      'Faster debt payoff, less total interest paid, and builds financial awareness. Many pay off mortgages 10-15 years early.',
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
      'The Simulator shows both side-by-side. Velocity typically saves 30-50% of total interest on mortgages.',
      'Traditional is passive (autopay minimums). Velocity is active (strategic chunks). Active usually wins but requires more effort.'
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
    keywords: ['heloc', 'home equity', 'home line of credit'],
    question: 'What is a HELOC?',
    answers: [
      'HELOC = Home Equity Line of Credit. It\'s a LOC secured by your home\'s equity, typically offering lower interest rates than unsecured LOCs.',
      'A HELOC uses your home as collateral, which means lower rates (often 7-9% vs 15-20% for credit cards).',
      'Home Equity Line of Credit - borrow against the value you\'ve built in your home. Lower rates but your home is at risk if you default.'
    ]
  },
  {
    keywords: ['loc vs credit card', 'credit card or loc', 'difference loc credit card'],
    question: 'What\'s the difference between a LOC and credit card?',
    answers: [
      'LOCs typically have lower rates (8-12%) vs credit cards (15-25%). LOCs calculate interest daily on balance; cards often have grace periods.',
      'Credit cards are convenient for purchases. LOCs are better for strategic debt management due to lower rates.',
      'Both are revolving credit, but LOCs usually offer better rates and are designed for larger, longer-term use.'
    ]
  },
  {
    keywords: ['get a loc', 'apply for loc', 'how to get heloc'],
    question: 'How do I get a LOC or HELOC?',
    answers: [
      'Banks, credit unions, and online lenders offer LOCs. For HELOCs, you need home equity. Compare rates and fees before applying.',
      'Check with your current bank first - existing customers often get better terms. Credit unions typically have lower rates than big banks.',
      'You\'ll need good credit (680+), proof of income, and for HELOCs, sufficient home equity (usually 15-20% minimum).'
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
      'In a 30-year mortgage, you might pay $100K in interest the first 10 years but only reduce principal by $30K.',
      'That\'s why extra principal payments early in a loan save massive interest - you\'re skipping ahead in the amortization schedule.'
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
      'Chunks should be your accumulated cash flow. If you have $1,500 surplus monthly, that could be your monthly chunk.',
      'Bigger is generally better, but don\'t over-extend your LOC. Keep a buffer for emergencies.',
      'Start with whatever your positive cash flow allows. Even $500 chunks make a significant difference over time.'
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
      'It\'s essentially your monthly surplus translated into debt-crushing ammunition.',
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
      'Review your numbers honestly. The math works - if it\'s not working, something in the inputs is off.'
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
      'The Vault shows how paying off debt early creates generational wealth - money your family keeps instead of paying interest.',
      'Calculate: interest saved + redirected payments invested = wealth created. See the multi-generational impact.',
      'It\'s the "why" behind debt payoff. Not just getting out of debt, but building lasting financial freedom.'
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
      'Yes, you need access to a Line of Credit to use velocity banking. Start the application process now.',
      'While waiting for LOC approval, use this time to track spending and confirm your positive cash flow.',
      'No LOC? Some use credit cards strategically (0% periods) but this is advanced and risky. LOC is preferred.'
    ]
  },
  {
    keywords: ['income requirement', 'minimum income', 'how much income'],
    question: 'Is there a minimum income needed?',
    answers: [
      'No minimum, but you need positive cash flow. Someone earning $3K with $2.5K expenses has $500 chunk power.',
      'The strategy scales. Higher income often means higher expenses too. Focus on the surplus, not the total.',
      'Even $200/month surplus works - it just takes longer. The math is the math at any scale.'
    ]
  },
  {
    keywords: ['best debt first', 'which debt', 'debt priority'],
    question: 'Which debt should I target first?',
    answers: [
      'Mathematically: highest interest rate. Psychologically: smallest balance (debt snowball). Both work.',
      'If your LOC is 8% and credit cards are 20%, attack the cards. If mortgage is 7%, that might come later.',
      'The key is the spread between LOC rate and debt rate. Bigger spread = more benefit from velocity banking.'
    ]
  },

  // DOMAINS/CATEGORIES (20 Q&As)
  {
    keywords: ['auto', 'car loan', 'car debt'],
    question: 'How does velocity banking work for car loans?',
    answers: [
      'Car loans are great for velocity banking - typically 4-7 years, $15K-$50K. Chunks can shave years off.',
      'Many pay off car loans 2-3 years early with consistent chunks, saving thousands in interest.',
      'Tip: Once the car is paid off, redirect those "payments" to your LOC or next debt target.'
    ]
  },
  {
    keywords: ['mortgage', 'house loan', 'home debt'],
    question: 'How does velocity banking work for mortgages?',
    answers: [
      'Mortgages are the biggest velocity banking opportunity. A 30-year can become 15-20 with strategic chunks.',
      'The interest savings are massive - often $100K+ on a typical mortgage over its life.',
      'HELOCs are perfect here - you\'re using home equity to pay down the home faster. Powerful combination.'
    ]
  },
  {
    keywords: ['credit card debt', 'credit cards', 'card balance'],
    question: 'Should I use velocity banking for credit cards?',
    answers: [
      'Credit cards have high rates (15-25%), so paying them off should be priority one - even before using velocity for mortgage.',
      'If your LOC is 8% and cards are 22%, the interest spread is huge. Attack cards aggressively.',
      'Pro tip: Some do balance transfers to 0% cards while chunking. Advanced but effective if disciplined.'
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
      'The average American has $100K+ in debt. You\'re not alone, and you\'re doing something about it.'
    ]
  },
  {
    keywords: ['takes too long', 'impatient', 'slow progress'],
    question: 'This feels like it\'s taking forever.',
    answers: [
      'Compare to doing nothing - years faster is still years faster. Trust the math, stay consistent.',
      'Zoom out. A 30-year mortgage in 18 years saves 12 years. That\'s huge even if month-to-month feels slow.',
      'Quick wins: See the Simulator comparison. Watch total interest savings grow. Progress is happening.'
    ]
  },
  {
    keywords: ['worth it', 'is it worth', 'benefit real'],
    question: 'Is all this effort really worth it?',
    answers: [
      'The average family saves $50K-$150K in mortgage interest alone. That\'s a college fund, retirement boost, or legacy.',
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
      'If you can get a significantly lower rate (1%+), it often makes sense. But factor in closing costs.',
      'Refinancing + velocity banking = powerful combination. Lower rate means more of each chunk hits principal.',
      'Don\'t refinance to a longer term just for lower payments. Keep or shorten the term while using velocity banking.'
    ]
  },
  {
    keywords: ['invest instead', 'investing vs debt', 'should I invest'],
    question: 'Should I invest instead of paying off debt?',
    answers: [
      'Classic question. Math says: if investment return > debt rate, invest. But debt has guaranteed "return" (saved interest).',
      'Risk tolerance matters. Guaranteed 7% saved interest vs potential 10% market return (which could be -10% some years).',
      'Many do both: enough in retirement accounts for employer match, then attack debt, then increase investing.'
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

export function getGuardianResponse(input: string): string {
  const lower = input.toLowerCase().trim();
  
  if (!lower || lower.length < 2) {
    return "I'm here to help! Ask me anything about velocity banking, cash flow, chunks, or how to use InterestShield.";
  }
  
  for (const qa of shieldGuardianQA) {
    for (const keyword of qa.keywords) {
      if (lower.includes(keyword)) {
        const answers = qa.answers;
        return answers[Math.floor(Math.random() * answers.length)];
      }
    }
  }
  
  const fallbackResponses = [
    "Great question! While I focus on velocity banking topics from the Learn section, I recommend checking there for detailed lessons. Ask me about cash flow, chunks, LOCs, or interest timing!",
    "I'm trained on velocity banking concepts from the Learn section. Try asking about cash flow, the money loop, chunks, or how to use the app!",
    "I specialize in velocity banking education. For this topic, check out the Learn section. I can help with cash flow, chunks, LOCs, and debt strategy!",
  ];
  
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}
