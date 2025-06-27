import type { Assessments } from "../model/people/agents";
import { maxbyWithValue, minbyWithValue, sortedByKey, sumFun, type OptByWithValue } from "../model/lib/basics";
import type { PopulationChange } from "../model/people/population";
import type { Clans, CondorcetCalc } from "../model/people/clans";
import { pct } from "../model/lib/format";
import type { Note } from "../model/notifications";
import type { Clan, ConsumptionCalc, EconomicPolicy, EconomicPolicyDecision, EconomicReport, ProductivityCalc, RitualEffectivenessCalc, SkillChange } from "../model/people/people";
import type { PrestigeCalc } from "../model/people/prestige";
import type { QoLCalc } from "../model/people/qol";
import type { SimulationResult } from "../model/rites";
import type { Settlement } from "../model/people/settlement";
import type { TimePoint } from "../model/timeline";
import type { TradeGood } from "../model/trade";
import type { World } from "../model/world";
import type { SettlementCluster } from "../model/people/cluster";
import { weightedAverage } from "../model/lib/modelbasics";

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
    ref: Clan,
    name: string;
    color: string;

    cadets: Clan[];
    parent: Clan|undefined;
    tradePartners: TradePartnerDTO[];
    settlement: Settlement;
    slices: number[][];

    assessments: Assessments;
    benevolence: number;
    reputation: number;
    prestige: Map<Clan, PrestigeCalc>;
    averagePrestige: number;
    influence: number;
    
    consumption: ConsumptionCalc;
    subsistenceConsumption: number; // TODO - remove
    economicPolicy: EconomicPolicy;
    economicPolicyDecision: EconomicPolicyDecision;
    economicReport: EconomicReport;
    productivity: number;
    productivityTooltip: string[][];
    ritualEffectiveness: number;
    ritualEffectivenessTooltip: string[][];
    seniority: number;
    migrationTargets: string[][];
    bestMigrationTarget: string[][];
    lastPopulationChange: PopulationChange;
    size: number;

    qol: number;
    qolCalc: QoLCalc;

    intelligence: number;
    skill: number;
    skillChange: SkillChange;
    ritualSkill: number;
    ritualSkillChange: SkillChange;
    strength: number;
    techModifier: number;
    traits: string[];
}

export function clanDTO(clan: Clan) {
    return {
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
        migrationTargets: clan.migrationCalc.targetsTable,
        bestMigrationTarget: clan.migrationCalc.bestTargetTable,
        slices: clan.slices,

        consumption: clan.consumption.clone(),
        subsistenceConsumption: clan.subsistenceConsumption,
        economicPolicy: clan.economicPolicy,
        economicPolicyDecision: clan.economicPolicyDecision,
        economicReport: clan.economicReport,
        perCapitaSubsistenceConsumption: clan.perCapitaSubsistenceConsumption,
        productivity: clan.productivity,
        productivityTooltip: clan.productivityCalc.tooltip,
        ritualEffectiveness: clan.ritualEffectiveness,
        ritualEffectivenessTooltip: clan.ritualEffectivenessCalc.tooltip,
        seniority: clan.seniority,
        size: clan.population,
        lastPopulationChange: clan.lastPopulationChange,
        tradePartners: tradePartnersDTO(clan),

        qol: clan.qol,
        qolCalc: clan.qolCalc,

        intelligence: clan.intelligence,
        skill: clan.skill,
        skillChange: clan.skillChange,
        ritualSkill: clan.ritualSkill,
        ritualSkillChange: clan.ritualSkillChange,
        strength: clan.strength,
        techModifier: clan.techModifier,
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

    constructor(clans: Clans) {
        super(...sortedByKey([...clans].map(clanDTO), clan => -clan.averagePrestige));
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

        this.clans = new ClansDTO(settlement.clans);
        this.localTradeGoods = [...settlement.localTradeGoods];

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

    constructor(private readonly cluster: SettlementCluster) {
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
    readonly timeline: TimePoint[];
    readonly notes: Note[];

    constructor(private readonly world: World) {
        this.year = this.world.year.toString();
        this.clusters = this.world.clusters.map(cl => new ClusterDTO(cl));

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
        const tp = this.timeline[this.timeline.length - 1];
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

    advance() {
        this.world.advance();
    }
}