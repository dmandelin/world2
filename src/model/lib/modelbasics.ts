export function scaleFactorEffect(factor: number, scale: number): number {
    if (factor === 0) return 0;
    if (scale === 0) return 1;
    return Math.pow(factor, scale);
}

export function traitFactor(trait: number, a = 1.3) {
    return Math.pow(a, trait - 50);
}

export function eloSuccessProbability(eloScore: number, opponentEloScore: number, k: number = 15): number {
    return 1 / (1 + Math.pow(10, (opponentEloScore - eloScore) / k));
}

export class WeightedValue<T extends object> {
    constructor(
        readonly label: T,
        readonly trait: number,
        readonly weight: number,
        readonly value: number,
    ) {}

    get weightedValue(): number {
        return this.value * this.weight;
    }

    static tooltip<T extends Object>(
        wv: readonly WeightedValue<T>[],
        header: string[] = []): string[][] {
        const totalWeight = wv.reduce((acc, w) => acc + w.weight, 0);
        const data = wv.map(w => [
            w.label.toString(), 
            w.value.toFixed(1), 
            w.trait.toFixed(1),
            (w.weight / totalWeight).toFixed(2),
            (w.weightedValue / totalWeight).toFixed(2),
        ]);
        return [header, ...data];
    }
}

export function traitWeightedAverage<T, U extends Object>(
    items: readonly T[],
    labelFun: (t: T) => U,
    traitFun: (t: T) => number,
    valueFun: (t: T) => number|undefined): [number, WeightedValue<U>[]] {

    const weightedValues: WeightedValue<U>[] = []; 
    let totalWeight = 0;
    let totalValue = 0;
    for (const item of items) {
        const trait = traitFun(item);
        const value = valueFun(item);
        if (value === undefined) continue;
        const weight = traitFactor(trait);
        totalWeight += weight;
        totalValue += value * weight;

        const label = labelFun(item);
        weightedValues.push(new WeightedValue(label, trait, weight, value));
    }

    return [totalValue / totalWeight, weightedValues];
}

export function weightedAverage<T>(
    items: readonly T[],
    valueFun: (t: T) => number,
    weightFun: (t: T) => number): number {
        
    const totalWeight = items.reduce((acc, item) => acc + weightFun(item), 0);
    if (totalWeight === 0) return 0;
    const totalValue = items.reduce((acc, item) => acc + valueFun(item) * weightFun(item), 0);
    return totalValue / totalWeight;
}

export function meanAndStdDev(values: readonly number[]): [number, number] {
    const n = values.length;
    if (n === 0) return [0, 0];
    const mean = values.reduce((acc, v) => acc + v, 0) / n;
    const stddev = Math.sqrt(values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n);
    return [mean, stddev];
}

export function zScore(value: number, values: readonly number[]): number {
    const [mean, stddev] = meanAndStdDev(values);
    if (stddev === 0) return 0;
    return (value - mean) / stddev;
}

export function selectBySoftmax<T>(
    items: Iterable<T>,
    fun: (t: T) => number,
    temperature: number = 10,
): T | undefined {
    let sum = 0;
    const weights: number[] = [];
    const savedItems: T[] = [];
    for (const item of items) {
        savedItems.push(item);
        const weight = Math.exp(fun(item) / temperature);
        weights.push(weight);
        sum += weight;
    }

    if (sum === 0) return undefined;
    const probabilities = weights.map(w => w / sum);
    const randomValue = Math.random();
    let cumulativeProbability = 0;
    let index = 0;
    for (const probability of probabilities) {
        cumulativeProbability += probability;
        if (randomValue < cumulativeProbability) {
            return savedItems[index];
        }
        index++;
    }
}


export type CESParams = {
    rho: number;       // substitution parameter
    alpha?: number[];  // weights, defaults to equal weights
    nu?: number;       // scale factor, defaults to 1
    tfp?: number;      // total factor productivity, defaults to 1
};

export function ces(inputValues: number[], params: CESParams): number {
    const n = inputValues.length;
    if (n === 0) return 0;

    const { rho, nu = 1, tfp = 1 } = params;
    const alpha = params.alpha ?? new Array(n).fill(1 / n);

    if (rho === 0) {
        // This is the Cobb-Douglas case, a limit of the CES function as rho -> 0.
        return tfp * inputValues.reduce((acc, v, i) => acc * Math.pow(v, alpha[i] * nu), 1);
    }
    const sum = inputValues.reduce((acc, v, i) => acc + alpha[i] * Math.pow(v, rho), 0);
    return tfp * Math.pow(sum, nu / rho);
}

export function binaryLogistic(k: number, x: number): number {
    return 1 / (1 + 2 ** (-k * x));
}

export function createTwoSidedQuadratic(
    x0: number, y0: number,
    xc: number, yc: number,
    x1: number, y1: number): (x: number) => number {

    return (x: number): number => {
        if (x < x0) return y0;
        if (x > x1) return y1;
        if (x < xc) {
            const d = xc - x0;
            return y0 + (yc - y0) * ((x - x0) / d) ** 2;
        } else {
            const d = x1 - xc;
            return yc + (y1 - yc) * ((x - xc) / d) ** 2;
        }
    };
}

export function moveToward(value: number, target: number, stepSize: number) {
    if (value < target) {
        return Math.min(value + stepSize, target);
    }
    if (value > target) {
        return Math.max(value - stepSize, target);
    }
    return value;
}