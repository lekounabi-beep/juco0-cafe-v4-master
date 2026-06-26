/**
 * Validation utilities
 */

const GREEK_MOBILE_PATTERN = /^(?:69\d{8}|\+3069\d{8})$/;
const GREEK_LANDLINE_PATTERN = /^(?:2\d{9}|\+302\d{9})$/;

export function normalizeGreekPhone(value: string): string {
  return value.trim().replace(/[\s-]/g, "");
}

export function isGreekPhone(value: string): boolean {
  const normalized = normalizeGreekPhone(value);
  return GREEK_MOBILE_PATTERN.test(normalized) || GREEK_LANDLINE_PATTERN.test(normalized);
}

export function isGreekLandline(value: string): boolean {
  return GREEK_LANDLINE_PATTERN.test(normalizeGreekPhone(value));
}

export const validators = {
  phone: (value: string): boolean => {
    return isGreekPhone(value);
  },

  name: (value: string): boolean => {
    return value.trim().length >= 2;
  },
};
