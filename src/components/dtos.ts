import type { ClanAgent } from "../model/agents";
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
    
    festivalModifier: number;
    giftStrategy: string;
    income: number,
    intelligence: number;
    interactionModifier: number;
    lastSizeChange: number;
    prestige: number;
    productionAbility: number;
    qol: number;
    seniority: number;
    size: number;
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

        cadets: clan.cadets,
        parent: clan.parent,
        settlement: clan.settlement!,
        slices: clan.slices,

        festivalModifier: clan.festivalModifier,
        giftStrategy: clan.agent.defaultGiftStrategy,
        income: clan.income,
        intelligence: clan.intelligence,
        interactionModifier: clan.interactionModifier,
        lastSizeChange: clan.lastSizeChange,
        prestige: clan.prestige,
        productionAbility: clan.productionAbility,
        qol: clan.qol,
        seniority: clan.seniority,
        size: clan.size,
        strength: clan.strength,
        techModifier: clan.techModifier,
        tenure: clan.tenure,
        tenureModifier: clan.tenureModifier,
        traits: [...clan.traits].map(t => t.name),
    };
}