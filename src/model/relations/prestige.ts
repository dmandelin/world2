import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import { weightedAverage } from "../lib/modelbasics";
import { getAlignment } from "./alignment";
import { getRespect } from "./respect";

// Clan A's prestige view of clan B (B's prestige to A) combines how aligned
// A is with B (liking/support) and how much A respects B (capability/power).
// The geometric-style blend keeps the sign of alignment while dampening the
// growth of the product (respect is always >= 0).
export function getPrestige(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
    const alignment = getAlignment(subject, object);
    // Respect runs 0-100; rescale to 0-1 so it blends on the same scale as
    // alignment (which is -1 to 1).
    const respect = getRespect(subject, object) / 100;
    return Math.sign(alignment) * Math.sqrt(Math.abs(alignment) * respect);
}

// Population-weighted prestige granted to `object` by clans in `scope`.
export function getPrestigeInScope(object: Clan | ClanDTO, scope: (Clan | ClanDTO)[]): number {
    return weightedAverage(
        scope,
        subject => getPrestige(subject, object),
        subject => subject.population);
}

// Population-weighted prestige other clans in the settlement grant this one.
export function getLocalPrestige(clan: Clan | ClanDTO): number {
    const settlement = clan.settlement;
    if (!settlement) return 0;
    const raters = settlement.clans.filter(c => c.uuid !== clan.uuid);
    if (raters.length === 0) return 0;
    return getPrestigeInScope(clan, raters);
}

// Population-weighted average of local prestige across a set of clans.
export function averageLocalPrestige(scope: (Clan | ClanDTO)[]): number {
    return weightedAverage(
        scope,
        clan => getLocalPrestige(clan),
        clan => clan.population);
}

// A clan's local prestige relative to its settlement's pop-weighted average.
export function getRelativeLocalPrestige(clan: Clan | ClanDTO): number {
    const settlement = clan.settlement;
    if (!settlement) return 0;
    return getLocalPrestige(clan) - averageLocalPrestige(settlement.clans);
}
