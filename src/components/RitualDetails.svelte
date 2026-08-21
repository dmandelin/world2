<script lang="ts">
    import type { RitualEvent } from "../model/rituals";
    import { RITUAL_STAT_MIDPOINT } from "../model/rituals";
    import { pct, signed, unsigned } from "../model/lib/format";

    let { event }: { event: RitualEvent } = $props();

    let range = $derived(event.def.chanceRange);
</script>

<div class="ritual-details">
    <div class="head">
        {event.def.icon}
        {event.def.label}
        <span class="outcome {event.success ? 'good' : 'bad'}">
            {event.success ? "succeeded" : "failed"}
        </span>
    </div>
    <div class="note">{event.def.description}</div>

    <table>
        <tbody>
            <tr>
                <th>For</th>
                <td>{event.beneficiary.name}</td>
            </tr>
            <tr>
                <th>Officiant</th>
                <td>{event.performer.name}</td>
            </tr>
            <tr>
                <th>Stake</th>
                <td>{event.def.stakeLabel}</td>
            </tr>
            {#if event.foodCostOwed > 0}
                <tr>
                    <th>Offering</th>
                    <td>
                        {unsigned(event.foodCostPaid, 2)} food
                        {#if event.foodCostPaid < event.foodCostOwed - 1e-6}
                            <span class="note"
                                >(of {unsigned(event.foodCostOwed, 2)}
                                due; nothing more to spare)</span
                            >
                        {/if}
                    </td>
                </tr>
            {/if}
        </tbody>
    </table>

    <div class="section">Officiant's standing to say the words</div>
    <table>
        <tbody>
            {#each event.statItems as item}
                <tr>
                    <th>{item.label}</th>
                    <td class="num">{unsigned(item.value, 0)}</td>
                    <td class="note">&times;{item.weight}</td>
                </tr>
            {/each}
            <tr class="total">
                <th>Weighted harmonic mean</th>
                <td class="num">{unsigned(event.stat, 1)}</td>
                <td class="note">even odds at {RITUAL_STAT_MIDPOINT}</td>
            </tr>
        </tbody>
    </table>

    <div class="section">The roll</div>
    <table>
        <tbody>
            <tr>
                <th>Success chance</th>
                <td class="num">{pct(event.successChance)}</td>
                <td class="note">
                    {pct(range[0])}&ndash;{pct(range[1])} across officiants
                </td>
            </tr>
            <tr>
                <th>Rolled</th>
                <td class="num">{pct(event.roll)}</td>
                <td class="note">
                    under the chance succeeds
                </td>
            </tr>
            <tr class="total">
                <th>Result</th>
                <td colspan="2" class="{event.success ? 'good' : 'bad'}">
                    {event.resultLabel}
                </td>
            </tr>
            <tr>
                <th>Holiness</th>
                <td colspan="2" class="{event.success ? 'good' : 'bad'}">
                    {signed(event.holinessEffect, 0)}
                    {#if event.performer === event.beneficiary}
                        to {event.performer.name}'s sense of its own holiness
                    {:else}
                        to how {event.beneficiary.name} sees {event.performer
                            .name}
                    {/if}
                </td>
            </tr>
        </tbody>
    </table>
</div>

<style>
    .ritual-details {
        font-size: 0.9em;
        min-width: 19rem;
        max-width: 24rem;
        text-align: left;
    }
    .head {
        font-weight: bold;
        border-bottom: 1px dashed #ccc;
        padding-bottom: 0.2rem;
        margin-bottom: 0.3rem;
    }
    .section {
        font-weight: bold;
        margin-top: 0.5rem;
        border-top: 1px dashed #ccc;
        padding-top: 0.3rem;
    }
    .note {
        color: #6e5b47;
        font-style: italic;
        font-size: 0.9em;
    }
    table {
        border-collapse: collapse;
        width: 100%;
    }
    th {
        text-align: left;
        font-weight: normal;
        padding-right: 0.75rem;
        white-space: nowrap;
    }
    td.num {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }
    tr.total th,
    tr.total td {
        font-weight: bold;
        border-top: 1px solid #ddd;
    }
    .good {
        color: #15803d;
    }
    .bad {
        color: #b91c1c;
    }
</style>
