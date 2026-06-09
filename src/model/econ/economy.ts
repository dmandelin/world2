import type { Clan } from "../people/people";
import { Consumption } from "./consumption";
import { LaborAllocation } from "./labor";
import { LandAllocation } from "./land";
import { produce, type ProductionReport } from "./operation";

// The result of one turn's economic activity based on the clan's 
// state, including its effort allocation. No side effects.
export function economicResult(clan: Clan): EconomicResult {
    const labor = LaborAllocation.from(clan, clan.effortAllocation);
    const land = LandAllocation.from(clan);

    clan.production = produce(clan.operations, labor.m, land.m);

    clan.consumption = Consumption.from(
        clan.population,
        clan.effortAllocation,
        clan.production);

    return {
        production: clan.production,
        consumption: clan.consumption,
    };
}

export type EconomicResult = {
    production: ProductionReport,
    consumption: Consumption,
}