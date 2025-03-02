export function normal(mean: number, stdDev?: number): number {
    if (stdDev === undefined) [mean, stdDev] = [0, mean];
    
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}