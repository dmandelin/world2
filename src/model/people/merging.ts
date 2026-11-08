import { normal } from "../lib/distributions";
import { getAlignment } from "../relations/alignment";
import { getRelativeAttention } from "../relations/conversation";
import { inclusiveFeeling } from "../decision";
import { membershipChanged } from "./membership";
import { TRAIT_SD } from "./traits";
import { SOCIABILITY_SD } from "./sociability";
import type { Clan } from "./people";
import type { Settlement } from "./settlement";
import type { World } from "../world";

// When a clan grows too small to carry on alone.
//
// A clan of a dozen people has a few married women at most, and an unlucky
// year can leave it none. Clans that small mostly dwindle away. What such a
// clan can do is ask to be taken in by a neighbor it talks with, and become
// part of that clan: its people, its stores, its skills and its ways all go
// into the larger one.
//
// Whether it asks at all depends on how small it is; whether a neighbor will
// have it depends on how the neighbor feels about it and what sort of clan the
// neighbor is; and of those that would have it, it goes to the one that
// thinks best of it, as near as it can tell.

// --- Deciding to ask -----------------------------------------------------------
//
// A yearly hazard that is nothing at CEILING people and above, and grows in a
// straight line below it. Calibrated so that a clan of REFERENCE_SIZE asks
// within REFERENCE_YEARS with REFERENCE_CHANCE: 80% within ten years at ten
// people, which is about 15% a year. At five people it is about 21% a year,
// and at one about 26%.
export const MERGE_SIZE_CEILING = 20;
export const MERGE_REFERENCE_SIZE = 10;
export const MERGE_REFERENCE_YEARS = 10;
export const MERGE_REFERENCE_CHANCE = 0.8;

const MERGE_HAZARD_AT_REFERENCE =
    -Math.log(1 - MERGE_REFERENCE_CHANCE) / MERGE_REFERENCE_YEARS;

export function mergeAttemptChance(size: number): number {
    if (!(size > 0) || size >= MERGE_SIZE_CEILING) return 0;
    const hazard = MERGE_HAZARD_AT_REFERENCE
        * (MERGE_SIZE_CEILING - size) / (MERGE_SIZE_CEILING - MERGE_REFERENCE_SIZE);
    return 1 - Math.exp(-hazard);
}

// --- Taking it in ----------------------------------------------------------------
//
// A neighbor's chance of having the clan is a logistic in how it feels about
// it -- its alignment toward it, made more of by tenderness and less by
// hardness, as when weighing its interests in a decision -- shifted by what
// sort of clan the neighbor is:
//
//     logit = SLOPE * (feeling - MIDPOINT)
//           + RIGHTEOUSNESS_PER_SD * (righteousness - 50) / sd
//           + SOCIABILITY_PER_SD * (sociability - 50) / sd
//
// For a neighbor of ordinary righteousness and sociability, that is 80% at a
// feeling of +0.5 and 20% at nothing: a clan it is well disposed to it will
// probably have, and one it is set against it probably will not. A righteous
// clan takes in the small out of duty; a sociable one is glad of the company.
export const ACCEPT_FEELING_MIDPOINT = 0.25;
export const ACCEPT_CHANCE_AT_HALF = 0.8;
const ACCEPT_FEELING_SLOPE =
    Math.log(ACCEPT_CHANCE_AT_HALF / (1 - ACCEPT_CHANCE_AT_HALF))
    / (0.5 - ACCEPT_FEELING_MIDPOINT);
export const ACCEPT_RIGHTEOUSNESS_PER_SD = 0.5;
export const ACCEPT_SOCIABILITY_PER_SD = 0.5;

// How far off the asking clan is in judging which of the clans that would
// have it thinks best of it, in alignment.
export const MERGE_CHOICE_ERROR_SD = 0.1;

// One neighbor the clan asked, and what it said.
export class MergeOffer {
    readonly clanName: string;
    readonly accepted: boolean;

    constructor(
        readonly clan: Clan,
        // The neighbor's alignment toward the asking clan, and what its
        // tenderness made of that.
        readonly alignment: number,
        readonly feeling: number,
        // Its traits as they stood.
        readonly righteousness: number,
        readonly sociability: number,
        readonly tenderness: number,
        readonly chance: number,
    ) {
        this.clanName = clan.name;
        this.accepted = Math.random() < chance;
    }
}

export function acceptChance(
    feeling: number, righteousness: number, sociability: number,
): number {
    const logit = ACCEPT_FEELING_SLOPE * (feeling - ACCEPT_FEELING_MIDPOINT)
        + ACCEPT_RIGHTEOUSNESS_PER_SD * (righteousness - 50) / TRAIT_SD
        + ACCEPT_SOCIABILITY_PER_SD * (sociability - 50) / SOCIABILITY_SD;
    return 1 / (1 + Math.exp(-logit));
}

function offerFrom(host: Clan, joiner: Clan): MergeOffer {
    const alignment = getAlignment(host, joiner);
    const tenderness = host.traits.tenderness;
    const feeling = inclusiveFeeling(alignment, tenderness);
    const righteousness = host.traits.righteousness;
    const sociability = host.traits.sociability;
    return new MergeOffer(
        host, alignment, feeling, righteousness, sociability, tenderness,
        acceptChance(feeling, righteousness, sociability));
}

// A clan that asked to be taken in, whom it asked, and where it went, if
// anywhere.
export class MergeEvent {
    readonly clanName: string;

    constructor(
        readonly settlement: Settlement,
        readonly year: number,
        readonly clan: Clan,
        // Its people when it asked.
        readonly size: number,
        readonly offers: readonly MergeOffer[],
        // The clan that took it in, and that clan's people beforehand.
        readonly host: Clan | undefined,
        readonly hostSize: number,
    ) {
        this.clanName = clan.name;
    }

    get joined(): boolean {
        return this.host !== undefined;
    }

    get detail(): string {
        const asked = this.offers.length;
        const yes = this.offers.filter(o => o.accepted).length;
        return `${this.size} people; ${yes} of ${asked} `
            + `neighbor${asked === 1 ? '' : 's'} would have them`;
    }
}

// The event feed's marker for these; see NotificationBar.
export const MERGE_NOTE_LABEL = '🤝';

// Let the year's small clans ask to be taken in. Run at the start of the
// year's planning, with the splits, so that the clans as they then stand are
// the ones that plan. Who talks with whom is last year's, which is what the
// asking clan has to go on.
export function planMerges(world: World, priming: boolean = false): void {
    world.lastMerges = [];
    if (priming) return;

    // A clan already taken in, or already taking another in, sits the rest
    // of the year out.
    const involved = new Set<Clan>();
    let changed = false;
    for (const settlement of world.allSettlements) {
        for (const clan of [...settlement.clans]) {
            if (involved.has(clan)) continue;
            const size = clan.population;
            if (Math.random() >= mergeAttemptChance(size)) continue;

            const offers = settlement.clans
                .filter(c => c !== clan && !involved.has(c) && c.population > 0
                    && getRelativeAttention(clan, c) > 0)
                .map(c => offerFrom(c, clan));
            const willing = offers.filter(o => o.accepted);

            // To whichever thinks best of it, as near as it can judge.
            let best: MergeOffer | undefined;
            let bestScore = -Infinity;
            for (const offer of willing) {
                const score = offer.alignment + normal(0, MERGE_CHOICE_ERROR_SD);
                if (score > bestScore) {
                    best = offer;
                    bestScore = score;
                }
            }

            const host = best?.clan;
            const event = new MergeEvent(
                settlement, world.year.value, clan, size, offers,
                host, host?.population ?? 0);
            world.lastMerges.push(event);
            if (!host) continue;

            host.absorb(clan);
            settlement.clans.splice(settlement.clans.indexOf(clan), 1);
            involved.add(clan);
            involved.add(host);
            changed = true;
            world.addNote(
                MERGE_NOTE_LABEL,
                `The ${clan.name} joined {0} at {1}`,
                event.detail,
                [
                    { uuid: host.uuid, name: host.name },
                    { uuid: settlement.uuid, name: settlement.name },
                ],
            );
        }
    }
    if (changed) membershipChanged();
}
