<script lang="ts">
    import type { SettlementDTO, ClanDTO } from "../model/records/dtos";
    import {
        EU_DECAY,
        EU_RANGE,
        EU_VITALITY_SCALE,
        eudaimoniaAverage,
    } from "../model/self/eudaimonia";
    import { sortedByKey } from "../model/lib/basics";
    import EudaimoniaFormula from "./self/EudaimoniaFormula.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let activeClans = $derived(
        sortedByKey(
            settlement.clans.filter((c) => c.population > 0),
            (c: ClanDTO) => -c.eudaimonia.value,
        ),
    );

    // Population-weighted average, which for this calculation is the same
    // number the settlement would get from its own births and deaths.
    let settlementValue = $derived(
        eudaimoniaAverage(
            activeClans.map((c) => ({
                value: c.eudaimonia.value,
                weight: c.population,
            })),
        ),
    );

    // Which clan's working is on show. Defaults to the settlement's best.
    let selectedUuid = $state<string | undefined>(undefined);
    let selected = $derived(
        activeClans.find((c) => c.uuid === selectedUuid) ?? activeClans[0],
    );

    const n = (x: number, p = 1) =>
        (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(p);

    // Bar width for the roster, against the notional range so clans compare.
    const barPct = (v: number) => Math.min(50, (Math.abs(v) / EU_RANGE) * 50);
</script>

<div class="wrap">
    <header>
        <div class="title-row">
            <h3>Eudaimonia</h3>
            <div class="settlement-value" class:pos={settlementValue >= 0}>
                {n(settlementValue)}
            </div>
            {#if activeClans.length > 1}
                <div class="settlement-note">averaged over {activeClans.length} clans, by population</div>
            {/if}
        </div>
        <p class="blurb">
            How well life is going for each clan, judged over the long run
            rather than year by year. A year's births and deaths say what that
            year was worth; the standing verdict moves {(
                EU_DECAY * 100
            ).toFixed(0)}% of the way toward it and no further, so it takes a
            generation of good or bad years to shift. Zero is an unremarkable
            life. Nothing clamps the number &mdash; a clan can do far better or
            far worse than the notional &plusmn;{EU_RANGE}.
        </p>
        <p class="blurb">
            The settlement figure is the clans averaged by population, which is
            the same number the settlement would reach if the whole calculation
            were run on its own births, deaths, and headcount &mdash; so the
            parts and the whole always agree.
        </p>
    </header>

    <div class="body">
        <!-- Every clan at a glance, best first, and the one being explained. -->
        <div class="roster">
            <div class="roster-head">Clans</div>
            {#each activeClans as clan (clan.uuid)}
                <button
                    type="button"
                    class="clan-row"
                    class:selected={selected?.uuid === clan.uuid}
                    onclick={() => (selectedUuid = clan.uuid)}
                >
                    <span class="swatch" style="background: {clan.color}"></span>
                    <span class="clan-name">{clan.name}</span>
                    <span class="bar-cell">
                        <span class="bar-axis"></span>
                        <span
                            class="bar"
                            class:pos={clan.eudaimonia.value >= 0}
                            style="{clan.eudaimonia.value >= 0
                                ? 'left: 50%'
                                : `right: 50%`}; width: {barPct(
                                clan.eudaimonia.value,
                            )}%"
                        ></span>
                    </span>
                    <span
                        class="clan-value"
                        class:pos={clan.eudaimonia.value >= 0}
                        class:neg={clan.eudaimonia.value < 0}
                    >
                        {n(clan.eudaimonia.value)}
                    </span>
                    <span
                        class="clan-delta"
                        class:pos={clan.eudaimonia.delta > 0}
                        class:neg={clan.eudaimonia.delta < 0}
                    >
                        {n(clan.eudaimonia.delta, 2)}
                    </span>
                </button>
            {/each}
        </div>

        <!-- The full derivation for whichever clan is selected. -->
        <div class="detail">
            {#if selected}
                <div class="detail-head">
                    <span class="swatch" style="background: {selected.color}"
                    ></span>
                    <span class="detail-name">{selected.name}</span>
                </div>
                <EudaimoniaFormula eudaimonia={selected.eudaimonia} />

                <div class="legend">
                    <div class="legend-item">
                        <span class="key signal"></span>
                        <span
                            ><b>Signal</b> &mdash; what this year alone says the
                            clan is worth, its net growth rate read at &times;{EU_VITALITY_SCALE}.</span
                        >
                    </div>
                    <div class="legend-item">
                        <span class="key pull"></span>
                        <span
                            ><b>Pull</b> &mdash; the part of the gap this year
                            actually closed.</span
                        >
                    </div>
                    <div class="legend-item">
                        <span class="key gap"></span>
                        <span
                            ><b>Gap</b> &mdash; distance still to run if every
                            year were like this one.</span
                        >
                    </div>
                </div>
            {:else}
                <div class="empty">No clans here.</div>
            {/if}
        </div>
    </div>
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
        font-variant-numeric: tabular-nums;
    }

    .blurb {
        margin: 0.35rem 0 0;
        max-width: 60ch;
        font-size: 0.86rem;
        line-height: 1.5;
        color: #4b5563;
    }

    .body {
        display: flex;
        flex-direction: row;
        gap: 1.75rem;
        align-items: flex-start;
        flex-wrap: wrap;
    }

    /* --- roster --- */

    .roster {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 21rem;
    }

    .roster-head {
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #9ca3af;
        margin-bottom: 0.3rem;
    }

    .clan-row {
        display: grid;
        grid-template-columns: 0.7rem 7rem 1fr 3.4rem 3.6rem;
        align-items: center;
        gap: 0.5rem;
        padding: 0.22rem 0.35rem;
        background: none;
        border: 1px solid transparent;
        border-radius: 3px;
        font: inherit;
        font-size: 0.85rem;
        text-align: left;
        cursor: pointer;
    }

    .clan-row:hover {
        background: #f7f4ea;
    }

    .clan-row.selected {
        background: #f2ede0;
        border-color: #ddd6c0;
    }

    .swatch {
        width: 0.7rem;
        height: 0.7rem;
        border-radius: 2px;
        display: inline-block;
    }

    .clan-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .bar-cell {
        position: relative;
        height: 0.75rem;
        min-width: 5rem;
    }

    .bar-axis {
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        width: 1px;
        background: #ddd6c0;
    }

    .bar {
        position: absolute;
        top: 0.15rem;
        height: 0.45rem;
        background: #b91c1c;
        border-radius: 1px;
    }

    .bar.pos {
        background: #15803d;
    }

    .clan-value,
    .clan-delta {
        font-variant-numeric: tabular-nums;
        text-align: right;
    }

    .clan-value.pos {
        color: #15803d;
    }
    .clan-value.neg {
        color: #b91c1c;
    }

    .clan-delta {
        font-size: 0.78rem;
        color: #9ca3af;
    }
    .clan-delta.pos {
        color: #15803d;
    }
    .clan-delta.neg {
        color: #b91c1c;
    }

    /* --- detail --- */

    .detail {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        flex: 1 1 24rem;
        min-width: 24rem;
    }

    .detail-head {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        font-weight: 600;
    }

    .legend {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.8rem;
        color: #4b5563;
        max-width: 46ch;
    }

    .legend-item {
        display: flex;
        align-items: baseline;
        gap: 0.45rem;
    }

    .key {
        width: 0.85rem;
        height: 0.4rem;
        border-radius: 1px;
        flex: none;
        position: relative;
        top: -0.1rem;
    }

    .key.signal {
        background: #b7c6d8;
    }
    .key.pull {
        background: #15803d;
    }
    .key.gap {
        background: repeating-linear-gradient(
            90deg,
            #b7c6d8 0 3px,
            transparent 3px 6px
        );
    }

    .empty {
        color: #6b7280;
        font-style: italic;
    }
</style>
