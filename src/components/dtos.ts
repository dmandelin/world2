import type { Assessments, ClanAgent } from "../model/agents";
import type { Clans } from "../model/clans";
import type { Clan, EconomicPolicy, EconomicPolicyDecision, EconomicReport } from "../model/people";
import type { Settlement } from "../model/settlement";
import type { World } from "../model/world";

export type ClanDTO = {
    ref: Clan,
    name: string;
    color: string;

    cadets: Clan[];
    parent: Clan|undefined;
    settlement: Settlement;
    slices: number[][];

    agent: ClanAgent;
    assessments: Assessments;
    
    consumption: number;
    economicPolicy: EconomicPolicy;
    economicPolicyDecision: EconomicPolicyDecision;
    economicReport: EconomicReport;
    lastSizeChange: number;
    productionAbility: number;
    productivity: number;
    seniority: number;
    size: number;

    qolFromAbility: number;
    qolFromConsumption: number;
    qol: number;

    festivalModifier: number;
    giftStrategy: string;
    intelligence: number;
    interactionModifier: number;
    prestige: number;
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

        cadets: clan.cadets,
        parent: clan.parent,
        settlement: clan.settlement!,
        slices: clan.slices,

        consumption: clan.consumption,
        economicPolicy: clan.economicPolicy,
        economicPolicyDecision: clan.economicPolicyDecision,
        economicReport: clan.economicReport,
        perCapitaConsumption: clan.perCapitaConsumption,
        lastSizeChange: clan.lastSizeChange,
        productionAbility: clan.productionAbility,
        productivity: clan.productivity,
        seniority: clan.seniority,
        size: clan.size,

        qolFromConsumption: clan.qolFromConsumption,
        qolFromAbility: clan.qolFromAbility,
        qol: clan.qol,

        festivalModifier: clan.festivalModifier,
        giftStrategy: clan.agent.defaultGiftStrategy,
        intelligence: clan.intelligence,
        interactionModifier: clan.interactionModifier,
        prestige: clan.prestige,
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

    constructor(settlement: Settlement) {
        this.name = settlement.name;
        this.size = settlement.size;
        this.lastSizeChange = settlement.lastSizeChange;

        this.clans = new ClansDTO(settlement.clans);
    }
}

export class WorldDTO {
    readonly year: string;
    readonly settlements: SettlementDTO[];

    constructor(private readonly world: World) {
        this.year = this.world.year.toString();
        this.settlements = this.world.settlements.map(s => new SettlementDTO(s));
    }

    advance() {
        this.world.advance();
    }
}