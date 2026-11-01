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

export function tsigned(x: number, format: (n: number) => string = unsigned): string {
  if (x === 0) return '-';
  if (x > 0) return `▲${stripLeadingSign(format(x))}`;
  return `▼${stripLeadingSign(format(-x))}`;
}

function stripLeadingSign(s: string): string {
  return s.startsWith('-') || s.startsWith('+') ? s.substring(1) : s;
}


export function signedFormat(places: number = 0): (n: number) => string {
    return (n: number) => signed(n, places);
}

// Stats that run 0 to 100 and centre on 50 -- every skill, and the traits
// like righteousness and intellect -- read much faster with a band of colour behind
// them than as bare numbers in a wall of other bare numbers. Five bands,
// twenty points each: the middle one is the ordinary run of things, and the
// outer ones are the notably poor and the notably good.
export const STAT_BAND_WIDTH = 20;
export const STAT_BAND_COUNT = 5;

export function statBand(value: number): number {
    if (!Number.isFinite(value)) return 2;
    const band = Math.floor(value / STAT_BAND_WIDTH);
    return band < 0 ? 0 : band > STAT_BAND_COUNT - 1 ? STAT_BAND_COUNT - 1 : band;
}

export function statBandClass(value: number): string {
    return `stat-band-${statBand(value)}`;
}

// Bands for eudaimonia, which runs either side of zero rather than 0-100.
//
// Ten points to a band, with -5..+5 neutral, so that the middle band is
// "nothing much either way" rather than a boundary a clan sits exactly on.
// The main ramp is the first five bands, out to about +/-50, which is where
// clans ordinarily live. Past that the colours keep deepening, but in smaller
// steps out to +/-100, so a rare extreme still reads as more extreme without
// the ordinary range having to wash out to leave room for it.
export const EU_BAND_WIDTH = 10;
export const EU_BAND_MAX = 10;

// Signed band index: 0 is neutral, +1..+10 and -1..-10 either side.
export function eudaimoniaBand(value: number): number {
    if (!Number.isFinite(value)) return 0;
    const band = Math.floor(
        (Math.abs(value) + EU_BAND_WIDTH / 2) / EU_BAND_WIDTH);
    const capped = band > EU_BAND_MAX ? EU_BAND_MAX : band;
    return value < 0 ? -capped : capped;
}

// Two classes: `eu-band` carries the shape of the painted area, the second
// carries only its colour.
export function eudaimoniaBandClass(value: number): string {
    const band = eudaimoniaBand(value);
    if (band === 0) return 'eu-band eu-band-0';
    return band > 0
        ? `eu-band eu-band-p${band}`
        : `eu-band eu-band-n${-band}`;
}

// The eudaimonia bands, for any other stat where one side of a neutral value
// is good and the other bad. `perBand` is how much of the stat one band
// stands for; the neutral band is half that either side of zero.
export function goodBadBandClass(value: number, perBand: number): string {
    return eudaimoniaBandClass(value * EU_BAND_WIDTH / perBand);
}

// How much of the year a clan spends at home in the settlement: a mud-brick
// ramp, deepening with every tenth of the year, and nothing at all for a clan
// that is never there.
export function residenceBandClass(fraction: number): string {
    if (!Number.isFinite(fraction)) return '';
    const band = Math.floor(fraction * 10 + 1e-9);
    if (band <= 0) return '';
    return `tint-band residence-band-${band > 10 ? 10 : band}`;
}

// Prestige: lapis, deepening with every five points. Prestige below nothing
// much is left unpainted -- the absence is the point.
export const PRESTIGE_BAND_WIDTH = 5;
export const PRESTIGE_BAND_MAX = 8;

export function prestigeBandClass(value: number): string {
    if (!Number.isFinite(value)) return '';
    const band = Math.floor(
        (value + PRESTIGE_BAND_WIDTH / 2) / PRESTIGE_BAND_WIDTH);
    if (band <= 0) return '';
    return `tint-band prestige-band-${band > PRESTIGE_BAND_MAX ? PRESTIGE_BAND_MAX : band}`;
}

// Bands for food per head, as a share of a full ration: ten points to a band.
// Each returns `food-band` for the shape of the painted area, and a second
// class for its colour; see app.css.

// How well fed: nutrition and consumption. Green from 90% up, then yellow,
// orange and red for each ten points short, deepening to magenta below 60%.
export function foodSufficiencyBandClass(value: number): string {
    if (!Number.isFinite(value)) return '';
    const band = Math.floor(value * 10 + 1e-9);
    const b = band >= 9 ? 9 : band < 4 ? 3 : band;
    return `food-band food-band-${b}`;
}

// Food grown: the same up to a full ration, then aqua deepening to blue for
// each ten points past it, out to twice a full ration.
export function foodProductionBandClass(value: number): string {
    if (!Number.isFinite(value)) return '';
    if (value < 1) return foodSufficiencyBandClass(value);
    const band = Math.floor((value - 1) * 10 + 1e-9) + 1;
    return `food-band food-band-p${band > 10 ? 10 : band}`;
}

// Food in store: brown when there is none, through to green at a year's
// rations, then on to blue at two years'.
export function foodStockBandClass(value: number): string {
    if (!Number.isFinite(value)) return '';
    const band = Math.floor(Math.max(0, value) * 10 + 1e-9);
    return `food-band food-band-s${band > 20 ? 20 : band}`;
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

// Height of a tell, as a bare measurement, or '' when there's effectively
// none yet. Callers supply the word "tell" so they can decorate it.
export function formatTellHeight(meters: number) {
  const inches = meters * 39.37;
  if (inches < 1) {
    return '';
  } else if (inches < 24) {
    return `${inches.toFixed()} in`;
  } else return `${(inches / 12).toFixed()} ft`;
}

export function stressColor(value: number): string {
    if (value >= -5 && value <= 5) {
        return 'black';
    } else if (value < -5 && value >= -15) {
        return '#8a6d0f'; // Darkened yellow / brown
    } else if (value < -15 && value >= -25) {
        return '#cc5200'; // Darkened orange
    } else if (value < -25) {
        return '#b30000'; // Red
    } else if (value > 5 && value <= 15) {
        return '#006600'; // Green
    } else if (value > 15 && value <= 25) {
        return '#1b4d8c'; // Lapis blue
    } else {
        return '#5a189a'; // Dark violet
    }
}