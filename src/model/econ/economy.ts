import type { EffortAllocation } from "../decisions/effort";
import type { Clan } from "../people/people";
import { Consumption } from "./consumption";
import { LaborAllocation } from "./labor";
import { LandAllocation } from "./land";
import { produce, type ProductionReport } from "./operation";
import { QualityOfLife } from "./qol";

// The result of one turn's economic activity based on the clan's 
// state, including its effort allocation. No side effects.
export function economicResult(clan: Clan, effort: EffortAllocation): EconomicResult {
    const labor = LaborAllocation.from(clan, effort);
    const land = LandAllocation.from(clan);

    const production = produce(clan.operations, labor.m, land.m);

    const consumption = Consumption.from(
        clan.population,
        effort,
        production);

    const qol = QualityOfLife.from(consumption);

    return {
        production,
        consumption,
        qol,
    };
}

export type EconomicResult = {
    production: ProductionReport,
    consumption: Consumption,
    qol: QualityOfLife,
}