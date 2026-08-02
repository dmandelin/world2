import { FoodQualityHappinessItem, FoodQuantityHappinessItem, LeisureHappinessItem } from "../people/happiness";
import { Consumption } from "./flows";

export { Consumption };

export class ConsumptionGood {
    constructor(
        readonly good: any,
        public consumed: number,
        public wasted: number,
        public stored: number,
    ) { }
}

// Standard of living data. This is basically the subset of happiness
// that comes from consumption and leisure.
export class StandardOfLiving {
    readonly items: StandardOfLivingItem[] = [];

    static from(consumption: Consumption): StandardOfLiving {
        const hitems = [
            new FoodQuantityHappinessItem(0, consumption.perCapitaFood),
            new FoodQualityHappinessItem(0, consumption.foodQuality),
            new LeisureHappinessItem(0, consumption.leisureFraction),
        ];

        const sol = new StandardOfLiving();
        for (const hitem of hitems) {
            sol.items.push(new StandardOfLivingItem(
                hitem.label,
                hitem.appeal,
                hitem.stateDisplay,
            ));
        }
        return sol;
    }
}

export class StandardOfLivingItem {
    constructor(
        readonly name: string,
        readonly value: number,
        readonly explanation: string,
    ) { }
}
