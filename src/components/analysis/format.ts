// Shared number formatting for analysis output.

export function num(v: number, digits = 4): string {
    if (v === null || v === undefined || !Number.isFinite(v)) return '—';
    if (v === 0) return '0';
    const magnitude = Math.abs(v);
    if (magnitude >= 1e6 || magnitude < 1e-4) return v.toExponential(2);
    return v.toLocaleString(undefined, { maximumSignificantDigits: digits });
}

export function fixed(v: number, digits = 3): string {
    if (!Number.isFinite(v)) return '—';
    return v.toFixed(digits);
}

export function pValue(p: number): string {
    if (!Number.isFinite(p)) return '—';
    if (p < 1e-16) return '< 1e-16';
    if (p < 0.001) return '< 0.001';
    return p.toFixed(4);
}

export function percent(fraction: number, digits = 1): string {
    if (!Number.isFinite(fraction)) return '—';
    return `${(100 * fraction).toFixed(digits)}%`;
}

// Signed coefficient, for building a readable equation.
export function signedNum(v: number, digits = 4): string {
    const body = num(Math.abs(v), digits);
    return v < 0 ? `− ${body}` : `+ ${body}`;
}
