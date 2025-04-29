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


export function remove<T>(arr: T[], elem: T) {
    const index = arr.indexOf(elem);
    if (index >= 0) {
        arr.splice(index, 1);
    }
}