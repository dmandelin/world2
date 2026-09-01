import { populationAverage } from "../lib/modelbasics";
import { sortedByKey, sumFun } from "../lib/basics";
import { TradeGood } from "../trade";
import type { Clan, ClanNotification } from "../people/people";
import type { ClanTraits } from "../people/traits";
import type { ClanSkills } from "../people/clanskills";
import type { Consumption } from "../econ/consumption";
import type { DiseaseLoadCalc } from "../environment/pathogens";
import type { EffortAllocation } from "../decisions/effort";
import type { ClanFloodDamage, ExtremeFlood, FloodLevel } from "../environment/flood";
import type { DitchCalc, DitchingMethod } from "../infrastructure";
import type { Festivals, RitualLeadership, RitualStructure } from "../festivals";
import type { HappinessCalc } from "../people/happiness";
import type { Housing } from "../econ/housing";
import type { HousingDecision } from "../decisions/housingdecision";
import type { MigrationCalc, NewSettlementDecisionReport, PlannedSettlement } from "../people/migration";
import type { MarriageDecisions } from "../relations/marriage";
import type { Note } from "../records/notifications";
import type { Alert, AlertKindId } from "../records/alerts";
import type { BreakpointHit, BreakpointId } from "../records/breakpoints";
import type { PopulationChange } from "../people/population";
import type { ProductionReport } from "../econ/operation";
import type { Distribution, StockOutflow } from "../econ/flows";
import type { Stock } from "../econ/stock";
import type { QualityOfLife } from "../econ/qol";
import type { ResidenceLevel } from "../people/residence";
import type { Rites } from "../rites";
import type { RitualEvent } from "../rituals";
import type { RitualChangeEvent } from "../ritualchange";
import type { Settlement } from "../people/settlement";
import type { SettlementCluster } from "../people/cluster";
import type { SettlementTimePoint, TimePoint, Timeline } from "../records/timeline";
import type { TrendDTO } from "../records/trends";
import { type World } from "../world";
import { Interaction, type InteractionGraph } from "../relations/interaction";
import { BasicInteraction } from "../relations/basicinteraction";
import type { PerceptionsGraph } from "../relations/perceptions";
import type { Alignment } from "../relations/alignment";
import type { Respect } from "../relations/respect";
import type { Holiness } from "../relations/holiness";
import { getPrestige, getLocalPrestige } from "../relations/prestige";
import { ALL_OBSERVATION_DEFS, ObservationDefs } from "../relations/information";
import type { ObservationDef } from "../relations/information";
import type { ClanInformation, Memory, NewsItem, Observation, Observations } from "../relations/information";
import { type UUID } from "./basicdata";
import type { ConnectionGraph } from "../relations/connection";
import type { Conflict, ConflictGraph, Conflicts } from "../relations/conflict";
import type { Stress } from "../people/stress";
import type { FoodGiftsResult } from "../econ/gifts";

export type TradeRelationshipsDTO = {
    name: string;
    sending: string[];
    receiving: string[];
}

function tradeRelationshipsDTO(clan: Clan) {
    return [...clan.tradeRelationships].map(r => ({
        name: r.partner(clan).moniker,
        sending: r.sending(clan).map(t => t.name),
        receiving: r.receiving(clan).map(t => t.name),
    }));
}

export class SettlementProductionItemDTO {
    constructor(
        readonly good: TradeGood,
        readonly land: number,
        readonly workerFraction: number,
        readonly workers: number,
        readonly productivity: number,
        readonly tfp: number,
        readonly amount: number | undefined,
    ) { }
}

export class ClanProductionItemDTO {
    constructor(
        readonly good: TradeGood,
        readonly land: number,
        readonly workerFraction: number,
        readonly workers: number,
        readonly tfp: number,
        readonly amount: number | undefined,
    ) { }
}

export class ClanDTO {
    year: string;
    ref: Clan;
    uuid: string;
    name: string;
    color: string;

    housing: Housing;
    housingDecision: HousingDecision | undefined;
    residenceLevel: ResidenceLevel;
    residenceFraction: number;

    tradeRelationships: TradeRelationshipsDTO[];
    rites: Rites;
    slices: number[][];

    effort: number;
    production: ProductionReport;
    distribution: Distribution;
    stockOutflow: StockOutflow;
    stock: Stock;
    consumption: Consumption;
    stress: Stress;
    qol: QualityOfLife;

    // What this clan put into the settlement's ditches this year.
    ditchingEffortShare: number;
    ditchingLabor: number;
    // And into its festivals.
    festivalEffortShare: number;
    festivalLabor: number;
    effortAllocation: EffortAllocation;
    workers: number;
    seniority: number;
    migrationPlan: MigrationCalc | undefined;
    lastPopulationChange: PopulationChange;
    perCapitaFoodProductionTarget: number;
    population: number;
    effectiveResidentPopulation: number;

    happiness: HappinessCalc;

    skills: ClanSkills;
    traits: ClanTraits;

    notifications: ClanNotification[];

    // What this year's extreme floods, if any, did to this clan.
    floodDamage: ClanFloodDamage;

    // Troubles this clan faced this turn, and how the rites went.
    ritualEvents: RitualEvent[];

    constructor(clan: Clan, readonly settlement: SettlementDTO) {
        this.year = settlement.world.year.toString();
        this.uuid = clan.uuid;

        this.ref = clan;
        this.name = clan.name;
        this.color = clan.color;

        this.housing = clan.housing;
        this.housingDecision = clan.housingDecision;
        this.residenceLevel = clan.residenceLevel.clone();

        this.rites = clan.rites.clone();
        this.migrationPlan = clan.migrationPlan;
        this.slices = clan.slices;

        this.effort = clan.effort;
        this.production = clan.production;
        this.distribution = clan.distribution;
        this.stockOutflow = clan.stockOutflow;
        this.stock = clan.stock.clone();
        this.consumption = clan.consumption;
        this.stress = clan.stress.clone();
        this.qol = clan.qol;

        this.ditchingEffortShare = clan.ditchingEffortShare;
        this.ditchingLabor = clan.ditchingLabor;
        this.festivalEffortShare = clan.festivalEffortShare;
        this.festivalLabor = clan.festivalLabor;
        this.effortAllocation = clan.effortAllocation.clone();
        this.seniority = clan.seniority;
        this.population = clan.population;
        this.perCapitaFoodProductionTarget = clan.perCapitaFoodProductionTarget;
        this.workers = clan.workers;
        this.effectiveResidentPopulation = clan.effectiveResidentPopulation;
        this.residenceFraction = clan.residenceFraction;
        this.lastPopulationChange = clan.lastPopulationChange;
        this.tradeRelationships = tradeRelationshipsDTO(clan);

        this.happiness = clan.happiness.clone();

        this.skills = clan.skills;
        this.traits = clan.traits.clone();

        this.notifications = [...clan.notifications];
        this.ritualEvents = [...clan.ritualEvents];
        this.floodDamage = clan.floodDamage;
    }

    get world(): WorldDTO {
        return this.settlement.world;
    }

    get previousPopulation(): number {
        return this.lastPopulationChange.previousSize;
    }

    // Population-weighted prestige other clans grant this one (alignment *
    // respect). Scaled by 100 for display, matching the Favor/alignment scale.
    get prestigeAverage(): number {
        return 100 * getLocalPrestige(this);
    }

    get respectAverage(): number {
        const otherClans = this.settlement.clans.filter(c => c.uuid !== this.uuid);
        if (otherClans.length === 0) return 0;
        return populationAverage(
            otherClans,
            c => this.world.respectToward(c, this)?.value ?? 0
        );
    }

    // Population-weighted holiness other clans grant this one. Same scale as
    // Respect.
    get holinessAverage(): number {
        const otherClans = this.settlement.clans.filter(c => c.uuid !== this.uuid);
        if (otherClans.length === 0) return 0;
        return populationAverage(
            otherClans,
            c => this.world.holinessToward(c, this)?.value ?? 0
        );
    }

    // Population-weighted average of what other clans make of some quality
    // of this one. Unlike Favor and Respect these are impressions built from
    // deeds, so clans that have seen little contribute something close to the
    // prior rather than nothing at all.
    impressionAverage(def: ObservationDef): number {
        const otherClans = this.settlement.clans.filter(c => c.uuid !== this.uuid);
        if (otherClans.length === 0) return 0;
        return populationAverage(
            otherClans,
            c => this.world.observationsToward(c, this)?.estimate(def) ?? def.prior
        );
    }

    // What each other clan makes of that quality, with the weight it carries
    // in the average above.
    impressionViews(def: ObservationDef): ImpressionView[] {
        const otherClans = this.settlement.clans.filter(c => c.uuid !== this.uuid);
        const totalPop = sumFun(otherClans, c => c.population);
        return otherClans.map(clan => {
            const observations = this.world.observationsToward(clan, this);
            return {
                clan,
                estimate: observations?.estimate(def) ?? def.prior,
                confidence: observations?.confidence(def) ?? 0,
                weight: totalPop > 0 ? clan.population / totalPop : 0,
            };
        });
    }

    get generosityAverage(): number {
        return this.impressionAverage(ObservationDefs.Generosity);
    }

    get bellicosityAverage(): number {
        return this.impressionAverage(ObservationDefs.Bellicosity);
    }

    // Population-weighted alignment other clans feel toward this one: how
    // well liked/supported the clan is ("Favor"). Alignment is in [-1, 1];
    // scaled by 100 for a readable integer stat.
    get favorAverage(): number {
        const otherClans = this.settlement.clans.filter(c => c.uuid !== this.uuid);
        if (otherClans.length === 0) return 0;
        return 100 * populationAverage(
            otherClans,
            c => this.world.alignmentToward(c, this)?.value ?? 0
        );
    }
}

export class SettlementDTO {
    readonly uuid: string;
    readonly ref: Settlement;
    readonly name: string;
    readonly yearsInPlace: number;
    readonly tellHeightInMeters: number;
    readonly population: number;
    readonly effectiveResidentPopulation: number;
    readonly residenceFraction: number;
    readonly averageAppeal: number;
    readonly averageHappiness: number;
    readonly lastSizeChange: number;

    readonly clans: ClanDTO[];
    readonly localTradeGoods: TradeGood[];

    readonly ditchingMethod: DitchingMethod;
    readonly ditch: DitchCalc | undefined;
    readonly ritualStructure: RitualStructure;
    readonly ritualLeadership: RitualLeadership;
    readonly festivals: Festivals | undefined;
    readonly floodLevel: FloodLevel;
    readonly floodRating: number;
    readonly refoundedAfterRiverShift: boolean;
    readonly newSettlementDecisionReport: NewSettlementDecisionReport | undefined;
    // Every time the question of how to hold the festival has come open, and
    // whether it came open in this turn's planning.
    readonly ritualChanges: readonly RitualChangeEvent[];
    readonly ritualChangeThisTurn: RitualChangeEvent | undefined;

    readonly timeline: Timeline<SettlementTimePoint>;

    constructor(settlement: Settlement, readonly cluster: ClusterDTO, readonly world: WorldDTO) {
        this.ref = settlement;
        this.clans = sortedByKey([...settlement.clans].map(clan =>
            new ClanDTO(clan, this)), clan => clan.name);

        this.uuid = settlement.uuid;
        this.name = settlement.name;
        this.yearsInPlace = settlement.yearsInPlace;
        this.tellHeightInMeters = settlement.tellHeightInMeters;
        this.population = settlement.population;
        this.effectiveResidentPopulation = settlement.effectiveResidentPopulation;
        this.residenceFraction = settlement.residenceFraction;
        this.averageAppeal = settlement.averageAppeal;
        this.averageHappiness = settlement.averageHappiness;
        this.lastSizeChange = settlement.lastSizeChange;

        this.localTradeGoods = [...settlement.localTradeGoods];

        this.ditchingMethod = settlement.ditchingMethod;
        this.ditch = settlement.ditch;
        this.ritualStructure = settlement.ritualStructure;
        this.ritualLeadership = settlement.ritualLeadership;
        this.festivals = settlement.festivals;
        this.floodLevel = settlement.floodLevel;
        this.floodRating = settlement.floodRating;
        this.refoundedAfterRiverShift = settlement.refoundedAfterRiverShift;
        this.newSettlementDecisionReport = settlement.newSettlementDecisionReport;
        this.ritualChanges = [...settlement.ritualChanges];
        this.ritualChangeThisTurn = settlement.world.lastRitualChanges
            .find(e => e.settlement === settlement);

        this.timeline = settlement.timeline;
    }

    get ditchRating(): number {
        return this.ditch?.rating ?? 0;
    }

    get ditchEffect(): number {
        return this.ditch?.effectAgainst(this.floodRating) ?? 0;
    }

    get ditchHolds(): boolean {
        return !!this.ditch?.holdsAgainst(this.floodRating);
    }

    get festivalAppeal(): number {
        return this.festivals?.appeal ?? 0;
    }

    get festivalPower(): number {
        return this.festivals?.power ?? 0;
    }

    // The extreme floods that caught any clan living here this year.
    get extremeFloods(): ExtremeFlood[] {
        return [...new Set(this.clans.flatMap(c => c.floodDamage.floods))];
    }

    get farmingRatio(): number {
        return populationAverage(
            this.clans,
            clan => clan.effortAllocation.farmingRatio());
    }
}

export class ClusterDTO {
    readonly uuid: string;
    readonly name: string;
    readonly settlements: SettlementDTO[];
    readonly population: number;
    readonly floodLevel: FloodLevel;
    readonly averageAppeal: number;
    readonly averageHappiness: number;
    readonly diseaseLoad: DiseaseLoadCalc;

    constructor(private readonly cluster: SettlementCluster, readonly world: WorldDTO) {
        this.uuid = cluster.uuid;
        this.name = cluster.name;
        this.settlements = cluster.settlements.map(s => new SettlementDTO(s, this, world));
        this.population = cluster.population;
        this.floodLevel = cluster.floodLevel;
        this.averageAppeal = cluster.appeal;
        this.averageHappiness = cluster.happiness;
        this.diseaseLoad = cluster.diseaseLoad;
    }

    get lastPopulationChange() {
        return sumFun(this.settlements, s => s.lastSizeChange);
    }

    get clans() {
        return this.settlements.flatMap(s => s.clans);
    }

    // The extreme floods that caught anyone in this cluster this year.
    get extremeFloods(): ExtremeFlood[] {
        return [...new Set(this.settlements.flatMap(s => s.extremeFloods))];
    }
}

export class PlannedSettlementDTO {
    readonly name: string;
    readonly x: number;
    readonly y: number;
    readonly parentName: string;
    readonly clusterName: string;
    readonly clans: { uuid: string; name: string }[];

    constructor(planned: PlannedSettlement) {
        this.name = planned.name;
        this.x = planned.x;
        this.y = planned.y;
        this.parentName = planned.parent.name;
        this.clusterName = planned.cluster.name;
        this.clans = planned.clans.map(c => ({ uuid: c.uuid, name: c.name }));
    }
}

import type { FoodRedistributionResult } from "../econ/redistribution";

// What one clan believes about one of another's qualities, next to the truth
// of it, so that views can show how far off the impression is.
export type Impression = {
    subject: ClanDTO;
    object: ClanDTO;
    observation: Observation;
    // Absent for qualities with no figure an observer could be checked
    // against, such as ones inferred from deeds.
    trueValue: number | undefined;
};

// One clan's view of a quality of another, with the weight it carries in the
// settlement-wide average.
export type ImpressionView = {
    clan: ClanDTO;
    estimate: number;
    confidence: number;
    weight: number;
};

// One event, with every clan that knows of it and the version each holds.
export type EventKnowledge = {
    // The best-informed copy, standing for the event itself.
    entry: NewsItem;
    knownBy: { clan: ClanDTO, entry: NewsItem }[];
};

export class WorldDTO {
    readonly year: string;
    // Numeric form of the year, for computing ages of remembered events.
    readonly yearValue: number;
    readonly clanMap: ReadonlyMap<UUID, ClanDTO>;
    readonly clusters: ClusterDTO[];
    readonly plannedSettlements: PlannedSettlementDTO[];
    readonly lastMarriageDecisions?: MarriageDecisions;
    readonly lastFoodRedistribution?: FoodRedistributionResult;
    readonly lastFoodGifts?: FoodGiftsResult;
    readonly rituals: RitualEvent[];
    // Extreme floods that struck this year, worldwide.
    readonly extremeFloods: ExtremeFlood[];

    readonly connections: ConnectionGraph;
    readonly interactions: InteractionGraph;
    readonly conflicts: Conflicts;
    readonly perceptions: PerceptionsGraph;

    readonly timeline: Timeline<TimePoint>;
    readonly trends: TrendDTO[];
    readonly notes: Note[];
    readonly alerts: Alert[];

    readonly beginningOfTurnSnapshot: WorldDTO;
    readonly endOfTurnSnapshot: WorldDTO;
    readonly previousEndOfTurnSnapshot: WorldDTO | undefined;

    constructor(private readonly world: World) {
        this.year = this.world.year.toString();
        this.yearValue = this.world.year.value;
        this.lastMarriageDecisions = world.lastMarriageDecisions;
        this.lastFoodRedistribution = world.lastFoodRedistribution;
        this.lastFoodGifts = world.lastFoodGifts;
        this.rituals = [...world.rituals];
        this.extremeFloods = [...world.extremeFloods];
        this.clusters = this.world.clusters.map(cl => new ClusterDTO(cl, this));
        this.clanMap = new Map(this.clusters.flatMap(cl => cl.settlements.flatMap(s => s.clans.map(clan => [clan.uuid, clan] as [UUID, ClanDTO]))));
        this.plannedSettlements = world.plannedSettlements.map(p => new PlannedSettlementDTO(p));
        this.connections = world.connections.clone();
        this.interactions = world.interactions.clone();
        this.conflicts = world.conflicts.clone();
        this.perceptions = world.perceptions.clone();

        this.timeline = world.timeline;
        this.trends = world.trends.map(t => t.asDTO);
        this.notes = [...world.notes];
        this.alerts = [...world.alerts.all];

        this.beginningOfTurnSnapshot = world.beginningOfTurnSnapshot!;
        this.endOfTurnSnapshot = world.endOfTurnSnapshot!;
        this.previousEndOfTurnSnapshot = world.previousEndOfTurnSnapshot;
    }

    clanFrom(uuid: string): ClanDTO {
        return this.clanMap.get(uuid)!;
    }

    clansFrom(uuid1: string, uuid2: string): [ClanDTO, ClanDTO] {
        return [this.clanMap.get(uuid1)!, this.clanMap.get(uuid2)!];
    }

    get settlements() {
        return this.clusters.flatMap(c => c.settlements);
    }

    get population() {
        return sumFun(this.clusters, cl => cl.population);
    }

    get stats() {
        const tp = this.timeline.points[this.timeline.points.length - 1];
        return [
            ['Appeal', tp.averageAppeal.toFixed(1)],
            ['Subsistence satisfaction', tp.averageSubsistenceSat.toFixed(1)],
            ['Happiness', tp.averageHappiness.toFixed(1)],
        ];
    }

    *interactionsFor(clan: ClanDTO) {
        for (const [other, interactions] of this.interactions.getFor(clan)) {
            yield [this.clanMap.get(other)!, interactions] as [ClanDTO, Interaction[]];
        }
    }

    *interactionsForType<T extends Interaction>(clan: ClanDTO, type: new (...args: any[]) => T) {
        for (const [other, interactions] of this.interactionsFor(clan)) {
            for (const i of interactions) {
                if (i instanceof type) {
                    yield [other, i] as [ClanDTO, T];
                }
            }
        }
    }

    interactionsWith(clan: ClanDTO, other: ClanDTO) {
        return this.interactions.get(clan.ref, other.ref);
    }

    attentionTo(clan: ClanDTO, other: ClanDTO) {
        for (const i of this.interactionsWith(clan, other)) {
            if (i instanceof BasicInteraction) {
                return i.c1 == clan.uuid ? i.amount1to2 : i.amount2to1;
            }
        }
        return 0;
    }

    conflictBetween(clan: ClanDTO, other: ClanDTO): Conflict | undefined {
        return this.conflicts.get(clan, other);
    }

    alignmentToward(clan: ClanDTO, other: ClanDTO): Alignment | undefined {
        return this.perceptions.get(clan.uuid, other.uuid)?.alignment;
    }

    respectToward(clan: ClanDTO, other: ClanDTO): Respect | undefined {
        return this.perceptions.get(clan.uuid, other.uuid)?.respect;
    }

    holinessToward(clan: ClanDTO, other: ClanDTO): Holiness | undefined {
        return this.perceptions.get(clan.uuid, other.uuid)?.holiness;
    }

    // Rituals whose beneficiary lives in this settlement, most consequential
    // first.
    ritualsIn(settlement: SettlementDTO): RitualEvent[] {
        const ids = new Set(settlement.clans.map(c => c.uuid));
        return this.rituals.filter(r => ids.has(r.beneficiaryID));
    }

    // Prestige clan grants other (alignment * respect), scaled by 100 for
    // display. Also the marriage appeal.
    prestigeToward(clan: ClanDTO, other: ClanDTO): number {
        return 100 * getPrestige(clan, other);
    }

    informationToward(clan: ClanDTO, other: ClanDTO): ClanInformation | undefined {
        return this.perceptions.get(clan.uuid, other.uuid)?.information;
    }

    memoryToward(clan: ClanDTO, other: ClanDTO): Memory | undefined {
        return this.perceptions.get(clan.uuid, other.uuid)?.information.memory;
    }

    // Event ids the subject can still recount as occasions, as against the
    // ones that have run together into a general impression. Views show the
    // rest greyed rather than hiding them, so the whole ledger stays legible.
    recountableIds(clan: ClanDTO, other: ClanDTO): Set<number> {
        return this.memoryToward(clan, other)?.rememberedIds(this.yearValue)
            ?? new Set();
    }

    observationsToward(clan: ClanDTO, other: ClanDTO): Observations | undefined {
        return this.perceptions.get(clan.uuid, other.uuid)?.information.observations;
    }

    // Every impression held about the given pairing of clans, one per tracked
    // quantity, skipping ones nobody has formed an impression of yet.
    impressions(subject: ClanDTO, object: ClanDTO): Impression[] {
        const observations = this.observationsToward(subject, object);
        if (!observations) return [];
        const out: Impression[] = [];
        for (const def of ALL_OBSERVATION_DEFS) {
            const observation = observations.get(def);
            if (!observation) continue;
            out.push({
                subject, object, observation,
                trueValue: def.truthFn?.(object.ref),
            });
        }
        return out;
    }

    // Every ledger this clan keeps, by the clan it's about.
    *memoriesFor(clan: ClanDTO): Iterable<[ClanDTO, Memory]> {
        for (const [other, perceptions] of this.perceptions.getFor(clan.uuid)) {
            const otherClan = this.clanMap.get(other);
            if (otherClan) yield [otherClan, perceptions.information.memory];
        }
    }

    // Every ledger anyone keeps about this clan, by the clan keeping it. The
    // perceptions graph already indexes by object, so this doesn't scan.
    *memoriesRegarding(clan: ClanDTO): Iterable<[ClanDTO, Memory]> {
        for (const [subject, perceptions] of this.perceptions.getRegarding(clan.uuid)) {
            const subjectClan = this.clanMap.get(subject);
            if (subjectClan) yield [subjectClan, perceptions.information.memory];
        }
    }

    // Every remembered event this clan was party to, paired with the clans
    // that know of it.
    //
    // An event involving a clan is only ever filed in a ledger where that clan
    // is the subject or the object, so the perceptions graph's two indexes
    // between them cover all of them without a scan. Copies of one event are
    // coalesced by event id; the copy shown is the best-informed one, since
    // the copies differ in how far they travelled to get where they are.
    eventsInvolving(clan: ClanDTO): EventKnowledge[] {
        const events = new Map<number, { entry: NewsItem, knownBy: Map<ClanDTO, NewsItem> }>();
        const collect = (knower: ClanDTO, memory: Memory) => {
            for (const entry of memory.entries) {
                if (entry.actor !== clan.uuid && entry.target !== clan.uuid) continue;
                const event = events.get(entry.eventId);
                if (!event) {
                    events.set(entry.eventId, { entry, knownBy: new Map([[knower, entry]]) });
                    continue;
                }
                // A knower can hold one event in two ledgers, one per party;
                // either copy will do, but prefer the better-informed one.
                const held = event.knownBy.get(knower);
                if (!held || entry.hops < held.hops) event.knownBy.set(knower, entry);
                if (entry.hops < event.entry.hops) event.entry = entry;
            }
        };
        for (const [subject, memory] of this.memoriesRegarding(clan)) {
            collect(subject, memory);
        }
        // The clan's own ledgers, which hold its copy of events it took part in.
        for (const [, memory] of this.memoriesFor(clan)) {
            collect(clan, memory);
        }
        return [...events.values()].map(({ entry, knownBy }) => ({
            entry,
            knownBy: sortedByKey(
                [...knownBy].map(([clan, entry]) => ({ clan, entry })),
                k => k.clan.name),
        }));
    }

    advanceFromPlanningView(
        ticks?: number,
        armedBreakpoints?: ReadonlySet<BreakpointId>,
    ) {
        this.world.advanceFromUserPlanningView(ticks, armedBreakpoints);
    }

    // What cut the last multi-year run short, if anything did.
    get lastBreak(): BreakpointHit | undefined {
        return this.world.lastBreak;
    }

    // Dismiss all alerts of a kind (e.g. when the player right-clicks a badge).
    dismissAlertKind(kind: AlertKindId) {
        this.world.alerts.dismissKind(kind);
        this.world.notify();
    }
}

export type ClanLastTurnSnapshots = {
    // Beginning of turn snapshot.
    b?: ClanDTO;
    // End of turn snapshot. If the clan didn't exist at the end of the turn,
    // this will be the current snapshot.
    e: ClanDTO;
    // End of previous turn snapshot.
    p?: ClanDTO;
    // Current snapshot.
    c: ClanDTO;
    worldB: WorldDTO;
    worldE: WorldDTO;
    worldP?: WorldDTO;
    worldC: WorldDTO;
}

export function getClanLastTurnSnapshots(settlement: SettlementDTO): ClanLastTurnSnapshots[] {
    const world = settlement.world;

    const worldB = world.beginningOfTurnSnapshot;
    const worldE = world.endOfTurnSnapshot;
    const worldP = world.previousEndOfTurnSnapshot;
    const worldC = world;

    const settlementB = worldB?.settlements.find(s => s.uuid === settlement.uuid);
    const settlementE = worldE?.settlements.find(s => s.uuid === settlement.uuid);
    const settlementP = worldP?.settlements.find(s => s.uuid === settlement.uuid);
    const settlementC = worldC?.settlements.find(s => s.uuid === settlement.uuid);

    return settlementC?.clans.map(clanC => {
        return {
            b: settlementB?.clans.find(c => c.uuid === clanC.uuid),
            e: settlementE?.clans.find(c => c.uuid === clanC.uuid) ?? clanC,
            p: settlementP?.clans.find(c => c.uuid === clanC.uuid),
            c: clanC,
            worldB: worldB,
            worldE: worldE,
            worldP: worldP,
            worldC: worldC,
        };
    }) ?? [];
}