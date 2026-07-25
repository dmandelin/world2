<script lang="ts">
    import { CrossTab, IterableTable } from "./tables/tables2";
    import { signed } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import TableView2 from "./tables/TableView2.svelte";
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import type { Snippet } from "svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let world = $derived(settlement.world);
    let clans = $derived(settlement.clans);

    function marriageInterestCellValue(
        rowClan: ClanDTO,
        colClan: ClanDTO,
    ): number {
        const mi = world.marriageInterestToward(rowClan, colClan);
        if (!mi) return 0;
        return mi.value;
    }

    function marriageInterestFormat(value: number, rowClan?: ClanDTO, colClan?: ClanDTO): string {
        const formattedNum = signed(value, 0);
        if (!rowClan || !colClan) {
            return formattedNum;
        }
        if (rowClan.uuid === colClan.uuid) {
            return formattedNum;
        }

        // Rank other clans for this rowClan (excluding itself)
        const targets = clans.filter((c) => c.uuid !== rowClan.uuid);
        const values = targets.map((c) => ({
            clan: c,
            val: marriageInterestCellValue(rowClan, c),
        }));
        values.sort((a, b) => b.val - a.val);

        const rankIdx = values.findIndex((v) => v.clan.uuid === colClan.uuid);

        if (rankIdx === 0) {
            return `${formattedNum}<span style="color: #ffd700; margin-left: 4px; font-weight: bold;">★</span>`;
        } else if (rankIdx === 1) {
            return `${formattedNum}<span style="color: #a0a0a0; margin-left: 4px; font-weight: bold;">★</span>`;
        } else if (rankIdx === 2) {
            return `${formattedNum}<span style="color: #cd7f32; margin-left: 4px; font-weight: bold;">★</span>`;
        }
        return `${formattedNum}<span style="color: transparent; margin-left: 4px; font-weight: bold;">★</span>`;
    }

    function buildRelationshipsTable<CellValue>(
        valueFn: (rowClan: ClanDTO, colClan: ClanDTO) => CellValue,
        formatFn: (value: CellValue, row?: ClanDTO, col?: ClanDTO) => string,
        cellTooltip: Snippet<[CellValue, ClanDTO, ClanDTO]>,
        html?: boolean,
    ): CrossTab<ClanDTO, CellValue> {
        const sortedClans: ClanDTO[] = sortedByKey(settlement.clans, (c) => c.name);

        const table = new CrossTab<ClanDTO, CellValue>(
            sortedClans,
            (clan: ClanDTO) => clan.name,
            valueFn,
            formatFn as any,
            cellTooltip,
        );

        if (html) {
            table.columns.forEach((col) => col.html = true);
        }

        return table;
    }
</script>

{#snippet marriageInterestCellTooltip(
    value: number,
    subject: ClanDTO,
    object: ClanDTO,
)}
    {@const mi = world.marriageInterestToward(subject, object)}
    {#if mi}
        {@const rawTotal = mi.items.reduce((sum, item) => sum + item.value, 0)}
        {@const infoMultiplier = Math.max(0, Math.min(1, mi.informationValue))}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
            <TableView2
                table={new IterableTable(mi.items, (i) => i.label, [
                    {
                        data: "Value",
                        label: "Value",
                        valueFn: (i) => i.value,
                        formatFn: (i: number) => signed(i, 1),
                    },
                    {
                        data: "Base",
                        label: "Base",
                        valueFn: (i) => i.baseValue,
                        formatFn: (i: number) => signed(i, 1),
                    },
                    {
                        data: "Explanation",
                        label: "Explanation",
                        valueFn: (i) => i.explanation,
                    },
                ])}
            ></TableView2>
            <div style="margin-top: 0.5rem; border-top: 1px solid #ccc; padding-top: 0.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span>Raw Total:</span>
                    <strong>{signed(rawTotal, 1)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span>Information Multiplier:</span>
                    <strong>{infoMultiplier.toFixed(2)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.25rem; border-top: 1px dashed #eee; padding-top: 0.25rem;">
                    <span>Final Value:</span>
                    <strong>{signed(mi.value, 1)}</strong>
                </div>
            </div>
        </div>
    {/if}
{/snippet}

<div>
    <h3>Marriage Interest</h3>
    <TableView2
        table={buildRelationshipsTable(
            marriageInterestCellValue,
            marriageInterestFormat,
            marriageInterestCellTooltip,
            true,
        )}
    ></TableView2>
</div>
