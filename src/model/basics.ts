export function assert(condition: boolean, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

export function clamp(value: number, min: number = 0.0, max: number = 1.0) {
    return Math.min(Math.max(value, min), max);
}

export type OptByWithValue<T> = (arr: T[], key: (t: T) => number) => [T, number];

export function maxby<T>(arr: T[], key: (t: T) => number): T {
    return arr.reduce((acc, cur) => key(acc) > key(cur) ? acc : cur);
}

export function maxbyWithValue<T>(arr: T[], key: (t: T) => number): [T, number] {
    return arr.reduce((acc, cur) => {
        const curValue = key(cur);
        if (curValue > acc[1]) {
            return [cur, curValue];
        } else {
            return acc;
        }
    }, [arr[0], key(arr[0])]);
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
export function chooseFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
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

export function sortedByKey<T>(arr: T[], key: (t: T) => number): T[] {
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

export function harmonicMean(aa: number[]): number {
    if (aa.length === 0) return 0;
    if (aa.length === 1) return aa[0];
    const sum = aa.reduce((acc, cur) => acc + 1 / cur, 0);
    return aa.length / sum;
}

export function weightedHarmonicMean<T>(
    aa: T[],
    value: (t: T) => number,
    weight: (t: T) => number
): number {
    if (aa.length === 0) return 0;
    if (aa.length === 1) return value(aa[0]);
    const sum = aa.reduce((acc, cur) => acc + weight(cur) / value(cur), 0);
    return sum === 0 ? 0 : aa.reduce((acc, cur) => acc + weight(cur), 0) / sum;
}

export function znan(value: number): number {
    return isNaN(value) ? 0 : value;
}