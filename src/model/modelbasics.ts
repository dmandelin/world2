export function traitFactor(trait: number, a = 1.05) {
    return Math.pow(a, trait - 50);
}

export class WeightedValue<T> {
    constructor(
        readonly label: T,
        readonly value: number,
        readonly weight: number
    ) {}
}

export function traitWeightedAverage<T, U>(
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
        weightedValues.push(new WeightedValue(label, value, weight));
    }

    return [totalValue / totalWeight, weightedValues];
}