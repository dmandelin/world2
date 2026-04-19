import { sumFun } from "../lib/basics";
import { TradeGoods, type TradeGood } from "../trade";
import type { Clan } from "./people";
import { SkillDef, SkillDefs } from "./skills";

export class Consumption {
    // Population consuming these goods.
    private population_: number = 0;
    // Ledger of all data on each good.
    private ledger_: Map<TradeGood, ConsumptionGood> = new Map();
    // Sources of goods, for informational purposes.
    private sourceMaps_: Map<TradeGood, Map<string, number>> = new Map();
    // Food insecurity.
    private foodInsecurity_ = new FoodInsecurity(this);

    constructor(readonly clan: Clan) {
    }

    reset() {
        this.population_ = this.clan.population;
        this.ledger_.clear();
        this.foodInsecurity_.reset();
    }

    clone(): Consumption {
        const clone = new Consumption(this.clan);
        clone.population_ = this.population_;
        clone.ledger_ = new Map(this.ledger_);
        clone.sourceMaps_ = new Map(this.sourceMaps_);
        clone.foodInsecurity_ = this.foodInsecurity_.clone();
        return clone;
    }

    get population(): number {
        return this.population_;
    }

    get ledger(): ReadonlyMap<TradeGood, ConsumptionGood> {
        return this.ledger_;
    }
    
    sourceMap(good: TradeGood): ReadonlyMap<string, number> {
        return this.sourceMaps_.get(good)!;
    }

    get foodInsecurity(): FoodInsecurity {
        return this.foodInsecurity_;
    }

    get amounts(): Record<string, number> {
        const result: Record<string, number> = {};
        for (const cg of this.ledger_.values()) {
            result[cg.good.name] = cg.consumed;
        }
        return result;
    }

    amount(good: TradeGood): number {
         return this.ledger_.get(good)?.consumed ?? 0;
    }

    get perCapitaAmounts(): Record<string, number> {
        const amounts = this.amounts;
        for (const key of Object.keys(amounts)) {
            if (this.population !== 0) {
                amounts[key] /= this.population;
            }
        }
        return amounts;
    }

    get perCapitaSubistenceAmounts(): Record<string, number> {
        const result: Record<string, number> = {};
        for (const cg of this.ledger_.values()) {
            if (cg.good.isSubsistence) {
                result[cg.good.name] = this.population === 0 ? cg.consumed : cg.consumed / this.population;
            }
        }
        return result;
    }

    perCapita(good: TradeGood): number {
        const amount = this.amount(good);
        if (this.population === 0) return amount;
        return amount / this.population;
    }

    perCapitaSubsistence(): number {
        return this.perCapita(TradeGoods.Cereals) + this.perCapita(TradeGoods.Fish);
    }

    perCapitaFoodWasted(): number {
        const cerealsCg = this.ledger_.get(TradeGoods.Cereals);
        const fishCg = this.ledger_.get(TradeGoods.Fish);
        const cerealsWaste = cerealsCg ? cerealsCg.wasted : 0;
        const fishWaste = fishCg ? fishCg.wasted : 0;
        const totalWaste = cerealsWaste + fishWaste;
        return this.population === 0 ? totalWaste : totalWaste / this.population;
    }

    perCapitaFoodStored(): number {
        const cerealsCg = this.ledger_.get(TradeGoods.Cereals);
        if (!cerealsCg) return 0;
        return this.population === 0 ? cerealsCg.stored : cerealsCg.stored / this.population;
    }

    perCapitaFoodStock(): number {
        const cerealsCg = this.ledger_.get(TradeGoods.Cereals);
        if (!cerealsCg) return 0;
        return this.population === 0 ? cerealsCg.stock : cerealsCg.stock / this.population;
    }

    perCapitaFoodStockLoss(): number {
        const cerealsCg = this.ledger_.get(TradeGoods.Cereals);
        if (!cerealsCg) return 0;
        return this.population === 0 ? cerealsCg.stockLoss : cerealsCg.stockLoss / this.population;
    }

    remove(source: string, good: TradeGood, amount: number): boolean {
        if (amount <= 0) return false;
        if (this.amount(good) < amount) return false;
        this.ledger_.get(good)!.consumed -= amount;
        const sourceMap = this.sourceMaps_.get(good)!;
        const prevAmount = sourceMap.get(source) ?? 0;
        sourceMap.set(source, prevAmount - amount);
        return true;
    }

    // Accept goods produced or acquired into the consumption basket.
    // Note however that some may be moved into storage before consumption.
    accept(source: string, good: TradeGood, amount: number) {
        if (amount <= 0) return;

        // Update source map.
        let sourceMap = this.sourceMaps_.get(good);
        if (!sourceMap) {
            sourceMap = new Map<string, number>();
            this.sourceMaps_.set(good, sourceMap);
        }
        const prevAmount = sourceMap.get(source) ?? 0;
        sourceMap.set(source, prevAmount + amount);

        // Update ledger.
        let cg = this.ledger_.get(good);
        if (!cg) {
            cg = new ConsumptionGood(good, 0, 0, 0, 0, 0);
            this.ledger_.set(good, cg);
        }
        cg.consumed += amount;
    }

    handleSurplusFood() {
        // For now, assume clans eat only what they need, so all surplus food
        // must go to storage or waste:
        // - Cereals can be stored with an iceberg cost for storage construction,
        //   spoilage, and pests.
        // - Fish can't be stored. Fish can be dried, but for now mainly we need
        //   to draw the distinction that cereals are much more storable.

        // Get requirements and exit if no surplus.
        const cerealsCg = this.ledger_.get(TradeGoods.Cereals);
        const fishCg = this.ledger_.get(TradeGoods.Fish);
        const totalFood = (cerealsCg?.consumed ?? 0) + (fishCg?.consumed ?? 0);
        const requiredFood = this.population;
        if (totalFood <= requiredFood) return;
        let excessFood = totalFood - requiredFood;

        // Try to store all the cereals we can.
        if (cerealsCg) {
            const excessCereals = Math.min(cerealsCg.consumed, excessFood);

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
            cerealsCg.consumed -= excessCereals;
            cerealsCg.stored += storedCereals;
            cerealsCg.stock += storedCereals;
            cerealsCg.stockLoss += storedCereals * icebergCost;
            excessFood -= excessCereals;
        }

        // Any remaining excess food is wasted. Cereals are accounted for above.
        if (fishCg) {
            fishCg.consumed -= excessFood;
            fishCg.wasted += excessFood;
        }
    }
    
    splitOff(newClan: Clan): Consumption {
        const newCalc = new Consumption(newClan);
        const newClanFraction = newClan.population / this.clan.population;

        // Split population.
        newCalc.population_ = Math.round(this.population_ * newClanFraction);
        this.population_ -= newCalc.population_;

        // Split goods.
        // TODO - Split other fields, although I'm not sure it actually matters.
        for (const [good, cg] of this.ledger_) {
            const newAmount = Math.round(cg.consumed * newClanFraction);
            newCalc.ledger_.set(good, new ConsumptionGood(good, newAmount, 0, 0, 0, 0));
            cg.consumed -= newAmount;
        }

        // Split sources.
        for (const [good, sourceMap] of this.sourceMaps_) {
            const newSourceMap = new Map<string, number>();
            newCalc.sourceMaps_.set(good, newSourceMap);
            for (const [source, amount] of sourceMap) {
                const newAmount = Math.round(amount * newClanFraction);
                newSourceMap.set(source, newAmount);
                sourceMap.set(source, amount - newAmount);
            }
        }

        return newCalc;
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

// Simple model of food insecurity. Assumptions:
// - Clans experience food production unavailability from time to 
//   time due to fish die-offs, floods wiping out fields, pests, etc.,
//   depending on their environment and production methods.
//   - Hunter-gatherers have a low but nonzero baseline food production
//     unavailability; low because they have many sources to try
//   - Early farmers without flood control systems have a high baseline
//     food production unavailability, because a 20-year turn offers
//     plenty of chances for flooding and other small disasters
// - Clans can cover unavailability with stored food or receipts from
//   other clans
//
// Food insecurity is expressed as an arbitrarily defined ratio where
// 1.0 is high, but not the highest possible.
export class FoodInsecurity {
    productionInsecurityItems: FoodProductionInsecurityItem[] = [];
    productionInsecurity = 0;

    storage = 0;
    storageBuffering = 0;

    value = 0;

    constructor(readonly consumption: Consumption) {
        this.update();
    }

    reset() {
        this.productionInsecurityItems = [];
        this.productionInsecurity = 0;
        this.storage = 0;
        this.storageBuffering = 0;
        this.value = 0;
    }

    clone() {
        const clone = new FoodInsecurity(this.consumption);
        clone.productionInsecurityItems = this.productionInsecurityItems.slice();
        clone.productionInsecurity = this.productionInsecurity;
        clone.storage = this.storage;
        clone.storageBuffering = this.storageBuffering;
        clone.value = this.value;
        return clone;
    }

    update() {
        this.updateProductionInsecurity();
        this.updateStorageBuffering();
        this.value = Math.max(0, this.productionInsecurity - this.storageBuffering);
    }
    
    updateProductionInsecurity() {
        const fishCg = this.consumption.ledger.get(TradeGoods.Fish);
        const cerealsCg = this.consumption.ledger.get(TradeGoods.Cereals);
        const fishConsumed = fishCg ? fishCg.consumed : 0;
        const cerealsConsumed = cerealsCg ? cerealsCg.consumed : 0;
        const fishRatio = (fishConsumed + cerealsConsumed) > 0 ? fishConsumed / (fishConsumed + cerealsConsumed) : 0;

        // Assumed to be more broadly hunting and gathering items for now
        this.productionInsecurityItems.push(new FoodProductionInsecurityItem(
            SkillDefs.Fishing.name,
            0.2,
            fishRatio,
        ));

        this.productionInsecurityItems.push(new FoodProductionInsecurityItem(
            SkillDefs.Agriculture.name,
            1.0,
            1 - fishRatio,
        ));

        this.productionInsecurity = sumFun(this.productionInsecurityItems, item => item.scaledInsecurity);
    }

    updateStorageBuffering() {
        this.storage = this.consumption.perCapitaFoodStock();
        this.storageBuffering = 1 - 0.2 ** this.storage;
    }
}

class FoodProductionInsecurityItem {
    constructor(
        readonly source: string,
        readonly insecurity: number,
        readonly consumptionRatio: number) {
    }

    get scaledInsecurity() {
        return this.insecurity * this.consumptionRatio;
    }
}