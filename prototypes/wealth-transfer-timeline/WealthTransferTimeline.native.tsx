import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';

/**
 * RN PORT STARTER (MVP)
 * ----------------------
 * This is a *starter* port of the Opus web prototype into React Native.
 * - Uses basic RN components + NativeWind className (if configured)
 * - Keeps the 6-step story structure
 * - Drops particles / gradients / complex animations for now
 *
 * NOTE: For production, drive results from the simulation engine rather than placeholders.
 */

type FormData = {
  age: number;
  mortgageBalance: number;
  interestRatePct: number;
  yearsRemaining: number;
};

function calculateAmortization(principal: number, annualRate: number, years: number) {
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  if (monthlyRate === 0) {
    const monthlyPayment = principal / numPayments;
    return {
      monthlyPayment,
      totalPaid: principal,
      totalInterest: 0,
    };
  }
  const pow = Math.pow(1 + monthlyRate, numPayments);
  const monthlyPayment = principal * ((monthlyRate * pow) / (pow - 1));
  const totalPaid = monthlyPayment * numPayments;
  const totalInterest = totalPaid - principal;
  return { monthlyPayment, totalPaid, totalInterest };
}

function calculateFutureValue(presentValue: number, annualReturn: number, years: number) {
  return presentValue * Math.pow(1 + annualReturn, years);
}

function formatCurrency(num: number) {
  // RN-safe formatting: keep it simple (no Intl dependency assumptions)
  const rounded = Math.round(num);
  return `$${rounded.toLocaleString()}`;
}

export default function WealthTransferTimelineNative() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    age: 32,
    mortgageBalance: 350000,
    interestRatePct: 6.5,
    yearsRemaining: 28,
  });

  const calc = useMemo(() => {
    const rate = form.interestRatePct / 100;
    const traditional = calculateAmortization(form.mortgageBalance, rate, form.yearsRemaining);

    // PLACEHOLDER “velocity” assumptions — replace with sim engine outputs.
    const velocityYears = Math.min(7, form.yearsRemaining);
    const velocityInterest = form.mortgageBalance * rate * velocityYears * 0.4;

    const investmentReturn = 0.07;
    const futureValueOfInterest = calculateFutureValue(traditional.totalInterest, investmentReturn, form.yearsRemaining);

    const moneySaved = traditional.totalInterest - velocityInterest;

    return {
      traditional,
      velocityYears,
      velocityInterest,
      moneySaved,
      futureValueOfInterest,
      payoffAge: form.age + form.yearsRemaining,
      velocityPayoffAge: form.age + velocityYears,
    };
  }, [form]);

  const steps = [
    {
      title: 'Your Numbers',
      subtitle: "Let’s see the long-term cost — calmly and clearly.",
      content: (
        <View className="space-y-4">
          <Field
            label="Your current age"
            value={form.age}
            onChange={(v) => setForm((p) => ({ ...p, age: v }))}
          />
          <Field
            label="Mortgage balance"
            value={form.mortgageBalance}
            onChange={(v) => setForm((p) => ({ ...p, mortgageBalance: v }))}
          />
          <Field
            label="Interest rate (APR %)"
            value={form.interestRatePct}
            onChange={(v) => setForm((p) => ({ ...p, interestRatePct: v }))}
          />
          <Field
            label="Years remaining"
            value={form.yearsRemaining}
            onChange={(v) => setForm((p) => ({ ...p, yearsRemaining: v }))}
          />
          <Text className="text-xs text-gray-400">
            Tip: if you’re not sure, use your last statement. You can refine later.
          </Text>
        </View>
      ),
    },
    {
      title: 'The Wealth Transfer',
      subtitle: "Here’s the full picture — principal versus interest.",
      content: (
        <View className="space-y-4">
          <Card>
            <Row label="Monthly payment" value={formatCurrency(calc.traditional.monthlyPayment)} />
            <Row label={`Total paid over ${form.yearsRemaining} years`} value={formatCurrency(calc.traditional.totalPaid)} />
            <Row label="Principal" value={formatCurrency(form.mortgageBalance)} accent="emerald" />
            <Row label="Interest" value={formatCurrency(calc.traditional.totalInterest)} accent="red" />
          </Card>
          <Text className="text-xs text-gray-400">
            This is not about blame. It’s about understanding the tool you’re using.
          </Text>
        </View>
      ),
    },
    {
      title: 'The Alternative',
      subtitle: 'What changes when your payoff timeline gets shorter?',
      content: (
        <View className="space-y-4">
          <Card>
            <Row label="Traditional debt-free" value={`Age ${calc.payoffAge}`} />
            <Row label="Velocity estimate" value={`Age ${calc.velocityPayoffAge}`} accent="emerald" />
            <Row label="Interest kept" value={formatCurrency(calc.moneySaved)} accent="emerald" />
          </Card>
          <Text className="text-xs text-gray-400">
            In production, this screen should use the simulator’s real outputs.
          </Text>
        </View>
      ),
    },
  ];

  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <View className="flex-1 bg-gray-900">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="items-center mb-6">
          <Text className="text-white text-2xl font-bold text-center">{current.title}</Text>
          <Text className="text-gray-400 text-center mt-1">{current.subtitle}</Text>

          {/* stepper */}
          <View className="flex-row gap-2 mt-4">
            {steps.map((_, i) => (
              <View
                key={i}
                className={`${i === step ? 'bg-emerald-500' : i < step ? 'bg-emerald-800' : 'bg-gray-700'} h-1 rounded-full`}
                style={{ width: i === step ? 28 : 14 }}
              />
            ))}
          </View>
        </View>

        {current.content}

        <View className="flex-row gap-3 mt-8">
          {!isFirst && (
            <Pressable
              className="flex-1 bg-gray-800 rounded-xl py-3 items-center"
              onPress={() => setStep((s) => Math.max(0, s - 1))}
            >
              <Text className="text-white font-medium">Back</Text>
            </Pressable>
          )}
          <Pressable
            className="flex-1 bg-emerald-600 rounded-xl py-3 items-center"
            onPress={() => setStep((s) => (isLast ? 0 : Math.min(steps.length - 1, s + 1)))}
          >
            <Text className="text-white font-semibold">{isLast ? 'Start over' : 'Continue'}</Text>
          </Pressable>
        </View>

        <Text className="text-gray-600 text-xs italic text-center mt-6">
          Investment growth is hypothetical. Returns are not guaranteed.
        </Text>
      </ScrollView>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4 space-y-3">{children}</View>;
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'emerald' | 'red';
}) {
  const valueClass =
    accent === 'emerald' ? 'text-emerald-400' : accent === 'red' ? 'text-red-400' : 'text-white';
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-gray-400 text-sm">{label}</Text>
      <Text className={`${valueClass} font-mono text-sm`}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View>
      <Text className="text-gray-400 text-sm mb-2">{label}</Text>
      <TextInput
        keyboardType="numeric"
        value={String(value)}
        onChangeText={(t) => onChange(Number(t.replace(/[^0-9.]/g, '')) || 0)}
        className="bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-lg"
      />
    </View>
  );
}
