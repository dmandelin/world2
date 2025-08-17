import { maxbyWithValue, minbyWithValue, sortedByKey, sumFun, type OptByWithValue } from "../model/lib/basics";
import type { PopulationChange } from "../model/people/population";
import type { CondorcetCalc } from "../model/people/clans";
import { pct } from "../model/lib/format";
import type { Note } from "../model/records/notifications";
import { Clan, type ConsumptionCalc } from "../model/people/people";
import type { PrestigeCalc } from "../model/people/prestige";
import type { QolCalc } from "../model/people/qol";
import type { Rites } from "../model/rites";
import type { Settlement } from "../model/people/settlement";
import type { TimePoint, Timeline } from "../model/records/timeline";
import { TradeGood, TradeGoods } from "../model/trade";
import type { World } from "../model/world";
import type { SettlementCluster } from "../model/people/cluster";
import type { MigrationCalc } from "../model/people/migration";
import { type ClanSkills, type SkillDef, SkillDefs } from "../model/people/skills";
import type { ProductivityCalc } from "../model/people/productivity";
import type { HousingDecision } from "../model/decisions/housingdecision";
import type { FloodLevel } from "../model/environment/flood";
import { ProductionNode } from "../model/econ/productionnode";
import type { LaborAllocation } from "../model/people/labor";
import type { AlignmentCalc } from "../model/people/alignment";
import type { TrendDTO } from "../model/records/trends";
import type { Housing } from "../model/econ/housing";
import type { DiseaseLoadCalc } from "../model/environment/pathogens";

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

export class ProductionItemDTO {
    constructor(
        readonly good: TradeGood,
        readonly land: number,
        readonly workerFraction: number,
        readonly workers: number,
        readonly amount: number|undefined,
    ) {}

    get tfp(): number|undefined {
        return this.amount !== undefined
            ? this.amount / this.workers / ProductionNode.outputPerWorker
            : undefined;
    }
}

class ClanProductionDTO {
    readonly goods: ProductionItemDTO[] = [];

    constructor(clan: Clan) {
        for (const pn of clan.settlement.productionNodes) {
            for (const [good, amount] of pn.output(clan).entries()) {
                const item = new ProductionItemDTO(
                    good, pn.land(clan), pn.workerFraction(clan), pn.workers(clan), amount);
                this.goods.push(item);
            }
        }

        const housingWf = clan.laborAllocation.allocs.get(SkillDefs.Construction) ?? 0;
        this.goods.push(new ProductionItemDTO(
            TradeGoods.Housing, Infinity, housingWf, housingWf * clan.population, undefined));

        const ditchingWf = clan.laborAllocation.allocs.get(SkillDefs.Irrigation) ?? 0;
        this.goods.push(new ProductionItemDTO(
            TradeGoods.Ditching, Infinity, ditchingWf, ditchingWf * clan.population, undefined));
    }
}

export type ClanDTO = {
    world: WorldDTO;

    ref: Clan;
    uuid: string;
    name: string;
    color: string;

    cadets: Clan[];
    parent: Clan|undefined;
    tradeRelationships: TradeRelationshipsDTO[];
    settlement: Settlement;
    rites: Rites;
    housing: Housing;
    housingDecision: HousingDecision|undefined;
    slices: number[][];

    prestige: Map<Clan, PrestigeCalc>;
    alignment: Map<Clan, AlignmentCalc>;
    averagePrestige: number;
    influence: number;
    
    consumption: ConsumptionCalc;
    isDitching: boolean;
    laborAllocation: LaborAllocation;
    productivityCalcs: Map<SkillDef, ProductivityCalc>;
    productivity: number;
    productivityTooltip: string[][];
    production: ClanProductionDTO;
    ritualEffectiveness: number;
    ritualEffectivenessTooltip: string[][];
    seniority: number;
    migrationPlan: MigrationCalc|undefined;
    lastPopulationChange: PopulationChange;
    population: number;

    qol: number;
    qolCalc: QolCalc;

    skills: ClanSkills;
    intelligence: number;
    strength: number;
    traits: string[];
}

export function clanDTO(clan: Clan, world: WorldDTO): ClanDTO {
    return {
        world,
        uuid: clan.uuid,

        ref: clan,
        name: clan.name,
        color: clan.color,

        prestige: prestigeDTO(clan),
        alignment: alignmentDTO(clan),
        averagePrestige: clan.averagePrestige,
        influence: clan.influence,

        cadets: clan.cadets,
        parent: clan.parent,
        settlement: clan.settlement,
        rites: clan.rites.clone(),
        housing: clan.housing,
        housingDecision: clan.housingDecision,
        migrationPlan: clan.migrationPlan,
        slices: clan.slices,

        consumption: clan.consumption.clone(),
        isDitching: clan.isDitching,
        laborAllocation: clan.laborAllocation,
        productivityCalcs: clan.productivityCalcs,
        productivity: clan.agriculturalProductivity,
        productivityTooltip: clan.productivityCalcs.get(SkillDefs.Agriculture)?.tooltip ?? [],
        production: new ClanProductionDTO(clan),
        ritualEffectiveness: clan.ritualEffectiveness,
        ritualEffectivenessTooltip: clan.productivityCalcs.get(SkillDefs.Ritual)?.tooltip ?? [],
        seniority: clan.seniority,
        population: clan.population,
        lastPopulationChange: clan.lastPopulationChange,
        tradeRelationships: tradeRelationshipsDTO(clan),

        qol: clan.qol,
        qolCalc: clan.qolCalc,

        skills: clan.skills,
        intelligence: clan.intelligence,
        strength: clan.strength,
        traits: [...clan.traits].map(t => t.name),
    };
}

class SettlementProductionDTO {
    readonly goods: Map<TradeGood, ProductionItemDTO> = new Map();

    constructor(settlement: Settlement) {
        for (const pn of settlement.productionNodes) {
            for (const [good, amount] of pn.output().entries()) {
                const item = new ProductionItemDTO(
                    good, pn.land(), pn.workerFraction(), pn.workers(), amount);
                const existingItem = this.goods.get(good);
                if (existingItem) {
                    const newAmount = existingItem.amount !== undefined && item.amount !== undefined
                        ? existingItem.amount + item.amount
                        : undefined;
                    this.goods.set(good, new ProductionItemDTO(
                        good, 
                        existingItem.land + item.land, 
                        existingItem.workerFraction + item.workerFraction,
                        existingItem.workers + item.workers, 
                        newAmount));
                } else {
                    this.goods.set(good, item);
                }
            }
        }

        // Add items for construction, because the table code keys off of this.
        this.goods.set(TradeGoods.Housing, new ProductionItemDTO(
            TradeGoods.Housing, Infinity, 0, 0, undefined));
        this.goods.set(TradeGoods.Ditching, new ProductionItemDTO(
            TradeGoods.Ditching, Infinity, 0, 0, undefined));
    }
}

export class SettlementDTO {
    readonly name: string;
    readonly yearsInPlace: number;
    readonly tellHeightInMeters: number;
    readonly population: number;
    readonly averageQoL: number;
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

    constructor(settlement: Settlement, readonly cluster: ClusterDTO, readonly world: WorldDTO) {
        this.clans = sortedByKey([...settlement.clans].map(clan => 
            clanDTO(clan, world)), clan => -clan.averagePrestige);

        this.name = settlement.name;
        this.yearsInPlace = settlement.yearsInPlace;
        this.tellHeightInMeters = settlement.tellHeightInMeters;
        this.population = settlement.population;
        this.averageQoL = settlement.averageQoL;
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
            
        this.condorcet = settlement.clans.condorcetLeader;
    }
}

export class ClusterDTO {
    readonly name: string;
    readonly settlements: SettlementDTO[];
    readonly population: number;
    readonly averageQoL: number;
    readonly diseaseLoad: DiseaseLoadCalc;

    constructor(private readonly cluster: SettlementCluster, readonly world: WorldDTO) {
        this.name = cluster.name;
        this.settlements = cluster.settlements.map(s => new SettlementDTO(s, this, world));
        this.population = cluster.population;
        this.averageQoL = cluster.qol;
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
            ['Quality of life', tp.averageQoL.toFixed(1)],
            ['Subsistence satisfaction', tp.averageSubsistenceSat.toFixed(1)],
            ['Ritual satisfaction', tp.averageRitualSat.toFixed(1)],
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

    get notableClans() {
        const items: [string, OptByWithValue<ClanDTO>, (clan: ClanDTO) => number, (n: number) => string][] = [
            ['Biggest', maxbyWithValue, clan => clan.population, n => n.toFixed()],
            ['Smallest', minbyWithValue,  clan => clan.population, n => n.toFixed()],
            ['Most productive', maxbyWithValue, clan => clan.productivity, pct],
            ['Least productive', minbyWithValue, clan => clan.productivity, pct],
            ['Most correct', maxbyWithValue, clan => clan.ritualEffectiveness, pct],
            ['Least correct', minbyWithValue, clan => clan.ritualEffectiveness, pct],
            ['Highest QoL', maxbyWithValue, clan => clan.qol, n => n.toFixed()],
            ['Lowest QoL', minbyWithValue, clan => clan.qol, n => n.toFixed()],
            ['Most influential', maxbyWithValue, clan => clan.influence, pct],
            ['Least influential', minbyWithValue, clan => clan.influence, pct],
        ]
        const clans = [...this.clans()];
        return items.map(([name, opt, key, fmt]) => {
            const [clan, value] = opt(clans, key);
            return [name, `${clan.name} of ${clan.settlement!.name}`, fmt(value)];
        });
    }

    advanceFromPlanningView() {
        this.world.advanceFromPlanningView();
    }
}