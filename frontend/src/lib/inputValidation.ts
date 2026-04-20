// Input sanitization helpers used across forms to keep validation consistent.

// Numeric fields: digits + optional single decimal point. Ignores everything else.
export const sanitizeNumber = (value: string, { allowDecimal = true }: { allowDecimal?: boolean } = {}): string => {
  if (!value) return "";
  let cleaned = value.replace(allowDecimal ? /[^\d.]/g : /[^\d]/g, "");
  if (allowDecimal) {
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
      cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
    }
  }
  // Strip leading zeros ("007" -> "7"), but preserve "0.x"
  if (cleaned.length > 1 && cleaned.startsWith("0") && cleaned[1] !== ".") {
    cleaned = cleaned.replace(/^0+/, "") || "0";
  }
  return cleaned;
};

// Text fields (names, notes): allow letters, numbers, spaces, and basic punctuation.
// Blocks emoji and control characters.
export const sanitizeText = (value: string): string => {
  if (!value) return "";
  // Remove control chars (except newline/tab) and non-BMP emoji ranges.
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "");
};

// Phone: digits only, capped at 10 chars.
export const sanitizePhone = (value: string): string => {
  return (value || "").replace(/\D/g, "").slice(0, 10);
};

export const isValidPhone = (value: string): boolean => {
  const v = (value || "").replace(/\D/g, "");
  return v.length === 10 && /^[6-9]/.test(v);
};
