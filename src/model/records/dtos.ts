import { product, sortedByKey, sumFun } from "../lib/basics";
import { populationAverage } from "../lib/modelbasics";
import { TradeGood, TradeGoods } from "../trade";
import { type ClanSkills, type SkillDef, SkillDefs } from "../people/skills";
import type { Clan } from "../people/people";
import type { DiseaseLoadCalc } from "../environment/pathogens";
import type { FloodLevel } from "../environment/flood";
import type { HappinessCalc } from "../people/happiness";
import type { Housing } from "../econ/housing";
import type { HousingDecision } from "../decisions/housingdecision";
import type { MigrationCalc } from "../people/migration";
import type { Note } from "../records/notifications";
import type { PopulationChange } from "../people/population";
import type { PrestigeCalc } from "../people/prestige";
import type { ProductivityCalc } from "../people/productivity";
import type { Relationships } from "../people/relationships";
import type { ResidenceLevel } from "../people/residence";
import type { RespectCalc } from "../people/respect";
import type { Rites } from "../rites";
import type { Settlement } from "../people/settlement";
import type { SettlementCluster } from "../people/cluster";
import type { SettlementTimePoint, TimePoint, Timeline } from "../records/timeline";
import type { TrendDTO } from "../records/trends";
import type { World } from "../world";
import type { EffortAllocation } from "../decisions/effort";
import type { Consumption } from "../econ/consumption";
import type { ProductionReport } from "../econ/operation";
import type { QualityOfLife } from "../econ/qol";

function prestigeDTO(clan: Clan) {
    return new Map(clan.prestigeViews);
}

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
        readonly productivity: ClanProductivitySnapshot,
        readonly tfp: number,
        readonly amount: number|undefined,
    ) {}
}

export class ClanProductivitySnapshot {
    readonly items: ClanProductivitySnapshotItem[];

    constructor(clan: Clan, skillDef: SkillDef) {
        this.items = clan.productivityCalcs.get(skillDef)?.items.map(i => 
            new ClanProductivitySnapshotItem(i.label, i.value, i.fp)) ?? [];
    }

    get fp(): number {
        return product(this.items.map(i => i.fp));
    }
}

export class ClanProductivitySnapshotItem {
    constructor(
        readonly label: string,
        readonly value: string|number,
        readonly fp: number,
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
    settlement: Settlement;

    cadets: Clan[];
    parent: Clan|undefined;
    relationships: Relationships;
    tradeRelationships: TradeRelationshipsDTO[];
    rites: Rites;
    slices: number[][];

    respect: Map<Clan, RespectCalc>;
    prestige: Map<Clan, PrestigeCalc>;
    averageRespect: number;
    averagePrestige: number;
    influence: number;
    
    effort: number;
    production: ProductionReport;
    consumption: Consumption;
    qol: QualityOfLife;

    isDitching: boolean;
    targetPerCapitaFood: number;
    effortAllocation: EffortAllocation;
    productivityCalcs: Map<SkillDef, ProductivityCalc>;
    productivity: number;
    productivityTooltip: string[][];
    workers: number;
    ritualEffectiveness: number;
    ritualEffectivenessTooltip: string[][];
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

    constructor(clan: Clan) {
        this.year = clan.world.year.toString();
        this.uuid = clan.uuid;

        this.ref = clan;
        this.name = clan.name;
        this.color = clan.color;

        this.relationships = clan.relationships;
        this.respect = clan.respectMap;
        this.prestige = prestigeDTO(clan);
        this.averageRespect = clan.averageRespect;
        this.averagePrestige = clan.averagePrestige;
        this.influence = clan.influence;

        this.housing = clan.housing;
        this.housingDecision = clan.housingDecision;
        this.residenceLevel = clan.residenceLevel.clone();
        this.settlement = clan.settlement;

        this.cadets = clan.cadets;
        this.parent = clan.parent;
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
        this.productivityCalcs = clan.productivityCalcs;
        this.productivity = clan.agriculturalProductivity;
        this.productivityTooltip = clan.productivityCalcs.get(SkillDefs.Agriculture)?.tooltip ?? [];
        this.ritualEffectiveness = clan.ritualEffectiveness;
        this.ritualEffectivenessTooltip = clan.productivityCalcs.get(SkillDefs.Ritual)?.tooltip ?? [];
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
    }
}

export class StandaloneSettlementDTO {
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
    readonly turnSnapshots: SettlementTurnSnapshots;
    readonly recentEndOfTurnSnapshots: SettlementEndOfTurnSnapshot[];

    constructor(settlement: Settlement) {
        this.ref = settlement;
        this.clans = sortedByKey([...settlement.clans].map(clan => 
            new ClanDTO(clan)), clan => clan.name);

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
        this.turnSnapshots = settlement.turnSnapshots;
        this.recentEndOfTurnSnapshots = [...settlement.recentEndOfTurnSnapshots];
    }

    get farmingRatio(): number {
        return populationAverage(
            this.clans, 
            clan => clan.effortAllocation.farmingRatio());
    }

    // TODO - Have a more general registry of snapshot history. Right now
    // each item in the snapshot history has its own history, which is redundant.

    // Latest end-of-turn snapshot when this DTO was created. During user planning,
    // that should be the snapshot for the end of the previous turn.
    get e(): SettlementEndOfTurnSnapshot|undefined {
        return this.recentEndOfTurnSnapshots[this.recentEndOfTurnSnapshots.length - 1];
    }

    // Previous end-of-turn snapshot before this.e.
    get p(): SettlementEndOfTurnSnapshot|undefined {
        return this.recentEndOfTurnSnapshots[this.recentEndOfTurnSnapshots.length - 2];
    }
}

// The state of a settlement at the end of a turn. Defined as its own
// type because even if it has the same data values as another kind of
// snapshot, the logical meaning is different: values from these can
// be maningfully compared in ways that values from arbitrary snapshots can't.
//
// Use with caution: Probably not hermetic.
export class SettlementEndOfTurnSnapshot extends StandaloneSettlementDTO {
    // Logical year that the snapshot gives the state of. Example: if the 
    // turn for 5500-5480 BC has just completed, this would be 5480 BC.
    readonly year: string;

    constructor(settlement: Settlement) {
        super(settlement);

        this.year = settlement.world.year.toString();
    }
}

// TODO - Try to avoid having the higher structures.
export class SettlementDTO extends StandaloneSettlementDTO {
    constructor(
        settlement: Settlement, 
        readonly cluster: ClusterDTO, 
        readonly world: WorldDTO) {
            
        super(settlement);
    }
}

// Snapshots for a completed turn.
export class SettlementTurnSnapshots {
    // Clan snapshots conveniently grouped together.
    readonly byClan = new Map<ClanDTO, {bot?: ClanDTO, eot: ClanDTO}>();

    constructor(
        readonly bot?: StandaloneSettlementDTO, 
        readonly eot?: StandaloneSettlementDTO) {
        for (const clan of eot?.clans ?? []) {
            this.byClan.set(clan, {
                bot: bot?.clans.find(c => c.name === clan.name),
                eot: clan,
            });
        }
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
}

export class WorldDTO {
    readonly year: string;
    readonly clusters: ClusterDTO[] = [];
    readonly timeline: Timeline<TimePoint>;
    readonly trends: TrendDTO[];
    readonly notes: Note[];

    constructor(private readonly world: World) {
        this.year = this.world.year.toString();
        this.clusters = this.world.clusters.map(cl => new ClusterDTO(cl, this));

        this.timeline = world.timeline;
        this.trends = world.trends.map(t => t.asDTO);
        this.notes = [...world.notes];
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

    *clans() {
        for (const cl of this.clusters) {
            for (const s of cl.settlements) {
                for (const clan of s.clans) {
                    yield clan;
                }
            }
        }
    }

    advanceFromPlanningView() {
        this.world.advanceFromUserPlanningView();
    }
}