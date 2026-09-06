<script lang="ts">
    // The derivation of a clan's eudaimonia, drawn from a replay of last
    // turn's update. Used both by the overview tooltip (compact) and by the
    // Eudaimonia panel (full), so the two always say the same thing.
    import {
        EuNode,
        EU_DECAY,
        EU_RANGE,
        EU_VITALITY_SCALE,
        type Eudaimonia,
    } from "../../model/self/eudaimonia";

    let {
        eudaimonia,
        compact = false,
    }: { eudaimonia: Eudaimonia; compact?: boolean } = $props();

    // Replaying costs a few objects, and only happens for a clan someone is
    // actually looking at.
    let r = $derived(eudaimonia.explain());

    let prev = $derived(r.get(EuNode.PrevValue));
    let births = $derived(r.get(EuNode.Births));
    let deaths = $derived(r.get(EuNode.Deaths));
    let pop = $derived(r.get(EuNode.Population));
    let net = $derived(r.get(EuNode.Net));
    let netRate = $derived(r.get(EuNode.NetRate));
    let signal = $derived(r.get(EuNode.Signal));
    let pull = $derived(r.get(EuNode.Pull));
    let value = $derived(r.get(EuNode.Value));

    const n = (x: number, p = 1) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(p);
    const u = (x: number, p = 3) => x.toFixed(p);
    const rate = (x: number) => (x >= 0 ? "+" : "−") + (Math.abs(x) * 100).toFixed(2) + "%";

    // The number line spans the notional range, widening if the signal runs
    // past it, so the pull is always drawn to scale rather than clipped.
    let span = $derived(
        Math.max(
            EU_RANGE,
            Math.abs(signal) * 1.15,
            Math.abs(prev) * 1.15,
            Math.abs(value) * 1.15,
        ),
    );
    const posOf = (x: number, s: number) => 50 + (x / s) * 50;

    let prevPos = $derived(posOf(prev, span));
    let valuePos = $derived(posOf(value, span));
    let signalPos = $derived(posOf(signal, span));

    // A mark near either end would push its label off the edge if it stayed
    // centred, so labels tuck inward once they get close.
    function markStyle(pos: number): string {
        const align =
            pos > 82
                ? "transform: translateX(-100%); align-items: flex-end;"
                : pos < 18
                  ? "transform: translateX(0); align-items: flex-start;"
                  : "transform: translateX(-50%); align-items: center;";
        return `left: ${pos}%; ${align}`;
    }
</script>

{#if !eudaimonia.hasRun}
    <div class="eu-empty">No year has been lived yet.</div>
{:else}
    <div class="eu" class:compact>
        <!-- The chain from the year's vital record to a rate the clan can be
             judged on, independent of how big the clan is. -->
        <div class="eu-chain">
            <div class="eu-node">
                <div class="eu-node-v">{u(births, 1)}</div>
                <div class="eu-node-l">births</div>
            </div>
            <div class="eu-op">&minus;</div>
            <div class="eu-node">
                <div class="eu-node-v">{u(deaths, 1)}</div>
                <div class="eu-node-l">deaths</div>
            </div>
            <div class="eu-op">=</div>
            <div class="eu-node" class:pos={net > 0} class:neg={net < 0}>
                <div class="eu-node-v">{n(net, 1)}</div>
                <div class="eu-node-l">net</div>
            </div>
            <div class="eu-op">&divide;</div>
            <div class="eu-node">
                <div class="eu-node-v">{u(pop, 0)}</div>
                <div class="eu-node-l">people</div>
            </div>
            <div class="eu-op">=</div>
            <div class="eu-node" class:pos={netRate > 0} class:neg={netRate < 0}>
                <div class="eu-node-v">{rate(netRate)}</div>
                <div class="eu-node-l">a year</div>
            </div>
            <div class="eu-op">&times;{EU_VITALITY_SCALE}</div>
            <div class="eu-node signal">
                <div class="eu-node-v">{n(signal)}</div>
                <div class="eu-node-l">signal</div>
            </div>
        </div>

        <!-- Where the standing verdict sits, and how far this year moved it. -->
        <div class="eu-line-wrap">
            <div class="eu-line">
                <div class="eu-axis"></div>
                <div class="eu-zero" style="left: {posOf(0, span)}%"></div>

                <!-- The distance still to be closed, drawn faintly. -->
                <div
                    class="eu-gap"
                    style="left: {Math.min(valuePos, signalPos)}%;
                           width: {Math.abs(signalPos - valuePos)}%"
                ></div>

                <!-- What this year actually moved, drawn solidly. Widened to
                     stay visible when the pull is small, as it usually is. -->
                <div
                    class="eu-pull"
                    class:pos={pull >= 0}
                    style="left: {Math.min(prevPos, valuePos)}%;
                           width: {Math.max(0.6, Math.abs(valuePos - prevPos))}%"
                ></div>

                <div class="eu-mark signal-mark" style={markStyle(signalPos)}>
                    <div class="eu-tick"></div>
                    <div class="eu-mark-l">signal {n(signal)}</div>
                </div>
                <div class="eu-mark prev-mark" style={markStyle(prevPos)}>
                    <div class="eu-tick"></div>
                    <div class="eu-mark-l">was {n(prev)}</div>
                </div>
                <div class="eu-mark value-mark" style={markStyle(valuePos)}>
                    <div class="eu-tick"></div>
                    <div class="eu-mark-l">now {n(value)}</div>
                </div>
            </div>
            <div class="eu-line-ends">
                <span>{n(-span, 0)}</span>
                <span>{n(span, 0)}</span>
            </div>
        </div>

        <!-- The update itself, with the year's numbers standing in for the
             terms. One year closes 3% of the gap and no more. -->
        <div class="eu-eq">
            <span class="eu-eq-out">{n(value)}</span>
            <span class="eu-eq-op">=</span>
            <span class="eu-eq-term prev">{n(prev)}</span>
            <span class="eu-eq-op">+</span>
            <span class="eu-eq-decay">{(EU_DECAY * 100).toFixed(0)}%</span>
            <span class="eu-eq-op">&times;</span>
            <span class="eu-eq-paren">(</span>
            <span class="eu-eq-term signal">{n(signal)}</span>
            <span class="eu-eq-op">&minus;</span>
            <span class="eu-eq-term prev">{n(prev)}</span>
            <span class="eu-eq-paren">)</span>
        </div>

        {#if !compact}
            <div class="eu-note">
                This year moved the verdict by
                <b class:pos={pull >= 0} class:neg={pull < 0}>{n(pull, 2)}</b>.
                A clan that went on like this every year would settle at
                <b>{n(signal)}</b>, but at {(EU_DECAY * 100).toFixed(0)}% a year
                it takes about {Math.round(1 / EU_DECAY)} years to close most of
                the distance &mdash; which is the point: eudaimonia is a verdict
                on a life, not a report on a season.
            </div>
        {/if}
    </div>
{/if}

<style>
    .eu {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        min-width: 22rem;
        color: #1f2328;
    }

    .eu.compact {
        gap: 0.6rem;
        min-width: 20rem;
    }

    .eu-empty {
        color: #6b7280;
        font-style: italic;
    }

    /* --- the chain of inputs --- */

    .eu-chain {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        gap: 0.3rem;
        flex-wrap: wrap;
    }

    .eu-node {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 3.1rem;
        padding: 0.2rem 0.35rem;
        background: #f7f4ea;
        border: 1px solid #ddd6c0;
        border-radius: 3px;
    }

    .eu-node.signal {
        background: #eef2f7;
        border-color: #b7c6d8;
    }

    .eu-node-v {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        font-size: 0.95em;
        line-height: 1.2;
    }

    .eu-node-l {
        font-size: 0.72em;
        color: #6b7280;
        letter-spacing: 0.02em;
    }

    .eu-node.pos .eu-node-v {
        color: #15803d;
    }
    .eu-node.neg .eu-node-v {
        color: #b91c1c;
    }

    .eu-op {
        color: #9ca3af;
        font-size: 0.85em;
        padding: 0 0.05rem;
    }

    /* --- the number line --- */

    .eu-line-wrap {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .eu-line {
        position: relative;
        height: 4.4rem;
        margin-top: 0.9rem;
        overflow: hidden;
    }

    .eu-axis {
        position: absolute;
        top: 1.05rem;
        left: 0;
        right: 0;
        height: 2px;
        background: #e5e0d0;
    }

    .eu-zero {
        position: absolute;
        top: 0.55rem;
        width: 1px;
        height: 1rem;
        background: #c9c2ae;
    }

    .eu-gap {
        position: absolute;
        top: 1.05rem;
        height: 2px;
        background: repeating-linear-gradient(
            90deg,
            #b7c6d8 0 3px,
            transparent 3px 6px
        );
    }

    .eu-pull {
        position: absolute;
        top: 0.8rem;
        height: 0.55rem;
        border-radius: 2px;
        background: #b91c1c;
    }

    .eu-pull.pos {
        background: #15803d;
    }

    .eu-mark {
        position: absolute;
        top: 0;
        display: flex;
        flex-direction: column;
    }

    .eu-tick {
        width: 2px;
        height: 1.75rem;
        background: #9ca3af;
    }

    .eu-mark-l {
        font-size: 0.72em;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
        line-height: 1.2;
    }

    /* The "was" label rides above the axis and the other two below, so three
       marks close together stay readable. */
    .prev-mark {
        flex-direction: column-reverse;
        top: -0.95rem;
    }
    .prev-mark .eu-mark-l {
        color: #6b7280;
    }

    /* Signal rides in the lower lane: it is the one that can sit far from the
       other two, and once the verdict converges on it all three bunch up. */
    .signal-mark .eu-tick {
        background: #b7c6d8;
        height: 3.05rem;
    }
    .signal-mark .eu-mark-l {
        color: #55688a;
    }

    .value-mark .eu-tick {
        background: #1f2328;
    }
    .value-mark .eu-mark-l {
        font-weight: 600;
    }

    .eu-line-ends {
        display: flex;
        justify-content: space-between;
        font-size: 0.7em;
        color: #9ca3af;
        font-variant-numeric: tabular-nums;
    }

    /* --- the equation --- */

    .eu-eq {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.28rem;
        flex-wrap: wrap;
        padding: 0.4rem 0.5rem;
        background: #fbfaf5;
        border: 1px solid #e5e0d0;
        border-radius: 3px;
        font-variant-numeric: tabular-nums;
    }

    .eu-eq-out {
        font-weight: 700;
    }

    .eu-eq-op,
    .eu-eq-paren {
        color: #9ca3af;
    }

    .eu-eq-term.prev {
        color: #6b7280;
    }

    .eu-eq-term.signal {
        color: #55688a;
        font-weight: 600;
    }

    .eu-eq-decay {
        color: #7c2d12;
        font-weight: 600;
    }

    .eu-note {
        font-size: 0.85em;
        line-height: 1.45;
        color: #4b5563;
        max-width: 34rem;
    }

    .eu-note b.pos {
        color: #15803d;
    }
    .eu-note b.neg {
        color: #b91c1c;
    }
</style>
