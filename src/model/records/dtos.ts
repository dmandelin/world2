import { populationAverage } from "../lib/modelbasics";
import { sortedByKey, sumFun } from "../lib/basics";
import { TradeGood } from "../trade";
import type { Clan, ClanNotification } from "../people/people";
import type { ClanSkills } from "../people/clanskills";
import type { Consumption } from "../econ/consumption";
import type { DiseaseLoadCalc } from "../environment/pathogens";
import type { EffortAllocation } from "../decisions/effort";
import type { FloodLevel } from "../environment/flood";
import type { HappinessCalc } from "../people/happiness";
import type { Housing } from "../econ/housing";
import type { HousingDecision } from "../decisions/housingdecision";
import type { MigrationCalc } from "../people/migration";
import type { Note } from "../records/notifications";
import type { PopulationChange } from "../people/population";
import type { ProductionReport } from "../econ/operation";
import type { QualityOfLife } from "../econ/qol";
import type { ResidenceLevel } from "../people/residence";
import type { Rites } from "../rites";
import type { Settlement } from "../people/settlement";
import type { SettlementCluster } from "../people/cluster";
import type { SettlementTimePoint, TimePoint, Timeline } from "../records/timeline";
import type { TrendDTO } from "../records/trends";
import { type World } from "../world";
import { BasicInteraction, Interaction, type InteractionGraph } from "../relations/interaction";
import type { PerceptionsGraph } from "../relations/perceptions";
import type { Alignment } from "../relations/alignment";
import type { Respect } from "../relations/respect";
import { splitPairID, type UUID } from "./basicdata";
import type { ConnectionGraph } from "../relations/connection";
import type { Conflict, ConflictGraph } from "../relations/conflict";

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
        readonly amount: number|undefined,
    ) {}
}

export class ClanProductionItemDTO {
    constructor(
        readonly good: TradeGood,
        readonly land: number,
        readonly workerFraction: number,
        readonly workers: number,
        readonly tfp: number,
        readonly amount: number|undefined,
    ) {}
}

export class ClanDTO {
    year: string;
    ref: Clan;
    uuid: string;
    name: string;
    color: string;

    housing: Housing;
    housingDecision: HousingDecision|undefined;
    residenceLevel: ResidenceLevel;
    residenceFraction: number;

    tradeRelationships: TradeRelationshipsDTO[];
    rites: Rites;
    slices: number[][];

    effort: number;
    production: ProductionReport;
    consumption: Consumption;
    qol: QualityOfLife;

    isDitching: boolean;
    targetPerCapitaFood: number;
    effortAllocation: EffortAllocation;
    workers: number;
    seniority: number;
    migrationPlan: MigrationCalc|undefined;
    lastPopulationChange: PopulationChange;
    population: number;
    effectiveResidentPopulation: number;

    happiness: HappinessCalc;

    skills: ClanSkills;
    intelligence: number;
    strength: number;
    traits: string[];

    notifications: ClanNotification[];

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
        this.consumption = clan.consumption;
        this.qol = clan.qol;
        
        this.isDitching = clan.isDitching;
        this.targetPerCapitaFood = clan.targetPerCapitaFood;
        this.effortAllocation = clan.effortAllocation.clone();
        this.seniority = clan.seniority;
        this.population = clan.population;
        this.workers = clan.workers;
        this.effectiveResidentPopulation = clan.effectiveResidentPopulation;
        this.residenceFraction = clan.residenceFraction;
        this.lastPopulationChange = clan.lastPopulationChange;
        this.tradeRelationships = tradeRelationshipsDTO(clan);

        this.happiness = clan.happiness.clone();

        this.skills = clan.skills;
        this.intelligence = clan.intelligence;
        this.strength = clan.strength;
        this.traits = [...clan.traits].map(t => t.name);

        this.notifications = [...clan.notifications];
    }

    get world(): WorldDTO {
        return this.settlement.world;
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

    readonly ditchingLevel: number;
    readonly ditchQuality: number;
    readonly ditchTooltip: string[][];
    readonly floodLevel: FloodLevel;
    readonly refoundedAfterRiverShift: boolean;

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

        this.ditchingLevel = settlement.ditchingLevel;
        this.ditchQuality = settlement.ditchQuality;
        this.ditchTooltip = settlement.maintenanceCalc?.tooltip ?? [];
        this.floodLevel = settlement.floodLevel;
        this.refoundedAfterRiverShift = settlement.refoundedAfterRiverShift;

        this.timeline = settlement.timeline;
    }

    get farmingRatio(): number {
        return populationAverage(
            this.clans, 
            clan => clan.effortAllocation.farmingRatio());
    }
}

export class ClusterDTO {
    readonly name: string;
    readonly settlements: SettlementDTO[];
    readonly population: number;
    readonly averageAppeal: number;
    readonly averageHappiness: number;
    readonly diseaseLoad: DiseaseLoadCalc;

    constructor(private readonly cluster: SettlementCluster, readonly world: WorldDTO) {
        this.name = cluster.name;
        this.settlements = cluster.settlements.map(s => new SettlementDTO(s, this, world));
        this.population = cluster.population;
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
}

export class WorldDTO {
    readonly year: string;
    readonly clanMap: ReadonlyMap<UUID, ClanDTO>;
    readonly clusters: ClusterDTO[];

    readonly connections: ConnectionGraph;
    readonly interactions: InteractionGraph;
    readonly conflicts: ConflictGraph;
    readonly perceptions: PerceptionsGraph;

    readonly timeline: Timeline<TimePoint>;
    readonly trends: TrendDTO[];
    readonly notes: Note[];

    readonly beginningOfTurnSnapshot: WorldDTO;
    readonly endOfTurnSnapshot: WorldDTO;
    readonly previousEndOfTurnSnapshot: WorldDTO|undefined;

    constructor(private readonly world: World) {
        this.year = this.world.year.toString();
        this.clusters = this.world.clusters.map(cl => new ClusterDTO(cl, this));
        this.clanMap = new Map(this.clusters.flatMap(cl => cl.settlements.flatMap(s => s.clans.map(clan => [clan.uuid, clan] as [UUID, ClanDTO]))));
        this.connections = world.connections.clone();
        this.interactions = world.interactions.clone();
        this.conflicts = world.conflicts.clone();
        this.perceptions = world.perceptions.clone();

        this.timeline = world.timeline;
        this.trends = world.trends.map(t => t.asDTO);
        this.notes = [...world.notes];

        this.beginningOfTurnSnapshot = world.beginningOfTurnSnapshot!;
        this.endOfTurnSnapshot = world.endOfTurnSnapshot!;
        this.previousEndOfTurnSnapshot = world.previousEndOfTurnSnapshot;
    }

    clansFromPairID(pairID: string): [ClanDTO, ClanDTO] {
        return splitPairID(pairID).map(uuid => this.clanMap.get(uuid)!) as [ClanDTO, ClanDTO];
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

    conflictBetween(clan: ClanDTO, other: ClanDTO): Conflict|undefined {
        return this.conflicts.get(clan.uuid, other.uuid);
    }

    alignmentToward(clan: ClanDTO, other: ClanDTO): Alignment|undefined {
        return this.perceptions.get(clan.uuid, other.uuid)?.alignment;
    }

    respectToward(clan: ClanDTO, other: ClanDTO): Respect|undefined {
        return this.perceptions.get(clan.uuid, other.uuid)?.respect;
    }

    advanceFromPlanningView() {
        this.world.advanceFromUserPlanningView();
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