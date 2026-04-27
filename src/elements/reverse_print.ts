export interface ReversePrint {
  Value: boolean;
}

export function isReversePrint(p: ReversePrint | undefined): boolean {
  return p?.Value === true;
}
