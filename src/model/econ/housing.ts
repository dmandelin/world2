import type { Clan } from "../people/people";

export class Housing {
    constructor(
        readonly name: string, 
        readonly description: string,
        readonly shelter: number,
        readonly basePrestige: number,
        readonly constructionCost: number,
        readonly maintenanceCost: number,

    ) {}

    // Cost in fraction of one turn's labor.
    cost(clan: Clan): number {
        // Startup case.
        if (!clan.settlement) return 0;

        // Amortized over the life of the building.
        const initialConstructionCost = this.constructionCost
            * clan.world.yearsPerTurn
            / 100;

        // Houses must be rebuilt as the settlement shifts.
        const forcedMigrationCost = clan.settlement.forcedMigrations
            * this.constructionCost
            / clan.world.yearsPerTurn
            // Forced moves might be more expensive.
            * 2;

        // Direct damage to houses from flooding.
        const damageCost = this.constructionCost * clan.settlement.floodLevel.damageFactor;

        return initialConstructionCost
             + forcedMigrationCost + this.maintenanceCost + damageCost;
    }
}   

export const HousingTypes = {
    Huts: new Housing(
        "Huts", 
        "Small, simple mud dwellings, mainly for sleeping.", 
        1,
        0, 
        0,
        0.02,
    ),
    Cottages: new Housing(
        "Cottages", 
        "Small but permanent mud houses with a thatched roof.", 
        2,
        2, 
        0.15,
        0.05,
    ),
    Houses: new Housing(
        "Houses", 
        "Permanent mud houses", 
        3,
        5, 
        0.5,
        0.05),
}
