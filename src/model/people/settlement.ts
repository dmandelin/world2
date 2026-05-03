import { isExemplarClan, logExperiment1 } from "../lib/debug";

import { chooseFrom, shuffled, sumFun } from "../lib/basics";
import { DitchMaintenanceCalc } from "../infrastructure";
import { MILES_PER_UNIT, type SettlementCluster } from "./cluster";
import { poisson } from "../lib/distributions";
import { populationAverage, weightedAverage } from "../lib/modelbasics";
import { ProductionNode1 } from "../econ/productionnode";
import { SettlementEndOfTurnSnapshot, SettlementTurnSnapshots, StandaloneSettlementDTO } from "../records/dtos";
import { SettlementTimePoint, Timeline } from "../records/timeline";
import { SkillDef, SkillDefs } from "./skills";
import type { FloodLevel } from "../environment/flood";
import type { Rites } from "../rites";
import type { TradeGood } from "../trade";
import type { World } from "../world";
import type { Year } from "../records/year";
import type { Clan } from "./people";

const maxEndOfTurnSnapshots = 5;

export class Settlement {
    readonly uuid = crypto.randomUUID();

    readonly clans: Clan[] = [];
    readonly daughters: Settlement[] = [];

    private tellHeightInMeters_: number = 0;

    readonly productionNodes: ProductionNode1[] = [];

    readonly localTradeGoods = new Set<TradeGood>();

    // Infrastructure.
    ditchingLevel = 0;
    ditchQuality = 0.3;
    maintenanceCalc: DitchMaintenanceCalc|undefined;

    private forcedMigrations_ = 0;
    private preventedForcedMigrations_ = 0;
    private movingAverageForcedMigrations_: number[] = [];

    private lastShiftYear_: Year;
    readonly timeline = new Timeline<SettlementTimePoint>();

    beginningOfTurnSnapshot_: StandaloneSettlementDTO|undefined;

    recentEndOfTurnSnapshots: SettlementEndOfTurnSnapshot[] = [];
    
    constructor(
        readonly world: World,
        readonly name: string, 
        readonly x: number,
        readonly y: number,
        readonly cluster: SettlementCluster,
        readonly parent?: Settlement) {
        
        cluster.settlements.push(this);
        if (this.parent) {
            this.parent.daughters.push(this);
        }

        this.productionNodes.push(
            new ProductionNode1('Farms', this, 40, SkillDefs.Agriculture),
            new ProductionNode1('Fisheries', this, 40, SkillDefs.Fishing),
        );

        this.lastShiftYear_ = this.world.year;
    }

    milesTo(other: Settlement): number {
        const distance = Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
        return MILES_PER_UNIT * distance;
    }

    get lastSizeChange(): number {
        return sumFun(this.clans, (c: Clan) => c.lastPopulationChange.change);
    }

    get yearsInPlace(): number {
        return this.world.year.sub(this.lastShiftYear_);
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

    productionNode(skillDef: SkillDef): ProductionNode1 {
        return this.productionNodes.find(pn => pn.skillDef === skillDef)!;
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

    get forcedMigrations(): number {
        return this.forcedMigrations_;
    }

    get preventedForcedMigrations(): number {
        return this.preventedForcedMigrations_;
    }

    get movingAverageForcedMigrations(): number {
        let average = 0;
        for (const [i, m] of this.movingAverageForcedMigrations_.entries()) {
            if (i === 0) {
                average = m;
            } else if (i === this.movingAverageForcedMigrations_.length - 1) {
                // The last one represents the turn to come.
                break;
            } else {
                average = (average + m) / 2;
            }
        }
        return average;
    }

    updateForFloodLevel(level: FloodLevel): void {
        // River shifts that force farm fields to move.
        this.forcedMigrations_ = 0;
        this.preventedForcedMigrations_ = 0;

        const potentialMigrations = poisson(level.expectedRiverShifts);
        for (let i = 0; i < potentialMigrations; ++i) {
            if (Math.random() >= this.ditchQuality) {
                ++this.forcedMigrations_;
            } else {
                ++this.preventedForcedMigrations_;
            }
        }

        // Damage is calculated during the maintenance and
        // labor allocation phases.

        this.movingAverageForcedMigrations_.push(this.forcedMigrations_);
        if (this.movingAverageForcedMigrations_.length > 5) {
            this.movingAverageForcedMigrations_.shift();
        }

        if (this.forcedMigrations_ > 0) {
            // The shift could be late in the turn, so we'll count it as
            // at the end of the turn.
            this.lastShiftYear_ = this.world.year.add(this.world.yearsPerTurn);
        }
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
        // Split and merge at the start of the turn so that normal update
        // logic correctly updates the new clans.
        
        // TODO - Bring back
        //this.clans.split();
        //this.clans.merge();
        //this.clans.prune();

        // Economic production.
        // Maintenance goes before production, because it represents capital
        // that can be built in much less than a turn.
        for (const clan of this.clans) clan.residenceLevel.update();
        for (const clan of this.clans) clan.updateProductivity(false);
    }

    advancePostPhase() {
        this.resetEconomicNodes();
        this.maintain();
        //this.produce();
        this.distribute();
        this.exchange();
        for (const clan of this.clans) clan.consumption.foodInsecurity.update();
        this.redistribute();

        // Consume production.
        for (const clan of this.clans) clan.consume();

        // Advance traits and seniority.
        for (const clan of this.clans) clan.prepareTraitChanges();
        for (const clan of this.clans) clan.commitTraitChanges();
        for (const clan of this.clans) clan.advanceSeniority();

        const sizeBefore = this.effectiveResidentPopulation;
        for (const clan of this.clans) clan.advancePopulation();
        
        // Tell height.
        this.growTell(sizeBefore);
    }

    resetEconomicNodes() {
        for (const clan of this.clans) {
            clan.consumption.reset();
        }

        for (const pn of this.productionNodes) {
                pn.reset();
        }
    }

    maintain() {
        this.maintenanceCalc = new DitchMaintenanceCalc(this);
        this.ditchingLevel = this.maintenanceCalc.items.length ? 1 : 0;
        this.ditchQuality = this.maintenanceCalc.quality;
    }

    produce() {
        for (const pn of this.productionNodes) {
            pn.acceptFrom(this);
            pn.produce();
            pn.commitToProducers();
        }
    }

    distribute() {
        for (const clan of this.clans) {
            // Consume own production.
            if (isExemplarClan(clan)) {
                console.log(`Distribution for ${clan.name} (population: ${clan.population}):`);
            }
            for (const pnr of clan.production.reports()) {
                clan.accept(pnr.node.name, pnr.good, pnr.amount);
                if (isExemplarClan(clan)) {
                    console.log(pnr);
                    console.log(`  ${pnr.good.name}: ${pnr.amount}`);
                }
            }
            // Route surplus food somewhere.
            clan.consumption.handleSurplusFood();
        }
    }

    exchange() {
        for (const clan of this.clans) {
            clan.exchange();
        }
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

            const helperClans = this.clans.filter(c => c !== recipientClan && c.kinshipTo(recipientClan) > 0.05);
            const reductionFactor = 0.8 ** helperClans.length;
            const amountToReduceTotal = recipientClan.consumption.foodInsecurity.value * (1 - reductionFactor);
            const amountToReducePerHelper = amountToReduceTotal / helperClans.length;

            for (const helperClan of helperClans) {
                const populationFactor = recipientClan.population / helperClan.population;
                const amountToReduce = amountToReducePerHelper * Math.sqrt(populationFactor);
                const costToHelper = amountToReduce * costFactor / Math.sqrt(populationFactor);
                recipientClan.consumption.foodInsecurity.addProductionInsecurity(
                    `Help from ${helperClan.name}`, -amountToReduce);
                helperClan.consumption.foodInsecurity.addProductionInsecurity(
                    `Helping ${recipientClan.name}`, costToHelper);
            }

        }
    }

    consume() {
        for (const clan of this.clans) {
            clan.consume();
        }
    }

    growTell(previousEffectiveResidentPopulation: number) {
        // If the settlement shifts, there would be no tell at the new
        // location, but substantial tells would still be there on the
        // land and probably resettled at some point. As a simplification,
        // substantial tells will persist.
        if (this.forcedMigrations > 0 && this.tellHeightInMeters < 0.5) {
            this.tellHeightInMeters_ = 0;
            return;
        }

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

    updatePrestigeViews() {
        this.clans.forEach(clan => clan.startUpdatingPrestige());
        this.clans.forEach(clan => clan.finishUpdatingPrestige());

        const totalExpPrestige = this.clans.reduce((acc, clan) =>
             acc + Math.pow(1.05, clan.averagePrestige - 50), 0);
        for (const clan of this.clans) {
            const expPrestige = Math.pow(1.05, clan.averagePrestige - 50);
            clan.influence = expPrestige / totalExpPrestige;
        }
    }

    addTimePoint() {
        this.timeline.add(this.world.year, new SettlementTimePoint(this));
    }

    recordBeginningOfTurnSnapshot() {
        this.beginningOfTurnSnapshot_ = new StandaloneSettlementDTO(this);
    }

    get beginningOfTurnSnapshot() {
        return this.beginningOfTurnSnapshot_!;
    }

    recordEndOfTurnSnapshot() {
        this.recentEndOfTurnSnapshots.push(new SettlementEndOfTurnSnapshot(this));
        if (this.recentEndOfTurnSnapshots.length > maxEndOfTurnSnapshots) {
            this.recentEndOfTurnSnapshots.shift();
        }
    }

    get endOfTurnSnapshot(): SettlementEndOfTurnSnapshot|undefined {
        return this.recentEndOfTurnSnapshots[this.recentEndOfTurnSnapshots.length - 1];
    }

    get turnSnapshots() {
        logExperiment1(this.beginningOfTurnSnapshot, this.endOfTurnSnapshot);
        return new SettlementTurnSnapshots(this.beginningOfTurnSnapshot, this.endOfTurnSnapshot!);
    }
}
