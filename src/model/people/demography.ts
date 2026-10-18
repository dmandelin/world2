import { assert } from "../lib/basics";

// A clan's people, counted by sex, single year of age, and marital status.
//
// Everything outside asks questions of it the way it would of a list of
// people -- how many unmarried women are there between 16 and 25, take three
// of them -- and never touches the counts directly. That is so the counts can
// one day give way to individual people without the callers changing.
//
// People taken out come back as a Demography of their own, so moving people
// between clans (brides, a clan splitting off, migrants) is a take from one
// and a merge into the other.

// No one reaches this age; those who would have are handed back by
// ageOneYear() for the caller to count as dead of old age.
export const AGE_LIMIT = 100;

// The old 20-year age slices, still the view most of the model reads: 0-19,
// 20-39, 40-59, and 60 and up.
export const SLICE_WIDTH = 20;
export const SLICE_COUNT = 4;

export function sliceOf(age: number): number {
    return Math.min(Math.floor(age / SLICE_WIDTH), SLICE_COUNT - 1);
}

// The ages a slice covers, half-open.
export function sliceAges(slice: number): [number, number] {
    const from = slice * SLICE_WIDTH;
    return [from, slice === SLICE_COUNT - 1 ? AGE_LIMIT : from + SLICE_WIDTH];
}

// How a slice's people are taken to be spread over its ages, where only
// the slice's head count is known, one weight per age from its first. The
// younger slices are spread evenly; the oldest thins out by about 8% a year,
// roughly what it loses to death.
export function sliceAgeWeights(slice: number): number[] {
    const [from, to] = sliceAges(slice);
    const weights: number[] = [];
    for (let age = from; age < to; ++age) {
        weights.push(slice === SLICE_COUNT - 1 ? Math.pow(0.92, age - from) : 1);
    }
    return weights;
}

// Female first, as in the slices.
export type Sex = 0 | 1;
export const FEMALE: Sex = 0;
export const MALE: Sex = 1;
export const SEXES: readonly Sex[] = [FEMALE, MALE];

export enum MaritalStatus {
    Unmarried,
    Married,
    Widowed,
}
export const MARITAL_STATUSES: readonly MaritalStatus[] = [
    MaritalStatus.Unmarried, MaritalStatus.Married, MaritalStatus.Widowed,
];
const STATUS_COUNT = MARITAL_STATUSES.length;

// Which people a count or a take is about. Anything left out means everyone.
export interface PeopleFilter {
    sex?: Sex;
    // Half-open, as the slices are: [20, 40) is 20 through 39.
    ages?: readonly [number, number];
    status?: MaritalStatus | readonly MaritalStatus[];
}

// How a take chooses among the people who match:
//   random          -- any of them alike.
//   representative  -- a cross-section, spread across ages in proportion to
//                      numbers, as when a clan splits.
//   youngest/oldest -- from that end of the age range, at random within the
//                      age where it runs out.
export type Selection = 'random' | 'representative' | 'youngest' | 'oldest';

function cellIndex(sex: Sex, status: MaritalStatus, age: number): number {
    return (sex * STATUS_COUNT + status) * AGE_LIMIT + age;
}

function checkCount(n: number): void {
    assert(Number.isInteger(n) && n >= 0, `Expected a whole number of people, got ${n}.`);
}

function checkAge(age: number): void {
    assert(Number.isInteger(age) && age >= 0 && age < AGE_LIMIT,
        `Age ${age} is outside 0-${AGE_LIMIT - 1}.`);
}

// Share n out over items with the given weights, in proportion, by
// systematic sampling: lay the weights end to end, step through them at
// equal intervals from a random start, and count the steps landing in each.
// The shares come to exactly n, and none is ever more than ceil(n * w / W) --
// so when the weights are head counts and n is at most their total, no item
// is asked for more people than it has.
function systematicAllocation(n: number, weights: readonly number[]): number[] {
    const shares = new Array(weights.length).fill(0);
    let total = 0;
    for (const w of weights) total += w;
    if (n === 0 || total <= 0) return shares;

    const u = Math.random();
    let cum = 0;
    let before = Math.floor(u);
    for (let i = 0; i < weights.length; ++i) {
        cum += weights[i];
        const after = Math.floor(cum * n / total + u);
        shares[i] = after - before;
        before = after;
    }
    return shares;
}

// Choose n of the people in cells with the given counts, each person alike,
// by selection sampling: go through them one by one, taking each with the
// chance of still needing someone. Returns how many come from each cell.
function randomAllocation(n: number, counts: readonly number[]): number[] {
    const shares = new Array(counts.length).fill(0);
    let remaining = 0;
    for (const c of counts) remaining += c;
    let needed = n;
    for (let i = 0; i < counts.length && needed > 0; ++i) {
        for (let k = 0; k < counts[i] && needed > 0; ++k) {
            if (Math.random() * remaining < needed) {
                ++shares[i];
                --needed;
            }
            --remaining;
        }
    }
    return shares;
}

export class Demography {
    private readonly counts = new Int32Array(2 * STATUS_COUNT * AGE_LIMIT);
    private total_ = 0;

    // A clan's starting people from head counts by 20-year slice, as in
    // INITIAL_POPULATION_RATIOS, spread over ages as sliceAgeWeights says.
    // Everyone starts unmarried.
    static fromSlices(slices: readonly (readonly number[])[]): Demography {
        assert(slices.length === SLICE_COUNT,
            `Expected ${SLICE_COUNT} slices, got ${slices.length}.`);
        const d = new Demography();
        for (let i = 0; i < SLICE_COUNT; ++i) {
            const [from] = sliceAges(i);
            const weights = sliceAgeWeights(i);
            for (const sex of SEXES) {
                const shares = systematicAllocation(slices[i][sex], weights);
                for (let k = 0; k < shares.length; ++k) {
                    if (shares[k]) d.add(sex, from + k, MaritalStatus.Unmarried, shares[k]);
                }
            }
        }
        return d;
    }

    get total(): number {
        return this.total_;
    }

    get(sex: Sex, age: number, status: MaritalStatus): number {
        checkAge(age);
        return this.counts[cellIndex(sex, status, age)];
    }

    add(sex: Sex, age: number, status: MaritalStatus, n: number): void {
        checkAge(age);
        checkCount(n);
        this.counts[cellIndex(sex, status, age)] += n;
        this.total_ += n;
    }

    remove(sex: Sex, age: number, status: MaritalStatus, n: number): void {
        checkAge(age);
        checkCount(n);
        const i = cellIndex(sex, status, age);
        assert(this.counts[i] >= n,
            `Can't remove ${n} of ${this.counts[i]} (sex ${sex}, age ${age}, ` +
            `${MaritalStatus[status]}).`);
        this.counts[i] -= n;
        this.total_ -= n;
    }

    // Marrying, being widowed, remarrying.
    changeStatus(sex: Sex, age: number, from: MaritalStatus, to: MaritalStatus, n: number): void {
        this.remove(sex, age, from, n);
        this.add(sex, age, to, n);
    }

    count(filter: PeopleFilter = {}): number {
        let n = 0;
        this.forEachMatchingCell(filter, i => { n += this.counts[i]; });
        return n;
    }

    // Head counts by the old 20-year slices, girls first, as Clan.slices has
    // them. A fresh array each time.
    get slices(): number[][] {
        const slices: number[][] = [];
        for (let i = 0; i < SLICE_COUNT; ++i) slices.push([0, 0]);
        this.forEach((sex, age, _status, count) => { slices[sliceOf(age)][sex] += count; });
        return slices;
    }

    // Every group of people alike in sex, age and status, skipping empty
    // ones. Safe to remove from the group being visited.
    forEach(fn: (sex: Sex, age: number, status: MaritalStatus, count: number) => void): void {
        for (const sex of SEXES) {
            for (const status of MARITAL_STATUSES) {
                const base = cellIndex(sex, status, 0);
                for (let age = 0; age < AGE_LIMIT; ++age) {
                    const count = this.counts[base + age];
                    if (count > 0) fn(sex, age, status, count);
                }
            }
        }
    }

    merge(other: Demography): void {
        for (let i = 0; i < this.counts.length; ++i) this.counts[i] += other.counts[i];
        this.total_ += other.total_;
    }

    clone(): Demography {
        const d = new Demography();
        d.counts.set(this.counts);
        d.total_ = this.total_;
        return d;
    }

    // Everyone a year older. Those who were at the last age there is come
    // back, at that age, for the caller to count as dead.
    ageOneYear(): Demography {
        const aged = new Demography();
        for (const sex of SEXES) {
            for (const status of MARITAL_STATUSES) {
                const base = cellIndex(sex, status, 0);
                const last = this.counts[base + AGE_LIMIT - 1];
                if (last > 0) aged.add(sex, AGE_LIMIT - 1, status, last);
                this.counts.copyWithin(base + 1, base, base + AGE_LIMIT - 1);
                this.counts[base] = 0;
                this.total_ -= last;
            }
        }
        return aged;
    }

    // Take n of the people matching the filter out of this group, chosen as
    // `how` says, and hand them back as a group of their own. Asking for
    // more than there are is an error.
    take(n: number, filter: PeopleFilter = {}, how: Selection = 'random'): Demography {
        checkCount(n);
        const taken = new Demography();
        if (n === 0) return taken;

        // The matching cells, youngest first, grouped by age.
        const byAge: number[][] = [];
        for (let age = 0; age < AGE_LIMIT; ++age) byAge.push([]);
        let available = 0;
        this.forEachMatchingCell(filter, (i, age) => {
            if (this.counts[i] > 0) {
                byAge[age].push(i);
                available += this.counts[i];
            }
        });
        assert(n <= available,
            `Can't take ${n} people; only ${available} match ${JSON.stringify(filter)}.`);

        const moveOut = (cells: readonly number[], shares: readonly number[]) => {
            for (let k = 0; k < cells.length; ++k) {
                if (shares[k] === 0) continue;
                this.counts[cells[k]] -= shares[k];
                taken.counts[cells[k]] += shares[k];
            }
        };

        if (how === 'random' || how === 'representative') {
            const cells = byAge.flat();
            const counts = cells.map(i => this.counts[i]);
            moveOut(cells, how === 'random'
                ? randomAllocation(n, counts)
                : systematicAllocation(n, counts));
        } else {
            if (how === 'oldest') byAge.reverse();
            let needed = n;
            for (const cells of byAge) {
                if (needed === 0) break;
                const counts = cells.map(i => this.counts[i]);
                let atAge = 0;
                for (const c of counts) atAge += c;
                const shares = atAge <= needed ? counts : randomAllocation(needed, counts);
                moveOut(cells, shares);
                needed -= Math.min(atAge, needed);
            }
        }

        this.total_ -= n;
        taken.total_ = n;
        return taken;
    }

    // Take about `fraction` of everyone, as a cross-section, for a new clan.
    // Married men and women go in equal numbers when they are equal here, so
    // that couples are not parted.
    split(fraction: number): Demography {
        assert(fraction >= 0 && fraction <= 1, `Split fraction ${fraction} is outside 0-1.`);
        const split = new Demography();
        const marriedRoll = Math.random();
        for (const status of MARITAL_STATUSES) {
            for (const sex of SEXES) {
                const filter = { sex, status };
                const roll = status === MaritalStatus.Married ? marriedRoll : Math.random();
                const n = Math.floor(this.count(filter) * fraction + roll);
                split.merge(this.take(n, filter, 'representative'));
            }
        }
        return split;
    }

    // Calls fn with the index and age of every cell the filter covers,
    // empty or not.
    private forEachMatchingCell(filter: PeopleFilter, fn: (i: number, age: number) => void): void {
        const sexes = filter.sex === undefined ? SEXES : [filter.sex];
        const statuses = filter.status === undefined ? MARITAL_STATUSES
            : typeof filter.status === 'number' ? [filter.status]
            : filter.status;
        const from = Math.max(0, filter.ages?.[0] ?? 0);
        const to = Math.min(AGE_LIMIT, filter.ages?.[1] ?? AGE_LIMIT);
        for (const sex of sexes) {
            for (const status of statuses) {
                const base = cellIndex(sex, status, 0);
                for (let age = from; age < to; ++age) fn(base + age, age);
            }
        }
    }
}
