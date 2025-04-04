export function spct(x: number, places: number = 0): string {
  const sgn = x < 1 ? '' : '+';
  return `${sgn}${((x - 1) * 100).toFixed(places)}%`;
}