export function traitFactor(trait: number, a = 1.05) {
    return Math.pow(a, trait - 50);
}

export class WeightedValue<T extends object> {
    constructor(
        readonly label: T,
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
            (w.weight / totalWeight).toFixed(2),
            w.value.toFixed(2), 
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
        weightedValues.push(new WeightedValue(label, weight, value));
    }

    return [totalValue / totalWeight, weightedValues];
}