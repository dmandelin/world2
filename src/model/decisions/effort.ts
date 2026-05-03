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
    readonly f = new Map<Activity, number>();

    constructor(readonly clan: Clan) {
        this.f.set(ProductionActivity, 0.5);
        this.f.set(CareActivity, 0.3);
        this.f.set(LesiureActivity, 0.2);
    }

    entries(): IterableIterator<[Activity, number]> {
        return this.f.entries();
    }

    get(activity: Activity): number {
        return this.f.get(activity) ?? 0;
    }

    clone(): EffortAllocation {
        const clone = new EffortAllocation(this.clan);
        for (const [activity, fraction] of this.f.entries()) {
            clone.f.set(activity, fraction);
        }
        return clone;
    }

    apply() {
        // Effort fraction needed for child care.
        const fCare = Math.min(1, 0.25 * this.clan.children / this.clan.effort);

        // Effort fraction needed to produce enough food.
        // TODO - Base this on actual productivity.
        const fProduction = Math.max(0, 0.9 - fCare);

        // Effort fraction left for leisure.
        const fLeisure = Math.max(0, 1 - fCare - fProduction);

        this.f.set(ProductionActivity, fProduction);
        this.f.set(CareActivity, fCare);
        this.f.set(LesiureActivity, fLeisure);
    }
}

export type Activity = {
    name: string;
    shortName?: string;
}

export const LesiureActivity: Activity = { name: 'Leisure', shortName: 'L' };
export const CareActivity: Activity = { name: 'Care', shortName: 'C' };
export const ProductionActivity: Activity = { name: 'Production', shortName: 'P' };

// TODO - add domestic labor and maintenance
// TODO - add ritual and social time
// TODO - add time cost for relationships