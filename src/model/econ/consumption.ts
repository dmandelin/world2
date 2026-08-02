import { Activities, type Activity, EffortAllocation } from "../decisions/effort";
import { FoodQualityHappinessItem, FoodQuantityHappinessItem, LeisureHappinessItem } from "../people/happiness";
import { TradeGoods, type TradeGood } from "../trade";
import type { ProductionReport } from "./operation";
import { NetFlows } from "./netflows";

// Consumption data.
export class Consumption {
    readonly leisureFraction;

    // Note that we store per capita consumption in the map, as that's the
    // most relevant for welfare.

    constructor(
        readonly population: number,
        effortAllocation: EffortAllocation,
        readonly m: ReadonlyMap<TradeGood, ConsumptionGood>) {
        this.leisureFraction = effortAllocation.get(Activities.Leisure) ?? 0;
    }

    static from(
        population: number,
        effortAllocation: EffortAllocation,
        source: ProductionReport | NetFlows): Consumption {

        const netFlows = source instanceof NetFlows ? source : new NetFlows(source);
        const m = new Map<TradeGood, ConsumptionGood>();

        let unmetFoodDesire = 1;

        // Consume fish immediately, with any excess wasted.
        const fishCg = population > 0 ? netFlows.netGood(TradeGoods.Fish) / population : 0;
        if (fishCg) {
            const fishConsumed = Math.min(fishCg, unmetFoodDesire);
            unmetFoodDesire -= fishConsumed;
            m.set(TradeGoods.Fish, {
                good: TradeGoods.Fish,
                consumed: fishConsumed,
                wasted: fishCg - fishConsumed,
                stored: 0,
            });
        }

        // Consume cereals, putting any excess into storage.
        const cerealsCg = population > 0 ? netFlows.netGood(TradeGoods.Cereals) / population : 0;
        if (cerealsCg) {
            const cerealsConsumed = Math.min(cerealsCg, unmetFoodDesire);
            const excessCereals = cerealsCg - cerealsConsumed;
            unmetFoodDesire -= cerealsConsumed;

            const storedCereals = excessCereals;
            m.set(TradeGoods.Cereals, {
                good: TradeGoods.Cereals,
                consumed: cerealsConsumed,
                wasted: 0,
                stored: storedCereals,
            });
        }

        // Consume other goods directly.
        const goodsSet = new Set<TradeGood>([
            ...netFlows.produced.keys(),
            ...netFlows.gotten.map(r => r.good)
        ]);
        for (const good of goodsSet) {
            if (good === TradeGoods.Fish || good === TradeGoods.Cereals) continue;
            const amount = netFlows.netGood(good);
            m.set(good, {
                good,
                consumed: population > 0 ? amount / population : 0,
                wasted: 0,
                stored: 0,
            });
        }
        return new Consumption(population, effortAllocation, m);
    }

    get perCapitaFood(): number {
        return (this.m.get(TradeGoods.Fish)?.consumed ?? 0) + (this.m.get(TradeGoods.Cereals)?.consumed ?? 0);
    }

    get perCapitaFoodStored(): number {
        return (this.m.get(TradeGoods.Fish)?.stored ?? 0) + (this.m.get(TradeGoods.Cereals)?.stored ?? 0);
    }

    get fishRatio(): number {
        const cereals = this.m.get(TradeGoods.Cereals)?.consumed ?? 0;
        const fish = this.m.get(TradeGoods.Fish)?.consumed ?? 0;
        return cereals + fish === 0 ? 0.5 : fish / (cereals + fish);
    }

    get foodQuality(): { quantity: number, fishRatio: number } {
        return { quantity: this.perCapitaFood, fishRatio: this.fishRatio };
    }

    perCapita(good: TradeGood): number {
        return this.m.get(good)?.consumed ?? 0;
    }
}

export class ConsumptionGood {
    constructor(
        readonly good: TradeGood,
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
            // TODO need to port over more complicated code here.
            //new FoodSecurityHappinessItem(0, consumption.foodSecurity),
            new LeisureHappinessItem(0, consumption.leisureFraction),
        ]

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

