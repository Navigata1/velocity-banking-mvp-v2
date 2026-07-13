import type { MobileDashboardSnapshot } from '@interestshield/financial-engine';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

type MobileLoopStep = MobileDashboardSnapshot['loop'][number];

const mobileLoopOrbitPositions: Record<string, { left: number; top: number }> = {
  Income: { left: 93, top: 8 },
  LOC: { left: 176, top: 48 },
  Expenses: { left: 158, top: 154 },
  'Cash Flow': { left: 28, top: 154 },
  Principal: { left: 10, top: 48 },
};

const mobileLoopToneStyles: Record<string, { accent: string; surface: string; text: string }> = {
  Income: { accent: '#34d399', surface: '#064e3b', text: '#bbf7d0' },
  LOC: { accent: '#38bdf8', surface: '#075985', text: '#bae6fd' },
  Expenses: { accent: '#fbbf24', surface: '#78350f', text: '#fde68a' },
  'Cash Flow': { accent: '#34d399', surface: '#065f46', text: '#bbf7d0' },
  Principal: { accent: '#22c55e', surface: '#064e3b', text: '#bbf7d0' },
};

function loopNodeId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getLoopTone(step: MobileLoopStep): { accent: string; surface: string; text: string } {
  return mobileLoopToneStyles[step.label] ?? { accent: '#94a3b8', surface: '#1e293b', text: '#e2e8f0' };
}

export function MobileMoneyLoopOrbit({ steps }: { steps: MobileLoopStep[] }) {
  const [activeLabel, setActiveLabel] = useState(steps[0]?.label ?? 'Income');
  const activeStep = steps.find((step) => step.label === activeLabel) ?? steps[0];
  const activeIndex = Math.max(0, steps.findIndex((step) => step.label === activeStep?.label));
  const activeTone = activeStep ? getLoopTone(activeStep) : mobileLoopToneStyles.Income;

  if (!activeStep) {
    return null;
  }

  return (
    <View
      testID="mobile-payoff-orbit"
      accessibilityLabel="Money Loop payoff orbit"
      accessibilityRole="radiogroup"
      style={{
        backgroundColor: '#020617',
        borderColor: activeTone.accent,
        borderCurve: 'continuous',
        borderRadius: 18,
        borderWidth: 1,
        gap: 14,
        overflow: 'hidden',
        padding: 14,
      }}
    >
      <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
        Payoff Orbit
      </Text>

      <View style={{ alignItems: 'center' }}>
        <View style={{ height: 230, width: 230 }}>
          <View
            style={{
              borderColor: activeTone.accent,
              borderRadius: 92,
              borderWidth: 1,
              height: 184,
              left: 23,
              opacity: 0.48,
              position: 'absolute',
              top: 23,
              transform: [{ rotateX: '62deg' }, { rotateZ: '-14deg' }],
              width: 184,
            }}
          />
          <View
            style={{
              borderColor: '#334155',
              borderRadius: 68,
              borderWidth: 1,
              height: 136,
              left: 47,
              opacity: 0.7,
              position: 'absolute',
              top: 47,
              transform: [{ rotateX: '62deg' }, { rotateZ: '-14deg' }],
              width: 136,
            }}
          />
          <View
            style={{
              alignItems: 'center',
              backgroundColor: activeTone.surface,
              borderColor: activeTone.accent,
              borderCurve: 'continuous',
              borderRadius: 58,
              borderWidth: 2,
              height: 116,
              justifyContent: 'center',
              left: 57,
              position: 'absolute',
              shadowColor: activeTone.accent,
              shadowOpacity: 0.25,
              shadowRadius: 18,
              top: 57,
              transform: [{ rotateX: '58deg' }, { rotateZ: '-14deg' }],
              width: 116,
            }}
          >
            <Text selectable style={{ color: '#f8fafc', fontSize: 12, fontWeight: '900' }}>
              {String(activeIndex + 1).padStart(2, '0')}
            </Text>
            <Text selectable style={{ color: activeTone.text, fontSize: 13, fontWeight: '900', marginTop: 2 }}>
              {activeStep.label}
            </Text>
          </View>

          {steps.map((step, index) => {
            const tone = getLoopTone(step);
            const isActive = step.label === activeStep.label;
            const position = mobileLoopOrbitPositions[step.label] ?? { left: 93, top: 8 };

            return (
              <Pressable
                key={step.label}
                testID={`mobile-payoff-orbit-node-${loopNodeId(step.label)}`}
                accessibilityLabel={`${step.label} orbit step`}
                accessibilityRole="radio"
                accessibilityState={{ checked: isActive, selected: isActive }}
                aria-checked={isActive}
                aria-selected={isActive}
                onPress={() => setActiveLabel(step.label)}
                style={{
                  alignItems: 'center',
                  backgroundColor: isActive ? tone.accent : tone.surface,
                  borderColor: isActive ? '#f8fafc' : tone.accent,
                  borderRadius: 22,
                  borderWidth: 1,
                  height: 44,
                  justifyContent: 'center',
                  left: position.left,
                  position: 'absolute',
                  top: position.top,
                  width: 44,
                }}
              >
                <Text selectable style={{ color: isActive ? '#020617' : tone.text, fontSize: 13, fontWeight: '900' }}>
                  {index + 1}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 4 }}>
        <Text selectable style={{ color: activeTone.text, fontSize: 24, fontWeight: '900', lineHeight: 30 }}>
          {activeStep.value}
        </Text>
        <Text selectable style={{ color: '#f8fafc', fontSize: 18, fontWeight: '900' }}>
          {activeStep.label}
        </Text>
        <Text selectable style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 20 }}>
          {activeStep.detail}
        </Text>
      </View>
    </View>
  );
}

export function MobileMoneyLoopPressureStrip({ steps }: { steps: MobileLoopStep[] }) {
  return (
    <View
      testID="mobile-money-loop-pressure"
      accessibilityLabel="Money Loop pressure strip"
      style={{
        backgroundColor: '#020617',
        borderColor: '#1e293b',
        borderCurve: 'continuous',
        borderRadius: 18,
        borderWidth: 1,
        gap: 12,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text selectable style={{ color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
            Loop Pressure
          </Text>
          <Text selectable style={{ color: '#f8fafc', fontSize: 18, fontWeight: '900', lineHeight: 24 }}>
            Model-backed flow intensity
          </Text>
        </View>
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#0f172a',
            borderColor: '#334155',
            borderCurve: 'continuous',
            borderRadius: 10,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 7,
          }}
        >
          <Text selectable style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '900' }}>
            8-100%
          </Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {steps.map((step) => {
          const tone = getLoopTone(step);
          const pressurePercent = Math.min(100, Math.max(8, Math.round(step.pressurePercent)));

          return (
            <View
              key={step.label}
              testID={`mobile-money-loop-pressure-segment-${loopNodeId(step.label)}`}
              accessibilityLabel={`${step.label} loop pressure ${pressurePercent}%`}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: pressurePercent }}
              style={{ gap: 6 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Text selectable style={{ color: '#f8fafc', flex: 1, fontSize: 13, fontWeight: '900' }}>
                  {step.label}
                </Text>
                <Text selectable style={{ color: tone.text, fontSize: 13, fontWeight: '900' }}>
                  {pressurePercent}%
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderCurve: 'continuous',
                  borderRadius: 999,
                  borderWidth: 1,
                  height: 12,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    backgroundColor: tone.accent,
                    borderRadius: 999,
                    height: '100%',
                    opacity: 0.88,
                    width: `${pressurePercent}%`,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>

      <Text selectable style={{ color: '#94a3b8', fontSize: 12, lineHeight: 18 }}>
        Educational estimate. Pressure shows relative intensity, not a guarantee.
      </Text>
    </View>
  );
}
