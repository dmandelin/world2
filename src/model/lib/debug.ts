const enabled = true;

export function loggingEnabled(): boolean {
    return enabled;
}

export function log(...args: any[]) {
    if (!enabled) return;
    console.log(...args);
}