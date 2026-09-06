<script lang="ts">
    // A clan's eudaimonia broken into its subscores. This is the main content
    // of the overview tooltip: what the score is made of, and which way each
    // part moved this year.
    import {
        EU_SUBSCORES,
        type Eudaimonia,
    } from "../../model/self/eudaimonia";

    let { eudaimonia }: { eudaimonia: Eudaimonia } = $props();

    const n = (x: number, p = 1) =>
        (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(p);
    const pctOf = (x: number) => (x * 100).toFixed(0) + "%";

    let rows = $derived(
        EU_SUBSCORES.map((sub) => ({
            sub,
            value: eudaimonia.subscore(sub.key),
            delta: eudaimonia.hasRun
                ? eudaimonia.subscore(sub.key) -
                  eudaimonia.previousSubscore(sub.key)
                : 0,
        })),
    );
</script>

<div class="wrap">
    <table>
        <tbody>
            {#each rows as row (row.sub.key)}
                <tr>
                    <td class="label">
                        {row.sub.label}
                        <span class="decay">{pctOf(row.sub.decay)}/yr</span>
                    </td>
                    <td
                        class="val"
                        class:pos={row.value > 0}
                        class:neg={row.value < 0}>{n(row.value)}</td
                    >
                    <td
                        class="delta"
                        class:pos={row.delta > 0}
                        class:neg={row.delta < 0}
                    >
                        {eudaimonia.hasRun ? n(row.delta, 2) : "–"}
                    </td>
                </tr>
            {/each}
            <tr class="total">
                <td class="label">Eudaimonia</td>
                <td
                    class="val"
                    class:pos={eudaimonia.value > 0}
                    class:neg={eudaimonia.value < 0}>{n(eudaimonia.value)}</td
                >
                <td
                    class="delta"
                    class:pos={eudaimonia.delta > 0}
                    class:neg={eudaimonia.delta < 0}
                >
                    {eudaimonia.hasRun ? n(eudaimonia.delta, 2) : "–"}
                </td>
            </tr>
        </tbody>
    </table>
    <div class="foot">Click the row label for the full panel.</div>
</div>

<style>
    .wrap {
        min-width: 15rem;
        color: #1f2328;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    td {
        padding: 2px 0;
        vertical-align: baseline;
    }

    .label {
        text-align: left;
        padding-right: 1rem;
        white-space: nowrap;
    }

    .decay {
        color: #9ca3af;
        font-size: 0.75em;
        margin-left: 0.3rem;
    }

    .val,
    .delta {
        text-align: right;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    .val {
        padding-right: 0.75rem;
    }

    .delta {
        font-size: 0.82em;
        color: #9ca3af;
    }

    .total td {
        border-top: 1px solid #e5e0d0;
        padding-top: 4px;
        font-weight: 700;
    }

    .pos {
        color: #15803d;
    }
    .neg {
        color: #b91c1c;
    }

    .foot {
        margin-top: 6px;
        font-size: 0.78em;
        color: #6b7280;
    }
</style>
