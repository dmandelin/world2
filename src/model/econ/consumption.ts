import { Activities, type Activity, EffortAllocation } from "../decisions/effort";
import { FoodQualityHappinessItem, FoodQuantityHappinessItem, FoodSecurityHappinessItem, LeisureHappinessItem } from "../people/happiness";
import { TradeGoods, type TradeGood } from "../trade";
import type { ProductionReport } from "./operation";

// Consumption data.
export class Consumption {
    readonly leisureFraction;
    readonly foodInsecurity: FoodInsecurity;

    // Note that we store per capita consumption in the map, as that's the
    // most relevant for welfare.

    constructor(
        readonly population: number, 
        effortAllocation: EffortAllocation,
        readonly m: ReadonlyMap<TradeGood, ConsumptionGood>) {
            this.leisureFraction = effortAllocation.get(Activities.Leisure) ?? 0;
            this.foodInsecurity = new FoodInsecurity(this);
        }

    static from(
        population: number, 
        effortAllocation: EffortAllocation, 
        produce: ProductionReport): Consumption {

        const p = produce.totals();
        const m = new Map<TradeGood, ConsumptionGood>();

        let unmetFoodDesire = 1;

        // Consume fish immediately, with any excess wasted.
        const fishCg = (p.get(TradeGoods.Fish) ?? 0) / population;
        if (fishCg) {
            const fishConsumed = Math.min(fishCg, unmetFoodDesire);
            unmetFoodDesire -= fishConsumed;
            m.set(TradeGoods.Fish, {
                good: TradeGoods.Fish,
                consumed: fishConsumed,
                wasted: fishCg - fishConsumed,
                stored: 0,
                stock: 0,
                stockLoss: 0,
            });
        }

        // Consume cereals, putting any excess into storage.
        const cerealsCg = (p.get(TradeGoods.Cereals) ?? 0) / population;
        if (cerealsCg) {
            const cerealsConsumed = Math.min(cerealsCg, unmetFoodDesire);
            const excessCereals = cerealsCg - cerealsConsumed;
            unmetFoodDesire -= cerealsConsumed;

            // This has to be handled carefully because excessCereals is a flow,
            // which we need to convert into a stock of stored cereals. Also note
            // that logically some cereals are produced each year, but our turns
            // are rather longer, but this can be mostly ignored as including this
            // in the analysis just adds constant factors, so below we'll pretend
            // years and turns are equivalent.
            //
            // Let S be the stock, E the excess cereals, and c the iceberg cost
            // in fraction of stock lost per year. Then the storage losses are cS.
            // At steady state, E = cS, so S = E / c.
            //
            // At the start, we'll assume storage is mostly simple pits and bins,
            // with some use of simple hand-made pottery (which might not be
            // practical for big bulk storage) and a fairly high loss rate. We can
            // update that as needed.

            const icebergCost = 0.5;
            const storedCereals = excessCereals / icebergCost;
            m.set(TradeGoods.Cereals, {
                good: TradeGoods.Cereals,
                consumed: cerealsConsumed,
                wasted: 0,
                stored: storedCereals,
                stock: storedCereals,
                stockLoss: storedCereals * icebergCost,
            });
        }

        // Consume other goods directly.
        for (const [good, amount] of p.entries()) {
            if (good === TradeGoods.Fish || good === TradeGoods.Cereals) continue;
            m.set(good, {
                good,
                consumed: amount / population,
                wasted: 0,
                stored: 0,
                stock: 0,
                stockLoss: 0,
            });
        }
        return new Consumption(population, effortAllocation, m);
    }

    get perCapitaFood(): number {
        return (this.m.get(TradeGoods.Fish)?.consumed ?? 0) + (this.m.get(TradeGoods.Cereals)?.consumed ?? 0);
    }

    get perCapitaFoodStock(): number {
        return (this.m.get(TradeGoods.Fish)?.stock ?? 0) + (this.m.get(TradeGoods.Cereals)?.stock ?? 0);
    }

    get fishRatio(): number {
        const cereals = this.m.get(TradeGoods.Cereals)?.consumed ?? 0;
        const fish = this.m.get(TradeGoods.Fish)?.consumed ?? 0;
        return cereals + fish === 0 ? 0.5 : fish / (cereals + fish);
    }

    get foodQuality(): {quantity: number, fishRatio: number} {
        return {quantity: this.perCapitaFood, fishRatio: this.fishRatio};
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
        public stock: number,
        public stockLoss: number,
    ) {}
}

export class FoodInsecurity {
    // Even with plenty of storage, there's still some risk if the
    // storage system fails. For now we assume simple pits and reed
    // baskets.
    readonly storageRisk = 0.2;

    readonly base: number;
    readonly value: number;

    constructor(consumption: Consumption) {
        // Hunter-gatherers have a variety of sources, so their baseline
        // food insecurity is lower, but enough stored food can make
        // farmers more secure.
        this.base = 0.1 * consumption.fishRatio + 0.2 * (1 - consumption.fishRatio);
        this.value = Math.max(this.storageRisk, this.base - 0.5 * consumption.perCapitaFoodStock);
    }

    get buffering(): number {
        return this.base - this.value;
    }
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
    ) {}
}

