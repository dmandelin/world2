import type { Snippet } from "svelte";
import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
import { TableBuilder, type Table } from "./tablebuilder";
import { getLocalRespect, type Respect, type RespectItem } from "../model/relations/respect";
import { signed } from "../model/lib/format";
import { sortedByKey } from "../model/lib/basics";

export function buildConsumptionTable(settlement: SettlementDTO): Table<string, ClanDTO> {
    return TableBuilder.fromColumnData(
        settlement.clans,
        clan => clan.name,
        clan => {
            const record: Record<string, number> = {};
            for (const [good, cg] of clan.consumption.m.entries()) {
                record[good.name] = cg.consumed;
            }
            return record;
        },
        value => value?.toFixed(2),
    ).addTotalRow().table;
}

export function buildRespectTable(
    settlement: SettlementDTO, respectCellTooltip: Snippet<[ClanDTO, ClanDTO]>): Table<ClanDTO, ClanDTO> {

    return TableBuilder.crossTab(
        sortedByKey(settlement.clans, c => -getLocalRespect(c)),
        clan => clan.name,
        (rowClan, colClan) => settlement.world.respectToward(rowClan, colClan)?.value ?? 0,
        value => signed(value, 2),
        respectCellTooltip,
    )
    .addAverageRow(rowClan => (rowClan as ClanDTO).population).table;
}

export function buildRespectTooltip(
    clan: ClanDTO, targetClan: ClanDTO): Table<RespectItem, string> {
    const respectCalc = clan.settlement.world.respectToward(clan, targetClan)!;
    return TableBuilder.fromKeyedItems<'label', RespectItem>(
        respectCalc.items,
        'label',
        [
            { label: '', valueFn: item => item.value, formatFn: value => signed(value, 2) },
        ])
        .addTotalRow()
        .table;
}