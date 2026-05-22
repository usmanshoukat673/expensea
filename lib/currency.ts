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

function formatNumber(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Display: Rs 1,500 · $200 · €90 */
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
      return `${currency.symbol} ${value}`;
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
