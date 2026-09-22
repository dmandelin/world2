import { clamp } from "../lib/basics";
import type { Clan } from "./people";

// Care: looking after the people who can't look after themselves -- feeding
// the small, nursing the sick, keeping the old warm and the young out of the
// river.
//
// Every clan owes its children a standard amount of looking after, which is
// what an ordinary clan gives. How much of that a clan actually gives is its
// own choice, within limits: a devoted clan gives more, a hard-pressed or
// indifferent one less. How much that effort gets done is its skill. The two
// multiply into Care Provided, read against the standard, so 1 is exactly
// what the children need.
//
// What care provided is worth is all here, so the whole model can be read in
// one place: births, deaths by age, how well the young take up the clan's
// skills, how well its people get on with their neighbors, and the joy or
// strain of it. Quality of life still reads Care skill directly; see
// population.ts.

// --- Allocation -------------------------------------------------------------

// Effort a clan's children need, per child, in average-adult years.
export const CARE_EFFORT_PER_CHILD = 0.25;

// The range a clan chooses its care effort in, against the standard.
export const CARE_EFFORT_MIN = 0.5;
export const CARE_EFFORT_MAX = 1.5;

// Both Nurture and Care skill are worth this factor per 15 points from 50, so
// a clan at 65 in each gives 110% of the standard and gets 110% out of it:
// 121% provided.
export const CARE_FACTOR_PER_15 = 1.1;

// Share of its food target a clan must expect to meet before it will give the
// care it wants to. Short of that, it takes effort from care for the fields
// and the nets, but never below CARE_EFFORT_MIN.
export const CARE_FOOD_SECURITY = 0.8;

// The Care activity's share of a clan's year at the standard.
export function careStandardShare(clan: Clan): number {
    if (!(clan.effort > 0)) return clan.children > 0 ? 1 : 0;
    return Math.min(1, CARE_EFFORT_PER_CHILD * clan.children / clan.effort);
}

// How much care a clan wants to give, against the standard.
export function desiredCareRatio(nurture: number): number {
    return clamp(
        Math.pow(CARE_FACTOR_PER_15, (nurture - 50) / 15),
        CARE_EFFORT_MIN, CARE_EFFORT_MAX);
}

// How much looking after a unit of care effort gets done.
export function careSkillFactor(skill: number): number {
    return Math.pow(CARE_FACTOR_PER_15, (skill - 50) / 15);
}

// Held inside this range before any effect is read off it, so a clan with
// no skill at all, or a tiny clan with a freak allocation, doesn't run the
// exponentials off to nothing or to infinity.
const PROVISION_FLOOR = 0.25;
const PROVISION_CEILING = 2.5;

function bounded(provision: number): number {
    return Number.isFinite(provision)
        ? clamp(provision, PROVISION_FLOOR, PROVISION_CEILING) : 1;
}

// --- Births -----------------------------------------------------------------

// A clan that looks after its mothers loses fewer pregnancies and gets women
// back to health sooner, but this was never going to be the main thing care
// does. Factor on the birth rate at 150% care provided; the same the other way
// at 50%.
export const CARE_BIRTH_RATE_AT_TOP = 1.1;

export function careBirthRateModifier(provision: number): number {
    return Math.pow(CARE_BIRTH_RATE_AT_TOP, (bounded(provision) - 1) / 0.5);
}

// --- Deaths -----------------------------------------------------------------

// Death-rate modifiers by age slice, as [care provided, modifier] knots. The
// modifier runs log-linear between knots and carries on past the end knots
// along the end segments.
//
// Children get almost everything care is worth, and are looked after first:
// a clan that is short puts the children ahead of everyone, so they lose
// nothing until care falls below 80%. The old take the shortfall above that,
// which is why their line is steep between 80% and 100% and gentler below,
// where the children have started to share it. Adults in their strength
// mostly die of things nobody can nurse them through.
export const CARE_DEATH_RATE_KNOTS: readonly (readonly (readonly [number, number])[])[] = [
    [[0.5, 1.5], [0.8, 1.0], [1.0, 1.0], [1.5, 0.75]], // children
    [[0.5, 1.02], [1.0, 1.0], [1.5, 0.98]],            // adults
    [[0.5, 1.02], [1.0, 1.0], [1.5, 0.98]],            // seniors
    [[0.5, 1.35], [0.8, 1.2], [1.0, 1.0], [1.5, 0.90]], // elders
];

export function careDeathRateModifier(provision: number, slice: number): number {
    const knots = CARE_DEATH_RATE_KNOTS[slice];
    if (!knots) return 1;
    const p = bounded(provision);
    let i = 0;
    while (i < knots.length - 2 && p > knots[i + 1][0]) ++i;
    const [p0, m0] = knots[i];
    const [p1, m1] = knots[i + 1];
    const t = (p - p0) / (p1 - p0);
    return m0 * Math.pow(m1 / m0, t);
}

// --- Learning ---------------------------------------------------------------

// Children who are well looked after take up what their elders know more
// readily and hold on to it better. Factor on learning, and divisor on what is
// lost in the passing on, at 150% care provided; the same the other way at
// 50%. Together they move a skill's ceiling by the square, about 12%.
export const CARE_LEARNING_AT_TOP = 1.06;

export function careLearningFactor(provision: number): number {
    return Math.pow(CARE_LEARNING_AT_TOP, (bounded(provision) - 1) / 0.5);
}

// --- Getting on with the neighbors ------------------------------------------

// People raised with plenty of looking after get more out of the everyday
// dealings between clans: factor on the goodwill from conversation at
// 150% care provided. Read for both clans, since it takes two to get on.
export const CARE_SOCIABILITY_AT_TOP = 1.25;

export function careSociabilityFactor(
    subjectProvision: number, objectProvision: number): number {
    const f = (p: number) =>
        Math.pow(CARE_SOCIABILITY_AT_TOP, (bounded(p) - 1) / 0.5);
    return Math.sqrt(f(subjectProvision) * f(objectProvision));
}

// --- Fortune ----------------------------------------------------------------

// Childhood Joy, or when negative, Caretaker Stress: points of Fortune per
// whole standard's worth of care provided above or below the standard. A clan
// at 150% has a year +10 better for it; one scraping by at 50%, -10 worse.
export const CHILDHOOD_JOY_SCALE = 20;

export function childhoodJoy(provision: number): number {
    return CHILDHOOD_JOY_SCALE * (bounded(provision) - 1);
}

export function childhoodJoyLabel(joy: number): string {
    return joy >= 0 ? "Childhood Joy" : "Caretaker Stress";
}
