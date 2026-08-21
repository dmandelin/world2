// Ranking a settlement's clans on some measure, with a color that says how
// far from the middle of the pack each one sits. Shared so that every place
// showing a rank badge reads the same way.

// Neutral gray at the mean, blue above, red below, saturating at two standard
// deviations either way.
export function getZScoreColor(z: number): string {
    const clampedZ = Math.max(-2, Math.min(2, z));
    const t = clampedZ / 2; // -1 to +1

    let r: number, g: number, b: number;
    if (t >= 0) {
        // Neutral gray (107, 114, 128) -> Blue (37, 99, 235)
        r = Math.round(107 + (37 - 107) * t);
        g = Math.round(114 + (99 - 114) * t);
        b = Math.round(128 + (235 - 128) * t);
    } else {
        // Neutral gray (107, 114, 128) -> Red (220, 38, 38)
        const absT = -t;
        r = Math.round(107 + (220 - 107) * absT);
        g = Math.round(114 + (38 - 114) * absT);
        b = Math.round(128 + (38 - 128) * absT);
    }
    return `rgb(${r}, ${g}, ${b})`;
}

export type RankBadgeData = {
    rank: number;
    value: number;
    z: number;
    title: string;
    color: string;
};

// Rank items best-first on `valueFn`, keyed by `keyFn`. Ties share a rank.
// `titleFn` builds the hover text from the rank, the value, and the z-score
// already formatted with its sign.
export function rankBadges<T>(
    items: readonly T[],
    keyFn: (item: T) => string,
    valueFn: (item: T) => number,
    titleFn: (rank: number, value: number, zStr: string) => string,
): Map<string, RankBadgeData> {
    const result = new Map<string, RankBadgeData>();
    const n = items.length;
    if (n === 0) return result;

    const values = items.map(valueFn);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);

    const sorted = [...items].sort((a, b) => valueFn(b) - valueFn(a));
    const rankByKey = new Map<string, number>();
    sorted.forEach((item, idx) => {
        const tiedWithPrevious = idx > 0
            && Math.abs(valueFn(item) - valueFn(sorted[idx - 1])) < 1e-6;
        rankByKey.set(
            keyFn(item),
            tiedWithPrevious ? rankByKey.get(keyFn(sorted[idx - 1]))! : idx + 1);
    });

    for (const item of items) {
        const key = keyFn(item);
        const value = valueFn(item);
        const rank = rankByKey.get(key) ?? 1;
        const z = stdDev > 1e-6 ? (value - mean) / stdDev : 0;
        const zStr = z >= 0 ? `+${z.toFixed(2)}` : z.toFixed(2);
        result.set(key, {
            rank,
            value,
            z,
            title: titleFn(rank, value, zStr),
            color: getZScoreColor(z),
        });
    }
    return result;
}
