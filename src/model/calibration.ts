import { Annals } from "./annals";
import { Clan } from "./people";
import { world } from "./world";

// Population is roughly constant with this birth rate.
// At 1.15x, grows 7% per turn (0.35%/y, 30x/M)
// At 1.10x, grows 5% per turn (0.24%/y, 10x/M)
// At 1.05x, grows 2.5% per turn (0.12%/y, 3x/M)
// At 0.95x, drops 2.5% per turn (-0.13%/y, 1/4x/M)
// At 0.90x, drops 5% per turn (-0.26%/y, 1/14x/M)
// At 0.85x, drops 8% per turn (-0.40%/y, 1/50x/M)
const STABLE_BIRTH_RATE = 2.97;

// Stable population slices:
// 0.2157 | 0.2337
// 0.1541 | 0.1598
// 0.0908 | 0.0879
// 0.0324 | 0.0256

// 1.1x population slices:
// 0.2205 | 0.2389
// 0.1575 | 0.1633
// 0.0844 | 0.0816
// 0.0301 | 0.0237

// The amazing thing is how very small permanent changes in birth
// rate would cause huge population growth, yet there hardly ever
// seems to have been such a thing. It seems there must have generally
// been some sort of feedback mechanism or the equivalent. But
// there have been rises and falls in population relative to
// local capacity, so it doesn't seem to clearly relate to anything
// we can measure.
//
// For now, we'll set things so that populations will generally
// grow to be more crowded than people want, but not that quickly.
//
// Initially, we'll have a local carrying capacity of 300 based
// on careful tending of plants: these people seem to have known
// Neolithic agriculture before arriving. If they have more people
// to feed, then they can try to tend a bit harder, do more hunting
// and fishing, etc., so it's not an immediate emergency. But on
// the other hand, there can be a lot of variation from season to
// season, so without food storage, perhaps 1/2-2/3 max pop is the
// real number you can feed comfortably year after year.

// In the abstract qol model, 50 can be population breakeven. At
// QoL 100, we can use an approximately 5% modifier to both birth
// and death rates. 

// Per 20-year turn by age tier.
const BASE_DEATH_RATES = [0.3, 0.4, 0.65, 1.0];

export function calibrate() {
    const clan = new Clan(world, new Annals(), 'test', 'test', 30);

    // Look for a stationary distribution.
    let slices = clan.slices;
    list(slices);

    const br = STABLE_BIRTH_RATE * 1.04;
    const drm = 0.96;
    const N = 100;

    const origSize = totalPop(slices);
    for (let i = 0; i < N; ++i) {
        const newSlices = [];
        const babies = br * slices[1][0];
        newSlices.push([babies * 0.48, babies * 0.52]);
        for (let i = 0; i < 3; ++i) {
            newSlices.push([
                slices[i][0] * (1 - BASE_DEATH_RATES[i] * drm),
                slices[i][1] * (1 - BASE_DEATH_RATES[i] * 1.1 * drm),
            ]);
        }
        list(newSlices);
        slices = newSlices;
    }
    const finalSize = totalPop(slices);
    const sr = finalSize / origSize;
    const grpt = Math.pow(sr, 1 / N);
    const grpy = Math.pow(sr, 1 / (N * 20));
    const grpc = Math.pow(sr, 100 / (N * 20));
    const grpm = Math.pow(sr, 1000 / (N * 20));
    console.log(`growth rates: ${((grpt-1)*100).toFixed(2)}%/t,  ${((grpy-1)*100).toFixed(2)}%/y`);
    console.log(`              ${grpc.toFixed(3)}x/C,  ${grpm.toFixed(3)}x/M`);
}

function list(slices: number[][]) {
    const total = totalPop(slices);
    console.log(`--- ${total} (${(slices[1][0]/total*100).toFixed(1)}%)`);
    for (const slice of slices) {
        console.log((slice[0]/total).toFixed(4), '|', (slice[1]/total).toFixed(4));
    }
}

function totalPop(slices: number[][]) {
    let total = 0;
    for (const slice of slices) total += slice[0] + slice[1];
    return total;
}