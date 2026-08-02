import type { TradeGood } from "../trade";
import { TradeGoods } from "../trade";
import type { Clan } from "../people/people";
import type { ProductionReport } from "./operation";

export type FlowRecord = {
    clan: Clan;
    good: TradeGood;
    amount: number;
    transactionCost?: number;
};

export class NetFlows {
    readonly produced = new Map<TradeGood, number>();
    readonly gotten: FlowRecord[] = [];
    readonly given: FlowRecord[] = [];
    readonly transactionCost = new Map<TradeGood, number>();

    constructor(production?: ProductionReport) {
        if (production) {
            for (const [good, amount] of production.totals().entries()) {
                this.produced.set(good, amount);
            }
        }
    }

    give(recipient: Clan, good: TradeGood, amountSent: number): void {
        this.given.push({
            clan: recipient,
            good,
            amount: amountSent,
        });
    }

    receive(donor: Clan, good: TradeGood, amountReceived: number, cost: number): void {
        this.gotten.push({
            clan: donor,
            good,
            amount: amountReceived,
            transactionCost: cost,
        });
        if (cost > 0) {
            const prevCost = this.transactionCost.get(good) ?? 0;
            this.transactionCost.set(good, prevCost + cost);
        }
    }

    totalProducedGood(good: TradeGood): number {
        return this.produced.get(good) ?? 0;
    }

    totalGottenGood(good: TradeGood): number {
        let sum = 0;
        for (const r of this.gotten) {
            if (r.good === good) sum += r.amount;
        }
        return sum;
    }

    totalGivenGood(good: TradeGood): number {
        let sum = 0;
        for (const r of this.given) {
            if (r.good === good) sum += r.amount;
        }
        return sum;
    }

    totalTransactionCost(good: TradeGood): number {
        return this.transactionCost.get(good) ?? 0;
    }

    netGood(good: TradeGood): number {
        const prod = this.totalProducedGood(good);
        const got = this.totalGottenGood(good);
        const giv = this.totalGivenGood(good);
        return Math.max(0, prod + got - giv);
    }

    get totalFoodProduced(): number {
        return this.totalProducedGood(TradeGoods.Fish) + this.totalProducedGood(TradeGoods.Cereals);
    }

    get totalFoodGotten(): number {
        return this.totalGottenGood(TradeGoods.Fish) + this.totalGottenGood(TradeGoods.Cereals);
    }

    get totalFoodGiven(): number {
        return this.totalGivenGood(TradeGoods.Fish) + this.totalGivenGood(TradeGoods.Cereals);
    }

    get totalFoodTransactionCost(): number {
        return this.totalTransactionCost(TradeGoods.Fish) + this.totalTransactionCost(TradeGoods.Cereals);
    }

    get totalFood(): number {
        return this.netGood(TradeGoods.Fish) + this.netGood(TradeGoods.Cereals);
    }

    get netFoodTransferred(): number {
        return this.totalFoodGotten - this.totalFoodGiven;
    }

    get netFoodOutflow(): number {
        return this.totalFoodGiven - this.totalFoodGotten;
    }
}
