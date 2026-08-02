import { TradeGoods, type TradeGood } from "../trade";
import type { Clan } from "../people/people";

export type DirectFlowRecord = {
    clan: Clan;
    good: TradeGood;
    amount: number;
    transactionCost?: number;
};

export abstract class GoodFlows {
    constructor(readonly clan: Clan) { }

    protected sumMapGoods(map: Map<TradeGood, number>, predicate?: (g: TradeGood) => boolean): number {
        let sum = 0;
        for (const [good, amount] of map.entries()) {
            if (!predicate || predicate(good)) {
                sum += amount;
            }
        }
        return sum;
    }

    protected sumRecordsGoods(records: DirectFlowRecord[], predicate?: (g: TradeGood) => boolean): number {
        let sum = 0;
        for (const r of records) {
            if (!predicate || predicate(r.good)) {
                sum += r.amount;
            }
        }
        return sum;
    }
}

export class Distribution extends GoodFlows {
    readonly toConsumption = new Map<TradeGood, number>();
    readonly toStock = new Map<TradeGood, number>();
    readonly toDonations: DirectFlowRecord[] = [];

    addConsumption(good: TradeGood, amount: number): void {
        if (amount <= 0) return;
        const prev = this.toConsumption.get(good) ?? 0;
        this.toConsumption.set(good, prev + amount);
    }

    addStock(good: TradeGood, amount: number): void {
        if (amount <= 0) return;
        const prev = this.toStock.get(good) ?? 0;
        this.toStock.set(good, prev + amount);
    }

    addDonation(recipient: Clan, good: TradeGood, amount: number): void {
        if (amount <= 0) return;
        this.toDonations.push({ clan: recipient, good, amount });
    }

    totalToConsumption(good: TradeGood): number {
        return this.toConsumption.get(good) ?? 0;
    }

    totalToStock(good: TradeGood): number {
        return this.toStock.get(good) ?? 0;
    }

    totalToDonated(good: TradeGood): number {
        let sum = 0;
        for (const r of this.toDonations) {
            if (r.good === good) sum += r.amount;
        }
        return sum;
    }

    get totalFoodFromProduction(): number {
        return (this.clan.production?.totalFood() ?? 0);
    }

    get totalFoodToConsumption(): number {
        return this.sumMapGoods(this.toConsumption, g => g.isSubsistence);
    }

    get totalFoodToStock(): number {
        return this.sumMapGoods(this.toStock, g => g.isSubsistence);
    }

    get totalFoodGiven(): number {
        return this.sumRecordsGoods(this.toDonations, g => g.isSubsistence);
    }
}

export class StockOutflow extends GoodFlows {
    readonly toConsumption = new Map<TradeGood, number>();
    readonly toDonations: DirectFlowRecord[] = [];
    readonly retrievalCost = new Map<TradeGood, number>();
    readonly lost = new Map<TradeGood, number>();

    addConsumption(good: TradeGood, amount: number, cost: number = 0): void {
        if (amount <= 0) return;
        const prev = this.toConsumption.get(good) ?? 0;
        this.toConsumption.set(good, prev + amount);
        if (cost > 0) {
            const prevCost = this.retrievalCost.get(good) ?? 0;
            this.retrievalCost.set(good, prevCost + cost);
        }
    }

    addDonation(recipient: Clan, good: TradeGood, amount: number, cost: number = 0): void {
        if (amount <= 0) return;
        this.toDonations.push({ clan: recipient, good, amount, transactionCost: cost });
        if (cost > 0) {
            const prevCost = this.retrievalCost.get(good) ?? 0;
            this.retrievalCost.set(good, prevCost + cost);
        }
    }

    addLoss(good: TradeGood, amount: number): void {
        if (amount <= 0) return;
        const prev = this.lost.get(good) ?? 0;
        this.lost.set(good, prev + amount);
    }

    totalToConsumption(good: TradeGood): number {
        return this.toConsumption.get(good) ?? 0;
    }

    totalToDonated(good: TradeGood): number {
        let sum = 0;
        for (const r of this.toDonations) {
            if (r.good === good) sum += r.amount;
        }
        return sum;
    }

    totalRetrievalCost(good: TradeGood): number {
        return this.retrievalCost.get(good) ?? 0;
    }

    totalLost(good: TradeGood): number {
        return this.lost.get(good) ?? 0;
    }

    totalOutflow(good: TradeGood): number {
        return this.totalToConsumption(good) + this.totalToDonated(good) + this.totalRetrievalCost(good);
    }

    get totalFoodToConsumption(): number {
        return this.sumMapGoods(this.toConsumption, g => g.isSubsistence);
    }

    get totalFoodGiven(): number {
        return this.sumRecordsGoods(this.toDonations, g => g.isSubsistence);
    }

    get totalFoodRetrieved(): number {
        return this.totalFoodToConsumption + this.totalFoodGiven;
    }

    get totalFoodRetrievalCost(): number {
        return this.sumMapGoods(this.retrievalCost, g => g.isSubsistence);
    }

    get totalFoodLost(): number {
        return this.sumMapGoods(this.lost, g => g.isSubsistence);
    }
}

export class ConsumptionItem {
    constructor(
        readonly good: TradeGood,
        public consumed: number = 0,
        public fromProduction: number = 0,
        public fromStock: number = 0,
        public fromDonations: number = 0
    ) { }
}

export class Consumption extends GoodFlows {
    readonly fromProduction = new Map<TradeGood, number>();
    readonly fromStock = new Map<TradeGood, number>();
    readonly fromDonations: DirectFlowRecord[] = [];

    addProduction(good: TradeGood, amount: number): void {
        if (amount <= 0) return;
        const prev = this.fromProduction.get(good) ?? 0;
        this.fromProduction.set(good, prev + amount);
    }

    addStock(good: TradeGood, amount: number): void {
        if (amount <= 0) return;
        const prev = this.fromStock.get(good) ?? 0;
        this.fromStock.set(good, prev + amount);
    }

    addDonation(donor: Clan, good: TradeGood, amount: number, cost: number = 0): void {
        if (amount <= 0) return;
        this.fromDonations.push({ clan: donor, good, amount, transactionCost: cost });
    }

    totalFromProduction(good: TradeGood): number {
        return this.fromProduction.get(good) ?? 0;
    }

    totalFromStock(good: TradeGood): number {
        return this.fromStock.get(good) ?? 0;
    }

    totalFromDonated(good: TradeGood): number {
        let sum = 0;
        for (const r of this.fromDonations) {
            if (r.good === good) sum += r.amount;
        }
        return sum;
    }

    totalGood(good: TradeGood): number {
        return this.totalFromProduction(good) + this.totalFromStock(good) + this.totalFromDonated(good);
    }

    get totalFoodFromProduction(): number {
        return this.sumMapGoods(this.fromProduction, g => g.isSubsistence);
    }

    get totalFoodFromStock(): number {
        return this.sumMapGoods(this.fromStock, g => g.isSubsistence);
    }

    get totalFoodTaken(): number {
        return this.sumRecordsGoods(this.fromDonations, g => g.isSubsistence);
    }

    get totalFood(): number {
        return this.totalGood(TradeGoods.Fish) + this.totalGood(TradeGoods.Cereals);
    }

    get perCapitaFood(): number {
        const pop = this.clan.population || 1;
        return this.totalFood / pop;
    }

    get fishRatio(): number {
        const cereals = this.totalGood(TradeGoods.Cereals);
        const fish = this.totalGood(TradeGoods.Fish);
        return (cereals + fish === 0) ? 0.5 : fish / (cereals + fish);
    }

    get foodQuality(): { quantity: number; fishRatio: number } {
        return { quantity: this.perCapitaFood, fishRatio: this.fishRatio };
    }

    get leisureFraction(): number {
        return this.clan.effortAllocation?.get?.({ name: 'Leisure', sortKey: 4, shortName: 'L', color: '#ffd700' } as any) ?? 0.3;
    }

    perCapita(good: TradeGood): number {
        const pop = this.clan.population || 1;
        return this.totalGood(good) / pop;
    }

    // Compatibility getter for m: Map<TradeGood, ConsumptionGoodItem>
    get m(): ReadonlyMap<TradeGood, { good: TradeGood; consumed: number; wasted: number; stored: number }> {
        const result = new Map<TradeGood, { good: TradeGood; consumed: number; wasted: number; stored: number }>();
        const goodsSet = new Set<TradeGood>([
            ...this.fromProduction.keys(),
            ...this.fromStock.keys(),
            ...this.fromDonations.map(r => r.good)
        ]);
        const pop = this.clan.population || 1;
        for (const good of goodsSet) {
            result.set(good, {
                good,
                consumed: this.totalGood(good) / pop,
                wasted: 0,
                stored: 0,
            });
        }
        return result;
    }
}
