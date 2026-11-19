import { chooseWeighted, isPositive, removeAll, sortedByKey } from "../lib/basics";
import type { World } from "../world";
import type { Clan } from "../people/people";
import { MarriageConnection } from "./connection";
import { getPrestige } from "./prestige";
import { MarriageMemory, newHistoryEventId, type MarriageTie } from "../people/history";
import type { ClanTraits } from "../people/traits";
import {
    Demography, FEMALE, MALE, MaritalStatus, type PeopleFilter, type Sex,
} from "../people/demography";

// Marriage.
//
// Every year, the clans' unmarried women of 18 and up and men of 20 and up
// are matched clan to clan, and each match is a betrothal. For the next
// BRIDE_SERVICE_YEARS years the man lives with the clan of the woman he is
// promised to, eats at its hearths and works for it; then they marry and she
// comes to live with his clan. He is still of his own clan meanwhile, and
// counted there, but fed and worked where he serves. Women
// move to their husbands' clans -- patrilocality -- so married men and
// married women are always equal in number within a clan, which is what lets
// a death among them widow a particular spouse.
//
// The point of marriage between clans, as against within them, is in part
// that a clan that randomly has few young women would otherwise die out; the
// point of bride service is to pay a clan back with labor for the daughters
// it sends away.

// The ages from which people may marry.
export const BRIDE_MIN_AGE = 18;
export const GROOM_MIN_AGE = 20;
// Past this, no one looks for a match, first or again.
export const MARRIAGE_MAX_AGE = 45;
// Years a man works for his bride's clan before they marry.
export const BRIDE_SERVICE_YEARS = 2;
// The most years older than her husband a wife may be.
export const MAX_WIFE_SENIORITY = 2;

// The man and woman of one match, by their ages when they were promised.
export type AgePair = readonly [husbandAge: number, wifeAge: number];

// Every one of a clan's people who match a filter, by age, oldest first.
function agesOf(d: Demography, filter: PeopleFilter): number[] {
    const [from, to] = filter.ages ?? [0, 0];
    const ages: number[] = [];
    for (let age = to - 1; age >= from; --age) {
        const n = d.count({ ...filter, ages: [age, age + 1] });
        for (let k = 0; k < n; ++k) ages.push(age);
    }
    return ages;
}

// Pair as many of one clan's men with another clan's women as their ages
// allow: each man, oldest first, with the oldest woman no more than
// MAX_WIFE_SENIORITY years older than he is. Those who have waited longest
// still go first, as far as the rule lets them. Taking the oldest woman a
// man can have leaves the younger women for the younger men, who could not
// have had the older ones, so no other pairing makes more matches. Removes
// those matched from both lists.
function pairByAge(men: number[], women: number[]): AgePair[] {
    const pairs: AgePair[] = [];
    for (let i = 0; i < men.length;) {
        const m = men[i];
        const j = women.findIndex(w => w <= m + MAX_WIFE_SENIORITY);
        if (j < 0) { ++i; continue; }
        pairs.push([m, women[j]]);
        men.splice(i, 1);
        women.splice(j, 1);
    }
    return pairs;
}

// Whether any of these men could have any of these women.
function anyPairs(men: readonly number[], women: readonly number[]): boolean {
    return men.length > 0 && women.length > 0
        && women[women.length - 1] <= men[0] + MAX_WIFE_SENIORITY;
}

// Those on the market: unmarried, or widowed and young enough to marry again.
const SEEKING = [MaritalStatus.Unmarried, MaritalStatus.Widowed] as const;
export const ELIGIBLE_WOMEN: PeopleFilter = {
    sex: FEMALE, ages: [BRIDE_MIN_AGE, MARRIAGE_MAX_AGE], status: SEEKING,
};
export const ELIGIBLE_MEN: PeopleFilter = {
    sex: MALE, ages: [GROOM_MIN_AGE, MARRIAGE_MAX_AGE], status: SEEKING,
};
const BETROTHED_WOMEN: PeopleFilter = { sex: FEMALE, status: MaritalStatus.Betrothed };
const BETROTHED_MEN: PeopleFilter = { sex: MALE, status: MaritalStatus.Betrothed };

// How many proposals a clan's men make in each round of matching.
const PROPOSALS_PER_ROUND = 3;
const MAX_ROUNDS = 20;

// How long the marriages of the recent past count as recent: a generation.
export const RECENT_MARRIAGE_YEARS = 20;

// How long a clan's matches keep counting toward the averages kept of them:
// half as much after ten years, so they follow how things are going now
// rather than how they went a lifetime ago.
const MARRIAGE_RECORD_HALF_LIFE = 10;

// An average of things that happen now and then, each counting for less as
// the years pass. Undefined until there has been something to average.
export class FadingAverage {
    private sum_ = 0;
    private weight_ = 0;

    constructor(readonly halfLife: number) { }

    get value(): number | undefined {
        return this.weight_ > 1e-9 ? this.sum_ / this.weight_ : undefined;
    }

    add(value: number, weight: number = 1): void {
        this.sum_ += value * weight;
        this.weight_ += weight;
    }

    fade(years: number = 1): void {
        const kept = Math.pow(0.5, years / this.halfLife);
        this.sum_ *= kept;
        this.weight_ *= kept;
    }

    // Count another's history as this one's too, as when two clans join.
    absorb(other: FadingAverage): void {
        this.sum_ += other.sum_;
        this.weight_ += other.weight_;
    }

    clone(): FadingAverage {
        const c = new FadingAverage(this.halfLife);
        c.sum_ = this.sum_;
        c.weight_ = this.weight_;
        return c;
    }
}

// How a clan has been doing on the marriage market lately: how old its
// people were when first promised, men and women apart, and how appealing it
// found the clans it was matched with, as it saw them at the time. Both
// sides of a match count: the clans its men took wives from, and the clans
// its daughters were promised into.
export class ClanMarriageRecord {
    // By sex: FEMALE, MALE.
    readonly firstMatchAge: readonly [FadingAverage, FadingAverage];
    readonly partnerAppeal: FadingAverage;

    constructor(
        firstMatchAge?: readonly [FadingAverage, FadingAverage],
        partnerAppeal?: FadingAverage,
    ) {
        this.firstMatchAge = firstMatchAge ?? [
            new FadingAverage(MARRIAGE_RECORD_HALF_LIFE),
            new FadingAverage(MARRIAGE_RECORD_HALF_LIFE),
        ];
        this.partnerAppeal = partnerAppeal ?? new FadingAverage(MARRIAGE_RECORD_HALF_LIFE);
    }

    fade(): void {
        for (const a of this.firstMatchAge) a.fade();
        this.partnerAppeal.fade();
    }

    absorb(other: ClanMarriageRecord): void {
        this.firstMatchAge.forEach((a, sex) => a.absorb(other.firstMatchAge[sex]));
        this.partnerAppeal.absorb(other.partnerAppeal);
    }

    clone(): ClanMarriageRecord {
        return new ClanMarriageRecord(
            [this.firstMatchAge[FEMALE].clone(), this.firstMatchAge[MALE].clone()],
            this.partnerAppeal.clone());
    }
}

// Children take after both parents, by birth or by upbringing, and a clan's
// mothers come from the clans its wives came from. In a generation about
// half a clan is replaced by people formed half by their fathers, of the
// clan, and half by their mothers, of the clans it married into: so a
// generation moves the clan's inherited traits a quarter of the way toward
// its wives' clans. This is that, a year at a time.
export const MATERNAL_TRAITS_PER_GENERATION = 0.25;
const MATERNAL_TRAITS_PER_YEAR =
    1 - Math.pow(1 - MATERNAL_TRAITS_PER_GENERATION, 1 / RECENT_MARRIAGE_YEARS);

// What is left of the tie of a marriage after a year. Halves in 20 years,
// so that with no new marriages it has stopped counting within 3-6
// generations.
const MARRIAGE_TIE_RETENTION = Math.pow(0.5, 1 / 20);
const MARRIAGE_TIE_MIN = 0.03;

// Men of one clan promised to women of another, all from the same year's
// matching, and how much of their service they have done.
export class Betrothal {
    yearsServed = 0;

    constructor(
        public husbandClan: Clan,
        public wifeClan: Clan,
        public count: number,
        readonly year: number,
        // Who was promised to whom, by their ages at the time, so that the
        // same pairs marry when the service is done.
        public pairs: AgePair[] = [],
    ) { }

    get yearsLeft(): number {
        return Math.max(0, BRIDE_SERVICE_YEARS - this.yearsServed);
    }
}

// Matches by clan pair: subject clan -> object clan -> count.
export class PairingCounts {
    counts: Map<Clan, Map<Clan, number>> = new Map();

    get(subject: Clan, object: Clan): number {
        return this.counts.get(subject)?.get(object) ?? 0;
    }

    // Both ways, for when it doesn't matter who married whose daughters.
    add(clan1: Clan, clan2: Clan, count: number = 1) {
        this.addOneWay(clan1, clan2, count);
        this.addOneWay(clan2, clan1, count);
    }

    addOneWay(subject: Clan, object: Clan, count: number) {
        let m = this.counts.get(subject);
        if (!m) {
            m = new Map();
            this.counts.set(subject, m);
        }
        m.set(object, (m.get(object) ?? 0) + count);
    }

    // A clan that is gone is matched with no one.
    forget(clan: Clan): void {
        this.counts.delete(clan);
        for (const m of this.counts.values()) m.delete(clan);
    }

    *entries(): Iterable<[Clan, Clan, number]> {
        for (const [subject, m] of this.counts) {
            for (const [object, count] of m) yield [subject, object, count];
        }
    }
}

// One side of a clan's year on the marriage market: how many of its people
// were looking, and where they were promised.
export class PotentialPartnerSet {
    marriedTo: Map<Clan, number> = new Map();
    // The pairs made with each clan, by age. Kept on the women's side.
    agePairs: Map<Clan, AgePair[]> = new Map();
    taken = 0;

    constructor(
        readonly clan: Clan,
        readonly count: number,
        // The ages of those still unpromised, oldest first.
        readonly ages: number[] = [],
    ) {
    }

    addMarriage(clan: Clan, count: number = 1) {
        this.marriedTo.set(clan, (this.marriedTo.get(clan) ?? 0) + count);
        this.taken += count;
    }

    addPairs(clan: Clan, pairs: readonly AgePair[]) {
        const list = this.agePairs.get(clan);
        if (list) list.push(...pairs);
        else this.agePairs.set(clan, [...pairs]);
    }

    get available() { return this.count - this.taken; }
}

// A year of marriage.
export class MarriageDecisions {
    constructor(
        // Each clan's eligible women, and the clans of the men they were
        // promised to this year.
        readonly potentialWives: PotentialPartnerSet[],
        // Each clan's eligible men, and the clans of the women they were
        // promised to this year.
        readonly potentialHusbands: PotentialPartnerSet[],
        // This year's betrothals, both ways.
        readonly pairingCounts: PairingCounts,
        // Betrothals of the last RECENT_MARRIAGE_YEARS years, this one
        // included: both ways, and by husband's clan -> wife's clan.
        readonly recent: PairingCounts = new PairingCounts(),
        readonly recentByHusband: PairingCounts = new PairingCounts(),
        // Marriages made this year, as betrothals came to the end of their
        // service, by husband's clan -> wife's clan.
        readonly completed: PairingCounts = new PairingCounts(),
    ) { }

    wivesOf(clan: { uuid: string }): PotentialPartnerSet | undefined {
        return this.potentialWives.find(s => s.clan.uuid === clan.uuid);
    }

    husbandsOf(clan: { uuid: string }): PotentialPartnerSet | undefined {
        return this.potentialHusbands.find(s => s.clan.uuid === clan.uuid);
    }
}

// Marriage appeal is a clan's prestige in the eyes of the proposing clan.
function getMarriageAppeal(subject: Clan, object: Clan): number {
    return getPrestige(subject, object);
}

// The year's marriages, run before the population advances so that the
// year's births come of this year's married women.
export function marry(world: World): void {
    const completed = completeBetrothals(world);
    decayMarriageTies(world);
    strengthenMarriageTies(world, completed);

    for (const clan of world.allClans) clan.marriageRecord.fade();
    const decisions = getMarriageDecisions(world);
    betroth(world, decisions);
    rememberMarriages(world, decisions, completed);
    world.lastMarriageDecisions = decisions;
    inheritFromMothers(world, decisions);

    startServiceYear(world);
}

// Match each clan's eligible men with other clans' eligible women. The
// algorithm is a variant of Gale-Shapley, by clan rather than by person: in
// each round, clans with unmatched men propose to the clans they find most
// appealing that still have women to promise, and each of those takes the
// most appealing offers it has, up to the women it has. No one marries
// within their own clan, and no wife is more than MAX_WIFE_SENIORITY years
// older than her husband: a clan only proposes where one of its men could
// have one of the women, and an offer is worth as many pairs as the ages
// allow.
//
// Changes nothing: what it decides is carried out by betroth().
export function getMarriageDecisions(world: World): MarriageDecisions {
    const clans = world.allClans;
    const husbands = new Map<Clan, PotentialPartnerSet>();
    const wives = new Map<Clan, PotentialPartnerSet>();
    for (const clan of clans) {
        const men = agesOf(clan.demography, ELIGIBLE_MEN);
        const women = agesOf(clan.demography, ELIGIBLE_WOMEN);
        husbands.set(clan, new PotentialPartnerSet(clan, men.length, men));
        wives.set(clan, new PotentialPartnerSet(clan, women.length, women));
    }

    // Each clan's ranking of the others as wife-givers, worked out once
    // rather than every round.
    const wifeClans = clans.filter(c => wives.get(c)!.count > 0);
    const rankings = new Map<Clan, Clan[]>();
    for (const clan of clans) {
        if (husbands.get(clan)!.count === 0) continue;
        rankings.set(clan, sortedByKey(
            wifeClans.filter(w => w !== clan),
            w => -getMarriageAppeal(clan, w)));
    }
    const appealToWives = new Map<Clan, Map<Clan, number>>();
    const appealTo = (wifeClan: Clan, husbandClan: Clan): number => {
        let m = appealToWives.get(wifeClan);
        if (!m) appealToWives.set(wifeClan, m = new Map());
        let a = m.get(husbandClan);
        if (a === undefined) m.set(husbandClan, a = getMarriageAppeal(wifeClan, husbandClan));
        return a;
    };

    const pairingCounts = new PairingCounts();
    for (let round = 0; round < MAX_ROUNDS; ++round) {
        const proposals = new Map<Clan, Clan[]>();
        for (const [husbandClan, ranking] of rankings) {
            if (husbands.get(husbandClan)!.available <= 0) continue;
            const men = husbands.get(husbandClan)!.ages;
            let made = 0;
            for (const wifeClan of ranking) {
                if (made === PROPOSALS_PER_ROUND) break;
                if (!anyPairs(men, wives.get(wifeClan)!.ages)) continue;
                let list = proposals.get(wifeClan);
                if (!list) proposals.set(wifeClan, list = []);
                list.push(husbandClan);
                ++made;
            }
        }
        if (proposals.size === 0) break;

        let matched = 0;
        for (const [wifeClan, proposers] of proposals) {
            const wifeSet = wives.get(wifeClan)!;
            for (const husbandClan of sortedByKey(proposers, h => -appealTo(wifeClan, h))) {
                if (!isPositive(wifeSet.available)) break;
                const husbandSet = husbands.get(husbandClan)!;
                const pairs = pairByAge(husbandSet.ages, wifeSet.ages);
                const count = pairs.length;
                if (count <= 0) continue;
                wifeSet.addMarriage(husbandClan, count);
                wifeSet.addPairs(husbandClan, pairs);
                husbandSet.addMarriage(wifeClan, count);
                pairingCounts.add(husbandClan, wifeClan, count);
                matched += count;
            }
        }
        if (matched === 0) break;
    }

    return new MarriageDecisions(
        [...wives.values()], [...husbands.values()], pairingCounts);
}

// Promise the matched people to each other: the very ones paired. Each clan
// notes the match in its marriage record: the age of anyone of its own never
// promised before, and how it rates the clan it is matched with.
function betroth(world: World, decisions: MarriageDecisions): void {
    // Whoever is taken goes into the record if they had never married.
    const promise = (clan: Clan, sex: Sex, filter: PeopleFilter, age: number) => {
        const taken = clan.demography.take(1, { ...filter, ages: [age, age + 1] });
        if (taken.count({ status: MaritalStatus.Unmarried }) > 0) {
            clan.marriageRecord.firstMatchAge[sex].add(age);
        }
        clan.demography.mergeAs(taken, MaritalStatus.Betrothed);
    };
    for (const wifeSet of decisions.potentialWives) {
        const wifeClan = wifeSet.clan;
        for (const [husbandClan, pairs] of wifeSet.agePairs) {
            for (const [h, w] of pairs) {
                promise(wifeClan, FEMALE, ELIGIBLE_WOMEN, w);
                promise(husbandClan, MALE, ELIGIBLE_MEN, h);
            }
            husbandClan.marriageRecord.partnerAppeal.add(
                getMarriageAppeal(husbandClan, wifeClan), pairs.length);
            wifeClan.marriageRecord.partnerAppeal.add(
                getMarriageAppeal(wifeClan, husbandClan), pairs.length);
            world.betrothals.push(new Betrothal(
                husbandClan, wifeClan, pairs.length, world.year.value, [...pairs]));
        }
    }
}

// Each betrothal still standing serves another year, and the clans' labor
// for the year is reckoned from them: men away working for their brides'
// clans, and men here working for this one.
function startServiceYear(world: World): void {
    for (const clan of world.allClans) {
        clan.brideServiceOut = new Map();
        clan.brideServiceIn = new Map();
    }
    for (const b of world.betrothals) {
        ++b.yearsServed;
        const out = b.husbandClan.brideServiceOut;
        out.set(b.wifeClan, (out.get(b.wifeClan) ?? 0) + b.count);
        const inn = b.wifeClan.brideServiceIn;
        inn.set(b.husbandClan, (inn.get(b.husbandClan) ?? 0) + b.count);
    }
}

// Betrothals whose service is done become marriages: the brides come to
// their husbands' clans, and both are married. Returns the marriages made,
// by husband's clan -> wife's clan.
function completeBetrothals(world: World): PairingCounts {
    const completed = new PairingCounts();
    for (const b of world.betrothals) {
        if (b.yearsServed < BRIDE_SERVICE_YEARS) continue;
        const { husbandClan, wifeClan } = b;
        // Each pair marries: the man and woman of the ages promised, older
        // now by the years served. Should one of them not be there to find
        // -- a death that broke a different pair than the one it was in --
        // the nearest in age stands in, as long as the rule still holds.
        let n = 0;
        let freed = 0;
        for (const [h0, w0] of b.pairs) {
            const h = takeBetrothedNear(husbandClan, MALE, h0 + b.yearsServed, Infinity);
            if (h === undefined) continue;
            const w = takeBetrothedNear(
                wifeClan, FEMALE, w0 + b.yearsServed, h + MAX_WIFE_SENIORITY);
            if (w === undefined) {
                // No bride for him after all: he is free again.
                husbandClan.demography.add(MALE, h, MaritalStatus.Unmarried, 1);
                ++freed;
                continue;
            }
            husbandClan.demography.add(MALE, h, MaritalStatus.Married, 1);
            husbandClan.demography.add(FEMALE, w, MaritalStatus.Married, 1);
            ++n;
        }
        if (n > 0) completed.addOneWay(husbandClan, wifeClan, n);
        // Anyone left over lost their partner without the betrothal hearing
        // of it; they are free again.
        releaseBetrothed(wifeClan, FEMALE, b.count - n);
        releaseBetrothed(husbandClan, MALE, b.count - n - freed);
        b.count = 0;
    }
    removeAll(world.betrothals, b => b.count === 0);
    rememberWeddings(world, completed);
    return completed;
}

// Each clan in the year's weddings remembers them: one memory for the year,
// with the wives it took in and the daughters it sent out.
function rememberWeddings(world: World, completed: PairingCounts): void {
    const ties = new Map<Clan, { wivesFrom: MarriageTie[], daughtersTo: MarriageTie[] }>();
    const of = (clan: Clan) => {
        let t = ties.get(clan);
        if (!t) ties.set(clan, t = { wivesFrom: [], daughtersTo: [] });
        return t;
    };
    for (const [husbandClan, wifeClan, count] of completed.entries()) {
        if (husbandClan === wifeClan) continue;
        of(husbandClan).wivesFrom.push({ otherName: wifeClan.name, otherUuid: wifeClan.uuid, count });
        of(wifeClan).daughtersTo.push({ otherName: husbandClan.name, otherUuid: husbandClan.uuid, count });
    }
    for (const [clan, { wivesFrom, daughtersTo }] of ties) {
        clan.history.recordMarriages(new MarriageMemory(
            newHistoryEventId(), world.year.value, 0, wivesFrom, daughtersTo));
    }
}

// Take one of a clan's betrothed of a sex out of its people, as near the
// given age as there is one, and no older than `maxAge`. Returns their age,
// or undefined if there is no one to take.
function takeBetrothedNear(
    clan: Clan, sex: Sex, age: number, maxAge: number,
): number | undefined {
    const d = clan.demography;
    const filter = sex === FEMALE ? BETROTHED_WOMEN : BETROTHED_MEN;
    let best: number | undefined;
    d.forEach((s, a, status, count) => {
        if (s !== sex || status !== MaritalStatus.Betrothed || count <= 0) return;
        if (a > maxAge) return;
        if (best === undefined || Math.abs(a - age) < Math.abs(best - age)) best = a;
    });
    if (best === undefined) return undefined;
    d.take(1, { ...filter, ages: [best, best + 1] });
    return best;
}

// Up to n of a clan's betrothed of the given sex go back to being unmarried.
function releaseBetrothed(clan: Clan, sex: Sex, n: number): void {
    const filter = sex === FEMALE ? BETROTHED_WOMEN : BETROTHED_MEN;
    const k = Math.min(n, clan.demography.count(filter));
    if (k > 0) {
        clan.demography.mergeAs(
            clan.demography.take(k, filter, 'random'), MaritalStatus.Unmarried);
    }
}

// One of a clan's betrothed of the given sex, as near the given age as there
// is one, goes back to being unmarried.
function releaseBetrothedNear(clan: Clan, sex: Sex, age: number | undefined): void {
    if (age === undefined) {
        releaseBetrothed(clan, sex, 1);
        return;
    }
    const found = takeBetrothedNear(clan, sex, age, Infinity);
    if (found !== undefined) clan.demography.add(sex, found, MaritalStatus.Unmarried, 1);
}

// People of a clan who died while betrothed, by sex. Each death ends one of
// the clan's betrothals on that side, and the one promised is free again.
export function breakBetrothals(world: World, clan: Clan, deaths: readonly number[]): void {
    for (const sex of [FEMALE, MALE] as const) {
        for (let n = 0; n < deaths[sex]; ++n) {
            const own = world.betrothals.filter(b =>
                b.count > 0 && (sex === FEMALE ? b.wifeClan : b.husbandClan) === clan);
            if (own.length === 0) break;
            const b = chooseWeighted(own, b => b.count);
            --b.count;
            // Which pair the dead one was in is not known, only the side;
            // one of the betrothal's pairs is let go.
            const [pair] = b.pairs.splice(Math.floor(Math.random() * b.pairs.length), 1);
            if (sex === FEMALE) {
                releaseBetrothedNear(b.husbandClan, MALE, pair && pair[0] + b.yearsServed);
            } else {
                releaseBetrothedNear(b.wifeClan, FEMALE, pair && pair[1] + b.yearsServed);
            }
        }
    }
    removeAll(world.betrothals, b => b.count === 0);
}

// A clan that is gone keeps no promises: everyone promised to one of its
// people goes back to being unmarried.
export function dropBetrothals(world: World, clan: Clan): void {
    for (const b of world.betrothals) {
        if (b.husbandClan === clan) releaseBetrothed(b.wifeClan, FEMALE, b.count);
        else if (b.wifeClan === clan) releaseBetrothed(b.husbandClan, MALE, b.count);
        else continue;
        b.count = 0;
    }
    removeAll(world.betrothals, b => b.count === 0);
}

// When one clan takes in another, its promises come with it.
export function transferBetrothals(world: World, from: Clan, to: Clan): void {
    for (const b of world.betrothals) {
        if (b.husbandClan === from) b.husbandClan = to;
        if (b.wifeClan === from) b.wifeClan = to;
    }
}

function decayMarriageTies(world: World): void {
    // Collect the faded-out ones before removing any, since removing the
    // last connection on a pair drops the edge the walk is standing on.
    const faded: [string, string, MarriageConnection][] = [];
    for (const [u1, u2, connections] of world.connections.pairs()) {
        for (const connection of connections) {
            if (connection instanceof MarriageConnection) {
                connection.relatedness *= MARRIAGE_TIE_RETENTION;
                if (connection.relatedness < MARRIAGE_TIE_MIN) {
                    faded.push([u1, u2, connection]);
                }
            }
        }
    }
    for (const [u1, u2, connection] of faded) {
        world.connections.removeItem(u1, u2, connection);
    }
}

// Each marriage ties the two clans closer, by the share of the generation
// it is of each.
function strengthenMarriageTies(world: World, completed: PairingCounts): void {
    for (const [husbandClan, wifeClan, count] of completed.entries()) {
        if (husbandClan === wifeClan) continue;
        for (const [c1, c2] of [[husbandClan, wifeClan], [wifeClan, husbandClan]]) {
            const connection = world.connections.getOrCreate(c1, c2, MarriageConnection);
            connection.relatedness = Math.min(1,
                connection.relatedness + 0.5 * count / Math.max(1, c1.population));
        }
    }
}

// Keep the last generation of betrothals, for what the recent marriages
// between clans were.
function rememberMarriages(
    world: World, decisions: MarriageDecisions, completed: PairingCounts,
): void {
    const thisYear = new PairingCounts();
    for (const wifeSet of decisions.potentialWives) {
        for (const [husbandClan, count] of wifeSet.marriedTo) {
            thisYear.addOneWay(husbandClan, wifeSet.clan, count);
        }
    }
    world.marriageHistory.push(thisYear);
    while (world.marriageHistory.length > RECENT_MARRIAGE_YEARS) world.marriageHistory.shift();

    const living = new Set(world.allClans);
    for (const year of world.marriageHistory) {
        for (const [husbandClan, wifeClan, count] of year.entries()) {
            if (!living.has(husbandClan) || !living.has(wifeClan)) continue;
            decisions.recent.add(husbandClan, wifeClan, count);
            decisions.recentByHusband.addOneWay(husbandClan, wifeClan, count);
        }
    }
    for (const [husbandClan, wifeClan, count] of completed.entries()) {
        decisions.completed.addOneWay(husbandClan, wifeClan, count);
    }
}

// Each clan's inherited traits move toward those of the clans its wives of
// the last generation came from, weighted by how many came from each. Every
// clan moves toward the others as they stood at the start of the year.
function inheritFromMothers(world: World, decisions: MarriageDecisions): void {
    const moves: [Clan, { traits: ClanTraits, weight: number }[]][] = [];
    for (const clan of world.allClans) {
        const wives = decisions.recentByHusband.counts.get(clan);
        if (!wives) continue;
        const mix = [...wives]
            .filter(([wifeClan, count]) => wifeClan !== clan && count > 0)
            .map(([wifeClan, count]) => ({ traits: wifeClan.traits.clone(), weight: count }));
        if (mix.length > 0) moves.push([clan, mix]);
    }
    for (const [clan, mix] of moves) clan.traits.blendToward(mix, MATERNAL_TRAITS_PER_YEAR);
}

// Who the world's first clans have married, as they stand when it begins:
// most women of 20 to 59 are married, to men of 22 to 64, and those left
// unmarried in old age are taken as widowed.
export function settleInitialMarriages(d: Demography): void {
    const wifeFilter: PeopleFilter = { sex: FEMALE, ages: [20, 60], status: MaritalStatus.Unmarried };
    const husbandFilter: PeopleFilter = { sex: MALE, ages: [22, 65], status: MaritalStatus.Unmarried };
    const n = Math.min(Math.round(0.9 * d.count(wifeFilter)), d.count(husbandFilter));
    d.mergeAs(d.take(n, wifeFilter), MaritalStatus.Married);
    d.mergeAs(d.take(n, husbandFilter), MaritalStatus.Married);

    const widowFilters: PeopleFilter[] = [
        { sex: FEMALE, ages: [60, 100], status: MaritalStatus.Unmarried },
        { sex: MALE, ages: [65, 100], status: MaritalStatus.Unmarried },
    ];
    for (const filter of widowFilters) {
        d.mergeAs(d.take(d.count(filter), filter), MaritalStatus.Widowed);
    }
}

// Where a group of people stand as to marriage, for display.
export interface MarriageCounts {
    eligibleWomen: number;
    eligibleMen: number;
    betrothedWomen: number;
    betrothedMen: number;
    // Married women, who are as many as married men within a clan.
    marriedCouples: number;
    widowed: number;
}

export function marriageCountsOf(d: Demography): MarriageCounts {
    return {
        eligibleWomen: d.count(ELIGIBLE_WOMEN),
        eligibleMen: d.count(ELIGIBLE_MEN),
        betrothedWomen: d.count(BETROTHED_WOMEN),
        betrothedMen: d.count(BETROTHED_MEN),
        marriedCouples: d.count({ sex: FEMALE, status: MaritalStatus.Married }),
        widowed: d.count({ status: MaritalStatus.Widowed }),
    };
}

// A clan on the other end of some bride service, as a snapshot can keep it.
export interface ServicePartner {
    uuid: string;
    name: string;
    count: number;
}

export function servicePartners(m: ReadonlyMap<Clan, number>): ServicePartner[] {
    return sortedByKey([...m], ([clan]) => clan.name)
        .map(([clan, count]) => ({ uuid: clan.uuid, name: clan.name, count }));
}

// A betrothal, as a snapshot can keep it.
export interface BetrothalRecord {
    husbandClan: { uuid: string, name: string };
    wifeClan: { uuid: string, name: string };
    count: number;
    year: number;
    yearsServed: number;
    yearsLeft: number;
}

export function betrothalRecord(b: Betrothal): BetrothalRecord {
    return {
        husbandClan: { uuid: b.husbandClan.uuid, name: b.husbandClan.name },
        wifeClan: { uuid: b.wifeClan.uuid, name: b.wifeClan.name },
        count: b.count,
        year: b.year,
        yearsServed: b.yearsServed,
        yearsLeft: b.yearsLeft,
    };
}
