// Tail probabilities for the distributions the ANOVA needs.
//
// The regularized incomplete beta function gives us both, via the standard
// continued-fraction expansion (Lentz's method).

const LANCZOS = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function logGamma(x: number): number {
    if (x < 0.5) {
        // Reflection formula.
        return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    }
    const z = x - 1;
    let a = 0.99999999999980993;
    for (let i = 0; i < LANCZOS.length; i++) {
        a += LANCZOS[i] / (z + i + 1);
    }
    const t = z + LANCZOS.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

const FPMIN = 1e-300;
const EPS = 3e-16;
const MAX_ITERATIONS = 300;

function betaContinuedFraction(a: number, b: number, x: number): number {
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;

    let c = 1;
    let d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;

    for (let m = 1; m <= MAX_ITERATIONS; m++) {
        const m2 = 2 * m;

        let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;
        h *= d * c;

        aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
        d = 1 + aa * d;
        if (Math.abs(d) < FPMIN) d = FPMIN;
        c = 1 + aa / c;
        if (Math.abs(c) < FPMIN) c = FPMIN;
        d = 1 / d;

        const delta = d * c;
        h *= delta;
        if (Math.abs(delta - 1) < EPS) break;
    }

    return h;
}

// Regularized incomplete beta function I_x(a, b).
export function incompleteBeta(a: number, b: number, x: number): number {
    if (!Number.isFinite(x) || x <= 0) return 0;
    if (x >= 1) return 1;

    const front = Math.exp(
        logGamma(a + b) - logGamma(a) - logGamma(b)
        + a * Math.log(x) + b * Math.log1p(-x));

    return x < (a + 1) / (a + b + 2)
        ? (front * betaContinuedFraction(a, b, x)) / a
        : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

// Two-sided p-value for Student's t.
export function tTwoSidedP(t: number, df: number): number {
    if (!Number.isFinite(t) || df <= 0) return NaN;
    return incompleteBeta(df / 2, 0.5, df / (df + t * t));
}

// Upper-tail p-value for the F distribution.
export function fUpperP(f: number, df1: number, df2: number): number {
    if (!Number.isFinite(f) || f <= 0 || df1 <= 0 || df2 <= 0) return NaN;
    return incompleteBeta(df2 / 2, df1 / 2, df2 / (df2 + df1 * f));
}

// Standard normal CDF, for comparing the residual distribution to normal.
export function normalCdf(z: number): number {
    return 0.5 * (1 + erf(z / Math.SQRT2));
}

function erf(x: number): number {
    // Abramowitz & Stegun 7.1.26; plenty accurate for a diagnostic.
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
        - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
    return sign * y;
}

// Conventional significance markers.
export function significanceStars(p: number): string {
    if (!Number.isFinite(p)) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    if (p < 0.1) return '.';
    return '';
}
