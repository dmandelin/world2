import type { EffortAllocation } from "../decisions/effort";
import type { Clan } from "../people/people";
import type { Operation } from "./operation";
import { Processes } from "./econdefs";

export class LaborAllocation {

    constructor(readonly m: ReadonlyMap<Operation, number>) {}

    static from(clan: Clan, effort: EffortAllocation): LaborAllocation {
        const m = new Map<Operation, number>();
        // Populate labor allocation based on effort allocation.
        for (const [process, fraction] of effort.forProduction()) {
            switch (process) {
                case Processes.Fishing:
                    m.set(clan.operations.find(op => op.process === Processes.Fishing)!, fraction * clan.workers);
                    break;
                case Processes.Agriculture:
                    m.set(clan.operations.find(op => op.process === Processes.Agriculture)!, fraction * clan.workers);
                    break;
            }
        }
        return new LaborAllocation(m);
    }
}