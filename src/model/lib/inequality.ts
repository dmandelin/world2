// Gini coefficient of a per-head figure across a group's people, when every
// member of a clan has that clan's figure. Weighted by the people behind each
// figure; 0 is perfectly even and 1 is one person holding it all.
export function weightedGini(items: { value: number; weight: number }[]): number {
    let total = 0;
    let weight = 0;
    let sum = 0;
    for (const a of items) {
        total += a.value * a.weight;
        weight += a.weight;
        for (const b of items) {
            sum += a.weight * b.weight * Math.abs(a.value - b.value);
        }
    }
    return total > 0 ? sum / (2 * weight * total) : 0;
}
