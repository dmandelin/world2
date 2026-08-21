<script lang="ts">
    import type { SettlementDTO } from "../model/records/dtos";
    import type { RitualEvent } from "../model/rituals";
    import { ALL_RITUAL_TYPES } from "../model/rituals";
    import { pct, unsigned } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import Tooltip from "./Tooltip.svelte";
    import RitualDetails from "./RitualDetails.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    // Life first, then by officiant, so the year's serious business reads at
    // the top.
    let events = $derived(
        sortedByKey(
            settlement.world.ritualsIn(settlement),
            (e: RitualEvent) =>
                `${e.def.foodCostFraction > 0 ? 0 : 1}|${e.performer.name}`,
        ),
    );
</script>

<h3>Rituals This Year</h3>

{#if events.length === 0}
    <p class="quiet">
        No trouble this year called for a rite beyond the clans' own ancestral
        rounds.
    </p>
{:else}
    <table class="rituals">
        <thead>
            <tr>
                <th></th>
                <th>Officiant</th>
                <th>For</th>
                <th>Occasion</th>
                <th>Stake</th>
                <th class="num">Chance</th>
                <th class="num">Roll</th>
                <th>Result</th>
                <th class="num">Heard by</th>
            </tr>
        </thead>
        <tbody>
            {#each events as event}
                <tr>
                    <td class="icon {event.success ? 'good' : 'bad'}"
                        >{event.def.icon}</td
                    >
                    <td>
                        {event.performer.name}
                        {#if event.wasAsked}<span class="quiet">asked</span>{/if}
                    </td>
                    <td>{event.beneficiary.name}</td>
                    <td>
                        <Tooltip>
                            <span class="linky">{event.def.label}</span>
                            <div slot="tooltip" style="color: initial;">
                                <RitualDetails {event} />
                            </div>
                        </Tooltip>
                    </td>
                    <td>{event.def.stakeLabel}</td>
                    <td class="num">{pct(event.successChance)}</td>
                    <td class="num">{pct(event.roll)}</td>
                    <td class={event.success ? "good" : "bad"}
                        >{event.resultLabel}</td
                    >
                    <td class="num">{event.heardBy.length}</td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}

<h3>What Calls for a Rite</h3>
<table class="rituals">
    <thead>
        <tr>
            <th></th>
            <th>Occasion</th>
            <th>Stake</th>
            <th class="num">Offering</th>
            <th class="num">Fee if asked</th>
            <th class="num">Chance range</th>
            <th class="num">Expected/yr</th>
        </tr>
    </thead>
    <tbody>
        {#each ALL_RITUAL_TYPES as def}
            {@const range = def.chanceRange}
            <tr>
                <td class="icon">{def.icon}</td>
                <td>
                    {def.label}
                    <div class="quiet">{def.description}</div>
                </td>
                <td>{def.stakeLabel}</td>
                <td class="num"
                    >{def.foodCostFraction > 0
                        ? pct(def.foodCostFraction)
                        : "—"}</td
                >
                <td class="num"
                    >{def.askGiftFraction > 0
                        ? pct(def.askGiftFraction)
                        : "\u2014"}</td
                >
                <td class="num">{pct(range[0])}&ndash;{pct(range[1])}</td>
                <td class="num">
                    {unsigned(
                        settlement.clans.reduce(
                            (sum, c) => sum + def.rateFor(c.ref),
                            0,
                        ),
                        2,
                    )}
                </td>
            </tr>
        {/each}
    </tbody>
</table>

<style>
    h3 {
        margin: 1rem 0 0.5rem;
    }
    h3:first-child {
        margin-top: 0;
    }
    .quiet {
        color: #6e5b47;
        font-style: italic;
        font-size: 0.9em;
    }
    table.rituals {
        border-collapse: collapse;
    }
    table.rituals th,
    table.rituals td {
        padding: 0.15rem 0.6rem 0.15rem 0;
        text-align: left;
        vertical-align: top;
    }
    table.rituals th {
        border-bottom: 1px solid #62531d;
        white-space: nowrap;
    }
    .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }
    .icon {
        font-size: 1.2em;
    }
    .linky {
        border-bottom: 1px dotted #6e5b47;
        cursor: help;
    }
    .good {
        color: #15803d;
    }
    .bad {
        color: #b91c1c;
    }
</style>
