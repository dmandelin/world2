import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import { weightedAverage } from "../lib/modelbasics";
import { getAlignment } from "./alignment";
import { getRespect } from "./respect";

// Clan A's prestige view of clan B (B's prestige to A) combines how aligned
// A is with B (liking/support) and how much A respects B (capability/power).
export function getPrestige(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
    return getAlignment(subject, object) * getRespect(subject, object);
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
