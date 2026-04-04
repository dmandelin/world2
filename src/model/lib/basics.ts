export function assert(condition: boolean, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

export function safeDiv(numerator: number, denominator: number, defaultValue: number = 0): number {
    return denominator === 0 ? defaultValue : numerator / denominator;
}

export function randInt(a: number, b?: number): number {
    if (b === undefined) {
        b = a;
        a = 0;
    }
    return Math.floor(Math.random() * (b - a)) + a;
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

export function clamp(value: number, min: number = 0.0, max: number = 1.0) {
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
export function chooseFrom<T>(arr: T[], remove: boolean = false): T {
    const i = Math.floor(Math.random() * arr.length);
    return remove ? arr.splice(i, 1)[0] : arr[i];
}

export function chooseWeighted<T>(arr: readonly T[], weightFn: (t: T) => number): T {
    const totalWeight = arr.reduce((acc, cur) => acc + weightFn(cur), 0);
    if (totalWeight === 0) {
        throw new Error("Total weight is zero, cannot choose a weighted element.");
    }
    
    let randomValue = Math.random() * totalWeight;
    for (const item of arr) {
        randomValue -= weightFn(item);
        if (randomValue <= 0) {
            return item;
        }
    }
    
    throw new Error("Failed to choose a weighted element, this should not happen.");
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

export function product(aa: number[]): number {
    return aa.reduce((acc, cur) => acc * cur, 1);
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

export function colorInterpolator(color1: RGB, color2: RGB, lo: number = 0, hi: number = 1): (t: number) => string {
    return (t: number) => {
        const u = clamp((t - lo) / (hi - lo), 0, 1);
        const r = Math.round(color1[0] + (color2[0] - color1[0]) * u);
        const g = Math.round(color1[1] + (color2[1] - color1[1]) * u);
        const b = Math.round(color1[2] + (color2[2] - color1[2]) * u);
        return `rgb(${r}, ${g}, ${b})`;
    }
}