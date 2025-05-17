import type { Assessments, ClanAgent } from "../model/agents";
import { maxbyWithValue, minbyWithValue, type OptByWithValue } from "../model/basics";
import type { Clans } from "../model/clans";
import { pct } from "../model/format";
import type { Clan, ConsumptionCalc, EconomicPolicy, EconomicPolicyDecision, EconomicReport, PrestigeCalc } from "../model/people";
import type { Settlement } from "../model/settlement";
import type { TradeGood } from "../model/trade";
import type { World } from "../model/world";

function prestigeDTO(clan: Clan) {
    const prestige = new Map<Clan, PrestigeCalc>();
    for (const other of clan.settlement!.clans) {
        if (other === clan) continue;
        prestige.set(other, clan.prestigeSeenIn(other));
    }
    return prestige;
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

    agent: ClanAgent;
    assessments: Assessments;
    benevolence: number;
    reputation: number;
    prestige: Map<Clan, PrestigeCalc>;
    
    consumption: ConsumptionCalc;
    subsistenceConsumption: number; // TODO - remove
    economicPolicy: EconomicPolicy;
    economicPolicyDecision: EconomicPolicyDecision;
    economicReport: EconomicReport;
    lastSizeChange: number;
    productivity: number;
    seniority: number;
    size: number;

    qolFromAbility: number;
    qolFromConsumption: number;
    qolTable: [string, string][];
    qol: number;

    festivalModifier: number;
    giftStrategy: string;
    intelligence: number;
    interactionModifier: number;
    skill: number;
    strength: number;
    techModifier: number;
    tenure: number;
    tenureModifier: number;
    traits: string[];
}

export function clanDTO(clan: Clan) {
    return {
        ref: clan,
        name: clan.name,
        color: clan.color,

        agent: clan.agent.clone(),
        assessments: clan.assessments.clone(),
        benevolence: clan.benevolence,
        reputation: clan.reputation,
        prestige: prestigeDTO(clan),

        cadets: clan.cadets,
        parent: clan.parent,
        settlement: clan.settlement!,
        slices: clan.slices,

        consumption: clan.consumption.clone(),
        subsistenceConsumption: clan.subsistenceConsumption,
        economicPolicy: clan.economicPolicy,
        economicPolicyDecision: clan.economicPolicyDecision,
        economicReport: clan.economicReport,
        perCapitaSubsistenceConsumption: clan.perCapitaSubsistenceConsumption,
        lastSizeChange: clan.lastSizeChange,
        productivity: clan.productivity,
        productivityTooltip: clan.productivityCalc.tooltip,
        seniority: clan.seniority,
        size: clan.size,
        tradePartners: tradePartnersDTO(clan),

        qolFromConsumption: clan.qolFromConsumption,
        qolFromAbility: clan.qolFromAbility,
        qolTable: clan.qolTable,
        qol: clan.qol,

        festivalModifier: clan.festivalModifier,
        giftStrategy: clan.agent.defaultGiftStrategy,
        intelligence: clan.intelligence,
        interactionModifier: clan.interactionModifier,
        skill: clan.skill,
        strength: clan.strength,
        techModifier: clan.techModifier,
        tenure: clan.tenure,
        tenureModifier: clan.tenureModifier,
        traits: [...clan.traits].map(t => t.name),
    };
}

export class ClansDTO extends Array<ClanDTO> {
    population: number;
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
        super(...clans.map(clanDTO));
        this.population = clans.population;
        this.slippage = clans.slippage;
        this.pot = {
            contributors: clans.pot.contributors,
            input: clans.pot.input,
            output: clans.pot.output,
            baseProductivity: clans.pot.baseProductivity,
            scaleFactor: clans.pot.scaleFactor,
            tfp: clans.pot.tfp,
        }
    }
}

export class SettlementDTO {
    readonly name: string;
    readonly size: number;
    readonly lastSizeChange: number;

    readonly clans: ClansDTO;
    readonly localTradeGoods: TradeGood[];

    constructor(settlement: Settlement) {
        this.name = settlement.name;
        this.size = settlement.size;
        this.lastSizeChange = settlement.lastSizeChange;

        this.clans = new ClansDTO(settlement.clans);
        this.localTradeGoods = [...settlement.localTradeGoods];
    }
}

export class WorldDTO {
    readonly year: string;
    readonly settlements: SettlementDTO[];

    constructor(private readonly world: World) {
        this.year = this.world.year.toString();
        this.settlements = this.world.settlements.map(s => new SettlementDTO(s));
    }

    get population() {
        return this.settlements.reduce((acc, s) => acc + s.size, 0);
    }

    get consumption() {
        const totalConsumption = this.settlements.reduce((acc, s) => acc + s.clans.reduce((acc, clan) => acc + clan.subsistenceConsumption, 0), 0);
        return totalConsumption / this.population;
    }

    get qol() {
        const totalQol = this.settlements.reduce((acc, s) => acc + s.clans.reduce((acc, clan) => acc + clan.qol * clan.size, 0), 0);
        return totalQol / this.population;
    }

    get stats() {
        return [
            ['Productivity', pct(this.consumption)],
            ['Quality of life', this.qol.toFixed()],
        ];
    }

    *clans() {
        for (const settlement of this.settlements) {
            for (const clan of settlement.clans) {
                yield clan;
            }
        }
    }

    get notableClans() {
        const items: [string, OptByWithValue<ClanDTO>, (clan: ClanDTO) => number, (n: number) => string][] = [
            ['Biggest', maxbyWithValue, clan => clan.size, n => n.toFixed()],
            ['Smallest', minbyWithValue,  clan => clan.size, n => n.toFixed()],
            ['Most productive', maxbyWithValue, clan => clan.productivity, pct],
            ['Least productive', minbyWithValue, clan => clan.productivity, pct],
            ['Highest QoL', maxbyWithValue, clan => clan.qol, n => n.toFixed()],
            ['Lowest QoL', minbyWithValue, clan => clan.qol, n => n.toFixed()],
            ['Most benevolent', maxbyWithValue, clan => clan.benevolence, n => (100*n).toFixed()],
            ['Least benevolent', minbyWithValue, clan => clan.benevolence, n => (100*n).toFixed()],
            ['Best reputation', maxbyWithValue, clan => clan.reputation, n => (100*n).toFixed()],
            ['Worst reputation', minbyWithValue, clan => clan.reputation, n => (100*n).toFixed()],

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