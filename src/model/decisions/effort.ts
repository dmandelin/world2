import { economicResult } from "../econ/economy";
import { Processes } from "../econ/econdefs";
import { isExemplarClan } from "../lib/debug";
import { pct } from "../lib/format";
import type { Clan } from "../people/people";
import type { SkillDef } from "../people/skills";
import type { Process } from "../econ/process";
import type { Tagged } from "../econ/tagged";

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

    constructor(
        readonly clan: Clan,
        m?: ReadonlyMap<Activity, number>,
        pm?: ReadonlyMap<Process, number>) {

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
        return farmingEffort / (farmingEffort + fishingEffort);
    }

    clone(): EffortAllocation {
        return new EffortAllocation(this.clan, this.m_, this.pm_);
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
        return new EffortAllocation(this.clan, this.m_, new Map(pm));
    }

    shiftedActivity(from: Activity, to: Activity, delta: number): EffortAllocation {
        const actualDelta = Math.min(this.get(from), delta);

        const m = new Map(this.m_);
        m.set(from, this.get(from) - actualDelta);
        m.set(to, this.get(to) + actualDelta);
        return new EffortAllocation(this.clan, m, this.pm_);
    }

    // "Applying" the allocation refers to the process of converting
    // the high-level choices to specific effort allocations.

    // Initialize the application process.
    applyStart() {
        // Reserve effort needed for non-production activities, then
        // have the rest be production. Enforce at least 15% leisure.
        const fCare = Math.min(1, 0.25 * this.clan.children / this.clan.effort);
        const fHelp = this.clan.helpAllocation.total;
        const fLeisure = Math.max(0.15, this.get(Activities.Leisure));
        const reserved = fCare + fHelp + fLeisure;
        const fProduction = Math.max(0, 1 - reserved);

        this.m_.set(Activities.Care, fCare);
        this.m_.set(Activities.Help, fHelp);
        this.m_.set(Activities.Leisure, fLeisure);
        this.m_.set(Activities.Production, fProduction);

        if (isExemplarClan(this.clan)) {
            console.log(
                `Start effort allocation for ${this.clan.name}:`,
                this.clan.effortAllocation.debugString());
        }
    }

    private scoreOption(option: EffortAllocation): number {
        const leisure = option.get(Activities.Leisure);
        if (leisure < 0.15 - 1e-9) return -Infinity;

        const er = economicResult(this.clan, option);
        const targetPerCapita = this.clan.foodTargetPerCapita;
        const foodPerCapita = (this.clan.population > 0) ? er.production.totalFood() / this.clan.population : targetPerCapita;

        if (foodPerCapita >= targetPerCapita - 1e-9) {
            return 1000 + leisure;
        } else {
            return foodPerCapita;
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
}

// TODO - add domestic labor and maintenance
// TODO - add ritual and social time
// TODO - add time cost for relationships