import type { ProductionNode } from "../econ/productionnode";
import { between, chooseFrom, sumFun } from "../lib/basics";
import type { Clan } from "../people/people";

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
        this.f_ = f ? [...f] : [
            [Activities.Leisure, 0.7],
            [Activities.Care, 0.3],
        ];
    }

    [Symbol.iterator](): Iterator<[Activity, number]> {
        return this.f_[Symbol.iterator]();
    }

    private getEntries(activityName: string): [Activity, number][] {
        return this.f_.filter(([a, _]) => a.name === activityName);
    }

    private getEntry(activity: Activity): [Activity, number]|undefined {
        return this.f_.find(([a, _]) => a.name === activity.name && a.node === activity.node);
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

    getForNode(node: ProductionNode): number {
        return this.getEntry(Activities.Production(node))?.[1] ?? 0;
    }

    clone(): EffortAllocation {
        return new EffortAllocation(this.clan, this.f_);
    }

    // "Applying" the allocation refers to the process of converting
    // the high-level choices to specific effort allocations.

    // Initialize the application process.
    applyStart() {
        // Reserve effort needed for child care and initially leave
        // the rest for leisure.
        const fCare = Math.min(1, 0.25 * this.clan.children / this.clan.effort);
        this.f_ = [
            [Activities.Leisure, 1 - fCare],
            [Activities.Care, fCare],
        ];
    }

    // Try to make one step change to the allocation. Return true if 
    // a change was made.
    applyStep(labor: Map<ProductionNode, Map<Clan, number>>): boolean {
        const expectedProduction = sumFun(
            this.clan.productionNodes, 
            node => node.output(labor.get(node) ?? new Map(), this.clan));
        if (expectedProduction < 0.95 * this.clan.population) {
            // Not enough: work more at the expense of leisure. Note that clans
            // don't necessarily know exactly what has the most marginal production.
            // For now we'll be very simple about that and make it random.
            const leisureEntry = this.getEntry(Activities.Leisure);
            if (!leisureEntry || leisureEntry[1] <= 0) return false;

            const delta = Math.min(0.05, leisureEntry[1]);
            const node = chooseFrom(this.clan.productionNodes);

            leisureEntry[1] -= delta;
            this.getOrCreateEntry(Activities.Production(node))[1] += delta;

            return true;
        }
        
        if (expectedProduction > 1.05 * this.clan.population) {
            // More than enough: work less and enjoy more leisure.
            const workedNodes = this.clan.productionNodes.filter(node => this.get(Activities.Production(node)) > 0);
            const node = chooseFrom(workedNodes);

            const delta = Math.min(0.05, this.get(Activities.Production(node)));

            this.getOrCreateEntry(Activities.Production(node))[1] -= delta;
            this.getOrCreateEntry(Activities.Leisure)[1] += delta;

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
    node?: ProductionNode;
}

class Activities {
    static readonly Leisure: Activity = { name: 'Leisure', sortKey: 999, shortName: 'L', color: '#3b82f6' };
    static readonly Care: Activity = { name: 'Care', sortKey: 998, shortName: 'C', color: '#ef4444' };

    static Production(node: ProductionNode): Activity {
        // TODO - It would be nice to cache these, but a naive approach
        //        leaks memory.
        return { name: `Production (${node.name})`, sortKey: node.sortKey, shortName: node.shortName, color: node.color, node };
    }
}

// TODO - add domestic labor and maintenance
// TODO - add ritual and social time
// TODO - add time cost for relationships