export const FINANCIAL_AMOUNT_MAX = 999_999_999.99;
export const FINANCIAL_AMOUNT_MAX_MESSAGE = 'Amount exceeds allowed limit';
export const FINANCIAL_AMOUNT_REQUIRED_MESSAGE = 'This field is required';
export const FINANCIAL_AMOUNT_INVALID_MESSAGE = 'Enter a valid amount';
export const FINANCIAL_AMOUNT_POSITIVE_MESSAGE = 'Amount must be greater than 0';

export function sanitizeDecimalInput(value: string, decimalPlaces = 2) {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole = '', ...decimalParts] = cleaned.split('.');
  const decimal = decimalParts.join('').slice(0, decimalPlaces);
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '');

  if (!cleaned.includes('.')) {
    return normalizedWhole;
  }

  return `${normalizedWhole}.${decimal}`;
}

export function clampMoneyInput(value: string, max = FINANCIAL_AMOUNT_MAX) {
  const sanitized = sanitizeDecimalInput(value);

  if (sanitized === '' || sanitized === '.') {
    return sanitized;
  }

  const amount = Number(sanitized);
  if (!Number.isFinite(amount)) {
    return '';
  }

  if (amount > max) {
    return String(max);
  }

  return sanitized;
}
