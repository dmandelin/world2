import { TradeGoods, type TradeGood } from "../trade";

export class StockItem {
    constructor(
        readonly good: TradeGood,
        public amount: number = 0,
        public additions: number = 0,
        public storageLoss: number = 0,
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
}

export class Stock {
    private items_: Map<TradeGood, StockItem> = new Map();

    constructor(initialItems?: Map<TradeGood, StockItem> | ReadonlyMap<TradeGood, StockItem>) {
        if (initialItems) {
            for (const [good, item] of initialItems.entries()) {
                this.items_.set(good, new StockItem(good, item.amount, item.additions, item.storageLoss));
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
            item = new StockItem(good, 0, 0, 0);
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
