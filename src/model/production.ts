// A production pot, where effort and/or resources from
// various source go in, and products come out to different
// receivers.

import type { GoodsReceiver } from "./people";
import { TradeGood, TradeGoods } from "./trade";

export class Pot {
    private contributors_: number = 0;
    private input_: number = 0;

    private tradeGoods_ = new Set<TradeGood>();

    constructor(
        readonly name: string,
        readonly receivers: GoodsReceiver[],
    ) {}

    get contributors() {
        return this.contributors_;
    }

    get input() {
        return this.input_;
    }

    get baseProductivity() {
        return this.input / this.contributors;
    }

    get scaleFactor() {
        return Math.pow(this.contributors_ / 50, 1/6);
    }

    get output() {
        return this.scaleFactor * this.input_;
    }

    get tfp() {
        return this.baseProductivity * this.scaleFactor;
    }

    clone() {
        const c = new Pot(this.name, this.receivers);
        c.contributors_ = this.contributors_;
        c.input_ = this.input_;
        return c;
    }

    clear() {
        this.contributors_ = 0;
        this.input_ = 0;
    }

    accept(contributors: number, input: number) {
        this.contributors_ += contributors;
        this.input_ += input;
    }

    acceptTradeGood(good: TradeGood) {
        this.tradeGoods_.add(good);
    }

    distribute() {
        const output = this.output;
        for (const clan of this.receivers) {
            clan.accept(this.name, TradeGoods.Subsistence, output * clan.share);
        }
    }
}