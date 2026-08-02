import { TradeGoods, type TradeGood } from "../trade";

export class StockItem {
    constructor(
        readonly good: TradeGood,
        public amount: number = 0,
        public additions: number = 0,
        public storageLoss: number = 0,
        public retrievals: number = 0,
        public retrievalCost: number = 0,
    ) { }

    perCapitaAmount(pop: number): number {
        return pop > 0 ? this.amount / pop : 0;
    }

    perCapitaAdditions(pop: number): number {
        return pop > 0 ? this.additions / pop : 0;
    }

    perCapitaStorageLoss(pop: number): number {
        return pop > 0 ? this.storageLoss / pop : 0;
    }

    perCapitaRetrievals(pop: number): number {
        return pop > 0 ? this.retrievals / pop : 0;
    }

    perCapitaRetrievalCost(pop: number): number {
        return pop > 0 ? this.retrievalCost / pop : 0;
    }
}

export class Stock {
    private items_: Map<TradeGood, StockItem> = new Map();

    constructor(initialItems?: Map<TradeGood, StockItem> | ReadonlyMap<TradeGood, StockItem>) {
        if (initialItems) {
            for (const [good, item] of initialItems.entries()) {
                this.items_.set(
                    good,
                    new StockItem(good, item.amount, item.additions, item.storageLoss, item.retrievals, item.retrievalCost)
                );
            }
        }
    }

    get items(): readonly StockItem[] {
        return Array.from(this.items_.values());
    }

    get m(): ReadonlyMap<TradeGood, StockItem> {
        return this.items_;
    }

    getItem(good: TradeGood): StockItem {
        let item = this.items_.get(good);
        if (!item) {
            item = new StockItem(good, 0, 0, 0, 0, 0);
            this.items_.set(good, item);
        }
        return item;
    }

    getAmount(good: TradeGood): number {
        return this.items_.get(good)?.amount ?? 0;
    }

    get totalFoodStock(): number {
        let total = 0;
        for (const item of this.items_.values()) {
            if (item.good.isSubsistence) {
                total += item.amount;
            }
        }
        return total;
    }

    perCapitaFoodStock(pop: number): number {
        return pop > 0 ? this.totalFoodStock / pop : 0;
    }

    get totalFoodAdditions(): number {
        let total = 0;
        for (const item of this.items_.values()) {
            if (item.good.isSubsistence) {
                total += item.additions;
            }
        }
        return total;
    }

    perCapitaFoodAdditions(pop: number): number {
        return pop > 0 ? this.totalFoodAdditions / pop : 0;
    }

    get totalFoodStorageLoss(): number {
        let total = 0;
        for (const item of this.items_.values()) {
            if (item.good.isSubsistence) {
                total += item.storageLoss;
            }
        }
        return total;
    }

    perCapitaFoodStorageLoss(pop: number): number {
        return pop > 0 ? this.totalFoodStorageLoss / pop : 0;
    }

    get totalFoodRetrievals(): number {
        let total = 0;
        for (const item of this.items_.values()) {
            if (item.good.isSubsistence) {
                total += item.retrievals;
            }
        }
        return total;
    }

    perCapitaFoodRetrievals(pop: number): number {
        return pop > 0 ? this.totalFoodRetrievals / pop : 0;
    }

    get totalFoodRetrievalCost(): number {
        let total = 0;
        for (const item of this.items_.values()) {
            if (item.good.isSubsistence) {
                total += item.retrievalCost;
            }
        }
        return total;
    }

    perCapitaFoodRetrievalCost(pop: number): number {
        return pop > 0 ? this.totalFoodRetrievalCost / pop : 0;
    }

    resetTurnStats(): void {
        for (const item of this.items_.values()) {
            item.additions = 0;
            item.storageLoss = 0;
            item.retrievals = 0;
            item.retrievalCost = 0;
        }
    }

    retrieveFood(needed: number, retrievalCostRate: number = 0.20): Map<TradeGood, number> {
        const retrievedMap = new Map<TradeGood, number>();
        let remainingNeeded = needed;
        const costFactor = 1 + retrievalCostRate;

        for (const item of this.items_.values()) {
            if (!item.good.isSubsistence || item.amount <= 0 || remainingNeeded <= 0) continue;

            const maxStockNeeded = remainingNeeded * costFactor;
            if (item.amount >= maxStockNeeded) {
                const retrieved = remainingNeeded;
                const cost = retrieved * retrievalCostRate;
                item.amount -= maxStockNeeded;
                item.retrievals += retrieved;
                item.retrievalCost += cost;
                retrievedMap.set(item.good, (retrievedMap.get(item.good) ?? 0) + retrieved);
                remainingNeeded = 0;
            } else {
                const retrieved = item.amount / costFactor;
                const cost = item.amount - retrieved;
                item.retrievals += retrieved;
                item.retrievalCost += cost;
                item.amount = 0;
                retrievedMap.set(item.good, (retrievedMap.get(item.good) ?? 0) + retrieved);
                remainingNeeded -= retrieved;
            }
        }
        return retrievedMap;
    }

    updateAdditions(additionsMap: Map<TradeGood, number>): void {
        for (const good of Object.values(TradeGoods)) {
            const added = additionsMap.get(good) ?? 0;
            const item = this.getItem(good);
            item.additions = added;
            item.amount += added;
        }
    }

    applyLosses(): void {
        for (const item of this.items_.values()) {
            const lossRate = item.good === TradeGoods.Cereals ? 0.2 : 1.0;
            item.storageLoss = item.amount * lossRate;
            item.amount = item.amount - item.storageLoss;
        }
    }

    clone(): Stock {
        return new Stock(this.items_);
    }
}
