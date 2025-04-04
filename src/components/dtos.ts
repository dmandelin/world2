import type { ClanAgent } from "../model/agents";
import type { Assessments } from "../model/interactions";
import type { Clan } from "../model/people";
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
    
    lastSizeChange: number;
    productionAbility: number;
    productitity: number;
    seniority: number;
    size: number;

    festivalModifier: number;
    giftStrategy: string;
    income: number,
    intelligence: number;
    interactionModifier: number;
    prestige: number;
    qol: number;
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

        lastSizeChange: clan.lastSizeChange,
        productionAbility: clan.productionAbility,
        productivity: clan.productivity,
        seniority: clan.seniority,
        size: clan.size,

        festivalModifier: clan.festivalModifier,
        giftStrategy: clan.agent.defaultGiftStrategy,
        income: clan.incomeOld,
        intelligence: clan.intelligence,
        interactionModifier: clan.interactionModifier,
        prestige: clan.prestige,
        qol: clan.qol,
        strength: clan.strength,
        techModifier: clan.techModifier,
        tenure: clan.tenure,
        tenureModifier: clan.tenureModifier,
        traits: [...clan.traits].map(t => t.name),
    };
}