import type { EffortAllocation } from "../decisions/effort";
import type { Clan } from "../people/people";
import type { Operation } from "./operation";
import { Processes } from "./process";

export class LaborAllocation {

    constructor(readonly m: ReadonlyMap<Operation, number>) {}

    static from(clan: Clan, effort: EffortAllocation): LaborAllocation {
        const m = new Map<Operation, number>();
        // Populate labor allocation based on effort allocation.
        for (const [activity, value] of effort) {
            switch (activity.operation?.process) {
                case Processes.Fishing:
                    m.set(clan.operations.find(op => op.process === Processes.Fishing)!, value * clan.workers);
                    break;
                case Processes.Agriculture:
                    m.set(clan.operations.find(op => op.process === Processes.Agriculture)!, value * clan.workers);
                    break;
            }
        }
        return new LaborAllocation(m);
    }
}