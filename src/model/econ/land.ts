import { chooseWeighted, randInt, sum, sumFun } from "../lib/basics";
import type { Clan } from "../people/people";
import type { Settlement } from "../people/settlement";
import { Processes, SkillDefs } from "./econdefs";
import type { LaborAllocation } from "./labor";
import type { Operation } from "./operation";
import {
    ALLUVIUM_MIX_JOSTLE_MAX,
    ALLUVIUM_MIX_JOSTLE_MIN,
    FRESH_ALLUVIUM_WEIGHTS,
    LandQualities,
    QUALITY_INDEXES_BEST_FIRST,
} from "./landquality";

// How much alluvium a settlement has to work with, in plots. A plot is
// roughly what one worker can keep in cultivation for a year.
//
// The first settlements sat down on the best stretches anyone had found:
// 50 plots, give or take a d20 either way. Everything founded afterwards is
// taking up what was left over, and gets a smaller base.
export const FOUNDING_PLOTS_BASE = 50;
export const DAUGHTER_PLOTS_BASE = 30;
// The spread either side of the base, as a die rolled for and against.
const PLOTS_SPREAD_DIE = 20;

// A settlement never ends up with nothing at all to farm.
const MIN_PLOTS = 1;

function rollPlots(base: number): number {
    return Math.max(
        MIN_PLOTS,
        base + randInt(1, PLOTS_SPREAD_DIE + 1) - randInt(1, PLOTS_SPREAD_DIE + 1));
}

// The alluvium a settlement farms: how many plots, and how good each one is.
// Immutable once made. When the river moves, the settlement throws this away
// and draws a fresh one, because the fields it wakes up next to are not the
// fields it went to sleep beside.
export class SettlementLand {
    // Plots at each quality, indexed as LandQualities: worst first.
    readonly counts: readonly number[];

    private constructor(counts: readonly number[]) {
        this.counts = counts;
    }

    // A fresh stretch of river, for a settlement founded on it or moved onto
    // it by a shift in the channel.
    static fresh(base: number): SettlementLand {
        const plots = rollPlots(base);

        // This settlement's own mix, jostled off the standard one.
        const jostle = () => ALLUVIUM_MIX_JOSTLE_MIN
            + Math.random() * (ALLUVIUM_MIX_JOSTLE_MAX - ALLUVIUM_MIX_JOSTLE_MIN);
        const weights = FRESH_ALLUVIUM_WEIGHTS.map(w => w > 0 ? w * jostle() : 0);
        const totalWeight = sum(weights);

        // Then the plots are dealt one at a time out of that mix, so a small
        // settlement's land comes out lumpier than a large one's.
        const counts = LandQualities.map(() => 0);
        for (let i = 0; i < plots; ++i) {
            let r = Math.random() * totalWeight;
            let k = 0;
            while (k < weights.length - 1) {
                if (weights[k] > 0 && r < weights[k]) break;
                r -= weights[k];
                ++k;
            }
            ++counts[k];
        }
        return new SettlementLand(counts);
    }

    at(index: number): number {
        return this.counts[index] ?? 0;
    }

    get totalPlots(): number {
        return sum(this.counts);
    }

    shareAt(index: number): number {
        const total = this.totalPlots;
        return total > 0 ? this.at(index) / total : 0;
    }

    // What a plot of this settlement's land is worth on average, with
    // ordinary land as the unit.
    get qualityFactor(): number {
        return qualityFactorOf(this.counts);
    }
}

// The average productivity of a parcel of land described by plot counts,
// with ordinary land as the unit. Land nobody has is reckoned ordinary.
function qualityFactorOf(counts: readonly number[]): number {
    const total = sum(counts);
    if (total <= 0) return 1;
    return sum(LandQualities.map((q, i) => (counts[i] ?? 0) * q.productivity)) / total;
}

// What one clan holds and farms this year: the plots it wanted, the plots it
// got at each quality, and how eagerly it went after them.
export class ClanLandHolding {
    constructor(
        readonly clan: Clan,
        readonly wanted: number,
        readonly eagerness: number,
        readonly counts: readonly number[],
        readonly rounds: number,
    ) { }

    at(index: number): number {
        return this.counts[index] ?? 0;
    }

    get totalPlots(): number {
        return sum(this.counts);
    }

    shareAt(index: number): number {
        const total = this.totalPlots;
        return total > 0 ? this.at(index) / total : 0;
    }

    // How much of what it wanted this clan actually got out to.
    get fillRate(): number {
        return this.wanted > 0 ? this.totalPlots / this.wanted : 1;
    }

    // The productivity modifier this clan's fields carry from their quality
    // alone, with ordinary land as the unit.
    get qualityFactor(): number {
        return qualityFactorOf(this.counts);
    }

    get description(): string {
        const parts: string[] = [];
        for (const i of QUALITY_INDEXES_BEST_FIRST) {
            if (this.at(i) > 0.005) {
                parts.push(`${this.at(i).toFixed(1)} ${LandQualities[i].name.toLowerCase()}`);
            }
        }
        return parts.length ? parts.join(', ') : 'no land';
    }
}

// How much a point of a trait or skill is worth in the scramble for land,
// as a share of the clan's weight per point away from the ordinary 50. Four
// of these multiply together, so a clan ordinary at everything is at 1 and
// one that is 80 across the board is worth about twice its size in the draw.
export const LAND_PICK_STAT_BONUS = 0.30;

// A stat of 50 is worth nothing either way; 100 is worth the whole bonus and
// 0 costs it.
function statFactor(value: number): number {
    return 1 + LAND_PICK_STAT_BONUS * (value - 50) / 50;
}

// How much readier than its bare size a clan is to be out in the fields
// early: the pious rise for it, the quick-witted see the year coming, and
// the ones who know the crop and the ground know which corner to make for.
export function landPickEagerness(clan: Clan): number {
    return statFactor(clan.traits.piety)
        * statFactor(clan.traits.intellect)
        * statFactor(clan.skills.v(SkillDefs.Agriculture))
        * statFactor(clan.skills.v(SkillDefs.LocalEcology));
}

// How much land a clan means to work this year: one plot to the worker it
// has put to farming. Nobody takes up ground they have no hands for.
export function farmlandWanted(clan: Clan): number {
    return clan.effortAllocation.getForProcess(Processes.Agriculture) * clan.workers;
}

// How many plots a clan takes up before the next family gets ahead of it.
// Scaled to the settlement, so a scramble runs about the same number of
// rounds whether the stretch of river is large or small.
const PLOTS_PER_ROUND_DIVISOR = 20;

export function plotsPerRound(totalPlots: number): number {
    return Math.max(1, Math.ceil(totalPlots / PLOTS_PER_ROUND_DIVISOR));
}

// Enough rounds to hand out every plot even if each one goes singly, with
// room to spare. A guard, not a limit anyone should reach.
const MAX_ROUNDS_FACTOR = 4;

type Taker = {
    clan: Clan;
    wanted: number;
    remaining: number;
    eagerness: number;
    counts: number[];
    rounds: number;
    firstPick: number;
};

// Who farms which of a settlement's plots this year.
//
// Nobody owns the alluvium. Every spring it is there to be taken up again,
// and the families go out to it as they happen to go: the draw for who is
// next is weighted by how many people a clan has still to send, and by how
// ready it is to be out early. Whoever is drawn works a few plots' worth
// down from the best land still unclaimed, and then the draw is made again.
// A clan stops being drawn once it has taken up as much as it has hands to
// work, so the ground left over stays open.
export class SettlementLandAllocation {
    // In the order the clans first got out to the fields.
    readonly holdings: readonly ClanLandHolding[];
    private readonly byClan_ = new Map<Clan, ClanLandHolding>();

    private constructor(
        readonly land: SettlementLand,
        holdings: ClanLandHolding[]) {

        this.holdings = holdings;
        for (const h of holdings) this.byClan_.set(h.clan, h);
    }

    static for(settlement: Settlement): SettlementLandAllocation {
        const land = settlement.land;
        const remaining = [...land.counts];
        const chunk = plotsPerRound(land.totalPlots);

        const takers: Taker[] = settlement.clans.map(clan => {
            const wanted = farmlandWanted(clan);
            return {
                clan,
                wanted,
                remaining: wanted,
                eagerness: landPickEagerness(clan),
                counts: LandQualities.map(() => 0),
                rounds: 0,
                firstPick: Infinity,
            };
        });

        // A clan's weight is the people it has not sent out yet -- its size
        // scaled by how much of its ground is still to be taken up -- times
        // how ready it is to be first out.
        const weight = (t: Taker) => t.remaining <= 0
            ? 0
            : t.clan.population * (t.wanted > 0 ? t.remaining / t.wanted : 0) * t.eagerness;

        const maxRounds = MAX_ROUNDS_FACTOR * (land.totalPlots + takers.length) + 1;
        for (let round = 0; round < maxRounds; ++round) {
            if (sum(remaining) <= 1e-9) break;
            const eligible = takers.filter(t => weight(t) > 0);
            if (eligible.length === 0) break;

            const taker = chooseWeighted(eligible, weight);
            let toTake = Math.min(chunk, taker.remaining);
            let took = 0;
            for (const i of QUALITY_INDEXES_BEST_FIRST) {
                if (toTake <= 1e-9) break;
                const taken = Math.min(toTake, remaining[i]);
                taker.counts[i] += taken;
                remaining[i] -= taken;
                toTake -= taken;
                took += taken;
            }
            if (took <= 1e-9) break;

            taker.remaining -= took;
            if (taker.rounds === 0) taker.firstPick = round;
            ++taker.rounds;
        }

        const holdings = takers
            .slice()
            .sort((a, b) => a.firstPick - b.firstPick)
            .map(t => new ClanLandHolding(
                t.clan, t.wanted, t.eagerness, t.counts, t.rounds));

        return new SettlementLandAllocation(land, holdings);
    }

    forClan(clan: Clan): ClanLandHolding | undefined {
        return this.byClan_.get(clan);
    }

    get plotsWanted(): number {
        return sumFun(this.holdings, h => h.wanted);
    }

    get plotsTaken(): number {
        return sumFun(this.holdings, h => h.totalPlots);
    }

    // Plots nobody had hands for, or nobody got to in time.
    get plotsLeft(): number {
        return this.land.totalPlots - this.plotsTaken;
    }

    takenAt(index: number): number {
        return sumFun(this.holdings, h => h.at(index));
    }

    // How much of what the settlement wanted to farm it actually got out to.
    // What planning goes on next year, since a clan that came back short
    // reckons on coming back short again.
    get fillRate(): number {
        const wanted = this.plotsWanted;
        return wanted > 0 ? this.plotsTaken / wanted : 1;
    }
}

// The farmland and fishing grounds one clan's operations run on this year.
export class LandAllocation {
    constructor(
        readonly m: ReadonlyMap<Operation, number>,
        readonly farmland: ClanLandHolding | undefined) { }

    static from(clan: Clan, labor: LaborAllocation): LandAllocation {
        const settlement = clan.settlement;
        // Only once the year's scramble has actually happened does a clan
        // know which plots it has. Before that -- while it is still working
        // out how much farming to do -- it reckons on getting a plot for
        // every worker it means to send, discounted by how the last scramble
        // went for the settlement as a whole.
        const settled = settlement.landIsTakenUp;
        const farmland = settled ? settlement.landAllocation?.forClan(clan) : undefined;
        const expectedFillRate = settlement.landAllocation?.fillRate ?? 1;

        const m = new Map<Operation, number>();
        for (const operation of clan.operations) {
            if (operation.process === Processes.Agriculture) {
                m.set(operation, farmland
                    ? farmland.totalPlots
                    : (labor.m.get(operation) ?? 0) * expectedFillRate);
            } else {
                // Fishing grounds are not divided up the way the fields are;
                // there is as much water as there are hands to work it.
                m.set(operation, shareByHead(
                    FOUNDING_PLOTS_BASE, clan.population, clan.cluster.population));
            }
        }
        return new LandAllocation(m, farmland);
    }
}

function shareByHead(total: number, part: number, whole: number): number {
    return whole > 0 ? total * part / whole : 0;
}
