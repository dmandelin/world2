export function clamp(value: number, min: number = 0.0, max: number = 1.0) {
    return Math.min(Math.max(value, min), max);
}

export function maxby<T>(arr: T[], key: (t: T) => number): T {
    return arr.reduce((acc, cur) => key(acc) > key(cur) ? acc : cur);
}

export function minby<T>(arr: T[], key: (t: T) => number): T {
    return arr.reduce((acc, cur) => key(acc) < key(cur) ? acc : cur);
}

export function chooseFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function remove<T>(arr: T[], elem: T) {
    const index = arr.indexOf(elem);
    if (index >= 0) {
        arr.splice(index, 1);
    }
}