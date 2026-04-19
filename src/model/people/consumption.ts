import { TradeGoods, type TradeGood } from "../trade";
import type { Clan } from "./people";

export class Consumption {
    // Population consuming these goods.
    private population_: number = 0;
    // Ledger of all data on each good.
    private ledger_: Map<TradeGood, ConsumptionGood> = new Map();
    // Sources of goods, for informational purposes.
    private sourceMaps_: Map<TradeGood, Map<string, number>> = new Map();

    constructor(readonly clan: Clan) {
    }

    reset() {
        this.population_ = this.clan.population;
        this.ledger_.clear();
    }

    clone(): Consumption {
        const clone = new Consumption(this.clan);
        clone.population_ = this.population_;
        clone.ledger_ = new Map(this.ledger_);
        clone.sourceMaps_ = new Map(this.sourceMaps_);
        return clone;
    }

    get population(): number {
        return this.population_;
    }

    sourceMap(good: TradeGood): Map<string, number> {
        return this.sourceMaps_.get(good)!;
    }

    get amounts(): Record<string, number> {
        const result: Record<string, number> = {};
        for (const cg of this.ledger_.values()) {
            result[cg.good.name] = cg.consumption;
        }
        return result;
    }

    amount(good: TradeGood): number {
         return this.ledger_.get(good)?.consumption ?? 0;
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
                result[cg.good.name] = this.population === 0 ? cg.consumption : cg.consumption / this.population;
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

    remove(source: string, good: TradeGood, amount: number): boolean {
        if (amount <= 0) return false;
        if (this.amount(good) < amount) return false;
        this.ledger_.get(good)!.consumption -= amount;
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
            cg = new ConsumptionGood(good, 0, 0, 0, 0);
            this.ledger_.set(good, cg);
        }
        cg.consumption += amount;
    }

    store() {
        // Fixed decision for now: If there is surplus 
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
            const newAmount = Math.round(cg.consumption * newClanFraction);
            newCalc.ledger_.set(good, new ConsumptionGood(good, newAmount, 0, 0, 0));
            cg.consumption -= newAmount;
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
        public consumption: number,
        public waste: number,
        public storage: number,
        public storageLoss: number,
    ) {}
}