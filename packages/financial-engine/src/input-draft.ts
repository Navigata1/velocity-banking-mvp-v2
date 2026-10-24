export type FinancialInputKind = 'money' | 'percent' | 'legacy-percent' | 'whole';
export interface FinancialInputBounds { minimum?: number; maximum?: number }

function shiftDecimal(text: string, places: number): string {
  const [mantissa, exponent = '0'] = text.toLowerCase().split('e');
  const negative = mantissa.startsWith('-');
  const [integer, fraction = ''] = mantissa.replace(/^-/, '').split('.');
  const digits = integer + fraction;
  const point = integer.length + Number(exponent) + places;
  const expanded = point <= 0 ? `0.${'0'.repeat(-point)}${digits}`
    : point >= digits.length ? digits + '0'.repeat(point - digits.length)
      : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return (negative ? '-' : '') + expanded.replace(/^0+(?=\d)/, '');
}

export function formatFinancialInput(value: number, kind: FinancialInputKind): string {
  const fraction = kind === 'percent' || kind === 'legacy-percent' && value <= 1;
  return Number.isFinite(value) ? shiftDecimal(String(value), fraction ? 2 : 0) : '';
}

function canonicalDecimal(text: string): string {
  const [integer, fraction = ''] = shiftDecimal(text, 0).split('.');
  const significantFraction = fraction.replace(/0+$/, '');
  return integer + (significantFraction ? `.${significantFraction}` : '');
}

export function resolveFinancialDraft(value: number, draft: string, kind: FinancialInputKind, bounds: FinancialInputBounds = {}): {
  value: number;
  error: string | null;
} {
  // An unchanged display must not round-trip the original IEEE value through formatting.
  if (draft === formatFinancialInput(value, kind)) return { value, error: null };
  const dollarPrefix = kind === 'money' && /^\$\s*/.test(draft.trim());
  const text = dollarPrefix ? draft.trim().replace(/^\$\s*/, '') : draft.trim();
  if (text.includes(',') && !(dollarPrefix && /\.\d+$/.test(text))) {
    return { value, error: 'Use a period for decimals.' };
  }
  const valid = /^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)$/.test(text);
  const raw = text.replace(/,/g, '');
  const legacy = kind === 'legacy-percent';
  // Equivalent edits must not migrate an existing mixed-unit legacy record.
  if (legacy && valid && Number.isFinite(value) && canonicalDecimal(raw) === canonicalDecimal(formatFinancialInput(value, kind))) return { value, error: null };
  const fraction = kind === 'percent' || legacy && Number(raw) <= 100;
  const decimal = valid ? (fraction ? shiftDecimal(raw, -2) : raw) : '';
  const parsed = valid ? Number(decimal) : NaN;
  const fractionalWhole = kind === 'whole' && /[1-9]/.test(raw.split('.')[1] ?? '');
  const underflow = parsed === 0 && /[1-9]/.test(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || underflow || fractionalWhole || (kind === 'whole' && !Number.isSafeInteger(parsed))) {
    return { value, error: kind === 'whole' ? 'Enter a non-negative whole number.' : 'Enter a valid non-negative number.' };
  }
  if (canonicalDecimal(String(parsed)) !== canonicalDecimal(decimal)) {
    return { value, error: 'Value exceeds supported precision.' };
  }
  if (Object.is(parsed, value)) return { value, error: null };
  const { minimum, maximum } = bounds;
  const comparable = (candidate: number) => legacy ? Number(formatFinancialInput(candidate, kind)) : candidate;
  const validBound = (bound: number | undefined) => bound === undefined || Number.isFinite(bound) && bound >= 0;
  if (!validBound(minimum) || !validBound(maximum) || minimum !== undefined && maximum !== undefined && comparable(minimum) > comparable(maximum)) {
    return { value, error: 'Input range is invalid.' };
  }
  const suffix = kind === 'percent' || legacy ? '%' : '';
  if (minimum !== undefined && comparable(parsed) < comparable(minimum)) return { value, error: `Enter at least ${formatFinancialInput(minimum, kind)}${suffix}.` };
  if (maximum !== undefined && comparable(parsed) > comparable(maximum)) return { value, error: `Enter at most ${formatFinancialInput(maximum, kind)}${suffix}.` };
  return { value: parsed, error: null };
}
