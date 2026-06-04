function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (isEmpty(a) && isEmpty(b)) return true;

  if (
    typeof a === "object" &&
    a !== null &&
    typeof b === "object" &&
    b !== null &&
    "from" in a &&
    "from" in b
  ) {
    const aFrom = (a as { from?: unknown }).from;
    const bFrom = (b as { from?: unknown }).from;
    const aTo = (a as { to?: unknown }).to;
    const bTo = (b as { to?: unknown }).to;
    return aFrom === bFrom && aTo === bTo;
  }

  return false;
}

export function countActiveFilters<T extends Record<string, unknown>>(
  values: T,
  defaults: T,
): number {
  return Object.keys(defaults).reduce((count, key) => {
    const value = values[key];
    const defaultValue = defaults[key];
    return valuesEqual(value, defaultValue) ? count : count + 1;
  }, 0);
}

export function hasActiveFilters<T extends Record<string, unknown>>(
  values: T,
  defaults: T,
): boolean {
  return countActiveFilters(values, defaults) > 0;
}
