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

export function grade(t: number) {
  switch (true) {
      case t > 98: return 'S';
      case t > 90: return 'A';
      case t > 70: return 'B';
      case t > 60: return 'C+';
      case t > 40: return 'C';
      case t > 30: return 'C-';
      case t > 10: return 'D';
      case t >  2: return 'E';
      default: return 'F';
  }
}

export function wg(trait: number) {
  if (trait === undefined) return 'N/A';
  return `${trait.toFixed()} (${grade(trait)})`;
}