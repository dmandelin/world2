import { TradeGoods, type TradeGood } from "../trade";
import type { Clan } from "./people";

export class ConsumptionCalc {
    // good -> source -> amount
    private ledger_: Map<TradeGood, Map<string, number>> = new Map();
    private population_: number = 0;

    constructor(readonly clan: Clan) {
    }

    reset() {
        this.population_ = this.clan.population;
        this.ledger_.clear();
    }

    clone(): ConsumptionCalc {
        const clone = new ConsumptionCalc(this.clan);
        clone.population_ = this.population_;
        for (const [good, sourceMap] of this.ledger_) {
            const newSourceMap = new Map<string, number>();
            for (const [source, amount] of sourceMap) {
                newSourceMap.set(source, amount);
            }
            clone.ledger_.set(good, newSourceMap);
        }
        return clone;
    }

    get population(): number {
        return this.population_;
    }

    get ledger(): IterableIterator<[TradeGood, Map<string, number>]> {
        return this.ledger_.entries();
    }

    sourceMap(good: TradeGood): Map<string, number> {
        return this.ledger_.get(good) ?? new Map<string, number>();
    }

    get amounts(): Record<string, number> {
        const result: Record<string, number> = {};
        for (const [good, sourceMap] of this.ledger_) {
            result[good.name] = [...sourceMap.values()].reduce((acc, amount) => acc + amount, 0);
        }
        return result;
    }

    amount(good: TradeGood): number {
        const sourceMap = this.ledger_.get(good);
        if (!sourceMap) return 0;
        return [...sourceMap.values()].reduce((acc, amount) => acc + amount, 0);
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
        for (const [good, sourceMap] of this.ledger_) {
            if (good.isSubsistence) {
                result[good.name] = [...sourceMap.values()]
                    .reduce((acc, amount) => acc + amount / this.population, 0);
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
        const sourceMap = this.ledger_.get(good)!;
        sourceMap.set(source, (sourceMap.get(source) ?? 0) - amount);
        return true;
    }

    accept(source: string, good: TradeGood, amount: number) {
        if (amount <= 0) return;
        if (!this.ledger_.has(good)) this.ledger_.set(good, new Map<string, number>());
        const sourceMap = this.ledger_.get(good)!;
        const prevAmount = sourceMap.get(source) ?? 0;
        let newAmount = prevAmount + amount;

        // Seasonal availability varies and forage is hard to store, so
        // there will always be some shortfall if this is the only good.
        if (good === TradeGoods.Fish) {
            newAmount = Math.min(newAmount, this.population * 0.9)
        }

        sourceMap.set(source, newAmount);
    }
    
    splitOff(newClan: Clan): ConsumptionCalc {
        const originalPopulation = this.population_;
        this.population_ -= newClan.population;
        const newCalc = new ConsumptionCalc(this.clan);
        for (const [good, sourceMap] of this.ledger_) {
            const newSourceMap = new Map<string, number>();
            for (const [source, amount] of sourceMap) {
                const newAmount = amount * newClan.population / originalPopulation;
                newSourceMap.set(source, newAmount);
                this.ledger_.get(good)!.set(source, amount - newAmount);
            }
            newCalc.ledger_.set(good, newSourceMap);
        }
        return newCalc;
    }
}
