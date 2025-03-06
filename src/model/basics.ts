export function clamp(value: number, min: number = 0.0, max: number = 1.0) {
    return Math.min(Math.max(value, min), max);
}