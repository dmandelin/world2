<script lang="ts">
    // Two readings of the same machinery, side by side under one roof:
    //
    //   Fortune     what this year alone was worth, the signal before the
    //               running averages absorb it
    //   Eudaimonia  the standing verdict those averages have reached
    //
    // The table has the same shape either way -- a row per contributing part,
    // a total, a column per clan -- so switching between them compares like
    // with like rather than reading as two different screens.
    import type { SettlementDTO, ClanDTO } from "../model/records/dtos";
    import {
        EuNode,
        EU_SUBSCORES,
        EU_FOOD_STEPS,
        EU_FOOD_EXPONENT,
        EU_FORTUNE_EXPONENT,
        EU_RANGE,
        eudaimoniaAverage,
        type Eudaimonia,
        type EuSubscoreDef,
    } from "../model/self/eudaimonia";
    import { sortedByKey } from "../model/lib/basics";
    import Tooltip from "./Tooltip.svelte";
    import LineGraph from "./LineGraph.svelte";
    import EudaimoniaCalc from "./self/EudaimoniaCalc.svelte";
    import FoodStepCalc from "./self/FoodStepCalc.svelte";
    import { settlementClanGraphData } from "../model/records/timeline";
    import { ZeroCenteredAutoScaler } from "./linegraph";

    let { settlement }: { settlement: SettlementDTO } = $props();

    type View = "fortune" | "eudaimonia";
    let view = $state<View>("eudaimonia");

    const VIEWS: { key: View; label: string; hint: string }[] = [
        {
            key: "fortune",
            label: "Fortune",
            hint: "How this year went, on its own",
        },
        {
            key: "eudaimonia",
            label: "Eudaimonia",
            hint: "The verdict on the whole run of years",
        },
    ];

    // Which parts make up the figure on show.
    let parts = $derived(
        view === "fortune"
            ? EU_SUBSCORES.filter((s) => s.inFortune)
            : EU_SUBSCORES,
    );

    let clans = $derived(
        sortedByKey(
            settlement.clans.filter((c) => c.population > 0),
            (c: ClanDTO) => -total(c.eudaimonia),
        ),
    );

    // One replay per clan, shared by every cell of that clan's column, rather
    // than a fresh one for each figure on screen.
    let reports = $derived(
        new Map(
            clans.map((c) => [
                c.uuid,
                view === "fortune"
                    ? c.eudaimonia.explainFortune()
                    : c.eudaimonia.explain(),
            ]),
        ),
    );

    function total(eu: Eudaimonia): number {
        return view === "fortune" ? eu.fortune : eu.value;
    }

    // In the Fortune view a part is Fortune's own reading of that concern,
    // not the subscore's standing value: Fortune reads rations on a straight
    // line where Food squares them, so the two are different numbers. With
    // Food the only contributor so far, the part and the total coincide.
    function part(clan: ClanDTO, sub: EuSubscoreDef): number {
        return view === "fortune"
            ? (reports.get(clan.uuid)?.get(EuNode.FoodSignal) ?? 0)
            : clan.eudaimonia.subscore(sub.key);
    }

    // The steps inside the food figure, shown under it so the quantity and
    // composition that make up nutrition, and the bonuses that follow, are on
    // screen rather than only in a tooltip.
    function foodStep(clan: ClanDTO, node: (typeof EU_FOOD_STEPS)[number]["node"]): number {
        return reports.get(clan.uuid)?.get(node) ?? 0;
    }

    function settlementFoodStep(node: (typeof EU_FOOD_STEPS)[number]["node"]): number {
        return eudaimoniaAverage(
            clans.map((c) => ({ value: foodStep(c, node), weight: c.population })),
        );
    }

    let settlementValue = $derived(
        eudaimoniaAverage(
            clans.map((c) => ({
                value: total(c.eudaimonia),
                weight: c.population,
            })),
        ),
    );

    function settlementPart(sub: EuSubscoreDef): number {
        return eudaimoniaAverage(
            clans.map((c) => ({ value: part(c, sub), weight: c.population })),
        );
    }

    const n = (x: number, p = 1) =>
        (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(p);
    const pctOf = (x: number) => (x * 100).toFixed(0) + "%";

    // A faint bar behind a cell, against the notional range, so a row reads as
    // a shape across the settlement before it reads as numbers.
    const barPct = (v: number) => Math.min(100, (Math.abs(v) / EU_RANGE) * 100);

    // Quantity's curve differs between the two readings, and the step
    // tooltips show the formula, so they need to know which is in play.
    let quantityExponent = $derived(
        view === "fortune" ? EU_FORTUNE_EXPONENT : EU_FOOD_EXPONENT,
    );

    let graphData = $derived(
        settlementClanGraphData(
            settlement,
            view === "fortune" ? "fortune" : "eudaimonia",
            new ZeroCenteredAutoScaler(20),
        ),
    );
</script>

<div class="wrap">
    <header>
        <div class="title-row">
            <h3>Wellness</h3>
            <div class="toggle" role="group" aria-label="Which reading to show">
                {#each VIEWS as v (v.key)}
                    <button
                        type="button"
                        class:on={view === v.key}
                        title={v.hint}
                        onclick={() => (view = v.key)}>{v.label}</button
                    >
                {/each}
            </div>
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
                    <!-- The whole figure first, then what it is made of. -->
                    <tr class="total">
                        <th class="rowhead">Everything</th>
                        <td class="num settlement-col">{n(settlementValue)}</td>
                        {#each clans as clan (clan.uuid)}
                            {@const t = total(clan.eudaimonia)}
                            <td
                                class="num"
                                class:pos={t > 0}
                                class:neg={t < 0}>{n(t)}</td
                            >
                        {/each}
                    </tr>

                    <!-- One row per contributing part; each cell explains
                         itself. -->
                    {#each parts as sub (sub.key)}
                        <tr>
                            <th class="rowhead">
                                {sub.label}
                                {#if view === "eudaimonia"}
                                    <span class="decay"
                                        >{pctOf(sub.decay)}/yr</span
                                    >
                                {:else}
                                    <span class="decay">this year</span>
                                {/if}
                            </th>
                            <td class="num settlement-col">
                                {n(settlementPart(sub))}
                            </td>
                            {#each clans as clan (clan.uuid)}
                                {@const v = part(clan, sub)}
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
                                            {#if view === "fortune"}
                                                <EudaimoniaCalc
                                                    eudaimonia={clan.eudaimonia}
                                                    fortune={true}
                                                />
                                            {:else}
                                                <EudaimoniaCalc
                                                    eudaimonia={clan.eudaimonia}
                                                    {sub}
                                                />
                                            {/if}
                                        </div>
                                    </Tooltip>
                                </td>
                            {/each}
                        </tr>
                    {/each}

                    <!-- What went into the food figure above. -->
                    {#each EU_FOOD_STEPS as step (step.node)}
                        <tr
                            class="step"
                            class:substep={step.isSubtotal}
                            class:part={step.isPart}
                        >
                            <th class="rowhead" title={step.note}
                                >{step.label}</th
                            >
                            <td class="num settlement-col"
                                >{n(settlementFoodStep(step.node))}</td
                            >
                            {#each clans as clan (clan.uuid)}
                                {@const v = foodStep(clan, step.node)}
                                <td class="num cell">
                                    <Tooltip>
                                        <span
                                            class:pos={v > 0}
                                            class:neg={v < 0}>{n(v)}</span
                                        >
                                        <div
                                            slot="tooltip"
                                            style="text-align: left; color: initial;"
                                        >
                                            <FoodStepCalc
                                                report={reports.get(
                                                    clan.uuid,
                                                )!}
                                                node={step.node}
                                                exponent={quantityExponent}
                                            />
                                        </div>
                                    </Tooltip>
                                </td>
                            {/each}
                        </tr>
                    {/each}

                </tbody>
            </table>
        </div>

        {#if view === "fortune" && parts.length < EU_SUBSCORES.length}
            <div class="note">
                Fortune reports on {parts.map((p) => p.label).join(", ")} only
                so far, and reads it on a straight line where the standing Hunger
                subscore squares it. Life is left out: its signal is a growth rate
                read at a large multiple, so in a small clan a single birth swings
                it by a hundred points, saying more about arithmetic than about the
                year.
            </div>
        {/if}

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
        flex-wrap: wrap;
    }

    h3 {
        margin: 0;
        font-size: 1.15rem;
    }

    .toggle {
        display: inline-flex;
        gap: 0.25rem;
        background-color: #f3edd8;
        padding: 0.2rem;
        border-radius: 4px;
        align-self: center;
    }

    .toggle button {
        font: inherit;
        font-size: 0.82rem;
        border: 1px solid transparent;
        background: none;
        border-radius: 3px;
        padding: 0.1rem 0.6rem;
        cursor: pointer;
        color: #4b5563;
    }

    .toggle button:hover {
        color: #7c2d12;
    }

    .toggle button.on {
        background: #fbfaf5;
        border-color: #ddd6c0;
        color: #1f2328;
        font-weight: 600;
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

    .note {
        font-size: 0.8rem;
        line-height: 1.45;
        color: #6b7280;
        max-width: 62ch;
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

    /* The food breakdown reads as detail beneath the figure it explains. */
    .step td,
    .step th {
        color: #6b7280;
        font-size: 0.82rem;
    }

    .step .rowhead {
        padding-left: 1.1rem;
        cursor: help;
    }

    /* Terms sit in under the subtotal they add up to. */
    .step.part .rowhead {
        padding-left: 2.2rem;
    }

    .step.substep td,
    .step.substep th {
        color: #1f2328;
        font-weight: 600;
    }

    .total td,
    .total th {
        border-bottom: 1px solid #ddd6c0;
        font-weight: 700;
        padding-bottom: 0.32rem;
    }

    .pos {
        color: #15803d;
    }
    .neg {
        color: #b91c1c;
    }
</style>
