export interface ReversePrint {
  value: boolean;
}

export function isReversePrint(p: ReversePrint | undefined): boolean {
  return p?.value === true;
}

/** Convenience factory matching the lowercase-name convention used by consumers. */
export function reversePrint(value: boolean): ReversePrint {
  return { value };
}
