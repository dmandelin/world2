import type { Assessments } from "../model/people/agents";
import { maxbyWithValue, minbyWithValue, sortedByKey, sumFun, type OptByWithValue } from "../model/lib/basics";
import type { PopulationChange } from "../model/people/population";
import type { Clans, CondorcetCalc } from "../model/people/clans";
import { pct } from "../model/lib/format";
import type { Note } from "../model/notifications";
import type { Clan, ConsumptionCalc, EconomicPolicy, EconomicPolicyDecision, EconomicReport } from "../model/people/people";
import type { PrestigeCalc } from "../model/people/prestige";
import type { QoLCalc } from "../model/people/qol";
import type { SimulationResult } from "../model/rites";
import type { Housing, Settlement } from "../model/people/settlement";
import type { TimePoint, Timeline } from "../model/timeline";
import { type TradeGood, TradeGoods } from "../model/trade";
import type { World } from "../model/world";
import type { SettlementCluster } from "../model/people/cluster";
import { weightedAverage } from "../model/lib/modelbasics";
import type { MigrationCalc } from "../model/people/migration";
import { type ClanSkills, type SkillDef, SkillDefs } from "../model/people/skills";
import type { ProductivityCalc } from "../model/people/productivity";
import type { HousingDecision } from "../model/decisions/housingdecision";

function prestigeDTO(clan: Clan) {
    return new Map(clan.prestigeViews);
}

export type TradePartnerDTO = {
    name: string;
    sending: string[];
    receiving: string[];
}

function tradePartnersDTO(clan: Clan) {
    return [...clan.tradePartners].map(partner => ({
        name: partner.name,
        settlement: partner.settlement!.name,
        sending: [...clan.exportsTo(partner).map(t => t.name)],
        receiving: [...clan.importsFrom(partner).map(t => t.name)],
    }));
}

export type ClanDTO = {
    world: WorldDTO;

    ref: Clan;
    uuid: string;
    name: string;
    color: string;

    cadets: Clan[];
    parent: Clan|undefined;
    tradePartners: TradePartnerDTO[];
    settlement: Settlement;
    housing: Housing;
    housingDecision: HousingDecision|undefined;
    slices: number[][];

    assessments: Assessments;
    benevolence: number;
    reputation: number;
    prestige: Map<Clan, PrestigeCalc>;
    averagePrestige: number;
    influence: number;
    
    consumption: ConsumptionCalc;
    subsistenceConsumption: number;
    isDitching: boolean;
    economicPolicy: EconomicPolicy;
    economicPolicyDecision: EconomicPolicyDecision;
    economicReport: EconomicReport;
    productivityCalcs: Map<SkillDef, ProductivityCalc>;
    productivity: number;
    productivityTooltip: string[][];
    ritualEffectiveness: number;
    ritualEffectivenessTooltip: string[][];
    seniority: number;
    migrationPlan: MigrationCalc|undefined;
    lastPopulationChange: PopulationChange;
    size: number;

    qol: number;
    qolCalc: QoLCalc;

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

        assessments: clan.assessments.clone(),
        benevolence: clan.benevolence,
        reputation: clan.reputation,
        prestige: prestigeDTO(clan),
        averagePrestige: clan.averagePrestige,
        influence: clan.influence,

        cadets: clan.cadets,
        parent: clan.parent,
        settlement: clan.settlement!,
        housing: clan.housing,
        housingDecision: clan.housingDecision,
        migrationPlan: clan.migrationPlan,
        slices: clan.slices,

        consumption: clan.consumption.clone(),
        subsistenceConsumption: clan.consumption.perCapita(TradeGoods.Subsistence),
        isDitching: clan.isDitching,
        economicPolicy: clan.economicPolicy,
        economicPolicyDecision: clan.economicPolicyDecision,
        economicReport: clan.economicReport,
        productivityCalcs: clan.productivityCalcs,
        productivity: clan.agriculturalProductivity,
        productivityTooltip: clan.productivityCalcs.get(SkillDefs.Agriculture)?.tooltip ?? [],
        ritualEffectiveness: clan.ritualEffectiveness,
        ritualEffectivenessTooltip: clan.productivityCalcs.get(SkillDefs.Ritual)?.tooltip ?? [],
        seniority: clan.seniority,
        size: clan.population,
        lastPopulationChange: clan.lastPopulationChange,
        tradePartners: tradePartnersDTO(clan),

        qol: clan.qol,
        qolCalc: clan.qolCalc,

        skills: clan.skills,
        intelligence: clan.intelligence,
        strength: clan.strength,
        traits: [...clan.traits].map(t => t.name),
    };
}

export class ClansDTO extends Array<ClanDTO> {
    population: number;
    condorcet: CondorcetCalc;
    slippage: number;

    pot: { 
        contributors: number; 
        input: number; 
        output: number;

        baseProductivity: number;
        scaleFactor: number;
        tfp: number;
    };

    constructor(clans: Clans, world: WorldDTO) {
        super(...sortedByKey([...clans].map(clan => 
            clanDTO(clan, world)), clan => -clan.averagePrestige));

        this.population = clans.population;
        this.condorcet = clans.condorcetLeader;
        this.slippage = clans.slippage;
        this.pot = {
            contributors: clans.pot.contributors,
            input: clans.pot.input,
            output: clans.pot.output,
            baseProductivity: clans.pot.baseProductivity,
            scaleFactor: clans.pot.scaleFactor,
            tfp: clans.pot.tfp,
        };
    }
}

export class SettlementDTO {
    readonly name: string;
    readonly size: number;
    readonly averageQoL: number;
    readonly lastSizeChange: number;

    readonly clans: ClansDTO;
    readonly localTradeGoods: TradeGood[];

    readonly ditchingLevel: number;
    readonly ditchQuality: number;
    readonly ditchTooltip: string[][];
    readonly floodingLevel: number;

    readonly rites: {
        name: string;
        held: boolean;
        leaderSelectionOption: string;
        leaderSelectionOptions: SimulationResult[];
        participants: string[];
        producers: string[];

        quality: number;
        qualityItems: [string, string, string][];
        output: number;
        perCapitaOutput: number;
        outputItems: [string, string][];
        appeal: number;
        appealItems: [string, string][];
    }[];

    constructor(settlement: Settlement, readonly cluster: ClusterDTO) {
        this.name = settlement.name;
        this.size = settlement.population;
        this.averageQoL = settlement.averageQoL;
        this.lastSizeChange = settlement.lastSizeChange;

        this.clans = new ClansDTO(settlement.clans, cluster.world);
        this.localTradeGoods = [...settlement.localTradeGoods];

        this.ditchingLevel = settlement.ditchingLevel;
        this.ditchQuality = settlement.ditchQuality;
        this.ditchTooltip = settlement.maintenanceCalc?.tooltip ?? [];
        this.floodingLevel = settlement.floodingLevel;

        this.rites = settlement.rites.map(rites => ({
            name: rites.name,
            held: rites.held,
            leaderSelectionOption: rites.leaderSelectionOption.name,
            leaderSelectionOptions: rites.simulateLeaderSelectionOptions(),
            participants: rites.participants.map(c => c.name),
            producers: rites.producers.map(c => c.name),
            quality: rites.quality,
            qualityItems: rites.qualityItems,
            output: rites.output,
            perCapitaOutput: rites.perCapitaOutput,
            outputItems: rites.outputItems,
            appeal: rites.appeal,
            appealItems: rites.appealItems,
        }));
    }
}

export class ClusterDTO {
    readonly name: string;
    readonly settlements: SettlementDTO[];
    readonly population: number;
    readonly averageQoL: number;

    constructor(private readonly cluster: SettlementCluster, readonly world: WorldDTO) {
        this.name = cluster.name;
        this.settlements = cluster.settlements.map(s => new SettlementDTO(s, this));
        this.population = cluster.population;
        this.averageQoL = cluster.qol;
    }

    get lastPopulationChange() {
        return sumFun(this.settlements, s => s.lastSizeChange);
    }
}

export class WorldDTO {
    readonly year: string;
    readonly clusters: ClusterDTO[] = [];
    readonly timeline: Timeline<TimePoint>;
    readonly notes: Note[];

    constructor(private readonly world: World) {
        this.year = this.world.year.toString();
        this.clusters = this.world.clusters.map(cl => new ClusterDTO(cl, this));

        this.timeline = world.timeline;
        this.notes = [...world.notes];
    }

    get settlements() {
        return this.clusters.flatMap(c => c.settlements);
    }

    get population() {
        return sumFun(this.clusters, cl => cl.population);
    }

    get consumption() {
        return weightedAverage(
            [...this.clans()], clan => clan.subsistenceConsumption, clan => clan.size);
    }

    get stats() {
        const tp = this.timeline.points[this.timeline.points.length - 1];
        return [
            ['Productivity', pct(this.consumption)],
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
            ['Biggest', maxbyWithValue, clan => clan.size, n => n.toFixed()],
            ['Smallest', minbyWithValue,  clan => clan.size, n => n.toFixed()],
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