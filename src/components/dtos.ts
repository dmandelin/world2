import type { ClanAgent } from "../model/agents";
import type { Clans } from "../model/clans";
import type { Assessments } from "../model/interactions";
import type { Clan, EconomicPolicy, EconomicPolicyDecision } from "../model/people";
import type { Settlement } from "../model/settlement";

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