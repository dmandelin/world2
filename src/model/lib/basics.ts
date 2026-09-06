export function assert(condition: boolean, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

export function between(min: number, value: number, max: number): boolean {
    return min <= value && value <= max;
}

export function safeDiv(numerator: number, denominator: number, defaultValue: number = 0): number {
    return denominator === 0 ? defaultValue : numerator / denominator;
}

export function fractionOf<K>(a: K, b: Iterable<[K, number]>): number {
    let matching = 0;
    let total = 0;
    for (const [item, weight] of b) {
        total += weight;
        if (item === a) {
            matching += weight;
        }
    }
    return total === 0 ? 0 : matching / total;
}

export function randInt(a: number, b?: number): number {
    if (b === undefined) {
        b = a;
        a = 0;
    }
    return Math.floor(Math.random() * (b - a)) + a;
}

export function dice(s: number, sides: number, mod: number): number {
    let total = mod;
    for (let i = 0; i < s; ++i) {
        total += randInt(1, sides + 1);
    }
    return total;
}

export function stochasticRound(value: number): number {
    const sign = Math.sign(value);
    if (sign === 0) return 0;
    const abs = Math.abs(value);
    const floor = Math.floor(abs);
    const frac = abs - floor;
    const extra = Math.random() < frac ? 1 : 0;
    return sign * (floor + extra);
}

export function matchingCount<T>(aa: Iterable<T>, predicate: (t: T) => boolean): number {
    let count = 0;
    for (const item of aa) {
        if (predicate(item)) {
            ++count;
        }
    }
    return count;
}

export function matchingFraction<T>(aa: Iterable<T>, predicate: (t: T) => boolean): number {
    let count = 0;
    let total = 0;
    for (const item of aa) {
        ++total;
        if (predicate(item)) {
            ++count;
        }
    }
    return count ? count / total : 0;
}

export function removeAll<T>(aa: T[], predicate: (t: T) => boolean): void {
    for (let i = aa.length - 1; i >= 0; --i) {
        if (predicate(aa[i])) {
            aa.splice(i, 1);
        }
    }
}

// True only for a quantity greater than zero, NaN included in what it rejects.
//
// Use this instead of writing a rejection guard as `if (x <= 0) return;`. That
// form is wrong in a way that is easy to miss: NaN compares false against
// every operator, so `NaN <= 0` is false and a NaN walks straight through the
// guard that exists to stop bad values. Written the other way round, as
// `if (!isPositive(x)) return;`, NaN is rejected alongside zero and negatives,
// because `NaN > 0` is false too.
//
// This is not hypothetical. A respect score dipping a hair below zero made
// getPrestige return NaN; three separate `<= 0` guards passed it along; it was
// stored as a food gift, became the clan's food total, its quality of life,
// and its holiness, and finally surfaced as an unrelated failure to choose a
// ritual officiant, eight steps from the cause.
//
// Note this admits Infinity, which is positive. Where a value must also be
// finite, check that separately and say so.
export function isPositive(x: number): boolean {
    return x > 0;
}

export function clamp(value: number, min: number = 0.0, max: number = 1.0) {
    if (isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
}

export function absmin(a: number, b: number): number {
    return Math.abs(a) < Math.abs(b) ? a : b;
}

export type OptByWithValue<T> = (arr: T[], key: (t: T) => number) => [T, number];

export function maxby<T>(aa: Iterable<T>, key: (t: T) => number): T {
    return maxbyWithValue(aa, key)[0];
}

export function maxbyWithValue<T>(aa: Iterable<T>, key: (t: T) => number): [T, number] {
    let best: T | undefined = undefined;
    let bestValue = -Infinity;
    for (const cur of aa) {
        const curValue = key(cur);
        if (curValue > bestValue) {
            best = cur;
            bestValue = curValue;
        }
    }
    if (best === undefined) {
        console.warn("maxbyWithValue called on empty array");
        return [undefined as unknown as T, -Infinity];
    }
    return [best, bestValue];
}

export function maxComparing<T>(arr: T[], compareFn: (a: T, b: T) => number): [number, T] {
    return arr.entries().reduce((acc, cur) => compareFn(acc[1], cur[1]) >= 0 ? acc : cur);
}

export function minby<T>(arr: T[], key: (t: T) => number): T {
    return arr.reduce((acc, cur) => key(acc) < key(cur) ? acc : cur);
}

export function minbyWithValue<T>(arr: T[], key: (t: T) => number): [T, number] {
    return arr.reduce((acc, cur) => {
        const curValue = key(cur);
        if (curValue < acc[1]) {
            return [cur, curValue];
        } else {
            return acc;
        }
    }, [arr[0], key(arr[0])]);
}

// A random element from the array. The array must not be empty.
export function chooseFrom<T>(iterable: Iterable<T>, remove: boolean = false): T {
    const arr = Array.from(iterable);
    const i = Math.floor(Math.random() * arr.length);
    return remove ? arr.splice(i, 1)[0] : arr[i];
}

// A random element, each chosen with probability proportional to its weight.
// Weights must be finite and non-negative, with at least one positive.
//
// The scan accumulates raw weights forward against a target of r * totalWeight
// rather than subtracting normalized shares from r. Those shares sum to
// slightly less than 1 in floating point, so the subtracting form could run out
// of elements on a draw landing in that last sliver and fall through -- odds
// around 1e-15 per call, which is rare enough to survive for years and to be
// unreproducible whenever it did happen. Accumulating against a target that is
// below the same running total cannot run out, and the clamp at the end covers
// the boundary where r * totalWeight rounds up to totalWeight itself.
//
// Bad weights are reported rather than tolerated. Treating a NaN as zero would
// silently bury whatever upstream calculation produced it, so the error names
// the offending element instead.
export function chooseWeighted<T>(arr: readonly T[], weightFn: (t: T) => number): T {
    if (arr.length === 0) {
        throw new Error('chooseWeighted: no elements to choose from.');
    }

    const ws = arr.map(weightFn);
    let totalWeight = 0;
    let lastPositive = -1;
    for (let i = 0; i < ws.length; ++i) {
        const w = ws[i];
        if (!Number.isFinite(w) || w < 0) {
            throw new Error(
                `chooseWeighted: weight[${i}] is ${w}, expected a finite ` +
                `weight >= 0. Weights: [${ws.join(', ')}]`);
        }
        if (w > 0) lastPositive = i;
        totalWeight += w;
    }
    if (lastPositive < 0) {
        throw new Error(
            `chooseWeighted: all ${ws.length} weights are zero, so there is ` +
            `nothing to choose between.`);
    }
    if (!Number.isFinite(totalWeight)) {
        throw new Error(
            `chooseWeighted: weights sum to ${totalWeight}; scale them down ` +
            `before choosing. Weights: [${ws.join(', ')}]`);
    }

    // Math.random() < 1, so the target is below the total. Strict `>` keeps a
    // zero-weight element from ever being returned, including at target 0.
    const target = Math.random() * totalWeight;
    let acc = 0;
    for (let i = 0; i < arr.length; ++i) {
        acc += ws[i];
        if (acc > target) return arr[i];
    }
    // Reachable only when rounding leaves the accumulation a hair short of the
    // target. The last element carrying weight is the right answer there.
    return arr[lastPositive];
}

export function shuffled<T>(arr: T[]): T[] {
    const copy = arr.slice();
    const result: T[] = [];
    while (copy.length) {
        const index = Math.floor(Math.random() * copy.length);
        result.push(copy.splice(index, 1)[0]);
    }
    return result;
}

export type ComparisonKeyFn<T> = (
    ((t: T) => number) |
    ((t: T) => string) |
    ((t: T) => Date)
);

export function sortedByKey<T>(iterable: Iterable<T>, key: ComparisonKeyFn<T>): T[] {
    const arr = Array.from(iterable);
    return arr.toSorted((a, b) => {
        const aKey = key(a);
        const bKey = key(b);
        if (aKey < bKey) return -1;
        if (aKey > bKey) return 1;
        return 0;
    });
}

export function remove<T>(arr: T[], elem: T) {
    const index = arr.indexOf(elem);
    if (index >= 0) {
        arr.splice(index, 1);
    }
}

export function compareLexically<T>(aa: T[], bb: T[]): number {
    for (let i = 0; i < Math.min(aa.length, bb.length); ++i) {
        const a = aa[i];
        const b = bb[i];
        if (a < b) return -1;
        if (a > b) return 1;
    }
    return aa.length - bb.length;
}

export function sum(aa: Iterable<number>): number {
    let sum = 0;
    for (const item of aa) {
        sum += item;
    }
    return sum;
}

export function sumFun<T>(
        aa: Iterable<T>,
        fn: (t: T) => number,
        weightFn?: (t: T) => number,
    ): number {
        let sum = 0;
        for (const item of aa) {
            sum += fn(item) * (weightFn ? weightFn(item) : 1);
        }
        return sum;
}

export function sumValues<T>(
    aa: Record<string, T>,
    valueFn: (t: T) => number,
    weightFn?: (t: T) => number,
): number {
    let sum = 0;
    for (const item of Object.values(aa)) {
        sum += valueFn(item) * (weightFn ? weightFn(item) : 1);
    }
    return sum;
}

export function product(aa: Iterable<number>): number {
    let result = 1;
    for (const item of aa) {
        result *= item;
    }
    return result;
}

export function productFun<T>(
        aa: Iterable<T>,
        fn: (t: T) => number,
        weightFn?: (t: T) => number,
    ): number {
    if (weightFn === undefined) {
        let result = 1;
        for (const item of aa) {
            result *= fn(item);
        }
        return result;
    } else {
        let result = 1;
        for (const item of aa) {
            result *= fn(item) * weightFn(item);
        }
        return result;
    }
}

export function average(aa: number[]): number {
    if (aa.length === 0) return 0;
    return sum(aa) / aa.length;
}

export function averageFun<T>(
        aa: Iterable<T>, 
        fn: (t: T) => number, 
        weightFn?: (t: T) => number): number {
    const arr = Array.from(aa);
    if (arr.length === 0) return 0;
    if (weightFn === undefined) {
        return sumFun(arr, fn) / arr.length;
    } else {
        const totalWeight = sumFun(arr, t => 1, weightFn);
        if (totalWeight === 0) return 0;
        return sumFun(arr, fn, weightFn) / totalWeight;
    }
}

export function geometricMean(aa: number[]): number {
    if (aa.length === 0) return 0;
    if (aa.length === 1) return aa[0];
    const product = aa.reduce((acc, cur) => acc * cur, 1);
    return Math.pow(product, 1 / aa.length);
}

export function weightedGeometricMean<T>(
    aa: Iterable<T>,
    value: (t: T) => number,
    weight?: (t: T) => number
): number {
    let product = 1;
    let totalWeight = 0;
    for (const item of aa) {
        product *= value(item) ** (weight ? weight(item) : 1);
        totalWeight += weight ? weight(item) : 1;
    }
    return totalWeight === 0 ? 0 : Math.pow(product, 1 / totalWeight);
}

export function harmonicMean(aa: number[]): number {
    if (aa.length === 0) return 0;
    if (aa.length === 1) return aa[0];
    const sum = aa.reduce((acc, cur) => acc + 1 / cur, 0);
    return aa.length / sum;
}

export function weightedHarmonicMean<T>(
    aa: Iterable<T>,
    value: (t: T) => number,
    weight: (t: T) => number
): number {
    let sum = 0;
    let totalWeight = 0;
    for (const item of aa) {
        sum += weight(item) / value(item);
        totalWeight += weight(item);
    }
    return(totalWeight === 0) ? 0 : totalWeight / sum;
}

export function mapNormalized<T, U>(
    aa: readonly T[],
    weightFun: (t: T) => number,
    mapFun: (t: T, weight: number) => U,
): U[] {
    const weights: number[] = [];
    let totalWeight = 0;
    for (const item of aa) {
        const weight = weightFun(item);
        weights.push(weight);
        totalWeight += weight;
    }

    const bb: U[] = [];
    for (let i = 0; i < aa.length; ++i) {
        const item = aa[i];
        const weight = weights[i];
        const normalizedWeight = totalWeight === 0 ? 0 : weight / totalWeight;
        bb.push(mapFun(item, normalizedWeight));
    }
    return bb;
}

export function znan(value: number): number {
    return isNaN(value) ? 0 : value;
}

type RGB = [number, number, number];

// `points` and `colors` should have the same length
// `points` should be sorted in ascending order
export function colorInterpolator(
    points: number[],
    colors: RGB[],
) {
    if (points.length !== colors.length) {
        throw new Error("points and colors must have the same length");
    }
    return (t: number) => {
        if (t <= points[0]) {
            return `rgb(${colors[0][0]}, ${colors[0][1]}, ${colors[0][2]})`;
        }
        if (t >= points[points.length - 1]) {
            return `rgb(${colors[colors.length - 1][0]}, ${colors[colors.length - 1][1]}, ${colors[colors.length - 1][2]})`;
        }
        for (let i = 0; i < points.length - 1; ++i) {
            if (t >= points[i] && t <= points[i + 1]) {
                const u = (t - points[i]) / (points[i + 1] - points[i]);
                const r = Math.round(colors[i][0] + (colors[i + 1][0] - colors[i][0]) * u);
                const g = Math.round(colors[i][1] + (colors[i + 1][1] - colors[i][1]) * u);
                const b = Math.round(colors[i][2] + (colors[i + 1][2] - colors[i][2]) * u);
                return `rgb(${r}, ${g}, ${b})`;
            }
        }
        throw new Error("unreachable");
    }
}

export function arrayMapAdd<T, U>(map: Map<T, U[]>, key: T, value: U): void {
    if (map.has(key)) {
        map.get(key)!.push(value);
    } else {
        map.set(key, [value]);
    }
}

export function recordMapSet<MapKey, Value>(
    map: Map<MapKey, Record<string, Value>>, 
    mapKey: MapKey, 
    recordKey: string, 
    value: Value): void {

    const record = map.get(mapKey);
    if (record) {
        record[recordKey] = value;
    } else {
        map.set(mapKey, { [recordKey]: value } as Record<string, Value>);
    }
}