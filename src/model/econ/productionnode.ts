import { Clan } from '../people/people';
import { Settlement } from '../people/settlement';
import { TradeGood } from '../trade';
import type { DistributionNode } from './distributionnode';
import type { SkillDef } from '../people/skills';

export class ProductionNode {
    workers_ = new Map<Clan, number>();
    output_ = new Map<TradeGood, Map<Clan, number>>();

    static readonly outputPerWorker = 3;
    static readonly populationPerWorker = 3;

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

    acceptFrom(settlement: Settlement): void {
        for (const clan of settlement.clans) {
            const laborFraction = clan.laborAllocation.allocs.get(this.skillDef) ?? 0;
            const workers = laborFraction * clan.population / ProductionNode.populationPerWorker;
            this.accept(clan, workers);
        }
    }

    accept(clan: Clan, workers: number): void {
        if (workers <= 0) {
            return;
        }
        this.workers_.set(clan, (this.workers_.get(clan) ?? 0) + workers);
        this.totalWorkers_ += workers;
    }

    produce(): void {
        // Assumptions:
        // - Output is linear in labor at this scale
        for (const [clan, workers] of this.workers_.entries()) {
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