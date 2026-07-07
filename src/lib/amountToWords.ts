// Convert a monetary amount into English words in the Philippine bank style, e.g.
//   1234.50 -> "ONE THOUSAND TWO HUNDRED THIRTY FOUR PESOS AND 50/100 ONLY"
//         0 -> "ZERO PESOS ONLY"
//     100.00 -> "ONE HUNDRED PESOS ONLY"
//       0.75 -> "SEVENTY FIVE CENTAVOS ONLY"
//
// Philippine cheques express the fractional part as "XX/100" (centavos). The line
// is conventionally uppercased and terminated with "ONLY" to prevent tampering.

const ONES = [
  "ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
  "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
  "SEVENTEEN", "EIGHTEEN", "NINETEEN",
];

const TENS = [
  "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY",
];

// Short-scale group names. Handles up to just under a quadrillion, which is far
// beyond any realistic cheque amount.
const SCALES = ["", "THOUSAND", "MILLION", "BILLION", "TRILLION"];

/** Words for an integer 0..999 (no scale suffix). */
function threeDigitsToWords(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds > 0) {
    parts.push(ONES[hundreds], "HUNDRED");
  }
  if (rest > 0) {
    if (rest < 20) {
      parts.push(ONES[rest]);
    } else {
      const tens = Math.floor(rest / 10);
      const ones = rest % 10;
      parts.push(TENS[tens] + (ones > 0 ? " " + ONES[ones] : ""));
    }
  }
  return parts.join(" ");
}

/** Words for a non-negative integer of any (reasonable) size. */
export function integerToWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "ZERO";

  // Break into groups of three digits, least-significant first.
  const groups: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  if (groups.length > SCALES.length) {
    // Absurdly large — fall back to digits rather than throwing.
    return String(n);
  }

  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group === 0) continue;
    words.push(threeDigitsToWords(group));
    if (SCALES[i]) words.push(SCALES[i]);
  }
  return words.join(" ");
}

export interface AmountWordsOptions {
  /** Singular/plural currency name for the whole part. Default PESO/PESOS. */
  currency?: { one: string; many: string };
  /** Append "ONLY" as an anti-tamper terminator. Default true. */
  appendOnly?: boolean;
}

/**
 * Split an amount into whole units and centavos, rounding to 2 decimals with
 * banker-safe rounding (avoids 0.1+0.2 float drift).
 */
export function splitAmount(amount: number): { whole: number; cents: number } {
  const total = Math.round(Math.abs(amount) * 100);
  return { whole: Math.floor(total / 100), cents: total % 100 };
}

/**
 * Full cheque "amount in words" line.
 *
 * Examples:
 *   amountToWords(1234.5)  -> "ONE THOUSAND TWO HUNDRED THIRTY FOUR PESOS AND 50/100 ONLY"
 *   amountToWords(0.75)    -> "SEVENTY FIVE CENTAVOS ONLY"
 *   amountToWords(1)       -> "ONE PESO ONLY"
 */
export function amountToWords(amount: number, opts: AmountWordsOptions = {}): string {
  const currency = opts.currency ?? { one: "PESO", many: "PESOS" };
  const appendOnly = opts.appendOnly ?? true;

  const negative = amount < 0;
  const { whole, cents } = splitAmount(amount);

  const segments: string[] = [];

  if (whole > 0) {
    const unit = whole === 1 ? currency.one : currency.many;
    segments.push(`${integerToWords(whole)} ${unit}`);
    if (cents > 0) {
      segments.push(`AND ${pad2(cents)}/100`);
    }
  } else if (cents > 0) {
    // Whole part is zero — express purely as centavos.
    segments.push(`${padFraction(cents)}`);
  } else {
    // Exactly zero.
    segments.push(`ZERO ${currency.many}`);
  }

  let line = segments.join(" ");
  if (appendOnly) line += " ONLY";
  if (negative) line = "MINUS " + line;
  return line;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** "SEVENTY FIVE CENTAVOS" style spelled-out fraction for sub-peso amounts. */
function padFraction(cents: number): string {
  const centavo = cents === 1 ? "CENTAVO" : "CENTAVOS";
  return `${integerToWords(cents)} ${centavo}`;
}
