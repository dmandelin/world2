import type { Clan } from "../people/people";
import { TradeGoods, type TradeGood } from "../trade";
import { clamp, isPositive } from "../lib/basics";
import { Conversation } from "../relations/conversation";
import { recordFoodAid } from "../relations/information";
import { foodBalance } from "../people/nutrition";

// Food aid: clans that are short ask the clans they talk with for food, and
// those clans give if the asker is enough worse off than they are.
//
// Asking. A clan short of full nutrition asks for enough food to reach it, at
// the mix it is eating, less anything it still has spare itself. It spreads
// the request over the clans it converses with, in proportion to how much
// conversation it has with each (strength times the other clan's people).
//
// Giving. A clan gives to an asker as long as the asker has less than a
// share r of its own food per head after the gift. r is set by the donor's
// Giving trait, and by how well it knows the asker: see aidRatio. For an
// ordinary clan that knows the asker well it is 0.95; the most open-handed
// go past 1, giving until the asker is better off than they are. So a donor
// gives
//
//     min(asked, (r * F_d/p_d - F_a/p_a) / (1/p_a + r/p_d))
//
// which is the gift that brings the asker to exactly r times the donor, both
// counted per head; or nothing, if the asker is already there. Whatever that
// comes to, a donor will always give food it has beyond a full ration for
// each of its own people, F_d - p_d, so a clan with plenty never turns away
// a hungry neighbor for being only a little worse off. F is food on
// hand: what the clan is eating, plus what it has spare this year, plus what
// it could take out of store. A donor gives first from spare production,
// then from store (paying the usual cost of taking it out), and only then
// from what it was going to eat itself.
//
// Asking again. Whatever a donor refuses, the asker puts to the clans that
// have not yet refused it, again in proportion to conversation, and so on
// until it has what it asked for or everyone has refused. A refusal stands
// for the rest of the year.
//
// The algorithm runs in rounds. Each round every asker with something still
// unmet spreads it over its remaining donors, and the asks are settled one
// at a time, neediest askers first, against everyone's food as it then
// stands. An ask settled in full leaves the donor in play; one settled short
// removes it. So every round that leaves anything unmet removes at least one
// donor from that asker's list, and the whole takes at most as many rounds
// as the largest list, each costing one pass over the live asks.

// The giving ratio a clan holds to with a clan it knows well, by its Giving
// trait, as [Giving, ratio] knots. It runs straight between knots and carries
// on past the ends along the end segments, never below nothing. An ordinary
// clan gives while the asker has under 95% of its own food per head; a
// tight-fisted one only to an asker in real want; an open-handed one until
// the asker is as well off as itself, and the most open-handed past that,
// into want themselves.
export const AID_RATIO_KNOTS: readonly (readonly [number, number])[] = [
    [20, 0.4],
    [35, 0.7],
    [50, 0.95],
    [65, 1.0],
    [80, 1.1],
];

// With a clan it knows nothing of, a clan holds to the same disposition, only
// more so: a ratio short of 1 is cut by this share, and one past 1 raised by
// it. Wariness of strangers makes the careful more careful; the open-handed
// do not stop to ask.
export const AID_RATIO_STRANGER_SHIFT = 0.1;

// What it costs to take food out of store, per unit taken out.
const STOCK_RETRIEVAL_COST = 0.2;

// Below this, an amount of food is treated as nothing.
const EPSILON = 1e-6;

// Rounds are bounded by the number of donors an asker has; this only guards
// against a mistake making that unbounded.
const MAX_ROUNDS = 1000;

const FOOD_GOODS: readonly TradeGood[] = [TradeGoods.Fish, TradeGoods.Cereals];

export function aidRatioKnown(giving: number): number {
    const knots = AID_RATIO_KNOTS;
    const g = Number.isFinite(giving) ? giving : 50;
    let i = 0;
    while (i < knots.length - 2 && g > knots[i + 1][0]) ++i;
    const [g0, r0] = knots[i];
    const [g1, r1] = knots[i + 1];
    return Math.max(0, r0 + (r1 - r0) * (g - g0) / (g1 - g0));
}

export function aidRatioStranger(giving: number): number {
    const known = aidRatioKnown(giving);
    if (known < 1) return known * (1 - AID_RATIO_STRANGER_SHIFT);
    if (known > 1) return known * (1 + AID_RATIO_STRANGER_SHIFT);
    return known;
}

// Between the two, read on the square root of information, so a little
// knowledge goes a long way: at half information a clan is about 71% of the
// way from how it treats a stranger to how it treats a clan it knows well.
export function aidRatio(giving: number, information: number): number {
    const stranger = aidRatioStranger(giving);
    const known = aidRatioKnown(giving);
    return stranger + (known - stranger) * Math.sqrt(clamp(information, 0, 1));
}

export interface FoodAidBidRecord {
    requesterUuid: string;
    requesterName: string;
    donorUuid: string;
    donorName: string;
    // How much conversation the asker has with the donor, which is what its
    // asks are weighted by.
    conversationAmount: number;
    // What the donor knows of the asker, and the share of its own food per
    // head that makes it willing to give.
    information: number;
    ratio: number;
    // Rounds in which the asker put a request to this donor.
    rounds: number;
    requestedAbs: number;
    receivedAbs: number;
    requestedPerCapita: number; // In per capita of receiving clan
    receivedPerCapita: number;  // In per capita of receiving clan
    refused: boolean;
}

export interface ClanRedistributionSummary {
    clanUuid: string;
    clanName: string;
    population: number;
    // What the clan was eating before any aid.
    initialFood: number;
    initialFoodPerCapita: number;
    initialNutrition: number;
    initialStock: number;
    initialStockPerCapita: number;
    // Food on hand, as aid reckons it, before and after.
    initialOnHandPerCapita: number;
    finalOnHandPerCapita: number;
    // What it asked for in all, and what it got.
    totalRequestedAbs: number;
    totalReceivedAbs: number;
    totalRequestedPerCapita: number;     // In per capita of receiving clan
    totalReceivedPerCapita: number;      // In per capita of receiving clan
    // What others asked of it, and what it gave, by where it came from.
    totalRequestedFromAbs: number;
    totalGivenAbs: number;
    givenFromSurplusAbs: number;
    givenFromStockAbs: number;
    givenFromOwnFoodAbs: number;
    totalRequestedFromPerCapita: number; // In per capita of giving clan
    totalGivenPerCapita: number;         // In per capita of giving clan
}

export class FoodRedistributionResult {
    readonly bids: FoodAidBidRecord[] = [];
    readonly clanSummaries = new Map<string, ClanRedistributionSummary>();
    rounds = 0;
    private readonly bidIndex_ = new Map<string, FoodAidBidRecord>();

    addBid(bid: FoodAidBidRecord): void {
        this.bids.push(bid);
        this.bidIndex_.set(bidKey(bid.requesterUuid, bid.donorUuid), bid);
    }

    setClanSummary(summary: ClanRedistributionSummary): void {
        this.clanSummaries.set(summary.clanUuid, summary);
    }

    getBid(requesterUuid: string, donorUuid: string): FoodAidBidRecord | undefined {
        return this.bidIndex_.get(bidKey(requesterUuid, donorUuid));
    }

    getClanSummary(clanUuid: string): ClanRedistributionSummary | undefined {
        return this.clanSummaries.get(clanUuid);
    }
}

function bidKey(requesterUuid: string, donorUuid: string): string {
    return `${requesterUuid}|${donorUuid}`;
}

// Where a donor's food comes from, in the order it gives it.
const SourceKind = {
    Surplus: 0,
    Stock: 1,
    EatenProduction: 2,
    EatenStock: 3,
} as const;

interface Source {
    kind: typeof SourceKind[keyof typeof SourceKind];
    good: TradeGood;
    remaining: number;
}

// One clan's side of the year's aid.
interface Party {
    clan: Clan;
    pop: number;
    // Food on hand, in absolute terms; moves as food is given and received.
    onHand: number;
    // What it can actually hand over, in order. Food it has from gifts or
    // ate at the festivals counts as on hand but cannot be passed on.
    sources: Source[];
    // Still to place: asked for and neither placed with a donor this round
    // nor received.
    unmet: number;
    // Donors it may still ask, as indices into links.
    live: Link[];
    initialFood: number;
    initialNutrition: number;
    initialStock: number;
    initialOnHand: number;
    requested: number;
    received: number;
    requestedFrom: number;
    given: number;
    givenBy: [number, number, number];
}

// An asker and one clan it may ask.
interface Link {
    asker: Party;
    donor: Party;
    weight: number;
    information: number;
    ratio: number;
    rounds: number;
    requested: number;
    received: number;
    refused: boolean;
}

export function redistributeFood(allClans: Clan[]): FoodRedistributionResult {
    const result = new FoodRedistributionResult();

    // ---- Who has what ----
    const parties = new Map<string, Party>();
    for (const clan of allClans) {
        if (!(clan.population > 0)) continue;
        parties.set(clan.uuid, makeParty(clan));
    }

    // ---- Who asks whom ----
    const links: Link[] = [];
    const askers: Party[] = [];
    for (const asker of parties.values()) {
        if (!isPositive(asker.requested)) continue;
        const world = asker.clan.world;
        for (const [uuid, interactions] of world.interactions.getFor(asker.clan)) {
            if (uuid === asker.clan.uuid) continue;
            const donor = parties.get(uuid);
            if (!donor) continue;
            let strength = 0;
            for (const interaction of interactions) {
                if (interaction instanceof Conversation) strength += interaction.strength;
            }
            const weight = strength * donor.pop;
            if (!isPositive(weight)) continue;
            const information = world.perceptions
                .get(donor.clan, asker.clan)?.information.value ?? 0;
            const link: Link = {
                asker, donor, weight, information,
                ratio: aidRatio(donor.clan.traits.giving, information),
                rounds: 0, requested: 0, received: 0, refused: false,
            };
            links.push(link);
            asker.live.push(link);
        }
        if (asker.live.length) askers.push(asker);
    }

    // Neediest first, by what they have per head before any aid.
    askers.sort((a, b) => a.initialOnHand / a.pop - b.initialOnHand / b.pop);

    // ---- Rounds of asking ----
    let rounds = 0;
    const asks: { link: Link; amount: number }[] = [];
    while (rounds < MAX_ROUNDS) {
        asks.length = 0;
        for (const asker of askers) {
            if (asker.unmet <= EPSILON || !asker.live.length) continue;
            let total = 0;
            for (const link of asker.live) total += link.weight;
            for (const link of asker.live) {
                asks.push({ link, amount: asker.unmet * link.weight / total });
            }
            asker.unmet = 0;
        }
        if (!asks.length) break;
        ++rounds;

        for (const { link, amount } of asks) {
            const { asker, donor } = link;
            ++link.rounds;
            link.requested += amount;
            donor.requestedFrom += amount;

            const given = Math.min(amount, willingToGive(link), giveable(donor));
            if (given > EPSILON) transfer(link, given);

            const short = amount - Math.max(0, given);
            if (short > EPSILON * Math.max(1, amount)) {
                asker.unmet += short;
                link.refused = true;
                const i = asker.live.indexOf(link);
                if (i >= 0) {
                    asker.live[i] = asker.live[asker.live.length - 1];
                    asker.live.pop();
                }
            }
        }
    }
    result.rounds = rounds;

    // ---- What everyone will remember, and what the panels show ----
    for (const link of links) {
        if (!(link.rounds > 0)) continue;
        const { asker, donor } = link;
        if (link.received > EPSILON) {
            recordFoodAid(donor.clan, asker.clan, link.received,
                asker.initialFood / asker.pop);
        }
        result.addBid({
            requesterUuid: asker.clan.uuid,
            requesterName: asker.clan.name,
            donorUuid: donor.clan.uuid,
            donorName: donor.clan.name,
            conversationAmount: link.weight,
            information: link.information,
            ratio: link.ratio,
            rounds: link.rounds,
            requestedAbs: link.requested,
            receivedAbs: link.received,
            requestedPerCapita: link.requested / asker.pop,
            receivedPerCapita: link.received / asker.pop,
            refused: link.refused,
        });
    }

    for (const p of parties.values()) {
        result.setClanSummary({
            clanUuid: p.clan.uuid,
            clanName: p.clan.name,
            population: p.pop,
            initialFood: p.initialFood,
            initialFoodPerCapita: p.initialFood / p.pop,
            initialNutrition: p.initialNutrition,
            initialStock: p.initialStock,
            initialStockPerCapita: p.initialStock / p.pop,
            initialOnHandPerCapita: p.initialOnHand / p.pop,
            finalOnHandPerCapita: p.onHand / p.pop,
            totalRequestedAbs: p.requested,
            totalReceivedAbs: p.received,
            totalRequestedPerCapita: p.requested / p.pop,
            totalReceivedPerCapita: p.received / p.pop,
            totalRequestedFromAbs: p.requestedFrom,
            totalGivenAbs: p.given,
            givenFromSurplusAbs: p.givenBy[0],
            givenFromStockAbs: p.givenBy[1],
            givenFromOwnFoodAbs: p.givenBy[2],
            totalRequestedFromPerCapita: p.requestedFrom / p.pop,
            totalGivenPerCapita: p.given / p.pop,
        });
    }

    return result;
}

function makeParty(clan: Clan): Party {
    const pop = clan.population;
    const sources: Source[] = [];
    let spare = 0;

    // Spare production. Cereals left over would go to store, fish would be
    // wasted, so both are there to give.
    for (const good of FOOD_GOODS) {
        const remaining = clan.distribution.undistributed(good);
        if (isPositive(remaining)) {
            sources.push({ kind: SourceKind.Surplus, good, remaining });
            spare += remaining;
        }
    }

    // What could still come out of store, net of what taking it out costs.
    let initialStock = 0;
    for (const item of clan.stock.items) {
        if (!item.good.isSubsistence) continue;
        initialStock += item.amount;
        const avail = Math.max(0, item.amount - clan.stockOutflow.totalOutflow(item.good));
        const remaining = avail / (1 + STOCK_RETRIEVAL_COST);
        if (isPositive(remaining)) {
            sources.push({ kind: SourceKind.Stock, good: item.good, remaining });
            spare += remaining;
        }
    }

    // What it was going to eat itself, from its own fields and nets, then
    // from what it had already taken out of store.
    for (const good of FOOD_GOODS) {
        const remaining = clan.distribution.totalToConsumption(good);
        if (isPositive(remaining)) {
            sources.push({ kind: SourceKind.EatenProduction, good, remaining });
        }
    }
    for (const good of FOOD_GOODS) {
        const remaining = clan.stockOutflow.totalToConsumption(good);
        if (isPositive(remaining)) {
            sources.push({ kind: SourceKind.EatenStock, good, remaining });
        }
    }

    const initialFood = clan.consumption.totalFood;
    const onHand = initialFood + spare;

    // Enough to reach full nutrition at the mix it is eating, less what it
    // has spare itself.
    const nutrition = clan.nutrition;
    let requested = 0;
    if (nutrition < 1) {
        const balance = foodBalance(1 - clan.consumption.fishRatio);
        const target = balance > 0 ? pop / balance : pop;
        requested = Math.max(0, target - initialFood - spare);
    }

    return {
        clan, pop, onHand, sources,
        unmet: requested,
        live: [],
        initialFood,
        initialNutrition: nutrition,
        initialStock,
        initialOnHand: onHand,
        requested,
        received: 0,
        requestedFrom: 0,
        given: 0,
        givenBy: [0, 0, 0],
    };
}

// The most the donor will give: anything it has beyond a full ration for
// each of its people, or, if more, as much as leaves the asker with r times
// its food per head.
function willingToGive(link: Link): number {
    const { asker, donor, ratio } = link;
    const excess = donor.onHand - donor.pop;
    const gap = ratio * donor.onHand / donor.pop - asker.onHand / asker.pop;
    const share = gap > 0 ? gap / (1 / asker.pop + ratio / donor.pop) : 0;
    return Math.max(0, excess, share);
}

function giveable(party: Party): number {
    let total = 0;
    for (const s of party.sources) total += s.remaining;
    return total;
}

function transfer(link: Link, amount: number): void {
    const { asker, donor } = link;
    let left = amount;
    for (const s of donor.sources) {
        if (left <= 0) break;
        if (!(s.remaining > 0)) continue;
        const t = Math.min(s.remaining, left);
        s.remaining -= t;
        left -= t;

        const d = donor.clan;
        switch (s.kind) {
            case SourceKind.Surplus:
                d.distribution.addDonation(asker.clan, s.good, t);
                donor.givenBy[0] += t;
                break;
            case SourceKind.Stock:
                d.stockOutflow.addDonation(asker.clan, s.good, t, t * STOCK_RETRIEVAL_COST);
                donor.givenBy[1] += t;
                break;
            case SourceKind.EatenProduction:
                d.distribution.consumptionToDonation(asker.clan, s.good, t);
                d.consumption.removeProduction(s.good, t);
                donor.givenBy[2] += t;
                break;
            case SourceKind.EatenStock:
                d.stockOutflow.consumptionToDonation(asker.clan, s.good, t);
                d.consumption.removeStock(s.good, t);
                donor.givenBy[2] += t;
                break;
        }
        asker.clan.consumption.addDonation(d, s.good, t, 0);
    }

    const given = amount - left;
    donor.onHand -= given;
    donor.given += given;
    asker.onHand += given;
    asker.received += given;
    link.received += given;
}
