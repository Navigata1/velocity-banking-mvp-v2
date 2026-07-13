import { buildMobileLearnSnapshot } from '@interestshield/financial-engine';
import { View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import { MobileRouteScreen } from './route-screen';

export function LearnRoute() {
  return (
    <MobileRouteScreen
      mode="learn"
      renderContent={({ input }) => {
        const learn = buildMobileLearnSnapshot(input);
        return (
          <View style={{ gap: 12 }}>
            {learn.guardrail ? (
              <FinancialCard title="Learning Mode" value="Review inputs" detail={learn.guardrail} />
            ) : null}
            {learn.lessons.map((lesson) => (
              <FinancialCard key={lesson.title} title={lesson.title} value={lesson.value} detail={lesson.detail} />
            ))}
          </View>
        );
      }}
    />
  );
}
