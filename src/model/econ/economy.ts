import type { EffortAllocation } from "../decisions/effort";
import type { Clan } from "../people/people";
import { Consumption } from "./consumption";
import { OperationHelp } from "./help";
import { LaborAllocation } from "./labor";
import { LandAllocation } from "./land";
import { produce, type ProductionReport } from "./operation";
import { QualityOfLife } from "./qol";

// The result of one turn's economic activity based on the clan's 
// state, including its effort allocation. No side effects.
export function economicResult(
    clan: Clan, 
    effort: EffortAllocation): EconomicResult {

    // Data we read off of the clan. These will be effectively
    // fixed during optimization.
    const operations = clan.operations;
    const population = clan.population;
    const helpReceived = clan.helpReceived;

    const labor = LaborAllocation.from(clan, effort);
    const land = LandAllocation.from(clan);
    const help = OperationHelp.from(clan, helpReceived);

    const production = produce(operations, labor.m, land.m, help.m);

    const consumption = Consumption.from(population, effort, production);

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