<script lang="ts">
    import { CrossTab, IterableTable } from "./tables/tables2";
    import {
        signed,
        signedFormat,
        unsigned,
        unsignedFormat,
    } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import TableView2 from "./tables/TableView2.svelte";
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import type { Snippet } from "svelte";
    import ConflictDetailsTable from "./tables/ConflictDetailsTable.svelte";
    import { BasicInteraction } from "../model/relations/basicinteraction";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let world = $derived(settlement.world);

    let stressMode: "stress" | "mutual aid" | "conflict" = $state("stress");
    let interactionMode: "interactions" | "information" =
        $state("interactions");
    let opinionMode: "respect" = $state("respect");

    function buildRelationshipsTable<CellValue>(
        valueFn: (rowClan: ClanDTO, colClan: ClanDTO) => CellValue,
        formatFn: (value: CellValue, row?: ClanDTO, col?: ClanDTO) => string,
        cellTooltip: Snippet<[CellValue, ClanDTO, ClanDTO]>,
        html?: boolean,
    ): CrossTab<ClanDTO, CellValue> {
        const sortedClans: ClanDTO[] = sortedByKey(
            settlement.clans,
            (c) => c.name,
        );

        const table = new CrossTab<ClanDTO, CellValue>(
            sortedClans,
            (clan: ClanDTO) => clan.name,
            valueFn,
            formatFn as any,
            cellTooltip,
        );

        if (html) {
            table.columns.forEach((col) => (col.html = true));
        }

        return table;
    }

    function interactionLevelCellValue(
        rowClan: ClanDTO,
        colClan: ClanDTO,
    ): number {
        const att = world.attentionTo(rowClan, colClan);
        return att / colClan.population;
    }

    function informationCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        const info = world.informationToward(rowClan, colClan);
        return info ? info.value : 0;
    }

    function alignmentCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        const a = world.alignmentToward(rowClan, colClan);
        if (!a) return 0;
        return a.value;
    }

    function conflictCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        const c = world.conflictBetween(rowClan, colClan);
        if (!c) return 0;
        return c.value(rowClan);
    }

    function mutualAidCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        const interactions = world.interactions.get(rowClan, colClan);
        let value = 0;
        for (const interaction of interactions) {
            if (interaction instanceof BasicInteraction) {
                const amount = Math.min(
                    interaction.amount1to2,
                    interaction.amount2to1,
                );
                if (amount > 0) {
                    value += amount / rowClan.population;
                }
            }
        }
        return 5 * value;
    }

    function stressCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        return (
            conflictCellValue(rowClan, colClan) +
            mutualAidCellValue(rowClan, colClan)
        );
    }

    function opinionToward(rowClan: ClanDTO, colClan: ClanDTO) {
        return world.respectToward(rowClan, colClan);
    }

    function opinionCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        const r = opinionToward(rowClan, colClan);
        if (!r) return 0;
        return r.value;
    }
</script>

{#snippet interactionVolumeCellTooltip(
    value: number,
    subject: ClanDTO,
    object: ClanDTO,
)}
    {@const att = world.attentionTo(subject, object)}
    {#if att}
        {unsigned(att)} attention / {object.population} population
    {/if}
{/snippet}

{#snippet conflictCellTooltip(value: number, subject: ClanDTO, object: ClanDTO)}
    {@const c = world.conflictBetween(subject, object)}
    <ConflictDetailsTable conflict={c} c1={subject} c2={object} />
{/snippet}

{#snippet stressCellTooltip(value: number, subject: ClanDTO, object: ClanDTO)}
    {@const cVal = conflictCellValue(subject, object)}
    {@const mVal = mutualAidCellValue(subject, object)}
    <div style="font-size: 0.9em; padding: 0.25rem;">
        <strong>Relationship Stress Breakdown:</strong>
        <ul
            style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;"
        >
            <li>Conflict Value: {signed(cVal, 1)}</li>
            <li>Mutual Aid Value: {signed(mVal, 1)}</li>
            <hr
                style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;"
            />
            <li><strong>Total Stress: {signed(cVal + mVal, 1)}</strong></li>
        </ul>
    </div>
{/snippet}

{#snippet mutualAidCellTooltip(
    value: number,
    subject: ClanDTO,
    object: ClanDTO,
)}
    {@const interactions = world.interactions.get(subject, object)}
    {@const basic = interactions.find((i) => i instanceof BasicInteraction)}
    {#if basic}
        {@const subToObj =
            subject.uuid === basic.c1 ? basic.amount1to2 : basic.amount2to1}
        {@const objToSub =
            subject.uuid === basic.c1 ? basic.amount2to1 : basic.amount1to2}
        {@const matched = Math.min(subToObj, objToSub)}
        {@const payoff = 5 * (matched / subject.population)}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
            <strong>Mutual Aid Source Details:</strong>
            <ul
                style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;"
            >
                <li>
                    • {subject.name} attention to {object.name}: {subToObj.toFixed(
                        1,
                    )}
                </li>
                <li>
                    • {object.name} attention to {subject.name}: {objToSub.toFixed(
                        1,
                    )}
                </li>
                <li>• Matched attention (min): {matched.toFixed(1)}</li>
                <li>• {subject.name} population: {subject.population}</li>
                <hr
                    style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;"
                />
                <li>
                    <strong>Payoff Formula:</strong> 5 × ({matched.toFixed(1)} /
                    {subject.population}) = <strong>{payoff.toFixed(1)}</strong>
                </li>
            </ul>
        </div>
    {:else}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            No mutual aid interactions between these clans.
        </div>
    {/if}
{/snippet}

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
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span>Current Items Total:</span>
                    <strong>{signed(a.currentItemsTotal, 2)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.25rem; border-top: 1px dashed #eee; padding-top: 0.25rem;">
                    <span>Current Value:</span>
                    <strong>{signed(a.value, 2)}</strong>
                </div>
            </div>
        </div>
    {/if}
{/snippet}

{#snippet informationCellTooltip(
    value: number,
    subject: ClanDTO,
    object: ClanDTO,
)}
    {@const info = world.informationToward(subject, object)}
    {#if info}
        <TableView2
            table={new IterableTable(info.items, (i) => i.label, [
                {
                    data: "Value",
                    label: "Value",
                    valueFn: (i) => i.value,
                    formatFn: (i: number) => unsigned(i, 2),
                },
                {
                    data: "Explanation",
                    label: "Explanation",
                    valueFn: (i) => i.explanation,
                },
            ])}
        ></TableView2>
    {/if}
{/snippet}

{#snippet opinionCellTooltip(value: number, subject: ClanDTO, object: ClanDTO)}
    {@const r = opinionToward(subject, object)}
    {#if r}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
            <TableView2
                table={new IterableTable(r.items, (i) => i.label, [
                    {
                        data: "Value",
                        label: "Value",
                        valueFn: (i) => i.value,
                        formatFn: (i: number) => signed(i, 1),
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
                    <span>Previous Value:</span>
                    <strong>{signed(r.previousValue, 1)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span>Current Items Total:</span>
                    <strong>{signed(r.currentItemsTotal, 1)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.25rem; border-top: 1px dashed #eee; padding-top: 0.25rem;">
                    <span>Current Value:</span>
                    <strong>{signed(r.value, 1)}</strong>
                </div>
            </div>
        </div>
    {/if}
{/snippet}

<div class="relationships-grid">
    <div>
        <div
            style="display: flex; flex-direction: row; align-items: center; gap: 1rem; margin-bottom: 0.5rem;"
        >
            <h3 style="margin: 0;">Interaction Level</h3>
            <div class="stress-button-group">
                <button
                    type="button"
                    class="stress-btn {interactionMode === 'interactions'
                        ? 'active'
                        : ''}"
                    onclick={() => (interactionMode = "interactions")}
                    >Interactions</button
                >
                <button
                    type="button"
                    class="stress-btn {interactionMode === 'information'
                        ? 'active'
                        : ''}"
                    onclick={() => (interactionMode = "information")}
                    >Information</button
                >
            </div>
        </div>
        {#if interactionMode === "interactions"}
            <TableView2
                table={buildRelationshipsTable(
                    interactionLevelCellValue,
                    unsignedFormat(2),
                    interactionVolumeCellTooltip,
                )}
            ></TableView2>
        {:else}
            <TableView2
                table={buildRelationshipsTable(
                    informationCellValue,
                    unsignedFormat(2),
                    informationCellTooltip,
                )}
            ></TableView2>
        {/if}
    </div>
    <div>
        <div
            style="display: flex; flex-direction: row; align-items: center; gap: 1rem; margin-bottom: 0.5rem;"
        >
            <h3 style="margin: 0;">Stress</h3>
            <div class="stress-button-group">
                <button
                    type="button"
                    class="stress-btn {stressMode === 'stress' ? 'active' : ''}"
                    onclick={() => (stressMode = "stress")}>Stress</button
                >
                <button
                    type="button"
                    class="stress-btn {stressMode === 'mutual aid'
                        ? 'active'
                        : ''}"
                    onclick={() => (stressMode = "mutual aid")}
                    >Mutual Aid</button
                >
                <button
                    type="button"
                    class="stress-btn {stressMode === 'conflict'
                        ? 'active'
                        : ''}"
                    onclick={() => (stressMode = "conflict")}>Conflict</button
                >
            </div>
        </div>
        {#if stressMode === "stress"}
            <TableView2
                table={buildRelationshipsTable(
                    stressCellValue,
                    signedFormat(1),
                    stressCellTooltip,
                )}
            ></TableView2>
        {:else if stressMode === "mutual aid"}
            <TableView2
                table={buildRelationshipsTable(
                    mutualAidCellValue,
                    unsignedFormat(1),
                    mutualAidCellTooltip,
                )}
            ></TableView2>
        {:else}
            <TableView2
                table={buildRelationshipsTable(
                    conflictCellValue,
                    unsignedFormat(),
                    conflictCellTooltip,
                )}
            ></TableView2>
        {/if}
    </div>
    <div>
        <h3>Alignment</h3>
        <TableView2
            table={buildRelationshipsTable(
                alignmentCellValue,
                unsignedFormat(2),
                alignmentCellTooltip,
            )}
        ></TableView2>
    </div>
    <div>
        <div
            style="display: flex; flex-direction: row; align-items: center; gap: 1rem; margin-bottom: 0.5rem;"
        >
            <h3 style="margin: 0;">Opinion (Respect)</h3>
        </div>
        {#key opinionMode}
            <TableView2
                table={buildRelationshipsTable(
                    opinionCellValue,
                    unsignedFormat(2),
                    opinionCellTooltip,
                )}
            ></TableView2>
        {/key}
    </div>
</div>

<style>
    .relationships-grid {
        display: grid;
        grid-template-columns: repeat(2, max-content);
        gap: 1.5rem 2rem;
        align-items: start;
    }

    .opinion-select {
        font-size: 0.9rem;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        border: 1px solid #ccc;
        background-color: #fff;
        color: #333;
        cursor: pointer;
    }

    .stress-button-group {
        display: inline-flex;
        gap: 0.25rem;
        background-color: #f3edd8;
        padding: 0.25rem;
        border-radius: 4px;
        align-items: center;
    }
    .stress-btn {
        all: unset;
        font-size: 0.9rem;
        padding: 0.25rem 0.75rem;
        cursor: pointer;
        border-radius: 3px;
        color: #333;
        transition:
            background-color 0.2s,
            font-weight 0.2s;
    }
    .stress-btn:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }
    .stress-btn.active {
        font-weight: bold;
        background-color: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
</style>
