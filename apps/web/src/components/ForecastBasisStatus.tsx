import { assessForecastBasis, type ForecastBasis, type LenderTermsInput } from '@interestshield/financial-engine';
import { lenderTermLabels } from '@interestshield/financial-engine/lender-terms-draft';

export default function ForecastBasisStatus({ terms, computed }: { terms?: LenderTermsInput; computed?: ForecastBasis | null }) {
  const basis = computed ?? assessForecastBasis(terms);
  return <div data-testid="forecast-basis" data-basis={basis.kind} className="min-w-0 space-y-2 text-sm [overflow-wrap:anywhere]">
    <p className="font-semibold">{basis.label}</p>
    {basis.kind === 'lender-dated' ? <p className="text-xs leading-5">Declared fixed-rate LOC estimate: actual calendar days / 365, dated cash entries, financed fees and monthly interest rounding. Other debts remain monthly educational estimates. Not lender verification or a promised outcome.</p>
      : basis.canProject ? <p className="text-xs leading-5">Monthly educational estimate. No lender-specific fees, minimums, rate changes or dated posting are verified.</p>
      : <>
        <p className="text-xs leading-5">Supplied terms are retained. Payoff dates, interest savings and payment targets are not projected because the supplied inputs are not supported by this model.</p>
        {computed?.reasons.map(reason => <p key={reason} className="text-xs leading-5">{reason}</p>)}
        <details className="text-xs leading-5"><summary className="min-h-11 cursor-pointer">Term assessment</summary>
          {basis.lenderTerms.missingFields.length ? <p>Missing: {basis.lenderTerms.missingFields.map(field => lenderTermLabels[field]).join(', ')}.</p> : null}
          {basis.lenderTerms.unmodeledFields.length ? <p>Not modeled: {basis.lenderTerms.unmodeledFields.map(field => lenderTermLabels[field]).join(', ')}.</p> : null}
          <p>Document-sourced is your provenance assertion, not verification by InterestShield.</p>
        </details>
      </>}
  </div>;
}
