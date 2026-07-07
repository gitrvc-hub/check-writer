// Currency, number and date formatting helpers.

import { format, parseISO } from "date-fns";

/** ₱1,234,567.89 style formatting. */
export function formatCurrency(amount: number, currency = "PHP"): string {
  const symbol = currencySymbol(currency);
  const formatted = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount < 0 ? "-" : ""}${symbol}${formatted}`;
}

/** Plain grouped number, no symbol: 1,234,567.89 (used inside the cheque box). */
export function formatAmountFigures(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function currencySymbol(currency: string): string {
  switch (currency) {
    case "PHP":
      return "₱";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    default:
      return currency + " ";
  }
}

/** Parse an ISO date string safely; returns null on failure. */
function toDate(iso: string): Date | null {
  if (!iso) return null;
  try {
    const d = iso.length <= 10 ? parseISO(iso) : new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** Human display date: "Jul 07, 2026". */
export function formatDate(iso: string): string {
  const d = toDate(iso);
  return d ? format(d, "MMM dd, yyyy") : iso;
}

/** Date+time for the register: "Jul 07, 2026 09:56". */
export function formatDateTime(iso: string): string {
  const d = toDate(iso);
  return d ? format(d, "MMM dd, yyyy HH:mm") : iso;
}

/** Today's date as yyyy-MM-dd, suitable for <input type="date"> and storage. */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Format a date for printing into a template field, honouring a pattern string.
 * Common Philippine cheque patterns: "MM/dd/yyyy", "MMddyyyy" (boxed digits).
 */
export function formatDatePattern(iso: string, pattern = "MM/dd/yyyy"): string {
  const d = toDate(iso);
  return d ? format(d, pattern) : iso;
}
