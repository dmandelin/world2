import { average, chooseFrom, sumFun } from "../lib/basics";
import type { Clans } from "./clans";
import type { Rites } from "../rites";
import type { TradeGood } from "../trade";
import type { World } from "../world";
import type { SettlementCluster } from "./cluster";
import { DitchMaintenanceCalc } from "../infrastructure";
import { DistributionNode } from "../econ/distributionnode";
import { ProductionNode } from "../econ/productionnode";
import { SkillDef, SkillDefs } from "./skills";
import type { FloodLevel } from "../environment/flood";
import { poisson } from "../lib/distributions";
import type { Year } from "../records/year";
import { populationAverage, weightedAverage } from "../lib/modelbasics";
import { SettlementTimePoint, Timeline } from "../records/timeline";

class DaughterSettlementPlacer {
    readonly places = 12;
    private radius = Math.random() * 10 + 15;
    private originAngle = Math.random() * 2 * Math.PI;
    readonly openPlaces = Array.from({ length: this.places }, (_, i) => i);
    private jitter = 3;

    constructor(readonly settlement: Settlement) {}

    placeFor(parent: Settlement): [number, number] {
        if (!this.openPlaces.length) {
            this.radius *= 1.5;
            this.jitter *= 1.5;
            this.originAngle = Math.random() * 2 * Math.PI / this.places;
            this.openPlaces.push(...Array.from({ length: this.places }, (_, i) => i));
        }
        const place = chooseFrom(this.openPlaces, true);

        const angle = this.originAngle + place * (2 * Math.PI / this.places);
        const x = this.settlement.x + this.radius * Math.cos(angle) + this.generateJitter();
        const y = this.settlement.y + this.radius * Math.sin(angle) + this.generateJitter();
        return [Math.round(x), Math.round(y)];
    }

    private generateJitter() {
        return (Math.random() * 2 - 1) * this.jitter;
    }
}

export class Settlement {
    readonly uuid = crypto.randomUUID();

    private cluster_: SettlementCluster|undefined;

    private tellHeightInMeters_: number = 0;

    readonly productionNodes: ProductionNode[] = [];
    readonly distributionNode: DistributionNode;

    readonly localTradeGoods = new Set<TradeGood>();

    readonly daughters: Settlement[] = [];
    readonly daughterPlacer = new DaughterSettlementPlacer(this);

    // Infrastructure.
    ditchingLevel = 0;
    ditchQuality = 0.3;
    maintenanceCalc: DitchMaintenanceCalc|undefined;

    private forcedMigrations_ = 0;
    private preventedForcedMigrations_ = 0;
    private movingAverageForcedMigrations_: number[] = [];

    private lastShiftYear_: Year;
    readonly timeline = new Timeline<SettlementTimePoint>();
    
    constructor(
        readonly world: World,
        readonly name: string, 
        readonly x: number,
        readonly y: number,
        readonly parent: Settlement|undefined,
        readonly clans: Clans) {
        
        if (this.parent) {
            this.parent.daughters.push(this);
        }

        for (const clan of clans) {
            clan.setSettlement(this);
        }

        this.distributionNode = new DistributionNode(this);
        this.productionNodes.push(
            new ProductionNode('Farms', this, 40, SkillDefs.Agriculture, this.distributionNode),
            new ProductionNode('Fisheries', this, 40, SkillDefs.Fishing, this.distributionNode),
        );

        this.lastShiftYear_ = this.world.year;
    }

    get cluster(): SettlementCluster {
        return this.cluster_!;
    }

    setCluster(cluster: SettlementCluster) {
        this.cluster_ = cluster;
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

    productionNode(skillDef: SkillDef): ProductionNode {
        return this.productionNodes.find(pn => pn.skillDef === skillDef)!;
    }


    get rites(): Rites[] {
        return [this.clans.rites, ...this.clans.map(clan => clan.rites)];
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

    private lastSizeChange_ = 0;

    get lastSizeChange() {
        return this.lastSizeChange_;
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

    advance(noEffect: boolean = false) {
        const sizeBefore = this.effectiveResidentPopulation;

        // Split and merge at the start of the turn so that normal update
        // logic correctly updates the new clans.
        if (!noEffect) {
            this.clans.split();
            this.clans.merge();
            this.clans.prune();
        }

        // Economic production.
        // Maintenance goes before production, because it represents capital
        // that can be built in much less than a turn.
        this.resetEconomicNodes();
        this.maintain();
        this.produce();
        this.distribute();
        this.exchange();

        // Ritual production.
        this.advanceRites();

        // Consume production.
        for (const clan of this.clans) clan.consume();

        if (!noEffect) {
            // Advance traits and seniority.
            for (const clan of this.clans) clan.prepareTraitChanges();
            for (const clan of this.clans) clan.commitTraitChanges();
            for (const clan of this.clans) clan.advanceSeniority();

            // Population effects.
            this.clans.marry();
        }
        for (const clan of this.clans) clan.advancePopulation(noEffect);
        if (!noEffect) {
            // Tell height.
            this.growTell(sizeBefore);
        }

        this.lastSizeChange_ = this.population - sizeBefore;
    }

    resetEconomicNodes() {
        for (const clan of this.clans) {
            clan.consumption.reset();
        }

        this.distributionNode.reset();

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
            pn.commit();
        }
    }

    distribute() {
        this.distributionNode.distribute();
        this.distributionNode.commit();
    }

    exchange() {
        for (const clan of this.clans) {
            clan.exchange();
        }
    }

    advanceRites(updateOptions: boolean = true) {
        if (this.abandoned) return;

        // Planning for clan rites isn't important yet and introduces a lot of notification noise.
        this.clans.rites.plan(updateOptions);
        for (const rites of this.rites) {
            rites.perform();
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

    addTimePoint() {
        this.timeline.add(this.world.year, new SettlementTimePoint(this));
    }
}