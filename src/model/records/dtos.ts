import { arrayMapAdd, product, recordMapSet, sortedByKey, sumFun } from "../lib/basics";
import type { PopulationChange } from "../people/population";
import type { CondorcetCalc } from "../people/clans";
import type { Note } from "../records/notifications";
import type { Clan, ConsumptionCalc } from "../people/people";
import type { PrestigeCalc } from "../people/prestige";
import type { Rites } from "../rites";
import type { Settlement } from "../people/settlement";
import type { SettlementTimePoint, TimePoint, Timeline } from "../records/timeline";
import { TradeGood, TradeGoods } from "../trade";
import type { World } from "../world";
import type { SettlementCluster } from "../people/cluster";
import type { MigrationCalc } from "../people/migration";
import { type ClanSkills, type SkillDef, SkillDefs } from "../people/skills";
import type { ProductivityCalc } from "../people/productivity";
import type { HousingDecision } from "../decisions/housingdecision";
import type { FloodLevel } from "../environment/flood";
import type { LaborAllocation } from "../decisions/labor";
import type { AlignmentCalc } from "../people/alignment";
import type { TrendDTO } from "../records/trends";
import type { Housing } from "../econ/housing";
import type { DiseaseLoadCalc } from "../environment/pathogens";
import type { HappinessCalc } from "../people/happiness";
import type { ResidenceLevel } from "../people/residence";
import { populationAverage } from "../lib/modelbasics";
import type { RespectCalc } from "../people/respect";
import type { Relationships } from "../people/relationships";

function prestigeDTO(clan: Clan) {
    return new Map(clan.prestigeViews);
}

function alignmentDTO(clan: Clan) {
    return new Map(clan.alignmentViews);
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

class ClanProductionDTO {
    readonly goods: ClanProductionItemDTO[] = [];

    constructor(clan: Clan) {
        for (const pn of clan.settlement.productionNodes) {
            for (const [good, amount] of pn.output(clan).entries()) {
                const item = new ClanProductionItemDTO(
                    good, pn.land(clan), pn.workerFraction(clan), 
                    pn.workers(clan), new ClanProductivitySnapshot(clan, pn.skillDef), pn.tfp(clan), amount);
                this.goods.push(item);
            }
        }

        const housingWf = clan.laborAllocation.allocs.get(SkillDefs.Construction) ?? 0;
        this.goods.push(new ClanProductionItemDTO(
            TradeGoods.Housing, Infinity, housingWf, housingWf * clan.population, 
            new ClanProductivitySnapshot(clan, SkillDefs.Construction), new ClanProductivitySnapshot(clan, SkillDefs.Construction).fp, 
            undefined));

        const ditchingWf = clan.laborAllocation.allocs.get(SkillDefs.Irrigation) ?? 0;
        this.goods.push(new ClanProductionItemDTO(
            TradeGoods.Ditching, Infinity, ditchingWf, ditchingWf * clan.population, 
            new ClanProductivitySnapshot(clan, SkillDefs.Irrigation), new ClanProductivitySnapshot(clan, SkillDefs.Irrigation).fp, 
            undefined));
    }
}

export type ClanDTO = {
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
    marriagePartners: Map<Clan, number>;
    relationships: Relationships;
    tradeRelationships: TradeRelationshipsDTO[];
    rites: Rites;
    slices: number[][];

    respect: Map<Clan, RespectCalc>;
    prestige: Map<Clan, PrestigeCalc>;
    alignment: Map<Clan, AlignmentCalc>;
    averageRespect: number;
    averagePrestige: number;
    influence: number;
    
    consumption: ConsumptionCalc;
    isDitching: boolean;
    laborAllocation: LaborAllocation;
    productivityCalcs: Map<SkillDef, ProductivityCalc>;
    productivity: number;
    productivityTooltip: string[][];
    production: ClanProductionDTO;
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
}

export function clanDTO(clan: Clan): ClanDTO {
    return {
        uuid: clan.uuid,

        ref: clan,
        name: clan.name,
        color: clan.color,

        relationships: clan.relationships,
        respect: clan.respectMap,
        prestige: prestigeDTO(clan),
        alignment: alignmentDTO(clan),
        averageRespect: clan.averageRespect,
        averagePrestige: clan.averagePrestige,
        influence: clan.influence,

        housing: clan.housing,
        housingDecision: clan.housingDecision,
        residenceLevel: clan.residenceLevel.clone(),
        settlement: clan.settlement,

        cadets: clan.cadets,
        parent: clan.parent,
        marriagePartners: clan.marriagePartners,
        rites: clan.rites.clone(),
        migrationPlan: clan.migrationPlan,
        slices: clan.slices,

        consumption: clan.consumption.clone(),
        isDitching: clan.isDitching,
        laborAllocation: clan.laborAllocation.clone(),
        productivityCalcs: clan.productivityCalcs,
        productivity: clan.agriculturalProductivity,
        productivityTooltip: clan.productivityCalcs.get(SkillDefs.Agriculture)?.tooltip ?? [],
        production: new ClanProductionDTO(clan),
        ritualEffectiveness: clan.ritualEffectiveness,
        ritualEffectivenessTooltip: clan.productivityCalcs.get(SkillDefs.Ritual)?.tooltip ?? [],
        seniority: clan.seniority,
        population: clan.population,
        workers: clan.workers,
        effectiveResidentPopulation: clan.effectiveResidentPopulation,
        residenceFraction: clan.residenceFraction,
        lastPopulationChange: clan.lastPopulationChange,
        tradeRelationships: tradeRelationshipsDTO(clan),

        happiness: clan.happiness.clone(),

        skills: clan.skills,
        intelligence: clan.intelligence,
        strength: clan.strength,
        traits: [...clan.traits].map(t => t.name),
    };
}

class SettlementProductionDTO {
    readonly goods: Map<TradeGood, SettlementProductionItemDTO> = new Map();

    constructor(settlement: Settlement) {
        for (const pn of settlement.productionNodes) {
            for (const [good, amount] of pn.output().entries()) {
                const item = new SettlementProductionItemDTO(
                    good, pn.land(), pn.workerFraction(), pn.workers(), 
                    pn.laborProductivity(), pn.tfp(), amount);
                const existingItem = this.goods.get(good);
                if (existingItem) {
                    const newAmount = existingItem.amount !== undefined && item.amount !== undefined
                        ? existingItem.amount + item.amount
                        : undefined;
                    this.goods.set(good, new SettlementProductionItemDTO(
                        good, 
                        existingItem.land + item.land, 
                        existingItem.workerFraction + item.workerFraction,
                        existingItem.workers + item.workers, 
                        -1,
                        -1,
                        newAmount));
                } else {
                    this.goods.set(good, item);
                }
            }
        }

        // Add items for construction, because the table code keys off of this.
        this.goods.set(TradeGoods.Housing, new SettlementProductionItemDTO(
            TradeGoods.Housing, Infinity, 0, 0, 0, 0, undefined));
        this.goods.set(TradeGoods.Ditching, new SettlementProductionItemDTO(
            TradeGoods.Ditching, Infinity, 0, 0, 0, 0, undefined));
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
    readonly production: SettlementProductionDTO;
    readonly localTradeGoods: TradeGood[];

    readonly ditchingLevel: number;
    readonly ditchQuality: number;
    readonly ditchTooltip: string[][];
    readonly floodLevel: FloodLevel;
    readonly forcedMigrations: number;
    readonly preventedForcedMigrations: number;
    readonly movingAverageForcedMigrations: number;

    readonly condorcet: CondorcetCalc;

    readonly rites: Rites;
    readonly timeline: Timeline<SettlementTimePoint>;
    readonly turnSnapshots: SettlementTurnSnapshots;
    readonly recentEndOfTurnSnapshots: SettlementEndOfTurnSnapshot[];

    constructor(settlement: Settlement) {
        this.ref = settlement;
        this.clans = sortedByKey([...settlement.clans].map(clan => 
            clanDTO(clan)), clan => clan.name);

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

        this.production = new SettlementProductionDTO(settlement);
        this.localTradeGoods = [...settlement.localTradeGoods];

        this.ditchingLevel = settlement.ditchingLevel;
        this.ditchQuality = settlement.ditchQuality;
        this.ditchTooltip = settlement.maintenanceCalc?.tooltip ?? [];
        this.floodLevel = settlement.floodLevel;
        this.forcedMigrations = settlement.forcedMigrations;
        this.preventedForcedMigrations = settlement.preventedForcedMigrations;
        this.movingAverageForcedMigrations = settlement.movingAverageForcedMigrations;

        this.rites = settlement.clans.rites.clone();
        this.timeline = settlement.timeline;
        this.turnSnapshots = settlement.turnSnapshots;
        this.recentEndOfTurnSnapshots = [...settlement.recentEndOfTurnSnapshots];
        this.condorcet = settlement.clans.condorcetLeader;
    }

    get farmingRatio(): number {
        return populationAverage(
            this.clans, 
            clan => clan.laborAllocation.plannedRatioFor(SkillDefs.Agriculture));
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

    get endOfTurnSnapshotsByClan(): Map<string, {e?: ClanDTO, p?: ClanDTO}> {
        const byClan = new Map<string, {e?: ClanDTO, p?: ClanDTO}>();

        if (this.e) {
            for (const ce of this.e.clans) {
                recordMapSet(byClan, ce.uuid, 'e', ce);
            }
        }

        if (this.p) {
            for (const cp of this.p.clans) {
                recordMapSet(byClan, cp.uuid, 'p', cp);
            }
        }

        return byClan;
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