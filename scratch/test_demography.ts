// Checks for Demography. There's no test runner in the project, so bundle and
// run it with node:
//   npx esbuild scratch/test_demography.ts --bundle --platform=node --outfile=<tmp>/t.cjs && node <tmp>/t.cjs
import {
    AGE_LIMIT, Demography, FEMALE, MALE, MaritalStatus,
} from '../src/model/people/demography';
import { INITIAL_POPULATION_RATIOS } from '../src/model/people/population';

const { Unmarried, Married, Widowed } = MaritalStatus;

let failures = 0;
function check(condition: boolean, message: string) {
    if (!condition) {
        ++failures;
        console.log(`FAIL: ${message}`);
    }
}
function throws(fn: () => void, message: string) {
    try { fn(); } catch { return; }
    check(false, `${message} (expected an error)`);
}

// Recounts from scratch, to catch total_ drifting from the cells.
function recount(d: Demography): number {
    let n = 0;
    d.forEach((_s, _a, _st, c) => { n += c; });
    return n;
}

// fromSlices keeps every slice's counts exactly.
for (let trial = 0; trial < 200; ++trial) {
    const pop = 10 + Math.floor(Math.random() * 200);
    const slices = INITIAL_POPULATION_RATIOS.map(r => r.map(x => Math.round(x * pop)));
    const d = Demography.fromSlices(slices);
    check(JSON.stringify(d.slices) === JSON.stringify(slices),
        `fromSlices ${JSON.stringify(slices)} gave ${JSON.stringify(d.slices)}`);
    check(d.total === recount(d), 'fromSlices total');
    check(d.count({ status: [Married, Widowed] }) === 0, 'fromSlices starts all unmarried');
}

// The oldest slice thins out with age rather than spreading to 99.
{
    const d = Demography.fromSlices([[0, 0], [0, 0], [0, 0], [10000, 0]]);
    const sixties = d.count({ ages: [60, 70] });
    const nineties = d.count({ ages: [90, 100] });
    check(sixties > 5000 && nineties < 1000, `elder spread: 60s ${sixties}, 90s ${nineties}`);
}

// add / remove / get / count / changeStatus.
{
    const d = new Demography();
    d.add(FEMALE, 22, Unmarried, 5);
    d.add(MALE, 25, Unmarried, 3);
    d.add(FEMALE, 45, Married, 2);
    check(d.total === 10, 'total after add');
    check(d.get(FEMALE, 22, Unmarried) === 5, 'get');
    check(d.count({ sex: FEMALE }) === 7, 'count by sex');
    check(d.count({ ages: [20, 40] }) === 8, 'count by ages');
    check(d.count({ ages: [22, 23], sex: FEMALE }) === 5, 'count one year');
    check(d.count({ status: Married }) === 2, 'count by status');
    d.changeStatus(FEMALE, 22, Unmarried, Married, 2);
    check(d.count({ status: Married }) === 4 && d.total === 10, 'changeStatus');
    d.remove(MALE, 25, Unmarried, 3);
    check(d.total === 7 && recount(d) === 7, 'remove');
    throws(() => d.remove(MALE, 25, Unmarried, 1), 'remove more than there are');
    throws(() => d.add(MALE, AGE_LIMIT, Unmarried, 1), 'add past AGE_LIMIT');
    throws(() => d.add(MALE, 30, Unmarried, 1.5), 'add a fraction of a person');
    check(JSON.stringify(d.slices) === JSON.stringify([[0, 0], [5, 0], [2, 0], [0, 0]]),
        `slices ${JSON.stringify(d.slices)}`);
}

// ageOneYear moves everyone up and hands back those at the last age.
{
    const d = new Demography();
    d.add(FEMALE, 0, Unmarried, 4);
    d.add(MALE, 19, Married, 2);
    d.add(MALE, AGE_LIMIT - 1, Widowed, 3);
    const gone = d.ageOneYear();
    check(d.get(FEMALE, 1, Unmarried) === 4 && d.get(FEMALE, 0, Unmarried) === 0, 'aging from 0');
    check(d.get(MALE, 20, Married) === 2, 'aging across a slice boundary keeps status');
    check(gone.total === 3 && gone.get(MALE, AGE_LIMIT - 1, Widowed) === 3, 'aged out');
    check(d.total === 6 && recount(d) === 6, 'total after aging');
    // A cohort stays together: 20 years on, all of them are exactly 20 older.
    for (let y = 0; y < 20; ++y) d.ageOneYear();
    check(d.get(FEMALE, 21, Unmarried) === 4 && d.get(MALE, 40, Married) === 2,
        'cohort holds together over 20 years');
}

// take: exact counts, only from matching people, totals kept.
for (const how of ['random', 'representative', 'youngest', 'oldest'] as const) {
    for (let trial = 0; trial < 100; ++trial) {
        const d = Demography.fromSlices([[30, 30], [20, 20], [10, 10], [5, 5]]);
        const filter = { sex: FEMALE, ages: [15, 45] as const };
        const available = d.count(filter);
        const n = Math.floor(Math.random() * (available + 1));
        const before = d.clone();
        const t = d.take(n, filter, how);
        check(t.total === n && recount(t) === n, `${how}: took ${t.total} of ${n}`);
        check(t.count(filter) === n, `${how}: took only matching people`);
        check(d.total === before.total - n && recount(d) === d.total, `${how}: total after take`);
        d.merge(t);
        check(JSON.stringify(d.slices) === JSON.stringify(before.slices), `${how}: merge restores`);
    }
}
throws(() => new Demography().take(1), 'take from nobody');

// youngest / oldest come from the right end.
{
    const d = new Demography();
    for (let age = 16; age < 30; ++age) d.add(FEMALE, age, Unmarried, 2);
    const young = d.take(5, { sex: FEMALE }, 'youngest');
    check(young.count({ ages: [16, 18] }) === 4 && young.count({ ages: [18, 19] }) === 1,
        'youngest');
    const old = d.take(3, { sex: FEMALE }, 'oldest');
    check(old.count({ ages: [29, 30] }) === 2 && old.count({ ages: [28, 29] }) === 1, 'oldest');
}

// random is unbiased: over many draws, each age is taken in proportion.
{
    const takenAt = new Array(AGE_LIMIT).fill(0);
    for (let trial = 0; trial < 5000; ++trial) {
        const d = new Demography();
        d.add(FEMALE, 20, Unmarried, 10);
        d.add(FEMALE, 30, Unmarried, 30);
        const t = d.take(4, {}, 'random');
        takenAt[20] += t.get(FEMALE, 20, Unmarried);
        takenAt[30] += t.get(FEMALE, 30, Unmarried);
    }
    const share = takenAt[20] / (takenAt[20] + takenAt[30]);
    check(Math.abs(share - 0.25) < 0.02, `random share at 20: ${share.toFixed(3)}, expected 0.25`);
}

// representative spreads over ages in proportion, never off by more than one.
{
    const d = new Demography();
    for (let age = 0; age < 60; ++age) d.add(MALE, age, Unmarried, 3);
    const t = d.take(60, {}, 'representative');
    let worst = 0;
    for (let age = 0; age < 60; ++age) {
        worst = Math.max(worst, Math.abs(t.get(MALE, age, Unmarried) - 1));
    }
    check(worst === 0, `representative: worst deviation ${worst} from 1 per age`);
}

// split takes about the fraction, keeps everyone, and keeps couples matched.
{
    let totalTaken = 0, totalPeople = 0;
    for (let trial = 0; trial < 500; ++trial) {
        const d = Demography.fromSlices([[20, 22], [15, 16], [9, 9], [3, 2]]);
        // Some couples: 8 wives and 8 husbands.
        d.changeStatus(FEMALE, 25, Unmarried, Married, Math.min(8, d.get(FEMALE, 25, Unmarried)));
        const wives = d.count({ sex: FEMALE, status: Married });
        let husbands = 0;
        for (let age = 20; age < 40 && husbands < wives; ++age) {
            const k = Math.min(wives - husbands, d.get(MALE, age, Unmarried));
            d.changeStatus(MALE, age, Unmarried, Married, k);
            husbands += k;
        }
        const before = d.total;
        const s = d.split(0.4);
        check(s.total + d.total === before, 'split keeps everyone');
        check(s.count({ sex: FEMALE, status: Married }) === s.count({ sex: MALE, status: Married }),
            'split keeps couples matched');
        check(recount(s) === s.total && recount(d) === d.total, 'split totals');
        totalTaken += s.total;
        totalPeople += before;
    }
    const share = totalTaken / totalPeople;
    check(Math.abs(share - 0.4) < 0.01, `split share ${share.toFixed(3)}, expected 0.4`);
}

// clone is independent.
{
    const d = Demography.fromSlices([[5, 5], [5, 5], [5, 5], [5, 5]]);
    const c = d.clone();
    c.add(MALE, 50, Unmarried, 1);
    check(d.total === 40 && c.total === 41, 'clone independent');
}

console.log(failures === 0 ? 'All Demography checks passed.' : `${failures} check(s) failed.`);
if (failures) process.exit(1);
