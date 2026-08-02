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
import type { NewSettlementDecisionReport } from "./migration";

export class Settlement {
    readonly uuid = crypto.randomUUID();

    readonly clans: Clan[] = [];
    readonly daughters: Settlement[] = [];

    foundationYear: Year;
    private tellHeightInMeters_: number = 0;
    refoundedAfterRiverShift = false;

    readonly localTradeGoods = new Set<TradeGood>();
    newSettlementDecisionReport: NewSettlementDecisionReport | undefined = undefined;

    // Infrastructure.
    ditchingLevel = 0;
    ditchQuality = 0.3;
    maintenanceCalc: DitchMaintenanceCalc | undefined;

    readonly timeline = new Timeline<SettlementTimePoint>();

    constructor(
        readonly world: World,
        readonly name: string,
        readonly x: number,
        readonly y: number,
        readonly cluster: SettlementCluster,
        readonly parent?: Settlement) {

        this.foundationYear = world.year.clone();

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
        return this.world.year.sub(this.foundationYear);
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
        return this.population > 0 ? this.effectiveResidentPopulation / this.population : 1;
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

    maintain() {
        this.maintenanceCalc = new DitchMaintenanceCalc(this);
        this.ditchingLevel = this.maintenanceCalc.items.length ? 1 : 0;
        this.ditchQuality = this.maintenanceCalc.quality;
    }

    growTell(previousEffectiveResidentPopulation: number) {
        // If population grew, scale down.
        if (this.effectiveResidentPopulation > previousEffectiveResidentPopulation) {
            this.tellHeightInMeters_ = this.tellHeightInMeters_
                * previousEffectiveResidentPopulation
                / this.effectiveResidentPopulation;
        }

        // 1mm per year (1m/millennium) if full-time resident.
        this.tellHeightInMeters_ += 0.001 * this.world.yearsPerTick * this.residenceFraction;
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
