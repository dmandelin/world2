import type { GoodsReceiver } from '../people/people';
import { Settlement } from '../people/settlement';
import type { TradeGood } from '../trade';

export class DistributionNode {
    input_: Map<TradeGood, number> = new Map();
    output_: Map<GoodsReceiver, Map<TradeGood, number>> = new Map();

    constructor(
        readonly settlement: Settlement,
    ) {}

    get name(): string {
        return `Village storage`;
    }

    reset(): void {
        this.input_.clear();
        this.output_.clear();
    }

    accept(source: string, good: TradeGood, amount: number): void {
        this.input_.set(good, (this.input_.get(good) ?? 0) + amount);
    }

    distribute() {
        // share out goods to all clans by population
        const totalPopulation = this.settlement.clans.population;
        for (const clan of this.settlement.clans) {
            const clanPopulation = clan.population;
            const share = clanPopulation / totalPopulation;

            const outputMap = new Map<TradeGood, number>();
            for (const [good, amount] of this.input_) {
                outputMap.set(good, amount * share);
            }
            this.output_.set(clan, outputMap);
        }
    }

    commit(): void {
        for (const [clan, goods] of this.output_) {
            for (const [good, amount] of goods) {
                clan.accept(this.name, good, amount);
            }
        }
    }
}