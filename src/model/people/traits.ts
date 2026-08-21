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

export class ClanTraits {
    private numeric: Record<string, number>;
    bitmap: number;
    private giving_: number;
    private aggression_: number;
    private pride_: number;

    constructor(
        numeric?: Partial<Record<NumericTrait, number>>,
        bitmap: number = 0,
        giving?: number,
        aggression?: number,
        pride?: number,
    ) {
        this.numeric = {
            piety: numeric?.piety ?? randomTraitStat(),
            intellect: numeric?.intellect ?? randomTraitStat(),
        };
        this.bitmap = bitmap;
        this.giving_ = giving ?? randomGiving();
        this.aggression_ = aggression ?? randomAggression();
        this.pride_ = pride ?? randomPride();
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
            { ...this.numeric }, this.bitmap, this.giving_, this.aggression_, this.pride_);
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
    }
}