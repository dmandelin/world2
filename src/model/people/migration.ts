import { dice, sumFun } from "../lib/basics";
import type { Clan } from "./people";
import { randomHamletName } from "./names";
import { Settlement } from "./settlement";
import { SettlementCluster } from "./cluster";
import { getAlignment } from "../relations/alignment";
import { TRAIT_SD } from "./traits";
import { DecisionEffects } from "../decision";
import type { World } from "../world";

// Going off to found a new village.
//
// Every year, in every village, each clan weighs up how appealing it would
// be to go off with some of the others and found a village of their own.
// The appeal is a sum of four things:
//
//   - the size of the new village, as log(people / a reference size): a
//     handful of clans can make a go of it where one alone cannot;
//   - the change in Favor from leaving: whatever the village's past
//     decisions are doing to the clan, for good or ill, it leaves behind,
//     and starts again at 0;
//   - how well it gets on with the people who would be going, as its
//     average alignment toward them;
//   - a small random value of its own, rolled once a year.
//
// One clan can't know what the others will do, so the village feels its way
// there over a few rounds. In the first, each clan supposes a third of the
// village would go, and goes by how it gets on with the village as a whole;
// after that it looks at who said they were interested last round. Clans say
// they're interested when the appeal is above 0, but no more than
// FOUNDING_MAX_SHARE of them, those keenest to go. Everyone gets a bonus in
// the early rounds that falls away round by round and is gone in the last,
// so that clans can show an interest before they know who else might.
// Whoever is still interested in the last round goes. A round in which
// nobody is interested ends it there, and nobody goes.

// The constant part of the appeal: where leaving starts from before any of
// the rest is counted.
export const FOUNDING_BASE = -7;
// Per unit of log(people in the new village / the reference size). Measured
// from a reference rather than from one person, so that what personality
// does to the weight moves the appeal of a village bigger or smaller than
// that, and not the appeal of leaving at all.
export const FOUNDING_POPULATION_COEFFICIENT = 4;
export const FOUNDING_REFERENCE_POPULATION = 60;
// Per point of Favor gained by leaving it behind.
export const FOUNDING_FAVOR_COEFFICIENT = 0.15;
// Per unit of average alignment toward the people going.
export const FOUNDING_ALIGNMENT_COEFFICIENT = 3;
// The random value is (d6 - d6) times this: -5 to +5 at most, and most
// often near 0.
export const FOUNDING_RANDOM_SCALE = 0.4;

// The early rounds' bonus, and how it falls away.
export const FOUNDING_ROUND_BONUS = 2;
export const FOUNDING_ROUND_BONUS_DECAY = 0.5;
// Rounds in all; the last has no bonus.
export const FOUNDING_ROUNDS = 5;

// How many of the clans will say they're interested at most in any round.
export const FOUNDING_MAX_SHARE = 0.45;
// Fewer than this many clans still interested at the end, and nobody goes.
// Without it, a village small enough that only one clan may be interested
// tends to see-saw: one clan is keen, the next round another is keen to go
// with it while the first, picturing itself alone, is not, and whichever
// holds the last round goes off by itself.
export const FOUNDING_MIN_CLANS = 2;
// In the first round, what share of the village a clan supposes would go.
export const FOUNDING_FIRST_ROUND_SHARE = 1 / 3;

// How personality moves the weights: each is a factor per standard
// deviation of the trait from 50.
export const FOUNDING_INTELLECT_RANDOM = 0.7;
export const FOUNDING_INTELLECT_POPULATION = 0.85;
export const FOUNDING_SOCIABILITY_POPULATION = 1.25;
export const FOUNDING_TENDERNESS_FAVOR = 1.25;
export const FOUNDING_TENDERNESS_ALIGNMENT = 1.25;
export const FOUNDING_PEACEABLENESS_FAVOR = 0.8;

function perSD(factor: number, trait: number): number {
    return Math.pow(factor, (trait - 50) / TRAIT_SD);
}

export function foundingRoundBonus(round: number): number {
    return round >= FOUNDING_ROUNDS - 1
        ? 0
        : FOUNDING_ROUND_BONUS * Math.pow(FOUNDING_ROUND_BONUS_DECAY, round);
}

// What a clan's personality makes of each part of the appeal.
export class FoundingWeights {
    readonly intellect: number;
    readonly sociability: number;
    readonly tenderness: number;
    readonly peaceableness: number;

    readonly randomFactor: number;
    readonly population: number;
    readonly favor: number;
    readonly alignment: number;

    constructor(clan: Clan) {
        const t = clan.traits;
        this.intellect = t.intellect;
        this.sociability = t.sociability;
        this.tenderness = t.tenderness;
        this.peaceableness = t.peaceableness;

        this.randomFactor = perSD(FOUNDING_INTELLECT_RANDOM, this.intellect);
        this.population = FOUNDING_POPULATION_COEFFICIENT
            * perSD(FOUNDING_INTELLECT_POPULATION, this.intellect)
            * perSD(FOUNDING_SOCIABILITY_POPULATION, this.sociability);
        this.favor = FOUNDING_FAVOR_COEFFICIENT
            * perSD(FOUNDING_TENDERNESS_FAVOR, this.tenderness)
            * perSD(FOUNDING_PEACEABLENESS_FAVOR, this.peaceableness);
        this.alignment = FOUNDING_ALIGNMENT_COEFFICIENT
            * perSD(FOUNDING_TENDERNESS_ALIGNMENT, this.tenderness);
    }
}

// One clan's appeal in one round, part by part.
export class FoundingAppeal {
    readonly populationTerm: number;
    readonly favorTerm: number;
    readonly alignmentTerm: number;
    readonly value: number;
    // Said it was interested: the appeal was above 0 and it was among the
    // keenest.
    interested = false;
    // The appeal was above 0, but too many were keener.
    crowdedOut = false;

    constructor(
        readonly round: number,
        weights: FoundingWeights,
        // The people it supposes would make up the new village.
        readonly expectedPopulation: number,
        readonly favorChange: number,
        // Average alignment toward the people going, and who they are
        // supposed to be: the whole village, or those interested last round.
        readonly alignment: number,
        readonly alignmentBasis: 'village' | 'interested',
        readonly random: number,
        readonly bonus: number,
    ) {
        this.populationTerm = weights.population
            * Math.log(Math.max(1, expectedPopulation) / FOUNDING_REFERENCE_POPULATION);
        this.favorTerm = weights.favor * favorChange;
        this.alignmentTerm = weights.alignment * alignment;
        this.value = FOUNDING_BASE + this.populationTerm + this.favorTerm
            + this.alignmentTerm + random + bonus;
    }
}

// One clan's part in the year's question.
export class FoundingVote {
    readonly clanName: string;
    readonly population: number;
    readonly weights: FoundingWeights;
    // The year's roll, before and after intellect.
    readonly roll: number;
    readonly random: number;
    // Favor now, and so what leaving would change it by.
    readonly favor: number;
    readonly rounds: FoundingAppeal[] = [];
    // Going, or would have gone with migration turned off.
    goes = false;
    prevented = false;

    constructor(readonly clan: Clan) {
        this.clanName = clan.name;
        this.population = clan.population;
        this.weights = new FoundingWeights(clan);
        this.roll = dice(1, 6, 0) - dice(1, 6, 0);
        this.random = this.roll * FOUNDING_RANDOM_SCALE * this.weights.randomFactor;
        this.favor = clan.decisionFavorability;
    }

    get favorChange(): number {
        return -this.favor;
    }

    get final(): FoundingAppeal | undefined {
        return this.rounds[this.rounds.length - 1];
    }

    get everInterested(): boolean {
        return this.rounds.some(r => r.interested);
    }
}

// A village's question for the year: who, if anyone, goes off to found a
// new one.
export class FoundingDecision {
    readonly year: number;
    readonly settlementName: string;
    readonly votes: FoundingVote[];
    // Who said they were interested in each round, and how many people that
    // came to.
    readonly interested: Clan[][] = [];
    readonly interestedPeople: number[] = [];
    readonly maxInterested: number;
    founders: Clan[] = [];
    prevented = false;

    constructor(readonly settlement: Settlement) {
        this.year = settlement.world.year.value;
        this.settlementName = settlement.name;
        this.votes = settlement.clans.map(c => new FoundingVote(c));
        this.maxInterested = Math.floor(FOUNDING_MAX_SHARE * this.votes.length);
        this.run();
    }

    voteOf(clan: Clan): FoundingVote | undefined {
        return this.votes.find(v => v.clan === clan);
    }

    private run() {
        const villagePopulation = this.settlement.population;
        let last: Clan[] = [];
        for (let round = 0; round < FOUNDING_ROUNDS; ++round) {
            const bonus = foundingRoundBonus(round);
            const appeals = this.votes.map(v => {
                let expectedPopulation: number;
                let alignment: number;
                let basis: 'village' | 'interested';
                if (round === 0) {
                    expectedPopulation = villagePopulation * FOUNDING_FIRST_ROUND_SHARE;
                    alignment = averageAlignment(v.clan, this.settlement.clans);
                    basis = 'village';
                } else {
                    // The ones interested last round, and itself.
                    const going = last.includes(v.clan) ? last : [...last, v.clan];
                    expectedPopulation = sumFun(going, c => c.population);
                    alignment = averageAlignment(v.clan, going);
                    basis = 'interested';
                }
                const appeal = new FoundingAppeal(
                    round, v.weights, expectedPopulation, v.favorChange,
                    alignment, basis, v.random, bonus);
                v.rounds.push(appeal);
                return { v, appeal };
            });

            const keen = appeals
                .filter(a => a.appeal.value > 0)
                .sort((a, b) => b.appeal.value - a.appeal.value);
            keen.forEach((a, i) => {
                if (i < this.maxInterested) a.appeal.interested = true;
                else a.appeal.crowdedOut = true;
            });
            last = keen.slice(0, this.maxInterested).map(a => a.v.clan);
            this.interested.push(last);
            this.interestedPeople.push(sumFun(last, c => c.population));
            // Nobody interested, and there is nothing more to talk about.
            if (last.length === 0) break;
        }

        this.founders = last.length >= FOUNDING_MIN_CLANS ? last : [];
        const world = this.settlement.world;
        this.prevented = this.founders.length > 0 && world.migrationsPrevented;
        for (const v of this.votes) {
            const going = this.founders.includes(v.clan);
            v.goes = going && !this.prevented;
            v.prevented = going && this.prevented;
        }
    }
}

// Population-weighted, over the other clans: how it gets on with the
// people, rather than with the clans as clans.
function averageAlignment(clan: Clan, among: readonly Clan[]): number {
    const others = among.filter(c => c !== clan);
    const total = sumFun(others, c => c.population);
    if (!(total > 0)) return 0;
    return sumFun(others, c => c.population * getAlignment(clan, c)) / total;
}

export class PlannedSettlement {
    constructor(
        readonly name: string,
        readonly x: number,
        readonly y: number,
        readonly cluster: SettlementCluster,
        readonly parent: Settlement,
        readonly clans: Clan[]
    ) { }
}

export function planMigration(world: World) {
    world.plannedSettlements = [];
    for (const settlement of world.allSettlements) {
        if (settlement.clans.length === 0) {
            settlement.foundingDecision = undefined;
            continue;
        }
        const decision = new FoundingDecision(settlement);
        settlement.foundingDecision = decision;
        for (const v of decision.votes) v.clan.foundingVote = v;

        if (decision.founders.length && !decision.prevented) {
            const [x, y] = settlement.cluster.placer_.placeFor();
            world.plannedSettlements.push(new PlannedSettlement(
                randomHamletName(), x, y, settlement.cluster, settlement,
                [...decision.founders]));
        }
    }
}

export function migrate(world: World) {
    for (const clan of world.allClans) {
        clan.previousSettlement_ = clan.settlement;
    }

    world.lastFoundations = [];
    for (const planned of world.plannedSettlements) {
        // Clans can die out or be taken in between planning and going.
        const clans = planned.clans.filter(c => c.population > 0 && c.settlement === planned.parent);
        if (clans.length === 0) continue;

        const newSettlement = new Settlement(world, planned.name, planned.x, planned.y, planned.cluster, planned.parent);
        for (const clan of clans) {
            clan.moveTo(newSettlement);
            // A fresh start: what the old village's decisions were doing to
            // it stays behind with the old village.
            clan.decisionEffects = new DecisionEffects();
        }
        world.lastFoundations.push({ settlement: newSettlement, clans: [...clans] });

        const clanNames = clans.map(c => c.name).join(', ');
        world.addNote(
            '✨',
            `Founded {0} from {1}`,
            `Founding clans: ${clanNames}`,
            [
                { uuid: newSettlement.uuid, name: newSettlement.name },
                { uuid: planned.parent.uuid, name: planned.parent.name },
            ],
        );
    }

    world.plannedSettlements = [];
}
