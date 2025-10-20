import type { ClanDTO, SettlementDTO } from "./dtos";
import { TableBuilder, type Table } from "./tablebuilder";

export function buildConsumptionTable(settlement: SettlementDTO): Table {
    return TableBuilder.fromColumnData(
        settlement.clans,
        clan => clan.name,
        clan => clan.consumption.perCapitaAmounts,
    ).addTotalRow().table;
}

export function buildRespectTable(settlement: SettlementDTO): Table {
    return TableBuilder.crossTab(
        settlement.clans,
        clan => clan.name,
        (rowClan, colClan) => rowClan.respect.get(colClan.ref)?.value ?? 0,
    ).addAverageRow(rowClan => (rowClan as ClanDTO).population).table;
}