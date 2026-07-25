<script lang="ts">
    import { CrossTab, IterableTable } from "./tables/tables2";
    import { MarriageConnection } from "../model/relations/connection";
    import { signed } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import TableView2 from "./tables/TableView2.svelte";
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import type { Snippet } from "svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let world = $derived(settlement.world);

    function isClanInSettlement(clan: ClanDTO): boolean {
        return settlement.clans.some((c) => c.uuid === clan.uuid);
    }

    function buildClansList(): ClanDTO[] {
        const inSettlement = new Set<string>();
        const inSettlementClans: ClanDTO[] = [];
        for (const clan of settlement.clans) {
            inSettlement.add(clan.uuid);
            inSettlementClans.push(clan);
        }

        const sortedInSettlement = sortedByKey(
            inSettlementClans,
            (c) => c.name,
        );

        const outSettlementClansMap = new Map<string, ClanDTO>();
        for (const clan of settlement.clans) {
            for (const other of world.clanMap.values()) {
                if (inSettlement.has(other.uuid)) continue;
                const mi1 = world.marriageInterestToward(clan, other);
                const mi2 = world.marriageInterestToward(other, clan);
                const conn = world.connections.getForType(clan, other, MarriageConnection);
                if ((mi1 && mi1.value !== 0) || (mi2 && mi2.value !== 0) || conn) {
                    outSettlementClansMap.set(other.uuid, other);
                }
            }
        }

        const sortedOutSettlement = sortedByKey(
            Array.from(outSettlementClansMap.values()),
            (c) => c.name,
        );

        return [...sortedInSettlement, ...sortedOutSettlement];
    }

    function marriageInterestCellValue(
        rowClan: ClanDTO,
        colClan: ClanDTO,
    ): number | null {
        const mi = world.marriageInterestToward(rowClan, colClan);
        if (!mi) return null;
        return mi.value;
    }

    function marriageInterestFormat(value: number | null, rowClan?: ClanDTO, colClan?: ClanDTO): string {
        if (value === null) {
            return "";
        }

        const formattedNum = signed(value, 0);
        if (!rowClan || !colClan || rowClan.uuid === colClan.uuid) {
            return formattedNum;
        }

        const clansList = buildClansList();
        const targets = clansList.filter((c) => c.uuid !== rowClan.uuid);
        const values = targets
            .map((c) => ({
                clan: c,
                val: marriageInterestCellValue(rowClan, c),
            }))
            .filter((v): v is { clan: ClanDTO; val: number } => v.val !== null);

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

    function getColClass(clan: ClanDTO): string {
        return isClanInSettlement(clan) ? "" : "out-of-settlement";
    }

    function getRowClass(clan: ClanDTO): string {
        return isClanInSettlement(clan) ? "" : "out-of-settlement";
    }

    function buildMarriageInterestTable(): CrossTab<ClanDTO, number | null> {
        const clansList = buildClansList();

        const table = new CrossTab<ClanDTO, number | null>(
            clansList,
            (clan: ClanDTO) => {
                const suffix = isClanInSettlement(clan) ? "" : " *";
                return clan.name + suffix;
            },
            marriageInterestCellValue,
            marriageInterestFormat as any,
            marriageInterestCellTooltip,
            undefined,
            undefined,
            undefined,
            getColClass,
            getRowClass,
        );

        table.columns.forEach((col) => col.html = true);

        return table;
    }
</script>

{#snippet marriageInterestCellTooltip(
    value: number | null,
    subject: ClanDTO,
    object: ClanDTO,
)}
    {@const mi = world.marriageInterestToward(subject, object)}
    {#if mi && value !== null}
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

<div style="padding: 1rem 2rem;">
    <h3 style="margin: 0 0 0.5rem 0;">Marriage Interest</h3>
    <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">
        Clans from outside this settlement are marked with an asterisk (*) and shaded.
    </p>

    <div class="table-container">
        <TableView2 table={buildMarriageInterestTable()} />
    </div>
</div>

<style>
    .table-container {
        overflow-x: auto;
        max-width: 100%;
        width: fit-content;
        border: 1px solid #e2d9c8;
        border-radius: 6px;
        background-color: #faf6ea;
    }
</style>
