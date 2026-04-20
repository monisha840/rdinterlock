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

// Strict name fields: letters, spaces and a small set of punctuation (. ' -)
// allowed for names like "O'Brien" or "Dr. Murugan". Digits are stripped.
export const sanitizeName = (value: string): string => {
  if (!value) return "";
  return sanitizeText(value)
    .replace(/[0-9]/g, "")
    // Collapse runs of spaces
    .replace(/\s{2,}/g, " ");
};

// Validity check — a name must contain at least one letter and no digits.
export const isValidName = (value: string): boolean => {
  const v = (value || "").trim();
  if (v.length < 2) return false;
  if (/\d/.test(v)) return false;
  return /[A-Za-z\u00C0-\u024F]/.test(v);
};

// Phone: digits only, capped at 10 chars.
export const sanitizePhone = (value: string): string => {
  return (value || "").replace(/\D/g, "").slice(0, 10);
};

export const isValidPhone = (value: string): boolean => {
  const v = (value || "").replace(/\D/g, "");
  return v.length === 10 && /^[6-9]/.test(v);
};
