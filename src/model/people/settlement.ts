import { isExemplarClan } from "../lib/debug";
import { shuffled, sumFun } from "../lib/basics";
import { DitchMaintenanceCalc } from "../infrastructure";
import { MILES_PER_UNIT, type SettlementCluster } from "./cluster";
import { populationAverage, weightedAverage } from "../lib/modelbasics";
import { SettlementTimePoint, Timeline } from "../records/timeline";
import type { TradeGood } from "../trade";
import type { World } from "../world";
import type { Year } from "../records/year";
import type { Clan } from "./people";
import { economicResult } from "../econ/economy";
import { getAlignment } from "../relations/alignment";

export class Settlement {
    readonly uuid = crypto.randomUUID();

    readonly clans: Clan[] = [];
    readonly daughters: Settlement[] = [];

    private foundationYear_: Year;
    private tellHeightInMeters_: number = 0;
    private refoundedAfterRiverShift_ = false;

    readonly localTradeGoods = new Set<TradeGood>();

    // Infrastructure.
    ditchingLevel = 0;
    ditchQuality = 0.3;
    maintenanceCalc: DitchMaintenanceCalc|undefined;

    readonly timeline = new Timeline<SettlementTimePoint>();

    constructor(
        readonly world: World,
        readonly name: string, 
        readonly x: number,
        readonly y: number,
        readonly cluster: SettlementCluster,
        readonly parent?: Settlement) {
        
        this.foundationYear_ = world.year.clone();

        cluster.settlements.push(this);
        if (this.parent) {
            this.parent.daughters.push(this);
        }
    }

    milesTo(other: Settlement): number {
        const distance = Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
        return MILES_PER_UNIT * distance;
    }

    get lastSizeChange(): number {
        return sumFun(this.clans, (c: Clan) => c.lastPopulationChange.change);
    }

    get yearsInPlace(): number {
        return this.world.year.sub(this.foundationYear_);
    }

    get tellHeightInMeters() {
        return this.tellHeightInMeters_;
    }

    get abandoned() {
        return this.clans.length === 0;
    }

    get population() {
        return sumFun(this.clans, clan => clan.population); 
    }

    get effectiveResidentPopulation() {
        return sumFun(this.clans, clan => clan.effectiveResidentPopulation);
    }

    get residenceFraction() {
        return this.effectiveResidentPopulation / this.population;
    }

    get averageAppeal() {
        return weightedAverage(this.clans, clan => clan.appeal, clan => clan.population);
    }

    averageAppealFrom(source: string) {
        return populationAverage(
            this.clans,
            clan => clan.happiness.getAppeal(source) ?? 0);
    }

    get averageHappiness() {
        return weightedAverage(this.clans, clan => clan.happinessValue, clan => clan.population);
    }

    get floodLevel() {
        return this.cluster.floodLevel;
    }

    get refoundedAfterRiverShift() {
        return this.refoundedAfterRiverShift_;
    }

    planMigrations(): void {
        // Precondition: Clans have individually considered whether they
        // want to move.

        // At this point, if clans do want to move, it's mainly due to
        // crowding, so there would never be any need for all clans to
        // move out at once.
        let remaining = this.population / 3;
        for (const clan of shuffled(this.clans)) {
            if (clan.migrationPlan?.willMigrate) {
                if (remaining > 0) {
                    remaining -= clan.population;
                } else {
                    clan.migrationPlan.othersLeftFirst = true;
                    clan.migrationPlan.willMigrate = false;
                }
            }
        }
    }

    advancePrePhase() {
        // Refound settlement if it has to move.
        this.refoundedAfterRiverShift_ = false;
        if (Math.random() <= this.floodLevel.riverShiftProbability()) {
            this.refoundedAfterRiverShift_ = true;
            this.foundationYear_ = this.world.year.clone();
        }


        for (const clan of this.clans) clan.residenceLevel.update();
    }

    advancePostPhase() {
        // TODO - Bring back some aspect of these
        // this.maintain();
        // this.distribute();
        // this.exchange();
        // this.redistribute();

        // Advance economy.
        for (const clan of this.clans) {
            const r = economicResult(clan, clan.effortAllocation);
            clan.production = r.production;
            clan.consumption = r.consumption;
            clan.qol = r.qol;
            if (isExemplarClan(clan)) {
                console.log(`Production for ${clan.name}:`);
                console.log(clan.effortAllocation);
                console.log(clan.production);
                console.log(clan.consumption);
                console.log(clan.qol);
            }
        }

        // Update happiness based on consumption and leisure.
        for (const clan of this.clans) clan.updateHappiness();

        // Advance traits and seniority.
        for (const clan of this.clans) clan.prepareTraitChanges();
        for (const clan of this.clans) clan.commitTraitChanges();
        // Skill changes depend on knowing if we just moved, so seniority
        // is updated after that.
        for (const clan of this.clans) clan.advanceSeniority();

        const sizeBefore = this.effectiveResidentPopulation;
        for (const clan of this.clans) clan.advancePopulation();
        
        // Tell height.
        this.growTell(sizeBefore);
    }

    maintain() {
        this.maintenanceCalc = new DitchMaintenanceCalc(this);
        this.ditchingLevel = this.maintenanceCalc.items.length ? 1 : 0;
        this.ditchQuality = this.maintenanceCalc.quality;
    }

    // Redistribute food to try to reduce food insecurity. Currently
    // the model assumes everyone uses a Communal Sharing model for
    // this: not sharing all resources equally, but taking care of
    // everyone when in need in the same way.
    redistribute() {
        if (this.clans.length <= 1) {
            return;
        }

        for (const recipientClan of this.clans) {
            if (recipientClan.consumption.foodInsecurity.value <= 0) {
                continue;
            }

            // Let's make a simple assumption that one clan can reduce 
            // the food insecurity of another by up to 20% of its current
            // value by paying 1/2 that amount in increased food insecurity
            // for itself.
            // - With multiple helpers, we compute the reduction limit for
            //   the group, then share that out among helpers.
            // - When clans are different in size, the effects are changed
            //   proportionally around the mean.
            const costFactor = 0.5; // Cost to decrease food security by 1

            const helperClans = this.clans.filter(c => 
                c !== recipientClan && getAlignment(c, recipientClan) > 0.05);
            const reductionFactor = 0.8 ** helperClans.length;
            const amountToReduceTotal = recipientClan.consumption.foodInsecurity.value * (1 - reductionFactor);
            const amountToReducePerHelper = amountToReduceTotal / helperClans.length;

            for (const helperClan of helperClans) {
                const populationFactor = recipientClan.population / helperClan.population;
                const amountToReduce = amountToReducePerHelper * Math.sqrt(populationFactor);
                const costToHelper = amountToReduce * costFactor / Math.sqrt(populationFactor);
                // TODO - rework in functional way when ready
                //recipientClan.consumption.foodInsecurity.addProductionInsecurity(
                //    `Help from ${helperClan.name}`, -amountToReduce);
                //helperClan.consumption.foodInsecurity.addProductionInsecurity(
                //    `Helping ${recipientClan.name}`, costToHelper);
            }

        }
    }

    growTell(previousEffectiveResidentPopulation: number) {
        // If population grew, scale down.
        if (this.effectiveResidentPopulation > previousEffectiveResidentPopulation) {
            this.tellHeightInMeters_ = this.tellHeightInMeters_
              * previousEffectiveResidentPopulation
              / this.effectiveResidentPopulation;
        }

        // 2cm per turn (1m/millennium) if full-time resident.
        this.tellHeightInMeters_ += 0.001 * this.world.yearsPerTurn * this.residenceFraction;
    }

    updateSeniority() {
        const newClans = [];
        let maxExistingSeniority = -1;
        for (const clan of this.clans) {
            if (clan.seniority == -1) {
                newClans.push(clan);
            } else {
                maxExistingSeniority = Math.max(maxExistingSeniority, clan.seniority);
            }
        }
        for (const clan of newClans) {
            clan.seniority = maxExistingSeniority + 1;
        }
    }

    addTimePoint() {
        this.timeline.add(this.world.year, new SettlementTimePoint(this));
    }
}
