export type CurrencyCode =
  | 'PKR'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AED'
  | 'INR'
  | 'SAR'
  | 'BDT';

export interface CurrencyDefinition {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  locale: string;
}

export const CURRENCIES: CurrencyDefinition[] = [
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', flag: '🇵🇰', locale: 'en-PK' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', flag: '🇦🇪', locale: 'en-AE' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', locale: 'en-IN' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦', locale: 'ar-SA' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩', locale: 'en-BD' },
];

const currencyMap = new Map(CURRENCIES.map((c) => [c.code, c]));

export function normalizeCurrencyCode(code?: string | null): CurrencyCode {
  const upper = (code ?? 'PKR').toUpperCase();
  if (currencyMap.has(upper as CurrencyCode)) return upper as CurrencyCode;
  return 'PKR';
}

export function getCurrency(code?: string | null): CurrencyDefinition {
  return currencyMap.get(normalizeCurrencyCode(code)) ?? CURRENCIES[0];
}

function hasFractionalCents(amount: number): boolean {
  return Math.abs(amount - Math.trunc(amount)) > Number.EPSILON;
}

function formatNumber(amount: number, locale: string): string {
  const hasDecimals = hasFractionalCents(amount);

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Display: PKR 1,500 · PKR 122.50 · $200 · $99.99 */
export function formatCurrencyAmount(amount: number, code?: string | null): string {
  const currency = getCurrency(code);
  const value = formatNumber(amount, currency.locale);

  switch (currency.code) {
    case 'USD':
    case 'EUR':
    case 'GBP':
    case 'INR':
      return `${currency.symbol}${value}`;
    case 'PKR':
      return `${currency.code} ${value}`;
    case 'AED':
    case 'SAR':
      return `${currency.symbol} ${value}`;
    case 'BDT':
      return `${currency.symbol}${value}`;
    default:
      return `${currency.symbol} ${value}`;
  }
}

export function getCurrencyLabel(code?: string | null): string {
  const c = getCurrency(code);
  return `${c.flag} ${c.code} — ${c.name}`;
}
