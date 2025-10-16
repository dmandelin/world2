import type { SettlementDTO } from "./dtos";
import { mapRecord, TableBuilder, type Table } from "./tablebuilder";

export function buildConsumptionTable(settlement: SettlementDTO): Table {
    return TableBuilder.fromColumnData(
        settlement.clans,
        clan => clan.name,
        clan => clan.consumption.perCapitaAmounts,
    ).addTotalRow().table;
}