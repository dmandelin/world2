import { economicResult } from "../econ/economy";
import type { Operation } from "../econ/operation";
import { Process, Processes } from "../econ/process";
import { between, chooseFrom, sumFun } from "../lib/basics";
import { isExemplarClan } from "../lib/debug";
import { pct } from "../lib/format";
import type { Clan } from "../people/people";
import type { SkillDef } from "../people/skills";

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

    get(activity: Activity): number {
        return this.m_.get(activity) ?? 0;
    }

    getForProcess(process: Process): number {
        const operation = this.clan.operations.find(op => op.process === process);
        const pf = operation ? this.get(Activities.Production) : 0;
        return pf * (this.pm_.get(process) ?? 0);
    }

    getForSkill(skillDef: SkillDef): number {
        const operation = this.clan.operations.find(op => op.process.skillDef === skillDef);
        if (!operation) return 0;
        return this.get(Activities.Production) * (this.pm_.get(operation.process) ?? 0);
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

    // "Applying" the allocation refers to the process of converting
    // the high-level choices to specific effort allocations.

    // Initialize the application process.
    applyStart() {
        // Reserve effort needed for non-production activities, then
        // have the rest be production.
        const fCare = Math.min(1, 0.25 * this.clan.children / this.clan.effort);
        const fHelp = this.clan.helpAllocation.total;
        const fLeisure = this.get(Activities.Leisure);
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

    // Try to make one step change to the allocation. Return true if 
    // a change was made.
    applyStep(labor: Map<Process, Map<Clan, number>>): boolean {
        const er = economicResult(this.clan, this.clan.effortAllocation);
        if (er.qol.valueFrom("food") < 0) {
            if (true || isExemplarClan(this.clan)) {
                console.log(`[Effort] ${this.clan.name} has food stress, value is ${er.qol.valueFrom("food").toFixed(2)}`);
                console.log(this.clan.effortAllocation.debugString());
                console.log(er.qol.debugString);
            }

            // Try shifting activities. Here, we assume that under stress,
            // clans try something different for a while, so they can find
            // out how good the results are.
            const options = [
                this.shifted(Processes.Fishing, Processes.Agriculture, 0.05),
                this.shifted(Processes.Agriculture, Processes.Fishing, 0.05),
            ];
            let bestOption: EffortAllocation = this;
            let bestOptionValue = er.qol.valueFrom("food");
            for (const option of options) {
                const optionResult = economicResult(this.clan, option);
                const optionValue = optionResult.qol.valueFrom("food");
                if (optionValue > bestOptionValue) {
                    bestOptionValue = optionValue;
                    bestOption = option;
                }
            }
            if (bestOption !== this) {
                console.log(`Shifting effort for ${this.clan.name} from ${this.debugString()} to ${bestOption.debugString()} with expected food QoL change from ${er.qol.valueFrom("food").toFixed(2)} to ${bestOptionValue.toFixed(2)}`);
            }
            this.pm_ = bestOption.pm_;
            return true;
        }

        return false;
    }
}

export type Activity = {
    name: string;
    sortKey: number;
    shortName: string;
    color: string;
}

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