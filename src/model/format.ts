export function pct(x: number, places: number = 0): string {
    return `${(x * 100).toFixed(places)}%`;
}
    
export function rpct(x: number, places: number = 0): string {
    return `${(x * 100).toFixed(places)}`;
}

export function spct(x: number, places: number = 0): string {
  const sgn = x < 1 ? '' : '+';
  return `${sgn}${((x - 1) * 100).toFixed(places)}%`;
}