<script lang="ts">
    import {
        CrossTab,
        IterableTable,
        type RowDataRowSpec,
    } from "./tables/tables2";
    import { pct, signed, unsigned, unsignedFormat } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import TableView2 from "./tables/TableView2.svelte";
    import { AffNode } from "../model/relations/affinity";
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let world = $derived(settlement.world);

    let mode: "Relative" | "Absolute" = $state("Relative");

    function isClanInSettlement(clan: ClanDTO): boolean {
        return settlement.clans.some((c) => c.uuid === clan.uuid);
    }

    // The settlement's clans first, then any clan outside it that one of them
    // knows, so ties across settlements show up too.
    function buildClansList(): ClanDTO[] {
        const inSettlement = new Set(settlement.clans.map((c) => c.uuid));
        const outside = new Map<string, ClanDTO>();
        for (const clan of settlement.clans) {
            for (const [otherID] of world.perceptions.getFor(clan.uuid)) {
                if (inSettlement.has(otherID)) continue;
                const other = world.clanMap.get(otherID);
                if (other) outside.set(otherID, other);
            }
        }
        return [
            ...sortedByKey([...settlement.clans], (c) => c.name),
            ...sortedByKey([...outside.values()], (c) => c.name),
        ];
    }

    function cellValue(subject: ClanDTO, object: ClanDTO): number | null {
        const affinity = world.affinityToward(subject, object);
        if (!affinity) return null;
        return mode === "Relative" ? affinity.relative : affinity.absolute;
    }

    function format(value: number | null): string {
        if (value === null) return "";
        return mode === "Relative" ? signed(value, 2) : value.toFixed(2);
    }

    // Average over the clans in the table who know the column clan.
    function avgToward(object: ClanDTO, clans: ClanDTO[]): number | null {
        let sum = 0;
        let count = 0;
        for (const subject of clans) {
            if (subject.uuid === object.uuid) continue;
            const value = cellValue(subject, object);
            if (value === null) continue;
            sum += value;
            ++count;
        }
        return count > 0 ? sum / count : null;
    }

    function outClass(clan: ClanDTO): string {
        return isClanInSettlement(clan) ? "" : "out-of-settlement";
    }

    function buildTable(): CrossTab<ClanDTO, number | null> {
        // Read so the table rebuilds when the mode changes.
        void mode;
        const clans = buildClansList();
        const rowDataRows: RowDataRowSpec<ClanDTO>[] = [
            {
                label: "Avg Toward",
                valueFn: (col: ClanDTO) => avgToward(col, clans),
                formatFn: format,
                divider: true,
            },
        ];
        return new CrossTab<ClanDTO, number | null>(
            clans,
            (c) => (isClanInSettlement(c) ? c.name : `${c.name}*`),
            cellValue,
            format,
            cellTooltip,
            undefined,
            undefined,
            rowDataRows,
            outClass,
            outClass,
        );
    }
    let table = $derived(buildTable());

    // The same as the Alignment table on the Relationships panel, here to be
    // read against affinity.
    function buildAlignmentTable(): CrossTab<ClanDTO, number> {
        const t = new CrossTab<ClanDTO, number>(
            sortedByKey([...settlement.clans], (c) => c.name),
            (c) => c.name,
            (row, col) => world.alignmentToward(row, col)?.value ?? 0,
            unsignedFormat(2),
            alignmentCellTooltip,
        );
        t.showDiagonal = true;
        return t;
    }
    let alignmentTable = $derived(buildAlignmentTable());

    function formatStep(value: number, role: string, id: string): string {
        // The temperament parts are offsets around 0, not shares.
        if (id === AffNode.TemperamentShared || id === AffNode.TemperamentOwn)
            return signed(value, 2);
        if (role === "input") return pct(value);
        return value.toFixed(2);
    }
</script>

{#snippet alignmentCellTooltip(
    value: number,
    subject: ClanDTO,
    object: ClanDTO,
)}
    {@const a = world.alignmentToward(subject, object)}
    {#if a}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
            <TableView2
                table={new IterableTable(a.items, (i) => i.label, [
                    {
                        data: "Value",
                        label: "Value",
                        valueFn: (i) => i.value,
                        formatFn: (i: number) => signed(i, 2),
                    },
                    {
                        data: "Mod",
                        label: "Mod",
                        valueFn: (i) => i.modifier,
                        formatFn: (i: number) => unsigned(i, 2),
                    },
                    {
                        data: "Base",
                        label: "Base",
                        valueFn: (i) => i.baseValue,
                        formatFn: (i: number) => signed(i, 2),
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
                    <span>Previous Value:</span>
                    <strong>{signed(a.previousValue, 2)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.25rem; border-top: 1px dashed #eee; padding-top: 0.25rem;">
                    <span>Current Value:</span>
                    <strong>{signed(a.value, 2)}</strong>
                </div>
            </div>
        </div>
    {/if}
{/snippet}

{#snippet cellTooltip(value: number | null, subject: ClanDTO, object: ClanDTO)}
    {@const affinity = world.affinityToward(subject, object)}
    {#if affinity && value !== null}
        {@const report = affinity.report(subject, object)}
        <div class="tip">
            <strong>Affinity ({subject.name} → {object.name})</strong>
            <table>
                <tbody>
                    {#each report.steps as { def, value: v }}
                        <tr
                            class:factor={def.role === "factor"}
                            class:input={def.role === "input"}
                            class:result={def.role === "result"}
                            title={def.note}
                        >
                            <td>{def.label}</td>
                            <td class="num">{formatStep(v, def.role, def.id)}</td>
                        </tr>
                    {/each}
                    <tr class="input">
                        <td>{subject.name} average</td>
                        <td class="num">{affinity.mean.toFixed(2)}</td>
                    </tr>
                    <tr class="result">
                        <td>Relative</td>
                        <td class="num">{signed(affinity.relative, 2)}</td>
                    </tr>
                </tbody>
            </table>
            <p class="note">
                Relative = (affinity − average) / (1 − average), the average
                being over the clans {subject.name} knows.
            </p>
        </div>
    {/if}
{/snippet}

<div>
    <div class="controls">
        <div class="button-group">
            {#each ["Relative", "Absolute"] as const as option}
                <button
                    type="button"
                    class="mode-btn {mode === option ? 'active' : ''}"
                    onclick={() => (mode = option)}>{option}</button
                >
            {/each}
        </div>
    </div>

    <p class="caption">
        {#if mode === "Relative"}
            How much more or less each row clan has in common with each column
            clan than with the clans it knows on average. 1 is as much as with
            itself; 0 is average.
        {:else}
            How similar and compatible each row clan finds each column clan,
            from 0 to 1: the average of kinship, residence, livelihood and
            temperament.
        {/if}
        Clans from outside this settlement are marked with an asterisk (*).
    </p>

    <div class="tables">
        <section>
            <h3>Affinity</h3>
            <div class="table-container">
                <TableView2 {table} />
            </div>
        </section>
        <section>
            <h3>Alignment</h3>
            <div class="table-container">
                <TableView2 table={alignmentTable} />
            </div>
        </section>
    </div>
</div>

<style>
    .controls {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    .button-group {
        display: inline-flex;
        gap: 0.25rem;
        background-color: #f3edd8;
        padding: 0.25rem;
        border-radius: 4px;
    }
    .mode-btn {
        all: unset;
        font-size: 0.9rem;
        padding: 0.25rem 0.75rem;
        cursor: pointer;
        border-radius: 3px;
        color: #333;
    }
    .mode-btn:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }
    .mode-btn.active {
        font-weight: bold;
        background-color: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .caption {
        font-size: 0.9rem;
        color: #666;
        margin-bottom: 1rem;
    }
    .tables {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 1.5rem;
    }
    .tables h3 {
        margin: 0 0 0.5rem;
    }
    .table-container {
        overflow-x: auto;
        max-width: 100%;
        width: fit-content;
        border: 1px solid #e2d9c8;
        border-radius: 6px;
        background-color: #faf6ea;
    }
    .tip {
        font-size: 0.9em;
        padding: 0.25rem;
        min-width: 260px;
    }
    .tip table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 0.25rem;
    }
    .tip td {
        padding: 0.05rem 0.25rem;
    }
    .tip .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }
    .tip tr.input td {
        color: #777;
        padding-left: 1rem;
    }
    .tip tr.result td {
        font-weight: bold;
        border-top: 1px solid #ccc;
    }
    .tip .note {
        margin: 0.25rem 0 0;
        color: #666;
        font-size: 0.85em;
    }
</style>
