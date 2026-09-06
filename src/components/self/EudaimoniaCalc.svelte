<script lang="ts">
    // The derivation of one figure for one clan, drawn from a replay of last
    // turn's update. Shown in tooltips on the overview row and the panel cells.
    //
    // Three shapes, because the underlying chains are different shapes:
    //
    //   Life     a short horizontal chain from births and deaths to a signal
    //   Food     a column of terms adding to a signal, then a relaxation
    //   Fortune  the same column on a straight quantity curve, and no
    //            relaxation, because it is the year rather than the verdict
    import {
        EuNode,
        EU_FOOD_STEPS,
        EU_VITALITY_SCALE,
        type Eudaimonia,
        type EuSubscoreDef,
    } from "../../model/self/eudaimonia";

    let {
        eudaimonia,
        sub,
        fortune = false,
    }: {
        eudaimonia: Eudaimonia;
        // Required unless this is the Fortune reading.
        sub?: EuSubscoreDef;
        fortune?: boolean;
    } = $props();

    // Replaying costs a few objects, and only happens for a figure someone is
    // actually pointing at. Fortune runs the same chain on a different curve,
    // so it gets its own report rather than sharing one.
    let r = $derived(
        fortune ? eudaimonia.explainFortune() : eudaimonia.explain(),
    );

    let isLife = $derived(!fortune && sub?.key === "life");

    let prev = $derived(sub ? r.get(sub.prevNode) : 0);
    let signal = $derived(
        fortune ? r.get(EuNode.FoodSignal) : sub ? r.get(sub.signalNode) : 0,
    );
    let pull = $derived(sub ? r.get(sub.pullNode) : 0);
    let value = $derived(sub ? r.get(sub.valueNode) : 0);

    const n = (x: number, p = 1) =>
        (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(p);
    const u = (x: number, p = 1) => x.toFixed(p);
    const rate = (x: number) =>
        (x >= 0 ? "+" : "−") + (Math.abs(x) * 100).toFixed(2) + "%";
    const pctOf = (x: number) => (x * 100).toFixed(0) + "%";
</script>

{#if !eudaimonia.hasRun}
    <div class="empty">No year has been lived yet.</div>
{:else}
    <div class="calc">
        <div class="head">{fortune ? "Fortune" : (sub?.label ?? "")}</div>
        <div class="blurb">
            {fortune
                ? "What this year's eating alone was worth, before the long verdict takes it in."
                : (sub?.blurb ?? "")}
        </div>

        {#if isLife}
            <!-- Births and deaths, read as a rate, read as eudaimonia. -->
            <div class="chain">
                <div class="node">
                    <div class="v">{u(r.get(EuNode.Births))}</div>
                    <div class="l">births</div>
                </div>
                <div class="op">&minus;</div>
                <div class="node">
                    <div class="v">{u(r.get(EuNode.Deaths))}</div>
                    <div class="l">deaths</div>
                </div>
                <div class="op">=</div>
                <div
                    class="node"
                    class:pos={r.get(EuNode.Net) > 0}
                    class:neg={r.get(EuNode.Net) < 0}
                >
                    <div class="v">{n(r.get(EuNode.Net))}</div>
                    <div class="l">net</div>
                </div>
                <div class="op">&divide;</div>
                <div class="node">
                    <div class="v">{u(r.get(EuNode.Population), 0)}</div>
                    <div class="l">people</div>
                </div>
                <div class="op">=</div>
                <div
                    class="node"
                    class:pos={r.get(EuNode.NetRate) > 0}
                    class:neg={r.get(EuNode.NetRate) < 0}
                >
                    <div class="v">{rate(r.get(EuNode.NetRate))}</div>
                    <div class="l">a year</div>
                </div>
                <div class="op">&times;{EU_VITALITY_SCALE}</div>
                <div class="node signal">
                    <div class="v">{n(signal)}</div>
                    <div class="l">signal</div>
                </div>
            </div>
        {:else}
            <!-- What was eaten, then what it was worth term by term. -->
            <div class="inputs">
                <span
                    ><b>{pctOf(r.get(EuNode.FoodRatio))}</b> of needs</span
                >
                <span class="sep">·</span>
                <span><b>{pctOf(r.get(EuNode.FishShare))}</b> fish</span>
                <span class="sep">·</span>
                <span><b>{pctOf(r.get(EuNode.CerealShare))}</b> cereals</span>
            </div>

            <table class="terms">
                <tbody>
                    {#each EU_FOOD_STEPS as step (step.node)}
                        {@const v = r.get(step.node)}
                        <tr
                            class:subtotal={step.isSubtotal}
                            class:part={step.isPart}
                        >
                            <td class="label" title={step.note}>
                                {step.label}
                                {#if step.node === EuNode.Taste}
                                    <span class="scale"
                                        >&times;{r
                                            .get(EuNode.TasteScale)
                                            .toFixed(2)}</span
                                    >
                                {/if}
                            </td>
                            <td class="v" class:pos={v > 0} class:neg={v < 0}
                                >{n(v)}</td
                            >
                        </tr>
                    {/each}
                    <tr class="signal-row">
                        <td class="label"
                            >{fortune ? "Fortune" : "Food signal"}</td
                        >
                        <td
                            class="v"
                            class:pos={signal > 0}
                            class:neg={signal < 0}>{n(signal)}</td
                        >
                    </tr>
                </tbody>
            </table>

            {#if r.get(EuNode.TasteScale) <= 0}
                <div class="aside">
                    Too little to eat for a treat to be worth anything, so the
                    honey and beer count for nothing this year.
                </div>
            {/if}
        {/if}

        {#if fortune}
            <div class="foot">
                Fortune reads rations on a straight line, where the standing
                Food subscore squares them &mdash; this is a report on the
                year, not a judgement built over many.
            </div>
        {:else if sub}
            <!-- The year's movement toward that signal, and no further. -->
            <div class="eq">
                <span class="out">{n(value)}</span>
                <span class="o">=</span>
                <span class="t prev">{n(prev)}</span>
                <span class="o">+</span>
                <span class="decay">{pctOf(sub.decay)}</span>
                <span class="o">&times;</span>
                <span class="o">(</span>
                <span class="t sig">{n(signal)}</span>
                <span class="o">&minus;</span>
                <span class="t prev">{n(prev)}</span>
                <span class="o">)</span>
            </div>

            <div class="foot">
                Moved <b class:pos={pull >= 0} class:neg={pull < 0}
                    >{n(pull, 2)}</b
                >
                this year. At {pctOf(sub.decay)} a year it takes about
                {Math.round(1 / sub.decay)} years to close most of the gap.
            </div>
        {/if}
    </div>
{/if}

<style>
    .calc {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 19rem;
        max-width: 25rem;
        color: #1f2328;
    }

    .empty {
        color: #6b7280;
        font-style: italic;
    }

    .head {
        font-weight: 700;
    }

    .blurb {
        font-size: 0.8em;
        color: #6b7280;
        line-height: 1.35;
    }

    /* --- life's horizontal chain --- */

    .chain {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.28rem;
        flex-wrap: wrap;
    }

    .node {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 3rem;
        padding: 0.18rem 0.32rem;
        background: #f7f4ea;
        border: 1px solid #ddd6c0;
        border-radius: 3px;
    }

    .node.signal {
        background: #eef2f7;
        border-color: #b7c6d8;
    }

    .node .v {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        font-size: 0.95em;
        line-height: 1.2;
    }

    .l {
        font-size: 0.7em;
        color: #6b7280;
    }

    .node.pos .v {
        color: #15803d;
    }
    .node.neg .v {
        color: #b91c1c;
    }

    .op {
        color: #9ca3af;
        font-size: 0.82em;
    }

    /* --- food's column of terms --- */

    .inputs {
        font-size: 0.82em;
        color: #4b5563;
    }

    .inputs b {
        font-variant-numeric: tabular-nums;
    }

    .sep {
        color: #c9c2ae;
        margin: 0 0.3rem;
    }

    table.terms {
        border-collapse: collapse;
        width: 100%;
    }

    table.terms td {
        padding: 1px 0;
        font-size: 0.88em;
    }

    table.terms .label {
        text-align: left;
        color: #4b5563;
        padding-right: 1.5rem;
    }

    table.terms .v {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    .scale {
        color: #9ca3af;
        font-size: 0.85em;
        margin-left: 0.3rem;
    }

    tr.subtotal td {
        border-top: 1px solid #e5e0d0;
        font-weight: 600;
        color: #1f2328;
    }

    tr.part .label {
        padding-left: 0.9rem;
    }

    tr.signal-row td {
        border-top: 2px solid #ddd6c0;
        font-weight: 700;
        color: #1f2328;
        padding-top: 2px;
    }

    .aside {
        font-size: 0.78em;
        color: #6b7280;
        line-height: 1.35;
        border-left: 2px solid #ddd6c0;
        padding-left: 0.45rem;
    }

    /* --- shared tail --- */

    .eq {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.25rem;
        flex-wrap: wrap;
        padding: 0.35rem 0.45rem;
        background: #fbfaf5;
        border: 1px solid #e5e0d0;
        border-radius: 3px;
        font-variant-numeric: tabular-nums;
    }

    .out {
        font-weight: 700;
    }

    .o {
        color: #9ca3af;
    }

    .t.prev {
        color: #6b7280;
    }

    .t.sig {
        color: #55688a;
        font-weight: 600;
    }

    .decay {
        color: #7c2d12;
        font-weight: 600;
    }

    .foot {
        font-size: 0.8em;
        color: #4b5563;
        line-height: 1.4;
    }

    .pos {
        color: #15803d;
    }
    .neg {
        color: #b91c1c;
    }

    b.pos {
        color: #15803d;
    }
    b.neg {
        color: #b91c1c;
    }
</style>
