import { buildMobilePortfolioSnapshot } from '@interestshield/financial-engine';
import { View } from 'react-native';
import { FinancialCard } from '@/components/financial-card';
import { MobilePortfolioPath } from '../mobile-shell/portfolio-path';
import { MobileRouteScreen } from './route-screen';

export function PortfolioRoute() {
  return (
    <MobileRouteScreen
      mode="portfolio"
      renderContent={({ input }) => {
        const portfolio = buildMobilePortfolioSnapshot(input);
        return (
          <View style={{ gap: 12 }}>
            <FinancialCard
              title="Portfolio Coverage"
              value={portfolio.cashFlowAfterMinimumsLabel}
              detail={portfolio.guardrail ?? `Cash flow after modeled minimums. Total minimums: ${portfolio.totalMinimumsLabel}.`}
            />
            <FinancialCard title="Modeling Mode" value={portfolio.modelingLabel} detail={portfolio.modelingDetail} />
            <FinancialCard title="Total Modeled Debt" value={portfolio.totalDebtLabel} detail="Current mobile shell starts with the active web demo debt." />
            <MobilePortfolioPath path={portfolio.payoffPath} />
            {portfolio.priorities.map((priority) => (
              <FinancialCard
                key={priority.name}
                title={priority.name}
                value={priority.balanceLabel}
                detail={`${priority.reason} Minimum payment: ${priority.minimumPaymentLabel}.`}
              />
            ))}
          </View>
        );
      }}
    />
  );
}
