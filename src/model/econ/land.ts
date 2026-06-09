import type { Clan } from "../people/people";
import type { Operation } from "./operation";
import { Processes } from "./process";

export class LandAllocation {
    constructor(readonly m: ReadonlyMap<Operation, number>) {}

    static from(clan: Clan): LandAllocation {
        const totalLand = 50;

        const m = new Map<Operation, number>();
        for (const operation of clan.operations) {
            const totalPopulation = 
                operation.process === Processes.Agriculture
              ? clan.settlement.population
              : clan.cluster.population;
            m.set(operation, totalLand * clan.population / totalPopulation);
        }
        return new LandAllocation(m);
    }
}