export function pct(x: number, places: number = 0, symbol: boolean = true): string {
    return `${(x * 100).toFixed(places)}${symbol ? '%' : ''}`;
}

export function pctFormat(places: number = 0, symbol: boolean = true): (n: number) => string {
    return (n: number) => pct(n, places, symbol);
}
    
export function rpct(x: number, places: number = 0): string {
    return `${(x * 100).toFixed(places)}`;
}

export function spct(x: number, places: number = 0): string {
  const sgn = x < 1 ? '' : '+';
  return `${sgn}${((x - 1) * 100).toFixed(places)}%`;
}

export function xm(x: number, places: number = 2): string {
    return `x${x.toFixed(places)}`;
}

export function unsigned(x: number, places: number = 0): string {
    return x.toFixed(places);
}

export function unsignedFormat(places: number = 0): (n: number) => string {
    return (n: number) => unsigned(n, places);
}

export function signed(x: number, places: number = 0): string {
    const sgn = x < 0 ? '' : '+';
    return `${sgn}${x.toFixed(places)}`;
}

export function signedFormat(places: number = 0): (n: number) => string {
    return (n: number) => signed(n, places);
}

export function grade(t: number) {
  switch (true) {
      case t > 87.5: return 'S';
      case t > 72.5: return 'A';
      case t > 57.5: return 'B';
      case t > 42.5: return 'C';
      case t > 27.5: return 'D';
      case t > 12.5: return 'E';
      default: return 'F';
  }
}

export function wg(trait: number) {
  if (trait === undefined) return 'N/A';
  return `${trait.toFixed()} (${grade(trait)})`;
}

export function npl(n: number, s: string) {
  if (n === 0) return `no ${s}s`;
  if (n === 1) return `${n} ${s}`;
  return `${n} ${s}s`;
}

export function dcr(r: number) {
  return Math.round(r * 1000);
}

export function formatTellHeight(meters: number) {
  const inches = meters * 39.37;
  if (inches < 1) {
    return ' ';
  } if (inches < 6) {
    return`${inches.toFixed()} in debris accumulation`;
  } else if (inches < 24) {
    return `${inches.toFixed()} in tell`;
  } else return `${(inches / 12).toFixed()} ft tell`;
}