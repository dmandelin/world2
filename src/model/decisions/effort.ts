import { economicResult } from "../econ/economy";
import { Processes } from "../econ/econdefs";
import { safeDiv } from "../lib/basics";
import { isExemplarClan } from "../lib/debug";
import { pct } from "../lib/format";
import { CARE_EFFORT_MIN, CARE_FOOD_SECURITY, careStandardShare, desiredCareRatio } from "../people/care";
import { nutritionOf } from "../people/nutrition";
import { TradeGoods } from "../trade";
import type { Clan } from "../people/people";
import type { SkillDef } from "../people/skills";
import type { Process } from "../econ/process";
import type { Tagged } from "../econ/tagged";

// How a clan settled its care for the year, all against the standard its
// children need. Kept as decided, so later drift in the clan's disposition
// doesn't rewrite what it chose.
export type CarePlan = {
    // What its Nurture asked for.
    readonly wanted: number;
    // What it actually gave.
    readonly given: number;
    // Nutrition it expected from what it would grow with the care it wanted,
    // as a share of its nutrition target. Below CARE_FOOD_SECURITY it cut
    // care to grow more.
    readonly foodOutlook: number;
};

const STANDARD_CARE_PLAN: CarePlan = { wanted: 1, given: 1, foodOutlook: 1 };

// How a clan allocates its "effort", which subsumes time taken
// (including preparation and recovery) and other factors not
// explicitly modeled, such as mental discipline.
//
// Effort is measured in units, where 1 "average adult" produces
// 1 unit of effort per turn. Effort is allocated in fractions.
export class EffortAllocation {
    // Overall map of high-level activities to fractions of
    // overall effort. Must sum to 1.
    private m_: Map<Activity, number> = new Map();

    // Map of production processes to fractions of Production
    // effort. Must sum to 1.
    private pm_: Map<Process, number> = new Map();

    // Settled in applyStart and left alone by the steps after it.
    private carePlan_: CarePlan;

    constructor(
        readonly clan: Clan,
        m?: ReadonlyMap<Activity, number>,
        pm?: ReadonlyMap<Process, number>,
        carePlan: CarePlan = STANDARD_CARE_PLAN) {

        this.carePlan_ = carePlan;

        if (m) {
            this.m_ = new Map(m);
        } else {
            // Initial cultural allocation.
            this.m_.set(Activities.Leisure, 0.3);
            // Default values. Will generally be replaced in planning.
            this.m_.set(Activities.Care, 0.2);
            this.m_.set(Activities.Production, 0.4);
            this.m_.set(Activities.Help, 0.1);
        }

        if (pm) {
            this.pm_ = new Map(pm);
        } else {
            // Start with production 80% fishing and 20% farming.
            this.pm_.set(Processes.Fishing, 0.8);
            this.pm_.set(Processes.Agriculture, 0.2);
        }
    }

    debugString(): string {
        return [...this.m_].map(([activity, fraction]) => `${activity.name}: ${pct(fraction)}%`).join(', ')
    }

    [Symbol.iterator](): Iterator<[Activity, number]> {
        return this.m_.entries();
    }

    get m(): ReadonlyMap<Activity, number> {
        return this.m_;
    }

    get pm(): ReadonlyMap<Process, number> {
        return this.pm_;
    }

    get carePlan(): CarePlan {
        return this.carePlan_;
    }

    // Care effort given, against the standard the clan's children need.
    get careRatio(): number {
        return this.carePlan_.given;
    }

    *forProduction(): Iterable<[Process, number]> {
        const fp = this.get(Activities.Production);
        for (const [process, fraction] of this.pm_) {
            yield [process, fraction * fp];
        }
    }

    *flattened(): Iterable<[Activity | Process, number]> {
        for (const [activity, fraction] of this.m_) {
            if (activity === Activities.Production) {
                for (const [process, processFraction] of this.pm_) {
                    yield [process, fraction * processFraction];
                }
            } else {
                yield [activity, fraction];
            }
        }
    }

    get(activity: Activity): number {
        return this.m_.get(activity) ?? 0;
    }

    getForProcess(process: Process): number {
        const operation = this.clan.operations.find(op => op.process === process);
        const pf = operation ? this.get(Activities.Production) : 0;
        return pf * (this.pm_.get(process) ?? 0);
    }

    farmingRatio(): number {
        const farmingEffort = this.getForProcess(Processes.Agriculture);
        const fishingEffort = this.getForProcess(Processes.Fishing);
        // A clan with no production effort at all has no ratio to report.
        return safeDiv(farmingEffort, farmingEffort + fishingEffort);
    }

    clone(): EffortAllocation {
        return new EffortAllocation(this.clan, this.m_, this.pm_, this.carePlan_);
    }

    shifted(from: Process, to: Process, delta: number): EffortAllocation {
        const actualDelta = Math.min(this.getForProcess(from), delta);

        const pm = [...this.pm_].map(([process, fraction]): [Process, number] => {
            if (process === from) {
                return [process, fraction - actualDelta];
            } else if (process === to) {
                return [process, fraction + actualDelta];
            } else {
                return [process, fraction];
            }
        });
        return new EffortAllocation(this.clan, this.m_, new Map(pm), this.carePlan_);
    }

    shiftedActivity(from: Activity, to: Activity, delta: number): EffortAllocation {
        const actualDelta = Math.min(this.get(from), delta);

        const m = new Map(this.m_);
        m.set(from, this.get(from) - actualDelta);
        m.set(to, this.get(to) + actualDelta);
        return new EffortAllocation(this.clan, m, this.pm_, this.carePlan_);
    }

    // "Applying" the allocation refers to the process of converting
    // the high-level choices to specific effort allocations.

    // Rest a clan will not do without, as a share of its year.
    static readonly MIN_REST_SHARE = 0.15;

    // How many times a clan halves the range when working out how far it
    // has to cut back on care to expect enough food.
    private static readonly CARE_SEARCH_STEPS = 6;

    // Initialize the application process.
    applyStart() {
        // Care comes first. The clan gives its children the care it wants to
        // give -- unless that leaves it expecting to go badly short of food,
        // in which case it gives as much as still lets it expect enough, and
        // however short it is, never less than the minimum.
        const standard = careStandardShare(this.clan);
        const wanted = desiredCareRatio(this.clan.traits.nurture);
        this.reserve(standard * wanted);
        const foodOutlook = this.expectedFoodShare();
        let careRatio = wanted;
        if (standard > 0 && wanted > CARE_EFFORT_MIN && !isFoodSecure(foodOutlook)) {
            this.reserve(standard * CARE_EFFORT_MIN);
            if (isFoodSecure(this.expectedFoodShare())) {
                // Enough food at lo, not at hi.
                let lo = CARE_EFFORT_MIN;
                let hi = wanted;
                for (let i = 0; i < EffortAllocation.CARE_SEARCH_STEPS; ++i) {
                    const mid = (lo + hi) / 2;
                    this.reserve(standard * mid);
                    if (isFoodSecure(this.expectedFoodShare())) lo = mid; else hi = mid;
                }
                careRatio = lo;
            } else {
                careRatio = CARE_EFFORT_MIN;
            }
            this.reserve(standard * careRatio);
        }
        // What was actually given, which falls short of the ratio when the
        // children would need more than the clan's whole year.
        const given = standard > 0
            ? this.get(Activities.Care) / standard
            : careRatio;
        this.carePlan_ = { wanted, given, foodOutlook };

        if (isExemplarClan(this.clan)) {
            console.log(
                `Start effort allocation for ${this.clan.name}:`,
                this.clan.effortAllocation.debugString());
        }
    }

    // Reserve effort for everything that isn't production around the given
    // share of care, then have the rest be production, keeping back the rest
    // the clan needs.
    private reserve(careShare: number) {
        const fCare = Math.min(1, careShare);
        const fHelp = this.clan.helpAllocation.total;
        // The settlement's festivals are nobody's choice: they are what the
        // year is, and the clan arranges the rest of its work around them.
        const fFestivals = Math.min(
            Math.max(0, 1 - fCare - fHelp),
            this.clan.festivalWillingness);
        const fLeisure = Math.max(
            EffortAllocation.MIN_REST_SHARE, this.get(Activities.Leisure));
        // Work on the ditches is nobody's assignment either: each clan gives
        // what it is willing to give, and the year is arranged around that.
        const fDitching = Math.min(
            Math.max(0, 1 - fCare - fHelp - fLeisure - fFestivals),
            this.clan.ditchingWillingness);
        const reserved = fCare + fHelp + fLeisure + fDitching + fFestivals;
        const fProduction = Math.max(0, 1 - reserved);

        this.m_.set(Activities.Care, fCare);
        this.m_.set(Activities.Help, fHelp);
        this.m_.set(Activities.Leisure, fLeisure);
        this.m_.set(Activities.Ditching, fDitching);
        this.m_.set(Activities.Festivals, fFestivals);
        this.m_.set(Activities.Production, fProduction);
    }

    // Nutrition the allocation as it stands leaves the clan expecting, as a
    // share of its nutrition target. Judged without the year's luck, as the
    // steps below judge it.
    private expectedFoodShare(): number {
        const target = this.clan.nutritionTarget;
        if (!(this.clan.population > 0) || !(target > 0)) return 1;
        return expectedNutrition(this.clan, this) / target;
    }

    private scoreOption(option: EffortAllocation): number {
        const leisure = option.get(Activities.Leisure);
        if (leisure < EffortAllocation.MIN_REST_SHARE - 1e-9) return -Infinity;

        // Short of its nutrition target, a clan works toward it -- by working
        // more, or by shifting between the nets and the fields for a better
        // balanced diet -- and past it, rests. Judged without the flood or
        // the harvest's luck, neither of which is known while the year's work
        // is still being settled.
        const target = this.clan.nutritionTarget;
        if (!(this.clan.population > 0)) return 1000 + leisure;
        const nutrition = expectedNutrition(this.clan, option);

        if (nutrition >= target - 1e-9) {
            return 1000 + leisure;
        } else {
            return nutrition;
        }
    }

    // Try to make one step change to the allocation. Return true if
    // a change was made.
    applyStep(labor: Map<Process, Map<Clan, number>>): boolean {
        const options: EffortAllocation[] = [
            this.shifted(Processes.Fishing, Processes.Agriculture, 0.05),
            this.shifted(Processes.Agriculture, Processes.Fishing, 0.05),
            this.shiftedActivity(Activities.Leisure, Activities.Production, 0.05),
            this.shiftedActivity(Activities.Production, Activities.Leisure, 0.05),
        ];

        let bestOption: EffortAllocation = this;
        let bestOptionValue = this.scoreOption(this);

        for (const option of options) {
            const optionValue = this.scoreOption(option);
            if (optionValue > bestOptionValue + 1e-6) {
                bestOptionValue = optionValue;
                bestOption = option;
            }
        }
        if (bestOption === this) {
            return false;
        }

        this.m_ = bestOption.m_;
        this.pm_ = bestOption.pm_;
        return true;
    }
}

// The nutrition a clan would get from an allocation if it ate everything it
// grew, less what it has to give up at the festivals. The mix is the mix of
// what it grows. Judged on the expected harvest, without the year's luck.
function expectedNutrition(clan: Clan, allocation: EffortAllocation): number {
    if (!(clan.population > 0)) return 0;
    const er = economicResult(clan, allocation, 'expected');
    const fish = er.production.forGood(TradeGoods.Fish);
    const cereals = er.production.forGood(TradeGoods.Cereals);
    const total = fish + cereals;
    if (!(total > 0)) return 0;
    const eaten = total / clan.population - clan.perCapitaFestivalSacrifice;
    return nutritionOf(eaten, cereals / total);
}

// Whether a clan expecting to meet this share of its nutrition target feels secure
// enough to give its children all the care it wants to.
function isFoodSecure(foodShare: number): boolean {
    return foodShare >= CARE_FOOD_SECURITY - 1e-9;
}

export type Activity = Tagged;

export class Activities {
    static readonly Leisure: Activity = {
        name: 'Leisure',
        sortKey: 4,
        shortName: 'L',
        color: '#ffd700',
    };
    static readonly Care: Activity = {
        name: 'Care',
        sortKey: 3,
        shortName: 'C',
        color: '#ef4444',
    };
    static readonly Help: Activity = {
        name: 'Help',
        sortKey: 2,
        shortName: 'H',
        color: '#34d399',
    };
    static readonly Production: Activity = {
        name: 'Production',
        sortKey: 1,
        shortName: 'P',
        color: '#3b82f6',
    };
    static readonly Ditching: Activity = {
        name: 'Ditching',
        sortKey: 5,
        shortName: 'D',
        color: '#0891b2',
    };
    static readonly Festivals: Activity = {
        name: 'Festivals',
        sortKey: 6,
        shortName: 'F',
        color: '#d946ef',
    };
}

// TODO - add domestic labor and maintenance
// TODO - add ritual and social time
// TODO - add time cost for relationships
