import { clamp, sumFun } from "../lib/basics";
import { pct } from "../lib/format";
import { foodVarietyAppeal } from "../people/happiness";
import type { Consumption } from "./consumption";

export class QualityOfLife {
    readonly m: ReadonlyMap<string, QualityOfLifeItem>;

    constructor(m: ReadonlyMap<string, QualityOfLifeItem>) {
        this.m = m;
    }

    get value(): number {
        return sumFun(this.m.values(), item => item.value);
    }

    static from(consumption: Consumption): QualityOfLife {
        const itemFuns = [
            QualityOfLife.fromLeisure,
            QualityOfLife.fromFoodQuantity,
            QualityOfLife.fromFoodQuality
        ];
        const m = new Map<string, QualityOfLifeItem>();
        for (const itemFun of itemFuns) {
            const item = itemFun(consumption);
            m.set(item.name, item);
        }
        return new QualityOfLife(m);
    }

    static fromLeisure(consumption: Consumption): QualityOfLifeItem {
        // Avoid -Infinity
        const leisureFraction = Math.max(0.001, consumption.leisureFraction);
        // Appeal 0 at 10% leisure share
        const value = clamp(5 * Math.log2(leisureFraction / 0.1), -20, 20);
        return new QualityOfLifeItem(
            "Leisure", value, `${pct(leisureFraction)} leisure`);

    }

    static fromFoodQuantity(consumption: Consumption): QualityOfLifeItem {
        const value = 50 * Math.log2(consumption.perCapitaFood);
        return new QualityOfLifeItem(
            "Food quantity", value, `${pct(consumption.perCapitaFood)} of needs`);
    }

    static fromFoodQuality(consumption: Consumption): QualityOfLifeItem {
        const value = foodVarietyAppeal(consumption.fishRatio);
        return new QualityOfLifeItem(
            "Food quality", value, `${pct(consumption.fishRatio)} fish`);
    }
}

export class QualityOfLifeItem {
    constructor(
        readonly name: string,
        readonly value: number,
        readonly explanation: string,
    ) {}
}