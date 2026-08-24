import type { Settlement } from './people/settlement';
import type { Clan } from './people/people';
import { sumFun } from './lib/basics';
import { populationAverage } from './lib/modelbasics';
import { Processes, SkillDefs } from './econ/econdefs';

// Basic flood control: a ditch around the settlement's fields, dug and kept
// up by whichever clans care to work on it.
//
// The ditch has one number that matters, its *rating*, standing for how deep
// and how sound it is. A flood has a rating too, for how hard the water
// pushes. There is no depth a ditch has to reach before it counts: a ditch
// built for half the year's water does half the good, and one built for all
// of it does all the good there is.
//
// Rating comes from two things pulling against each other:
// - Effort put in. A ditch has to be dug the length of the fields and down
//   to its depth, and spoil comes out of a deepening trench ever more
//   slowly, so a ditch of depth D around land X costs k * sqrt(X) * D^2.
//   Turned around, depth goes as the square root of the effort over the
//   fourth root of the land: digging twice as long makes a ditch only about
//   half again as deep, and doubling the fields costs a fifth of the depth.
// - Work that nobody is holding together. Each way of organizing the digging
//   can keep only so many hands pulling the same way; past that, stretches
//   are dug to cross-purposes and the ditch is the worse for it.

// How work on the ditches is organized. For now there is only one way, but
// the ditch is always dug under some arrangement, and later arrangements
// will coordinate the work rather than leaving it to inclination.
export class DitchingMethod {
    constructor(
        readonly name: string,
        readonly description: string,
        // How much work this arrangement can hold together, in worker-turns.
        // Effort past this still gets dug, but pulls against itself.
        readonly coordinatedEffort: number,
    ) {}
}

export const DitchingMethods = {
    AtWill: new DitchingMethod(
        'At Will',
        'Whoever cares to work on the ditches works on them when they care to. '
        + 'Nobody assigns the work and nobody is answerable for it.',
        5),
};

// The scale for all of it: this much effort around this much land digs a
// ditch of this rating.
const REFERENCE_LAND = 50;
const REFERENCE_EFFORT = 7.5;
const REFERENCE_RATING = 100;

// Rating lost per worker-turn of digging that the arrangement cannot hold
// together.
const PENALTY_PER_UNCOORDINATED_EFFORT = 1;

// How deep a ditch a given effort digs around a given area of fields.
export function ditchRatingFor(effort: number, land: number): number {
    if (effort <= 0 || land <= 0) return 0;
    return REFERENCE_RATING
        * Math.sqrt(effort / REFERENCE_EFFORT)
        * (REFERENCE_LAND / land) ** 0.25;
}

// And the other way round: what a ditch of that rating would cost.
export function ditchEffortFor(rating: number, land: number): number {
    if (land <= 0) return 0;
    return REFERENCE_EFFORT
        * (rating / REFERENCE_RATING) ** 2
        * Math.sqrt(land / REFERENCE_LAND);
}

// How much of a ditch's good it delivers against water of a given push:
// all of it once the ditch is built for the whole flood, and its share of
// the flood before that.
export function ditchDepthCredit(rating: number, floodRating: number): number {
    if (floodRating <= 0) return 1;
    return Math.min(1, rating / floodRating);
}

// What skill buys on top of a sound ditch. A middling crew gets the whole
// of it, and every fifteen points either way doubles or halves that, up to
// twice the benefit -- past which the ditch is as good as a ditch gets.
const SKILL_FACTOR_DOUBLING = 15;
const MAX_SKILL_FACTOR = 2;

export function ditchSkillFactor(skill: number): number {
    return Math.min(MAX_SKILL_FACTOR, 2 ** ((skill - 50) / SKILL_FACTOR_DOUBLING));
}

export class DitchWorkItem {
    constructor(
        readonly clan: Clan,
        // Share of this clan's own effort spent on the ditches.
        readonly effortShare: number,
        // That share in effort units.
        readonly labor: number,
        readonly skill: number,
    ) {}
}

export class DitchCalc {
    readonly method: DitchingMethod;
    readonly items: DitchWorkItem[];

    // Fields the ditch has to run around.
    readonly land: number;
    // What a full-strength ditch here would cost, and what was actually put in.
    readonly requiredEffort: number;
    readonly effort: number;

    // Rating from the digging alone, before flaws.
    readonly baseRating: number;

    readonly skill: number;
    // Work beyond what the arrangement can hold together, and what it costs.
    readonly uncoordinatedEffort: number;
    readonly coordinationPenalty: number;

    // What the ditch is finally worth against a flood.
    readonly rating: number;

    constructor(readonly settlement: Settlement) {
        this.method = settlement.ditchingMethod;

        this.items = settlement.clans
            .map(clan => new DitchWorkItem(
                clan,
                clan.ditchingEffortShare,
                clan.ditchingEffortShare * clan.effort,
                clan.skills.v(SkillDefs.Irrigation)))
            .filter(item => item.labor > 0);

        // The fields as they were last worked: the ditch is dug around the
        // land there is, before this year's harvest is taken off it.
        this.land = sumFun(settlement.clans,
            c => c.production.getForProcess(Processes.Agriculture, 'land') ?? 0);

        this.requiredEffort = ditchEffortFor(REFERENCE_RATING, this.land);
        this.effort = sumFun(this.items, item => item.labor);
        this.baseRating = ditchRatingFor(this.effort, this.land);

        this.skill = populationAverage(
            this.items.map(item => item.clan), c => c.skills.v(SkillDefs.Irrigation));

        // Past what the arrangement can hold together, hands at the work get
        // in one another's way and the ditch suffers for it.
        this.uncoordinatedEffort =
            Math.max(0, this.effort - this.method.coordinatedEffort);
        this.coordinationPenalty =
            PENALTY_PER_UNCOORDINATED_EFFORT * this.uncoordinatedEffort;

        this.rating = Math.max(0, this.baseRating - this.coordinationPenalty);
    }

    get building(): boolean {
        return this.items.length > 0;
    }

    // What one clan did on the ditches, as recorded when they were dug.
    // Read from here rather than from the clan, whose numbers move again
    // when the year's births and deaths are drawn.
    forClan(uuid: string): DitchWorkItem | undefined {
        return this.items.find(item => item.clan.uuid === uuid);
    }

    // Share of the settlement's whole effort that went into the ditches.
    get effortShare(): number {
        const settlementEffort = sumFun(this.settlement.clans, c => c.effort);
        return settlementEffort > 0 ? this.effort / settlementEffort : 0;
    }

    // How much of a full-strength ditch this one amounts to against a flood
    // of the given rating, counting both depth and the crew's skill. 1 is a
    // sound ditch dug by a middling crew; skilled crews go past that.
    effectAgainst(floodRating: number): number {
        return this.depthCreditAgainst(floodRating) * ditchSkillFactor(this.skill);
    }

    // The depth side of that on its own: what share of this year's water the
    // ditch is built for.
    depthCreditAgainst(floodRating: number): number {
        return ditchDepthCredit(this.rating, floodRating);
    }

    // Whether the ditch is built for the whole of that flood, so that
    // nothing is lost to its being too shallow.
    holdsAgainst(floodRating: number): boolean {
        return this.rating >= floodRating;
    }
}
