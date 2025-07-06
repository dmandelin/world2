import { Clan } from '../people/people';
import { Settlement } from '../people/settlement';
import { TradeGood } from '../trade';
import type { DistributionNode } from './distributionnode';
import type { SkillDef } from '../people/skills';

export class ProductionNode {
    workers_ = new Map<Clan, number>();
    output_ = new Map<TradeGood, Map<Clan, number>>();

    static readonly outputPerWorker = 3;

    totalWorkers_: number = 0;
    totalOutput_ = new Map<TradeGood, number>();

    constructor(
        readonly name: string,
        readonly settlement: Settlement,
        readonly skillDef: SkillDef,
        readonly sink: DistributionNode,
    ) {}

    workers(clan?: Clan): number {
        return clan ? this.workers_.get(clan) ?? 0 : this.totalWorkers_;
    }

    output(clan?: Clan): Map<TradeGood, number> {
        if (clan) {
            const m = new Map<TradeGood, number>();
            for (const [good, clansAndAmounts] of this.output_.entries()) {
                for (const [c, amount] of clansAndAmounts.entries()) {
                    if (c === clan) {
                        m.set(good, (m.get(good) ?? 0) + amount);
                    }
                }
            }
            return m;
        } else {
            return this.totalOutput_;
        }
    }

    reset(): void {
        this.workers_.clear();
        this.output_.clear();
        this.totalWorkers_ = 0;
        this.totalOutput_.clear();
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
            this.totalWorkers_ += workers;
            const tfp = clan.productivity(this.skillDef);
            const output = Math.round(ProductionNode.outputPerWorker * workers * tfp);
            if (output > 0) {
                this.totalOutput_.set(this.skillDef.outputGood!, 
                    (this.totalOutput_.get(this.skillDef.outputGood!) ?? 0) + output);
                
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