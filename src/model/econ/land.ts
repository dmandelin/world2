import type { Clan } from "../people/people";
import type { Operation } from "./operation";

export class LandAllocation {
    constructor(readonly m: ReadonlyMap<Operation, number>) {}

    static from(clan: Clan): LandAllocation {
        const totalPopulation = clan.settlement.population;
        const totalLand = 50;

        const m = new Map<Operation, number>();
        for (const operation of clan.operations) {
            m.set(operation, totalLand * clan.population / totalPopulation);
        }
        return new LandAllocation(m);
    }
}