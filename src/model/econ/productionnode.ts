import { Clan } from '../people/people';
import { Settlement } from '../people/settlement';
import { TradeGood } from '../trade';
import type { DistributionNode } from './distributionnode';
import type { SkillDef } from '../people/skills';

export class ProductionNode {
    workers_ = new Map<Clan, number>();
    output_ = new Map<TradeGood, Map<Clan, number>>();

    constructor(
        readonly name: string,
        readonly settlement: Settlement,
        readonly skillDef: SkillDef,
        readonly sink: DistributionNode,
    ) {}

    reset(): void {
        this.workers_.clear();
        this.output_.clear();
    }

    acceptFromSettlement(): void {
        // Assumptions:
        // - (For now) Every clan is 50/50 farmer/fisher
        for (const clan of this.settlement.clans) {
            this.workers_.set(clan, clan.population / 6);
        }
    }

    produce(): void {
        // Assumptions:
        // - Output is linear in labor at this scale
        for (const [clan, workers] of this.workers_.entries()) {
            const tfp = clan.productivity(this.skillDef);
            const output = Math.round(3 * workers * tfp);
            if (output > 0) {
                const goods = this.output_.get(this.skillDef.outputGood!) ?? new Map();
                goods.set(clan, (goods.get(clan) ?? 0) + output);
                this.output_.set(this.skillDef.outputGood!, goods);
            }
        }
    }

    commit(): void {
        for (const [good, goods] of this.output_) {
            for (const [clan, amount] of goods) {
                this.sink.accept(clan.name, good, amount);
            }
        }
    }
}