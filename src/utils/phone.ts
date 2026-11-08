/** RIDO targets Philippine motorcycle tours, so bare numbers default to +63. */
const DEFAULT_COUNTRY_CODE = '+63';
const E164_PATTERN = /^\+\d{10,15}$/;

/**
 * Normalises a rider-entered number to E.164 so Firebase and Firestore always
 * see one canonical form (`09171234567`, `9171234567` and `+639171234567`
 * all become `+639171234567`).
 */
export function normalizePhoneNumber(input: string): string {
  const compact = input.trim().replace(/[\s()\-.]/g, '');

  if (!compact) {
    return '';
  }

  if (compact.startsWith('+')) {
    return compact;
  }

  if (compact.startsWith('0')) {
    return `${DEFAULT_COUNTRY_CODE}${compact.slice(1)}`;
  }

  if (compact.startsWith('63')) {
    return `+${compact}`;
  }

  return `${DEFAULT_COUNTRY_CODE}${compact}`;
}

export function isValidPhoneNumber(input: string): boolean {
  return E164_PATTERN.test(normalizePhoneNumber(input));
}
