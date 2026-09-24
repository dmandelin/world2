import { GenericItem, type UUID } from "../records/basicdata";
import { clamp, isPositive, sumFun } from "../lib/basics";
import { pct } from "../lib/format";
import { Activities } from "../decisions/effort";
import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import type { Settlement } from "../people/settlement";
import type { World } from "../world";
import { Interaction } from "./interaction";
import {
    EU_CONVERSATION_NEUTRAL_AFFINITY,
    type FortuneInputs,
} from "../self/eudaimonia";
import {
    Connection,
    FriendshipConnection,
    KinConnection,
    MarriageConnection,
} from "./connection";

// Conversation: the ordinary back-and-forth of village life, which is where
// nearly everything else social starts.
//
// Nobody sits down and decides to converse. Conversation falls out of what
// clans are already doing -- living in the same village, digging the same
// ditches, keeping the same festivals, helping in each other's fields -- and
// out of the standing ties of marriage, kinship and friendship. Each of those
// is a *source*: it puts some of a clan's people in the same place as another
// clan's people for some share of the year.
//
// The measure is acquaintance. One unit is one of the other clan's people
// dealt with regularly for a year; divided by that clan's population it gives
// *strength*, which runs from 0 (strangers) to 1 (the whole clan known well).
// Strength is what the rest of the model reads, under the older name of
// relative attention.
//
// Two clans can only converse together, so every source is settled by
// matching: each side offers, and what actually happens is the lesser of the
// two offers. Within the group sources -- the village, the ditches, the
// festivals -- a clan has some say in whom it spends the time with, and
// spends it on the clans it has most in common with; see `appealOf`.

// --- Sources ---------------------------------------------------------------

// A setting in which conversation happens.
//
// A clan's supply of acquaintance in a setting is
//
//     time share x intensity x scale
//
// `intensity` is how much acquaintance a whole year in that setting is worth
// to a clan. It differs by setting because settings differ in how much of the
// time is actually spent among the other clans' people: a year of simply
// living in the same village is mostly spent within one's own clan, while a
// festival is nothing but other people.
//
// `scale` is what the size of the gathering does to that. When N people get
// together, what comes of it can be anything from a set of conversations in
// pairs, where more people add nothing (scale 1), to one great conversation
// with everybody, where each person meets all N (scale up to N). Real
// gatherings sit near the first end. Each group setting has a base size, in
// people, at which scale is 1, and
//
//     scale = (people / base size) ^ exponent
//
// Settings between two particular clans have no gathering to scale: 1.
export type ConversationSource = {
    readonly name: string;
    // Sorted for display; also the order items appear in.
    readonly sortKey: number;
    readonly intensity: number;
    readonly note: string;
    // People taking part at which the scale factor is 1. Group settings only.
    readonly baseSize?: number;
    readonly scaleExponent?: number;
};

// What the size of a gathering does to the acquaintance it yields.
export function venueScale(source: ConversationSource, people: number): number {
    if (source.baseSize === undefined || source.scaleExponent === undefined) return 1;
    if (!isPositive(people)) return 0;
    return (people / source.baseSize) ** source.scaleExponent;
}

// Talkativeness: every offer a clan makes is multiplied by
//
//     2 ^ ((talkativeness - 50) / TALKATIVENESS_DOUBLING)
//
// so an ordinary clan at 50 offers what the setting yields, one at 80 twice
// that, and one at 20 half.
export const TALKATIVENESS_DOUBLING = 30;

export function talkativenessFactor(talkativeness: number): number {
    return 2 ** ((talkativeness - 50) / TALKATIVENESS_DOUBLING);
}

// Acquaintance a whole year in each setting is worth, at scale 1. Set so that
// at the start, with clans living in the settlement 30% of the year, an
// average clan's supply of about 90 comes roughly 40% from festivals, 30%
// from the settlement, 20% from help and 10% from ditching.
export const SETTLEMENT_INTENSITY = 90;
export const DITCHING_INTENSITY = 150;
export const FESTIVALS_INTENSITY = 360;
export const HELP_INTENSITY = 190;

// Settings where a whole group takes part together, and a clan can choose
// whom within the group to spend its time with.
export class GroupSources {
    // Simply living in the same place: the paths, the water, the doorways.
    // Time is the share of the year the clan is actually in the settlement
    // rather than out at the fishing camps, so nomadic clans get less of it.
    // Its people are everyone in the clans living there.
    static readonly Settlement: ConversationSource = {
        name: 'Settlement',
        sortKey: 1,
        intensity: SETTLEMENT_INTENSITY,
        note: 'Share of the year spent living in the settlement',
        baseSize: 150,
        scaleExponent: 1 / 6,
    };

    // Work on the common ditches, done shoulder to shoulder with whoever else
    // turned out for it. Its people are the workers of the clans taking part.
    // Work parties are small whatever the size of the turnout, so size barely
    // matters.
    static readonly Ditching: ConversationSource = {
        name: 'Ditching',
        sortKey: 2,
        intensity: DITCHING_INTENSITY,
        note: 'Share of the year spent on the common ditches',
        baseSize: 50,
        scaleExponent: 0.05,
    };

    // The settlement's festivals, which are almost entirely other people.
    // Everyone in the clans taking part comes.
    static readonly Festivals: ConversationSource = {
        name: 'Festivals',
        sortKey: 3,
        intensity: FESTIVALS_INTENSITY,
        note: "Share of the year spent at the settlement's festivals",
        baseSize: 150,
        scaleExponent: 1 / 6,
    };
}

// Settings that hold between two particular clans, where there is nobody else
// to choose between.
export class TieSources {
    // Helping in another clan's fields. Already matched in person-years by
    // the help planner, so both sides put in the same time. Supplied in
    // acquaintance like the group settings, since it is time spent among
    // another clan's people in the same way.
    static readonly Help: ConversationSource = {
        name: 'Help',
        sortKey: 4,
        intensity: HELP_INTENSITY,
        note: 'Share of the year spent working in their fields',
    };

    static readonly Marriage: ConversationSource = {
        name: 'Marriage',
        sortKey: 5,
        intensity: 8,
        note: 'Visits between a clan and the clan its people married into',
    };

    static readonly Kin: ConversationSource = {
        name: 'Kin',
        sortKey: 6,
        intensity: 8,
        note: 'Visits between a clan and the clan it split from',
    };

    static readonly Friendship: ConversationSource = {
        name: 'Friendship',
        sortKey: 7,
        intensity: 8,
        note: 'Visits between clans that count each other friends',
    };
}

export const GROUP_SOURCES: readonly ConversationSource[] = [
    GroupSources.Settlement,
    GroupSources.Ditching,
    GroupSources.Festivals,
];

// Share of a clan's year that each standing tie takes up in visiting. Not yet
// taken out of the clan's effort allocation; see the note at the end of
// decisions/effort.ts.
export const MARRIAGE_VISIT_SHARE = 0.12;
export const KIN_VISIT_SHARE = 0.04;
export const FRIENDSHIP_VISIT_SHARE = 0.06;

// How much a clan's willingness to spend its time on another swings with its
// affinity for that clan. Appeal is 1 at neutral, and relative affinity is 0
// for a clan as close as the subject's average acquaintance and 1 for one as
// close as itself, so this is the full swing either way; the floor keeps a
// clan nobody has anything in common with from becoming entirely invisible,
// since villagers still have to get past each other in the lane.
export const AFFINITY_APPEAL_WEIGHT = 1.2;
export const APPEAL_FLOOR = 0.15;

// Nobody can know more of a clan than all of it, so one source can carry a
// pair no further than this, and the total no further either.
const MAX_STRENGTH = 1;

// Visiting falls off with distance the same way help does; see mutualaid.ts.
export const VISIT_ICEBERG_PER_MILE = 0.045;

// How many times offers are reshuffled away from partners who cannot match
// them and toward partners who could take more. Two passes past the first get
// nearly all of it.
const MATCHING_ROUNDS = 3;

// --- The interaction -------------------------------------------------------

const strengthText = (d: { strength: number }) => `From ${pct(d.strength)}`;

// One source's contribution to a pair's conversation: what each side had to
// offer, and what the two of them actually had between them.
export class ConversationItem {
    constructor(
        readonly source: ConversationSource,
        // Share of the year each clan spent in the setting.
        readonly share1: number,
        readonly share2: number,
        // Strength each offered the other, before matching.
        readonly offered1to2: number,
        readonly offered2to1: number,
        // What they settled at: the lesser of the two.
        readonly strength: number,
    ) { }

    offeredFrom(subject: Clan | ClanDTO, conversation: Conversation): number {
        return subject.uuid === conversation.c1
            ? this.offered1to2 : this.offered2to1;
    }

    shareFor(subject: Clan | ClanDTO, conversation: Conversation): number {
        return subject.uuid === conversation.c1 ? this.share1 : this.share2;
    }

    // The same item seen from the other clan's side.
    flipped(): ConversationItem {
        return new ConversationItem(
            this.source, this.share2, this.share1,
            this.offered2to1, this.offered1to2, this.strength);
    }
}

export class Conversation extends Interaction {
    // What the two clans settled at, the same seen from either side: the
    // share of the other clan's people each deals with regularly.
    strength: number = 0;

    // Acquaintance in absolute terms: how many of the other clan's people
    // this one deals with. Kept because a count of people is easier to reason
    // about than a ratio when the two clans are of very different sizes.
    amount1to2: number = 0;
    amount2to1: number = 0;

    // Where it came from, one entry per source that contributed.
    items: ConversationItem[] = [];

    constructor(c1: UUID, c2: UUID) {
        super(c1, c2);
    }

    // Conversation is mutual, so both clans see the same strength. The
    // arguments are kept for the shape the callers expect.
    relativeAttention(subject?: Clan | ClanDTO, object?: Clan | ClanDTO): number {
        return this.strength;
    }

    information(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
        return this.strength;
    }

    alignmentItem(subject: Clan | ClanDTO, object: Clan | ClanDTO): GenericItem {
        return new GenericItem(
            'Conversation',
            0.1 * this.strength,
            strengthText,
            { strength: this.strength },
        )
    }
}

// --- What each clan has to spend -------------------------------------------

// One line of a clan's conversation budget: a setting, the share of the
// clan's year it takes, and what that came to.
export class ConversationBudgetItem {
    // Acquaintance the clan put into this setting over the year.
    supply: number = 0;
    // How much of that found someone on the other side to take it up.
    used: number = 0;
    // People taking part in the setting, and the scale factor that came to.
    // Group settings only; a tie is 1 and has no gathering.
    people: number | undefined;
    scale: number = 1;
    // What the clan's Talkativeness multiplied it by.
    talk: number = 1;

    constructor(
        readonly source: ConversationSource,
        // Share of the clan's year spent in this setting. Ties add each
        // pair's share as they are walked.
        public share: number,
    ) { }

    get unused(): number {
        return Math.max(0, this.supply - this.used);
    }

    clone(): ConversationBudgetItem {
        const item = new ConversationBudgetItem(this.source, this.share);
        item.supply = this.supply;
        item.used = this.used;
        item.people = this.people;
        item.scale = this.scale;
        item.talk = this.talk;
        return item;
    }
}

// What a clan had to spend on conversation this year and how it went. Kept so
// the UI can show where a clan's conversation came from and how much of what
// it offered nobody was there to take.
export class ConversationBudget {
    items: ConversationBudgetItem[] = [];

    get supply(): number { return sumFun(this.items, i => i.supply); }
    get used(): number { return sumFun(this.items, i => i.used); }
    get unused(): number { return sumFun(this.items, i => i.unused); }

    item(source: ConversationSource): ConversationBudgetItem | undefined {
        return this.items.find(i => i.source === source);
    }

    clone(): ConversationBudget {
        const b = new ConversationBudget();
        b.items = this.items.map(i => i.clone());
        return b;
    }
}

// People taking part in a group setting: the whole population of the clans
// taking part, for the settlement and its festivals; only the workers, for
// the ditches. How much of the year each clan is actually there is its time
// share, not a smaller gathering.
function venuePeople(source: ConversationSource, participants: Clan[]): number {
    switch (source) {
        case GroupSources.Settlement:
        case GroupSources.Festivals:
            return sumFun(participants, c => c.population);
        case GroupSources.Ditching:
            return sumFun(participants, c => c.workers);
        default:
            return 0;
    }
}

// The share of its year a clan spends in each group setting.
function groupShare(clan: Clan, source: ConversationSource): number {
    switch (source) {
        case GroupSources.Settlement:
            return clamp(clan.residenceFraction, 0, 1);
        case GroupSources.Ditching:
            return clan.effortAllocation.get(Activities.Ditching);
        case GroupSources.Festivals:
            return clan.effortAllocation.get(Activities.Festivals);
        default:
            return 0;
    }
}

// The share of its year a clan spends on a standing tie to one other clan.
// Returns undefined for connections that generate no visiting of their own:
// being neighbors is already the Settlement source.
function tieShare(connection: Connection, subject: Clan, object: Clan): { source: ConversationSource, share: number } | undefined {

    if (connection instanceof MarriageConnection) {
        return {
            source: TieSources.Marriage,
            share: MARRIAGE_VISIT_SHARE * connection.relatedness,
        };
    }
    if (connection instanceof KinConnection) {
        return { source: TieSources.Kin, share: KIN_VISIT_SHARE };
    }
    if (connection instanceof FriendshipConnection) {
        return { source: TieSources.Friendship, share: FRIENDSHIP_VISIT_SHARE };
    }
    return undefined;
}

// Time spent helping in another clan's fields, as a share of the helper's
// year. Both sides of a help pair are matched in person-years already, so
// this is symmetric up to the two clans' sizes.
function helpShare(subject: Clan, object: Clan): number {
    return subject.helpAllocation.get(object);
}

// How much of the trip is left by the time they get there. Clans in the same
// settlement are already there.
function visitReach(c1: Clan, c2: Clan): number {
    if (c1.settlement === c2.settlement) return 1;
    if (!c1.settlement || !c2.settlement) return 0;
    return Math.max(0, 1 - VISIT_ICEBERG_PER_MILE * c1.settlement.milesTo(c2.settlement));
}

// How much a clan wants to spend its time on another: neutral at 1, more for
// a clan it has more in common with than usual and less for one it has less.
// Relative affinity, so that each clan seeks out the company it finds most
// congenial among those it knows, however congenial they are outright. A clan
// it does not know yet reads as average.
export function appealOf(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
    return Math.max(
        APPEAL_FLOOR, 1 + AFFINITY_APPEAL_WEIGHT * relativeAffinityOf(subject, object));
}

export function relativeAffinityOf(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
    return subject.world.perceptions.get(subject, object)?.affinity.relative ?? 0;
}

// --- Allocation and matching -----------------------------------------------

// One group setting in one settlement, with everyone taking part in it.
class Venue {
    // Acquaintance each participant has to spend here.
    readonly supply = new Map<Clan, number>();
    // Share of the year each participant spends here.
    readonly share = new Map<Clan, number>();
    // How each participant would rather spread it: subject -> object -> weight.
    readonly weights = new Map<Clan, Map<Clan, number>>();
    // What each is currently offering: subject -> object -> acquaintance.
    readonly offers = new Map<Clan, Map<Clan, number>>();

    readonly initialOffers = new Map<Clan, Map<Clan, number>>();

    // People taking part, and what that does to the acquaintance it yields.
    readonly people: number;
    readonly scale: number;

    constructor(
        readonly source: ConversationSource,
        readonly participants: Clan[],
    ) {
        this.people = venuePeople(source, participants);
        this.scale = venueScale(source, this.people);
        for (const c1 of participants) {
            const share = groupShare(c1, source);
            this.share.set(c1, share);
            this.supply.set(c1, share * source.intensity * this.scale
                * talkativenessFactor(c1.traits.talkativeness));

            const w = new Map<Clan, number>();
            for (const c2 of participants) {
                if (c1 === c2) continue;
                // Weighted by how much the clan cares to converse with c2.
                w.set(c2, appealOf(c1, c2));
            }
            this.weights.set(c1, w);
            this.offers.set(c1, new Map());
        }

        // Initial Pass: Spread total supply across all partners
        for (const c1 of this.participants) {
            this.spread(
                c1,
                this.participants.filter(c2 => c2 !== c1),
                this.supply.get(c1) ?? 0);
        }

        // Capture initial offers before allocate() trims or reallocates them.
        for (const c1 of this.participants) {
            const initMap = new Map<Clan, number>();
            const currentMap = this.offers.get(c1)!;
            for (const [c2, amt] of currentMap) {
                initMap.set(c2, amt);
            }
            this.initialOffers.set(c1, initMap);
        }
    }

    offer(c1: Clan, c2: Clan): number {
        return this.offers.get(c1)?.get(c2) ?? 0;
    }

    // Strength one clan's current offer would come to, if the other clan
    // matched all of it.
    offeredStrength(c1: Clan, c2: Clan): number {
        return c2.population > 0 ? this.offer(c1, c2) / c2.population : 0;
    }

    // Initial strength offered before any trimming or reallocation rounds.
    initialOfferedStrength(c1: Clan, c2: Clan): number {
        const off = this.initialOffers.get(c1)?.get(c2) ?? 0;
        return c2.population > 0 ? off / c2.population : 0;
    }

    // What the pair actually has: neither side can converse alone.
    matchedStrength(c1: Clan, c2: Clan): number {
        return Math.min(
            this.offeredStrength(c1, c2),
            this.offeredStrength(c2, c1),
            MAX_STRENGTH);
    }

    // Spread `amount` over the given partners in proportion to weight.
    private spread(c1: Clan, partners: Clan[], amount: number): void {
        const w = this.weights.get(c1)!;
        const total = sumFun(partners, c2 => w.get(c2) ?? 0);
        if (!isPositive(total) || !isPositive(amount)) return;
        const offers = this.offers.get(c1)!;
        for (const c2 of partners) {
            const share = (w.get(c2) ?? 0) / total;
            offers.set(c2, (offers.get(c2) ?? 0) + share * amount);
        }
    }

    // Settle who talks with whom. Everyone offers by preference, and then,
    // seeing that some of what they offered had nobody to take it, moves that
    // part to the partners who would have taken more. Offers never fall below
    // what was already matched, so this only ever settles upward.
    allocate(): void {
        for (let round = 1; round < MATCHING_ROUNDS; ++round) {
            // Read the matched levels off the round's offers before changing
            // any of them, so everyone is answering the same board.
            const matched = new Map<Clan, Map<Clan, number>>();
            for (const c1 of this.participants) {
                const m = new Map<Clan, number>();
                for (const c2 of this.participants) {
                    if (c1 !== c2) m.set(c2, this.matchedStrength(c1, c2));
                }
                matched.set(c1, m);
            }

            let moved = 0;
            for (const c1 of this.participants) {
                const offers = this.offers.get(c1)!;
                const hungry: Clan[] = [];
                let freed = 0;
                for (const c2 of this.participants) {
                    if (c1 === c2) continue;
                    const level = matched.get(c1)!.get(c2)!;
                    // Offers are in acquaintance, levels in strength.
                    const used = level * c2.population;
                    const offered = offers.get(c2) ?? 0;
                    if (offered > used + 1e-9) {
                        // They could not take all of it; keep back the rest.
                        freed += offered - used;
                        offers.set(c2, used);
                    } else if (level < MAX_STRENGTH - 1e-9) {
                        // They were the ones waiting on us.
                        hungry.push(c2);
                    }
                }
                if (freed > 1e-9 && hungry.length) {
                    this.spread(c1, hungry, freed);
                    moved += freed;
                }
            }
            if (moved < 1e-9) break;
        }
    }
}

// --- The turn's update -----------------------------------------------------

export function updateConversations(world: World): void {
    world.interactions.removeType(Conversation);
    for (const clan of world.allClans) {
        clan.conversationBudget = new ConversationBudget();
    }

    // Every source's contribution to every pair, gathered before anything is
    // written, so a pair's items come out in source order however the sources
    // were walked.
    const contributions = new Map<Clan, Map<Clan, ConversationItem[]>>();
    // Keyed by the pair in uuid order, so the group sources (walked in
    // settlement order) and the ties (walked in connection order) land on
    // the same entry.
    const record = (c1: Clan, c2: Clan, item: ConversationItem) => {
        if (c1.uuid > c2.uuid) {
            [c1, c2] = [c2, c1];
            item = item.flipped();
        }
        let side = contributions.get(c1);
        if (!side) contributions.set(c1, side = new Map());
        let items = side.get(c2);
        if (!items) side.set(c2, items = []);
        items.push(item);
    };

    // Group settings, settled one settlement at a time: everyone taking part
    // is in the same place, so who spends the time with whom is one question
    // with one answer.
    for (const settlement of world.allSettlements) {
        for (const source of GROUP_SOURCES) {
            const participants = settlement.clans.filter(
                c => c.population > 0 && isPositive(groupShare(c, source)));
            if (participants.length < 2) continue;

            const venue = new Venue(source, participants);
            venue.allocate();

            for (const c1 of participants) {
                const budgetItem = new ConversationBudgetItem(
                    source, venue.share.get(c1) ?? 0);
                budgetItem.supply = venue.supply.get(c1) ?? 0;
                budgetItem.people = venue.people;
                budgetItem.scale = venue.scale;
                budgetItem.talk = talkativenessFactor(c1.traits.talkativeness);
                c1.conversationBudget.items.push(budgetItem);
            }

            for (let i = 0; i < participants.length; ++i) {
                for (let j = i + 1; j < participants.length; ++j) {
                    const [c1, c2] = [participants[i], participants[j]];
                    const strength = venue.matchedStrength(c1, c2);
                    const initOff1 = venue.initialOfferedStrength(c1, c2);
                    const initOff2 = venue.initialOfferedStrength(c2, c1);
                    if (!isPositive(strength) && !isPositive(initOff1) && !isPositive(initOff2)) continue;
                    record(c1, c2, new ConversationItem(
                        source,
                        venue.share.get(c1) ?? 0,
                        venue.share.get(c2) ?? 0,
                        initOff1,
                        initOff2,
                        strength));
                    // Budgets are in acquaintance: the people of the
                    // other clan this one came to know.
                    c1.conversationBudget.item(source)!.used += strength * c2.population;
                    c2.conversationBudget.item(source)!.used += strength * c1.population;
                }
            }
        }
    }

    // Standing ties and help, which hold between two clans and need no
    // choosing: a clan visits its in-laws, or it does not.
    const tieItems = new Map<Clan, ConversationBudgetItem>();
    const tieBudget = (clan: Clan, source: ConversationSource, share: number) => {
        const key = clan;
        let item = clan.conversationBudget.item(source);
        if (!item) {
            item = new ConversationBudgetItem(source, 0);
            item.talk = talkativenessFactor(clan.traits.talkativeness);
            clan.conversationBudget.items.push(item);
        }
        return item;
    };

    const addTie = (
        c1: Clan, c2: Clan, source: ConversationSource,
        share1: number, share2: number) => {

        const reach = visitReach(c1, c2);
        if (!isPositive(reach)) return;
        const popMod1 = c1.population > 0 ? Math.sqrt(c1.population / 20) : 0;
        const popMod2 = c2.population > 0 ? Math.sqrt(c2.population / 20) : 0;
        const supply1 = share1 * source.intensity * reach * popMod1
            * talkativenessFactor(c1.traits.talkativeness);
        const supply2 = share2 * source.intensity * reach * popMod2
            * talkativenessFactor(c2.traits.talkativeness);

        const item1 = tieBudget(c1, source, share1);
        const item2 = tieBudget(c2, source, share2);
        item1.supply += supply1;
        item2.supply += supply2;

        const offered1to2 = supply1;
        const offered2to1 = supply2;
        const strength = Math.min(offered1to2, offered2to1, MAX_STRENGTH);
        if (!isPositive(strength) && !isPositive(offered1to2) && !isPositive(offered2to1)) return;

        record(c1, c2, new ConversationItem(
            source, share1, share2, offered1to2, offered2to1, strength));
        item1.used += strength;
        item2.used += strength;
    };

    // Help is supplied in acquaintance, like the group settings, but to one
    // partner at a time, so there is nothing to choose: each side offers its
    // time in the other's fields. The planner matched the two in person-
    // years, so the offers come out equal in strength.
    const addHelp = (c1: Clan, c2: Clan, share1: number, share2: number) => {
        const source = TieSources.Help;
        const supply1 = share1 * source.intensity
            * talkativenessFactor(c1.traits.talkativeness);
        const supply2 = share2 * source.intensity
            * talkativenessFactor(c2.traits.talkativeness);
        const offered1to2 = supply1 / c2.population;
        const offered2to1 = supply2 / c1.population;
        const strength = Math.min(offered1to2, offered2to1, MAX_STRENGTH);

        const item1 = tieBudget(c1, source, share1);
        const item2 = tieBudget(c2, source, share2);
        item1.share += share1;
        item2.share += share2;
        item1.supply += supply1;
        item2.supply += supply2;
        if (!isPositive(strength) && !isPositive(offered1to2) && !isPositive(offered2to1)) return;

        record(c1, c2, new ConversationItem(
            source, share1, share2, offered1to2, offered2to1, strength));
        item1.used += strength * c2.population;
        item2.used += strength * c1.population;
    };

    for (const [u1, u2, connections] of world.connections.pairs()) {
        const [c1, c2] = world.clansFrom(u1, u2);
        if (!c1 || !c2 || c1.population <= 0 || c2.population <= 0) continue;

        for (const connection of connections) {
            const tie = tieShare(connection, c1, c2);
            if (!tie) continue;
            addTie(c1, c2, tie.source, tie.share, tie.share);
        }

        const help1 = helpShare(c1, c2);
        const help2 = helpShare(c2, c1);
        if (isPositive(help1) || isPositive(help2)) {
            addHelp(c1, c2, help1, help2);
        }
    }

    // Write what each pair came to.
    for (const [c1, side] of contributions) {
        for (const [c2, items] of side) {
            items.sort((a, b) => a.source.sortKey - b.source.sortKey);
            const strength = clamp(
                sumFun(items, i => i.strength), 0, MAX_STRENGTH);
            const hasAnyOffer = items.some(i => isPositive(i.offered1to2) || isPositive(i.offered2to1) || isPositive(i.strength));
            if (!hasAnyOffer) continue;

            const conversation =
                world.interactions.getOrCreate(c1, c2, Conversation);
            if (conversation.c1 !== c1.uuid) {
                // Align ConversationItem fields with conversation.c1 (c2) and conversation.c2 (c1)
                conversation.items = items.map(item => item.flipped());
            } else {
                conversation.items = items;
            }
            conversation.strength = strength;
            conversation.amount1to2 = strength;
            conversation.amount2to1 = strength;
        }
    }


    for (const clan of world.allClans) {
        clan.conversationBudget.items.sort(
            (a: ConversationBudgetItem, b: ConversationBudgetItem) => a.source.sortKey - b.source.sortKey);
    }
}

// --- Reading it back -------------------------------------------------------

export function getConversation<T extends Clan | ClanDTO>(
    subject: T, object: T): Conversation | undefined {

    return subject.world.interactions.getOfType(subject, object, Conversation);
}

export function getRelativeAttention<T extends Clan | ClanDTO>(
    subject: T, object: T): number {

    return getConversation(subject, object)?.strength ?? 0;
}

// How much conversation a clan's people had with everyone outside the clan
// this year, which is what the Conversation item of quality of life is made
// of. Read off the settled strengths, so it counts what the clan actually had
// rather than what it offered.
export const CONVERSATION_QOL_SCALE = 10;

export function conversationPayoff(clan: Clan | ClanDTO): number {
    let total = 0;
    for (const [, interactions] of clan.world.interactions.getFor(clan)) {
        for (const interaction of interactions) {
            if (interaction instanceof Conversation) {
                total += interaction.strength;
            }
        }
    }
    return CONVERSATION_QOL_SCALE * total;
}

// What Fortune reads of a clan's conversation this year, written into its
// inputs: how many people outside the clan its people deal with, and its
// absolute affinity for their clans averaged by how many of each it knows. A
// clan that talks with nobody reads neutral on affinity, since there is
// nobody to get on well or badly with; see eudaimonia.ts.
export function readConversationForFortune(clan: Clan, inputs: FortuneInputs): void {
    let amount = 0;
    let affinity = 0;
    for (const [uuid, interactions] of clan.world.interactions.getFor(clan)) {
        const other = clan.world.clanFrom(uuid);
        if (!other) continue;
        for (const interaction of interactions) {
            if (!(interaction instanceof Conversation)) continue;
            const known = interaction.strength * other.population;
            amount += known;
            affinity += known
                * (clan.world.perceptions.get(clan, other)?.affinity.absolute ?? 0);
        }
    }
    inputs.conversationAmount = amount;
    inputs.conversationAffinity = amount > 0
        ? affinity / amount : EU_CONVERSATION_NEUTRAL_AFFINITY;
}
