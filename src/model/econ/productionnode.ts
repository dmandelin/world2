import { Clan } from '../people/people';
import { Settlement } from '../people/settlement';
import { TradeGood } from '../trade';
import type { DistributionNode } from './distributionnode';
import { SkillDefs, type SkillDef } from '../people/skills';
import { sum, sumFun } from '../lib/basics';

export class ProductionNode {
    workers_ = new Map<Clan, number>();
    workerFractions_ = new Map<Clan, number>();
    output_ = new Map<TradeGood, Map<Clan, number>>();

    land_ = new Map<Clan, number>();

    static readonly outputPerWorker = 3;
    static readonly populationPerWorker = 3;

    totalWorkers_: number = 0;
    totalOutput_ = new Map<TradeGood, number>();

    constructor(
        readonly name: string,
        readonly settlement: Settlement,
        readonly originalTotalLand: number,
        readonly skillDef: SkillDef,
        readonly sink: DistributionNode,
    ) {}

    workers(clan?: Clan): number {
        return clan ? this.workers_.get(clan) ?? 0 : this.totalWorkers_;
    }

    workerFraction(clan?: Clan): number {
        return clan 
             ? this.workerFractions_.get(clan)!
             : sumFun([...this.workerFractions_.entries()], ([c, f]) =>
                f * c.population / this.settlement.population);
    }

    land(clan?: Clan): number {
        return clan ? this.land_.get(clan)! : sum(this.land_.values());
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

    tfp(clan?: Clan): number {
        return clan 
          ? this.output(clan).get(this.skillDef.outputGood!)! / this.workers(clan) / ProductionNode.outputPerWorker
          : (this.totalOutput_.get(this.skillDef.outputGood!) ?? 0) / this.totalWorkers_ / ProductionNode.outputPerWorker;
    }

    reset(): void {
        this.workerFractions_.clear();
        this.workers_.clear();
        this.land_.clear();
        this.output_.clear();
        this.totalWorkers_ = 0;
        this.totalOutput_.clear();
    }

    acceptFrom(settlement: Settlement): void {
        for (const clan of settlement.clans) {
            const laborFraction = clan.laborAllocation.allocs.get(this.skillDef) ?? 0;
            const workers = laborFraction * clan.population / ProductionNode.populationPerWorker;
            this.accept(clan, laborFraction, workers);
        }
    }

    accept(clan: Clan, laborFraction: number, workers: number): void {
        if (workers <= 0) {
            return;
        }
        this.workers_.set(clan, (this.workers_.get(clan) ?? 0) + workers);
        this.workerFractions_.set(clan, (this.workerFractions_.get(clan) ?? 0) + laborFraction);
        this.totalWorkers_ += workers;
    }

    produce(): void {
        // Assume output is linear in workers and land at this scale, with both
        // required.
        for (const [clan, workers] of this.workers_.entries()) {
            const land = this.landFor(clan);
            this.land_.set(clan, land);

            const inputs = Math.min(land, workers);
            const lp = clan.productivity(this.skillDef);
            let output = ProductionNode.outputPerWorker * inputs * lp;

            if (output > 0) {
                this.totalOutput_.set(this.skillDef.outputGood!, 
                    (this.totalOutput_.get(this.skillDef.outputGood!) ?? 0) + output);
                
                    const goods = this.output_.get(this.skillDef.outputGood!) ?? new Map();
                goods.set(clan, (goods.get(clan) ?? 0) + output);
                this.output_.set(this.skillDef.outputGood!, goods);
            }
        }
    }

    private landFor(clan: Clan) {
        // Fishing "land" is shared across the cluster.
        if (this.skillDef === SkillDefs.Fishing) {
            let ourFishers = 0;
            let totalFishers = 0;
            for (const settlement of clan.settlement.cluster.settlements) {
                for (const pn of settlement.productionNodes) {
                    if (pn.skillDef === SkillDefs.Fishing) {
                        for (const fishingClan of settlement.clans) {
                            const fishers = pn.workers(fishingClan);
                            if (fishingClan === clan) {
                                ourFishers += fishers;
                            }
                            totalFishers += fishers;
                        }
                    }
                }
            }
            return this.originalTotalLand * ourFishers / totalFishers;
        }

        return this.originalTotalLand * this.workers(clan) / this.totalWorkers_;
    }

    commit(): void {
        for (const [good, goods] of this.output_) {
            for (const [clan, amount] of goods) {
                this.sink.accept(clan.name, good, amount);
            }
        }
    }
}