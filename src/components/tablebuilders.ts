import type { Snippet } from "svelte";
import type { ClanDTO, SettlementDTO } from "./dtos";
import { TableBuilder, type Table } from "./tablebuilder";
import type { RespectCalc, RespectCalcItem } from "../model/people/respect";

export function buildConsumptionTable(settlement: SettlementDTO): Table<string, ClanDTO> {
    return TableBuilder.fromColumnData(
        settlement.clans,
        clan => clan.name,
        clan => clan.consumption.perCapitaAmounts,
    ).addTotalRow().table;
}

export function buildRespectTable(
    settlement: SettlementDTO, respectCellTooltip: Snippet<[ClanDTO, ClanDTO]>): Table<ClanDTO, ClanDTO> {

    return TableBuilder.crossTab(
        settlement.clans,
        clan => clan.name,
        (rowClan, colClan) => rowClan.respect.get(colClan.ref)?.value ?? 0,
        respectCellTooltip,
    )
    .addAverageRow(rowClan => (rowClan as ClanDTO).population).table;
}

export function buildRespectTooltip(
    clan: ClanDTO, targetClan: ClanDTO): Table<RespectCalcItem, string> {
    const respectCalc: RespectCalc = clan.respect.get(targetClan.ref)!;
    return TableBuilder.fromRecordItems(
        respectCalc.items,
        [
            { label: '', valueFn: item => item.value },

        ])
        .addTotalRow()
        .table;
}