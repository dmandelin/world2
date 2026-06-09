import { economicResult } from "../econ/economy";
import type { Operation } from "../econ/operation";
import { Process, Processes } from "../econ/process";
import { between, chooseFrom, sumFun } from "../lib/basics";
import { isExemplarClan } from "../lib/debug";
import type { Clan } from "../people/people";
import type { SkillDef } from "../people/skills";

// How a clan allocates its "effort", which subsumes time taken
// (including preparation and recovery) and other factors not
// explicitly modeled, such as mental discipline.
//
// Effort is measured in units, where 1 "average adult" produces
// 1 unit of effort per turn. Effort is allocated in fractions.
export class EffortAllocation {
    // f for fractions.
    // These should be whole percentages, and must sum to 1.0.
    private f_: [Activity, number][];

    constructor(readonly clan: Clan, f?: [Activity, number][]) {
        // Fixed allocations for basic activities.
        this.f_ = f ? [...f] : [
            [Activities.Leisure, 0.2],
            [Activities.Care, 0.2],
        ];
        const remaining = 1 - sumFun(this.f_, ([_, fraction]) => fraction);

        if (!f) {
            // Start with production 80% fishing and 20% farming.
            const fFishing = 0.8 * remaining;
            const fAgriculture = remaining - fFishing;
            for (const operation of this.clan.operations) {
                if (operation.process === Processes.Fishing) {
                    this.f_.push([Activities.Production(operation), fFishing]);
                } else if (operation.process === Processes.Agriculture) {
                    this.f_.push([Activities.Production(operation), fAgriculture]);
                }
            }
        }
    }

    debugString(): string {
        return this.f_.map(([activity, fraction]) => `${activity.name}: ${fraction.toFixed(2)}`).join(', ');
    }

    [Symbol.iterator](): Iterator<[Activity, number]> {
        return this.f_[Symbol.iterator]();
    }

    private getEntries(activityName: string): [Activity, number][] {
        return this.f_.filter(([a, _]) => a.name === activityName);
    }

    private getEntry(activity: Activity): [Activity, number]|undefined {
        return this.f_.find(([a, _]) => a.name === activity.name
             && a.operation === activity.operation);
    }

    private getOrCreateEntry(activity: Activity): [Activity, number] {
        let entry = this.getEntry(activity);
        if (!entry) {
            entry = [activity, 0];
            this.f_.push(entry);
        }
        return entry;
    }

    get(activity: Activity): number {
        const entry = this.getEntry(activity);
        return entry ? entry[1] : 0;
    }

    getForProcess(process: Process): number {
        const operation = this.clan.operations.find(op => op.process === process);
        return operation ? this.get(Activities.Production(operation)) : 0;
    }

    getForSkill(skillDef: SkillDef): number {
        const operation = this.clan.operations.find(op => op.process.skillDef === skillDef);
        return operation ? this.get(Activities.Production(operation)) : 0;
    }

    farmingRatio(): number {
        const farmingEffort = this.getForProcess(Processes.Agriculture);
        const fishingEffort = this.getForProcess(Processes.Fishing);
        return farmingEffort / (farmingEffort + fishingEffort);
    }

    clone(): EffortAllocation {
        return new EffortAllocation(this.clan, this.f_);
    }

    shifted(from: Process, to: Process, delta: number): EffortAllocation {
        const actualDelta = Math.min(this.getForProcess(from), delta);

        const f = this.f_.map(([activity, fraction]): [Activity, number] => {
            if (activity.operation?.process === from) {
                return [activity, fraction - actualDelta];
            } else if (activity.operation?.process === to) {
                return [activity, fraction + actualDelta];
            } else {
                return [activity, fraction];
            }
        });
        return new EffortAllocation(this.clan, f);
    }

    // "Applying" the allocation refers to the process of converting
    // the high-level choices to specific effort allocations.

    // Initialize the application process.
    applyStart() {
        // Reserve effort needed for child care and initially leave
        // the rest for leisure.
        const fCare = Math.min(1, 0.25 * this.clan.children / this.clan.effort);

        // If we need more or less care than we have now, adjust everything
        // else proportionally.
        const careDelta = fCare - this.get(Activities.Care);
        const leisureEntry = this.getEntry(Activities.Leisure);
        if (leisureEntry) {
            leisureEntry[1] -= careDelta;
        }
        this.getOrCreateEntry(Activities.Care)[1] += careDelta;

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
            this.f_ = bestOption.f_;
            return true;
        }

        return false;
    }
}

export type Activity = {
    name: string;
    sortKey: number;
    shortName?: string;
    color?: string;
    operation?: Operation;
}

export class Activities {
    static readonly Leisure: Activity = { 
        name: 'Leisure', 
        sortKey: -1, 
        shortName: 'L', 
        color: '#ffd700',
     };
    static readonly Care: Activity = { 
        name: 'Care', 
        sortKey: -2, 
        shortName: 'C', 
        color: '#ef4444' };

    static Production(operation: Operation): Activity {
        // TODO - It would be nice to cache these, but a naive approach
        //        leaks memory.
        return { 
            name: `Production (${operation.process.name})`, 
            sortKey: operation.process.sortKey, 
            shortName: operation.process.shortName, 
            color: operation.process.color, 
            operation };
    }
}

// TODO - add domestic labor and maintenance
// TODO - add ritual and social time
// TODO - add time cost for relationships