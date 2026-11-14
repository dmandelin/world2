// Smoothing the tuning charts, so a trend can be read through the year-to-year
// noise of a few small worlds.
//
// Each figure of a year's summary -- mean, median, quartiles, min and max -- is
// replaced by its average over the years within half the window either side
// of that year, as many of them as there are data for. At the ends of a run
// the window is cut short rather than padded. Smoothing 'all' averages over
// the whole run, which flattens every chart to its overall level.

import type { Summary } from "./protocol";

export type Smoothing = 0 | 10 | 20 | 50 | 100 | "all";

export const SMOOTHING_OPTIONS: readonly { value: Smoothing; label: string }[] = [
    { value: 0, label: "None" },
    { value: 10, label: "10 yr" },
    { value: 20, label: "20 yr" },
    { value: 50, label: "50 yr" },
    { value: 100, label: "100 yr" },
    { value: "all", label: "All" },
];

const FIELDS = ["mean", "min", "max", "p25", "median", "p75"] as const;

export function smoothSummaries(points: readonly Summary[], smoothing: Smoothing): Summary[] {
    if (smoothing === 0 || points.length < 2) return [...points];
    const n = points.length;

    // Running sums of each figure, so every window is two lookups.
    const sums = FIELDS.map(() => new Float64Array(n + 1));
    for (let i = 0; i < n; ++i) {
        FIELDS.forEach((field, f) => sums[f][i + 1] = sums[f][i] + points[i][field]);
    }
    const average = (f: number, from: number, to: number) =>
        (sums[f][to] - sums[f][from]) / (to - from);

    if (smoothing === "all") {
        return points.map(p => {
            const out = { ...p };
            FIELDS.forEach((field, f) => out[field] = average(f, 0, n));
            return out;
        });
    }

    // The window [lo, hi) slides along with the year, by years rather than
    // by points, since a run's early years can be missing a figure.
    const half = smoothing / 2;
    let lo = 0;
    let hi = 0;
    return points.map(p => {
        while (lo < n && points[lo].year < p.year - half) ++lo;
        while (hi < n && points[hi].year <= p.year + half) ++hi;
        const out = { ...p };
        FIELDS.forEach((field, f) => out[field] = average(f, lo, hi));
        return out;
    });
}
