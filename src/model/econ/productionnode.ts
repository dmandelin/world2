import { Clan } from '../people/people';
import { Settlement } from '../people/settlement';
import { TradeGood } from '../trade';
import type { DistributionNode } from './distributionnode';
import { SkillDefs, type SkillDef } from '../people/skills';
import { sum, sumFun, weightedHarmonicMean } from '../lib/basics';

export class ProductionNode {
    workers_ = new Map<Clan, number>();
    workerFractions_ = new Map<Clan, number>();
    laborProductivity_ = new Map<Clan, number>();
    output_ = new Map<TradeGood, Map<Clan, number>>();

    land_ = new Map<Clan, number>();

    static readonly outputPerWorker = 3;
    static readonly populationPerWorker = 3;

    totalWorkers_: number = 0;
    totalLaborProductivity_: number = 0;
    totalOutput_ = new Map<TradeGood, number>();

    constructor(
        readonly name: string,
        readonly settlement: Settlement,
        readonly originalTotalLand: number,
        readonly skillDef: SkillDef,
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

    landPerWorker(clan?: Clan): number {
        const w = this.workers(clan);
        if (w === 0) {
            return 1.0;
        }
        const lpw = this.land(clan) / this.workers(clan);
        return Math.min(lpw, 1.0);
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

    laborProductivity(clan?: Clan): number {
        return clan 
          ? this.laborProductivity_.get(clan)!
          : this.totalLaborProductivity_;
    }

    tfp(clan?: Clan): number {
        if (clan) {
            const output = this.output(clan).get(this.skillDef.outputGood!) ?? 0;
            const workers = this.workers(clan);
            return workers === 0
                ? clan.productivity(this.skillDef)
                : ProductionNode.tfpOf(output, workers);
        }

        const output = this.totalOutput_.get(this.skillDef.outputGood!) ?? 0;
        const workers = this.totalWorkers_;
        return workers === 0
            ? weightedHarmonicMean(
                [...this.workers_.entries()], ([c, w]) => c.productivity(this.skillDef), ([c, w]) => w)
            : ProductionNode.tfpOf(output, workers);
    }

    static tfpOf(output: number, workers: number): number {
        if (workers === 0) {
            return 1;
        }
        return output / workers / ProductionNode.outputPerWorker;
    }

    reset(): void {
        this.workerFractions_.clear();
        this.workers_.clear();
        this.land_.clear();
        this.laborProductivity_.clear();
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
        let reciprocalLaborProductivity = 0;
        for (const [clan, workers] of this.workers_.entries()) {
            const land = this.landFor(clan);
            this.land_.set(clan, land);

            const inputs = Math.min(land, workers);
            const lp = clan.productivity(this.skillDef);
            this.laborProductivity_.set(clan, lp);
            reciprocalLaborProductivity += workers / lp;
            let output = ProductionNode.outputPerWorker * inputs * lp;

            if (output > 0) {
                this.totalOutput_.set(this.skillDef.outputGood!, 
                    (this.totalOutput_.get(this.skillDef.outputGood!) ?? 0) + output);
                
                    const goods = this.output_.get(this.skillDef.outputGood!) ?? new Map();
                goods.set(clan, (goods.get(clan) ?? 0) + output);
                this.output_.set(this.skillDef.outputGood!, goods);
            }
        }
        this.totalLaborProductivity_ = this.totalWorkers_ / reciprocalLaborProductivity;
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

    commitToProducers(): void {
        for (const [good, clanProduce] of this.output_.entries()) {
            for (const [clan, amount] of clanProduce.entries()) {
                clan.accept(this.name, good, amount);
            }
        }
    }

    commit(sink: DistributionNode): void {
        for (const [good, goods] of this.output_) {
            for (const [clan, amount] of goods) {
                sink.accept(clan.name, good, amount);
            }
        }
    }
}