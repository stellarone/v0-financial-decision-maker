/**
 * OData filter helpers for Acumatica $filter query strings.
 *
 * Ported from `MemberTenant.filterEq / filterContains / filterIn / filterAnd /
 * filterOr` static methods. Consumers can use these to build filter strings
 * for endpoints that accept an OData `$filter` (most read endpoints do not
 * forward $filter, but a few — accounts, trial-balance, vendor search — do).
 *
 * All helpers assume the input strings do NOT need OData quote-escaping
 * (single quotes are not auto-escaped). If you pass user-supplied input,
 * sanitize single quotes first.
 */

/** Build an equality filter: `field eq 'value'` (string) or `field eq value` (number). */
export function filterEq(field: string, value: string | number): string {
  if (typeof value === "string") {
    return `${field} eq '${value}'`;
  }
  return `${field} eq ${value}`;
}

/** Build a substring-match filter: `contains(field, 'value')`. */
export function filterContains(field: string, value: string): string {
  return `contains(${field}, '${value}')`;
}

/** Build a multi-value OR filter: `(field eq 'a' or field eq 'b')`. */
export function filterIn(field: string, values: string[]): string {
  const conditions = values.map((v) => `${field} eq '${v}'`);
  return `(${conditions.join(" or ")})`;
}

/** AND-combine multiple filters, dropping empties. */
export function filterAnd(...filters: string[]): string {
  return filters.filter(Boolean).join(" and ");
}

/** OR-combine multiple filters (always wrapped in parens), dropping empties. */
export function filterOr(...filters: string[]): string {
  return `(${filters.filter(Boolean).join(" or ")})`;
}
