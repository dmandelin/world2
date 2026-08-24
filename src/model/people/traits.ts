import { clamp } from "../lib/basics";
import { normal, poisson } from "../lib/distributions";

export const NUMERIC_TRAITS = ['piety', 'intellect'] as const;
export type NumericTrait = typeof NUMERIC_TRAITS[number];

export const BOOLEAN_TRAITS = [] as const;
export type BooleanTrait = string;

function randomTraitStat(): number {
    return clamp(Math.round(normal(50, 12)), 0, 100);
}

// Giving: a direct +/- modifier to the per-capita food threshold a clan
// keeps for itself before its surplus becomes available as aid (see
// AID_BUDGET_FOOD_THRESHOLD in redistribution.ts). Positive means the clan
// is willing to keep less for itself, i.e. more generous.
export const GIVING_MIN = -0.05;
export const GIVING_MAX = 0.05;
// Soft outer bound: drift can carry a clan past its starting range, but not
// without limit.
const GIVING_DRIFT_LIMIT = 0.15;

// Aggression: this clan's own probability of playing hawk in a conflict
// iteration (see Conflict.advance/iterate in conflict.ts).
export const AGGRESSION_MIN = 0.15;
export const AGGRESSION_MAX = 0.25;

// Per-year drift stddev for Giving and Aggression, chosen so that after 75
// years of independent yearly steps (a random walk), the accumulated drift
// has a stddev of ~0.043 -- most of a starting half-range (0.05), enough
// that a clan's disposition can shift substantially, or even flip sign,
// over a few generations.
const GIVING_DRIFT_STDDEV = 0.005;
const AGGRESSION_DRIFT_STDDEV = 0.005;

function randomGiving(): number {
    return GIVING_MIN + Math.random() * (GIVING_MAX - GIVING_MIN);
}

function randomAggression(): number {
    return AGGRESSION_MIN + Math.random() * (AGGRESSION_MAX - AGGRESSION_MIN);
}

// Pride: how much better than the plain facts a clan thinks of itself, in
// points of self-respect. Skewed positive, because most clans flatter
// themselves a little and only a few hold themselves cheap.
export const PRIDE_MIN = -5;
export const PRIDE_MAX = 10;

function randomPride(): number {
    return PRIDE_MIN + Math.random() * (PRIDE_MAX - PRIDE_MIN);
}

// Ditching dispositions. Under an "At Will" organization nobody is told
// what to do about the ditches, so what gets dug comes down to what each
// clan is willing to put in, what it thinks everyone else owes, and how
// much it cares who pulled their weight.

// Willingness: the share of its own effort a clan puts into the ditches.
export const DITCHING_EFFORT_MIN = 0.0;
export const DITCHING_EFFORT_MAX = 0.12;

// Expectation: the share it thinks each clan ought to be putting in.
export const DITCHING_EXPECTATION_MIN = 0.00;
export const DITCHING_EXPECTATION_MAX = 0.10;

// Admiration: how much a neighbor's standing rises, per point of effort
// above what this clan expected of it. Alignment runs -1 to 1, so a clan
// digging ten points past expectation earns between +0.05 and +0.30.
export const DITCHING_ADMIRATION_MIN = -0.005;
export const DITCHING_ADMIRATION_MAX = 0.030;

const DITCHING_EFFORT_DRIFT_STDDEV = 0.004;

function randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

export class ClanTraits {
    private numeric: Record<string, number>;
    bitmap: number;
    private giving_: number;
    private aggression_: number;
    private pride_: number;
    private ditchingEffort_: number;
    private ditchingExpectation_: number;
    private ditchingAdmiration_: number;

    constructor(
        numeric?: Partial<Record<NumericTrait, number>>,
        bitmap: number = 0,
        giving?: number,
        aggression?: number,
        pride?: number,
        ditchingEffort?: number,
        ditchingExpectation?: number,
        ditchingAdmiration?: number,
    ) {
        this.numeric = {
            piety: numeric?.piety ?? randomTraitStat(),
            intellect: numeric?.intellect ?? randomTraitStat(),
        };
        this.bitmap = bitmap;
        this.giving_ = giving ?? randomGiving();
        this.aggression_ = aggression ?? randomAggression();
        this.pride_ = pride ?? randomPride();
        this.ditchingEffort_ = ditchingEffort
            ?? randomInRange(DITCHING_EFFORT_MIN, DITCHING_EFFORT_MAX);
        this.ditchingExpectation_ = ditchingExpectation
            ?? randomInRange(DITCHING_EXPECTATION_MIN, DITCHING_EXPECTATION_MAX);
        this.ditchingAdmiration_ = ditchingAdmiration
            ?? randomInRange(DITCHING_ADMIRATION_MIN, DITCHING_ADMIRATION_MAX);
    }

    // Share of its own effort this clan is willing to spend on the ditches.
    get ditchingEffort(): number {
        return this.ditchingEffort_;
    }

    set ditchingEffort(val: number) {
        this.ditchingEffort_ = clamp(val, 0, 0.35);
    }

    // Share it thinks every clan ought to be spending.
    get ditchingExpectation(): number {
        return this.ditchingExpectation_;
    }

    // Alignment gained per point of effort a neighbor spends past that.
    get ditchingAdmiration(): number {
        return this.ditchingAdmiration_;
    }

    // Not clamped to the starting range: like Giving and Aggression, a clan's
    // opinion of itself can drift past where it began.
    get pride(): number {
        return this.pride_;
    }

    set pride(val: number) {
        this.pride_ = clamp(val, 3 * PRIDE_MIN, 3 * PRIDE_MAX);
    }

    get giving(): number {
        return this.giving_;
    }

    set giving(val: number) {
        this.giving_ = clamp(val, -GIVING_DRIFT_LIMIT, GIVING_DRIFT_LIMIT);
    }

    // A probability, so it must stay in [0, 1].
    get aggression(): number {
        return this.aggression_;
    }

    set aggression(val: number) {
        this.aggression_ = clamp(val, 0, 1);
    }

    get piety(): number {
        return this.numeric['piety'] ?? 50;
    }

    set piety(val: number) {
        this.numeric['piety'] = clamp(Math.round(val), 0, 100);
    }

    get intellect(): number {
        return this.numeric['intellect'] ?? 50;
    }

    set intellect(val: number) {
        this.numeric['intellect'] = clamp(Math.round(val), 0, 100);
    }

    get(trait: string): number {
        return this.numeric[trait] ?? 0;
    }

    set(trait: string, val: number): void {
        this.numeric[trait] = clamp(Math.round(val), 0, 100);
    }

    hasBoolean(bitIndex: number): boolean {
        return (this.bitmap & (1 << bitIndex)) !== 0;
    }

    setBoolean(bitIndex: number, val: boolean): void {
        if (val) {
            this.bitmap |= (1 << bitIndex);
        } else {
            this.bitmap &= ~(1 << bitIndex);
        }
    }

    clone(): ClanTraits {
        return new ClanTraits(
            { ...this.numeric }, this.bitmap, this.giving_, this.aggression_, this.pride_,
            this.ditchingEffort_, this.ditchingExpectation_, this.ditchingAdmiration_);
    }

    cloneWithSplitBump(): ClanTraits {
        const copy = this.clone();
        for (const key of NUMERIC_TRAITS) {
            const bump = Math.round(normal(0, 3));
            copy.set(key, copy.get(key) + bump);
        }
        for (let i = 0; i < BOOLEAN_TRAITS.length; i++) {
            if (Math.random() < 0.02) {
                copy.setBoolean(i, !copy.hasBoolean(i));
            }
        }
        copy.giving = copy.giving + normal(0, GIVING_DRIFT_STDDEV);
        copy.aggression = copy.aggression + normal(0, AGGRESSION_DRIFT_STDDEV);
        copy.ditchingEffort = copy.ditchingEffort + normal(0, DITCHING_EFFORT_DRIFT_STDDEV);
        return copy;
    }

    mutate(): void {
        for (const key of NUMERIC_TRAITS) {
            const change = poisson(1.5) - poisson(1.5);
            this.set(key, this.get(key) + change);
        }

        for (let i = 0; i < BOOLEAN_TRAITS.length; i++) {
            if (Math.random() < 0.005) {
                this.setBoolean(i, !this.hasBoolean(i));
            }
        }

        this.giving = this.giving + normal(0, GIVING_DRIFT_STDDEV);
        this.aggression = this.aggression + normal(0, AGGRESSION_DRIFT_STDDEV);
        this.ditchingEffort = this.ditchingEffort + normal(0, DITCHING_EFFORT_DRIFT_STDDEV);
    }
}