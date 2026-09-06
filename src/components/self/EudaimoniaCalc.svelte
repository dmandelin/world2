<script lang="ts">
    // The derivation of one eudaimonia subscore for one clan, drawn from a
    // replay of last turn's update. Shown in the panel's cell tooltips.
    import {
        EuNode,
        EU_HUNGER_EXPONENT,
        EU_HUNGER_SCALE,
        EU_VITALITY_SCALE,
        type Eudaimonia,
        type EuSubscoreDef,
    } from "../../model/self/eudaimonia";

    let {
        eudaimonia,
        sub,
    }: { eudaimonia: Eudaimonia; sub: EuSubscoreDef } = $props();

    // Replaying costs a few objects, and only happens for a cell someone is
    // actually pointing at.
    let r = $derived(eudaimonia.explain());

    let prev = $derived(r.get(sub.prevNode));
    let signal = $derived(r.get(sub.signalNode));
    let pull = $derived(r.get(sub.pullNode));
    let value = $derived(r.get(sub.valueNode));

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
        <div class="head">{sub.label}</div>
        <div class="blurb">{sub.blurb}</div>

        <!-- How this year's raw circumstances become a signal. -->
        <div class="chain">
            {#if sub.key === "life"}
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
            {:else}
                <div class="node">
                    <div class="v">{pctOf(r.get(EuNode.Food))}</div>
                    <div class="l">of needs</div>
                </div>
                <div class="op">
                    &rarr; {EU_HUNGER_SCALE}&times;(f<sup
                        >{EU_HUNGER_EXPONENT}</sup
                    >&minus;1)
                </div>
                <div
                    class="node"
                    class:neg={r.get(EuNode.HungerRaw) < 0}
                    class:muted={r.get(EuNode.HungerRaw) > 0}
                >
                    <div class="v">{n(r.get(EuNode.HungerRaw))}</div>
                    <div class="l">raw</div>
                </div>
                <div class="op" title="Held at zero from above">
                    &rarr; max 0
                </div>
            {/if}
            <div class="node signal">
                <div class="v">{n(signal)}</div>
                <div class="l">signal</div>
            </div>
        </div>

        {#if sub.key === "hunger" && r.get(EuNode.HungerRaw) > 0}
            <div class="aside">
                More than enough to eat, so the signal is held at zero: this
                subscore only ever charges for going short.
            </div>
        {/if}

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

    .v {
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
    .node.muted .v {
        color: #9ca3af;
    }

    .op {
        color: #9ca3af;
        font-size: 0.82em;
    }

    .aside {
        font-size: 0.78em;
        color: #6b7280;
        line-height: 1.35;
        border-left: 2px solid #ddd6c0;
        padding-left: 0.45rem;
    }

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

    b.pos {
        color: #15803d;
    }
    b.neg {
        color: #b91c1c;
    }
</style>
