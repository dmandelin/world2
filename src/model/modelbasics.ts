export function traitFactor(trait: number, a = 1.3) {
    return Math.pow(a, trait - 50);
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

export function ces(rho: number, ...inputValues: number[]): number {
    if (rho === 0) {
        return inputValues.reduce((acc, v) => acc + v / inputValues.length, 0);
    }
    const sum = inputValues.reduce((acc, v) => acc + Math.pow(v, rho) / inputValues.length, 0);
    return Math.pow(sum, 1 / rho);
}