export function normal(mean: number, stdDev?: number): number {
    if (stdDev === undefined) [mean, stdDev] = [0, mean];

    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function poisson(lambda: number): number {
    // mean is lambda, variance is lambda, cov is 1/sqrt(lambda)
    let L = Math.exp(-lambda);
    let k = 0, p = 1;
    do {
        k++;
        p *= Math.random();
    } while (p > L);
    return k - 1;
}

export function plusOrMinus(plusProb: number, minusProb?: number): number {
    if (minusProb === undefined) minusProb = plusProb;
    const r = Math.random();
    if (r < plusProb) return 1;
    if (r < plusProb + minusProb) return -1;
    return 0;
}