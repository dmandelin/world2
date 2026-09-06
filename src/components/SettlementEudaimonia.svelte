<script lang="ts">
    import type { SettlementDTO, ClanDTO } from "../model/records/dtos";
    import {
        EU_SUBSCORES,
        EU_RANGE,
        eudaimoniaAverage,
        type EuSubscoreDef,
    } from "../model/self/eudaimonia";
    import { sortedByKey } from "../model/lib/basics";
    import Tooltip from "./Tooltip.svelte";
    import LineGraph from "./LineGraph.svelte";
    import EudaimoniaCalc from "./self/EudaimoniaCalc.svelte";
    import { settlementEudaimoniaGraphData } from "../model/records/timeline";
    import { ZeroCenteredAutoScaler } from "./linegraph";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let clans = $derived(
        sortedByKey(
            settlement.clans.filter((c) => c.population > 0),
            (c: ClanDTO) => -c.eudaimonia.value,
        ),
    );

    // Population-weighted average, which for the Life part is the same number
    // the settlement would get from its own births and deaths.
    let settlementValue = $derived(
        eudaimoniaAverage(
            clans.map((c) => ({
                value: c.eudaimonia.value,
                weight: c.population,
            })),
        ),
    );

    function settlementSubscore(sub: EuSubscoreDef): number {
        return eudaimoniaAverage(
            clans.map((c) => ({
                value: c.eudaimonia.subscore(sub.key),
                weight: c.population,
            })),
        );
    }

    const n = (x: number, p = 1) =>
        (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(p);
    const pctOf = (x: number) => (x * 100).toFixed(0) + "%";

    // A faint bar behind a subscore cell, against the notional range, so a row
    // reads as a shape across the settlement before it reads as numbers.
    const barPct = (v: number) => Math.min(100, (Math.abs(v) / EU_RANGE) * 100);

    let graphData = $derived(
        settlementEudaimoniaGraphData(
            settlement,
            new ZeroCenteredAutoScaler(20),
        ),
    );
</script>

<div class="wrap">
    <header>
        <div class="title-row">
            <h3>Eudaimonia</h3>
            <div class="settlement-value" class:pos={settlementValue >= 0}>
                {n(settlementValue)}
            </div>
            {#if clans.length > 1}
                <div class="settlement-note">
                    averaged over {clans.length} clans, by population
                </div>
            {/if}
        </div>
    </header>

    {#if clans.length === 0}
        <div class="empty">No clans here.</div>
    {:else}
        <div class="scroll">
            <table>
                <thead>
                    <tr>
                        <th class="rowhead"></th>
                        <th class="settlement-col">Settlement</th>
                        {#each clans as clan (clan.uuid)}
                            <th>{clan.name}</th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    <!-- One row per subscore; each cell explains itself. -->
                    {#each EU_SUBSCORES as sub (sub.key)}
                        <tr>
                            <th class="rowhead">
                                {sub.label}
                                <span class="decay">{pctOf(sub.decay)}/yr</span>
                            </th>
                            <td class="num settlement-col">
                                {n(settlementSubscore(sub))}
                            </td>
                            {#each clans as clan (clan.uuid)}
                                {@const v = clan.eudaimonia.subscore(sub.key)}
                                <td class="num cell">
                                    <Tooltip>
                                        <span class="bar-wrap">
                                            <span
                                                class="bar"
                                                class:pos={v >= 0}
                                                style="width: {barPct(v)}%"
                                            ></span>
                                            <span
                                                class="figure"
                                                class:pos={v > 0}
                                                class:neg={v < 0}>{n(v)}</span
                                            >
                                        </span>
                                        <div
                                            slot="tooltip"
                                            style="text-align: left; color: initial;"
                                        >
                                            <EudaimoniaCalc
                                                eudaimonia={clan.eudaimonia}
                                                {sub}
                                            />
                                        </div>
                                    </Tooltip>
                                </td>
                            {/each}
                        </tr>
                    {/each}

                    <tr class="total">
                        <th class="rowhead">Total</th>
                        <td class="num settlement-col">{n(settlementValue)}</td>
                        {#each clans as clan (clan.uuid)}
                            <td
                                class="num"
                                class:pos={clan.eudaimonia.value > 0}
                                class:neg={clan.eudaimonia.value < 0}
                                >{n(clan.eudaimonia.value)}</td
                            >
                        {/each}
                    </tr>

                </tbody>
            </table>
        </div>

        <!-- Where each clan has been, and the settlement through the middle
             of them. The table says where things stand; this says how they
             got there. -->
        <div class="graph">
            <LineGraph data={graphData} />
        </div>
    {/if}
</div>

<style>
    .wrap {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        padding: 0.25rem 0.25rem 1rem;
    }

    .title-row {
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
    }

    h3 {
        margin: 0;
        font-size: 1.15rem;
    }

    .settlement-value {
        font-variant-numeric: tabular-nums;
        font-weight: 700;
        font-size: 1.15rem;
        color: #b91c1c;
    }

    .settlement-value.pos {
        color: #15803d;
    }

    .settlement-note {
        font-size: 0.75rem;
        color: #9ca3af;
    }

    .empty {
        color: #6b7280;
        font-style: italic;
    }

    .graph {
        width: 100%;
        max-width: 56rem;
        height: 25.6rem;
    }

    .scroll {
        overflow-x: auto;
    }

    table {
        border-collapse: collapse;
        font-size: 0.85rem;
    }

    th,
    td {
        padding: 0.22rem 0.6rem;
        text-align: right;
        white-space: nowrap;
    }

    thead th {
        border-bottom: 1px solid #ddd6c0;
        font-weight: 600;
        padding-bottom: 0.35rem;
    }

    .rowhead {
        text-align: left;
        font-weight: 500;
        padding-left: 0;
        padding-right: 1.2rem;
    }

    .decay {
        color: #9ca3af;
        font-size: 0.78em;
        font-weight: 400;
        margin-left: 0.25rem;
    }

    .num {
        font-variant-numeric: tabular-nums;
    }

    .cell {
        cursor: help;
    }

    .bar-wrap {
        position: relative;
        display: inline-block;
        min-width: 4rem;
        padding: 0.1rem 0;
    }

    .bar {
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        background: #f2d9d7;
        border-radius: 2px;
    }

    .bar.pos {
        background: #d9e8d9;
    }

    .figure {
        position: relative;
    }

    .settlement-col {
        border-right: 1px solid #e5e0d0;
        color: #4b5563;
    }

    .total td,
    .total th {
        border-top: 1px solid #ddd6c0;
        font-weight: 700;
        padding-top: 0.32rem;
    }

    .pos {
        color: #15803d;
    }
    .neg {
        color: #b91c1c;
    }
</style>
