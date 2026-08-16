<script lang="ts">
    import type { Summary } from "../../lib/tuning/protocol";

    let {
        title,
        points,
        precision = 0,
        color = "#3b82f6",
    }: {
        title: string;
        points: Summary[];
        precision?: number;
        color?: string;
    } = $props();

    // Fixed drawing space; CSS scales the whole thing, so text stays in
    // proportion and we never have to measure the container.
    const W = 400;
    const H = 230;
    const PAD = { top: 26, right: 12, bottom: 30, left: 52 };
    const gw = W - PAD.left - PAD.right;
    const gh = H - PAD.top - PAD.bottom;

    // Enough points to look continuous without building huge path strings.
    const MAX_POINTS = 360;

    let shown = $derived.by(() => {
        if (points.length <= MAX_POINTS) return points;
        const stride = Math.ceil(points.length / MAX_POINTS);
        const out = points.filter((_, i) => i % stride === 0);
        const last = points[points.length - 1];
        if (out[out.length - 1] !== last) out.push(last);
        return out;
    });

    // Show the quartile band and median only once there are enough runs for
    // them to mean anything.
    let runCount = $derived(points.length ? points[points.length - 1].count : 0);
    let showQuartiles = $derived(runCount >= 5);

    let xDomain = $derived.by<[number, number]>(() => {
        if (!shown.length) return [0, 1];
        const hi = shown[shown.length - 1].year;
        return [shown[0].year, hi > shown[0].year ? hi : shown[0].year + 1];
    });

    let yDomain = $derived.by<[number, number]>(() => {
        if (!shown.length) return [0, 1];
        let lo = Infinity;
        let hi = -Infinity;
        for (const p of shown) {
            if (p.min < lo) lo = p.min;
            if (p.max > hi) hi = p.max;
        }
        if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1];
        if (hi - lo < 1e-9) {
            const pad = Math.max(Math.abs(hi) * 0.1, 0.5);
            return [lo - pad, hi + pad];
        }
        const pad = (hi - lo) * 0.08;
        return [lo - pad, hi + pad];
    });

    function xp(year: number): number {
        const [lo, hi] = xDomain;
        return PAD.left + ((year - lo) / (hi - lo)) * gw;
    }

    function yp(value: number): number {
        const [lo, hi] = yDomain;
        return PAD.top + gh - ((value - lo) / (hi - lo)) * gh;
    }

    function line(pick: (p: Summary) => number): string {
        return shown
            .map((p, i) => `${i === 0 ? "M" : "L"}${xp(p.year).toFixed(1)},${yp(pick(p)).toFixed(1)}`)
            .join(" ");
    }

    // Closed shape between an upper and a lower series.
    function band(
        upper: (p: Summary) => number,
        lower: (p: Summary) => number,
    ): string {
        if (!shown.length) return "";
        const top = shown
            .map((p, i) => `${i === 0 ? "M" : "L"}${xp(p.year).toFixed(1)},${yp(upper(p)).toFixed(1)}`)
            .join(" ");
        const bottom = [...shown]
            .reverse()
            .map((p) => `L${xp(p.year).toFixed(1)},${yp(lower(p)).toFixed(1)}`)
            .join(" ");
        return `${top} ${bottom} Z`;
    }

    function fmt(v: number): string {
        if (precision === 0 && Math.abs(v) >= 10000) {
            return `${(v / 1000).toFixed(1)}k`;
        }
        return v.toLocaleString(undefined, {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
        });
    }

    let yTicks = $derived.by(() => {
        const [lo, hi] = yDomain;
        return [lo, lo + (hi - lo) / 2, hi].map((v) => ({ v, y: yp(v) }));
    });

    let latest = $derived(shown.length ? shown[shown.length - 1] : undefined);
</script>

<figure class="chart">
    <svg viewBox="0 0 {W} {H}" role="img" aria-label={title}>
        <text x={W / 2} y="14" class="title" text-anchor="middle">{title}</text>

        <!-- plot frame and horizontal gridlines -->
        <rect
            x={PAD.left}
            y={PAD.top}
            width={gw}
            height={gh}
            class="frame"
        />
        {#each yTicks as tick}
            <line
                x1={PAD.left}
                y1={tick.y}
                x2={PAD.left + gw}
                y2={tick.y}
                class="grid"
            />
            <text
                x={PAD.left - 6}
                y={tick.y}
                class="tick"
                text-anchor="end"
                dominant-baseline="middle"
            >
                {fmt(tick.v)}
            </text>
        {/each}

        {#if shown.length}
            <path d={band((p) => p.max, (p) => p.min)} fill={color} opacity="0.14" />
            {#if showQuartiles}
                <path
                    d={band((p) => p.p75, (p) => p.p25)}
                    fill={color}
                    opacity="0.28"
                />
                <path
                    d={line((p) => p.median)}
                    class="series"
                    stroke={color}
                    stroke-dasharray="4 3"
                />
            {/if}
            <path d={line((p) => p.mean)} class="series mean" stroke={color} />
        {/if}

        <!-- x axis end labels -->
        <text x={PAD.left} y={H - 12} class="tick" text-anchor="start">
            {xDomain[0]}
        </text>
        <text x={PAD.left + gw} y={H - 12} class="tick" text-anchor="end">
            {xDomain[1]}
        </text>
        <text x={PAD.left + gw / 2} y={H - 12} class="tick" text-anchor="middle">
            year
        </text>
    </svg>

    <figcaption>
        {#if latest}
            <span class="value">{fmt(latest.mean)}</span>
            <span class="range">
                {fmt(latest.min)}–{fmt(latest.max)}
            </span>
            {#if showQuartiles}
                <span class="range">med {fmt(latest.median)}</span>
            {/if}
        {:else}
            <span class="range">no data yet</span>
        {/if}
    </figcaption>
</figure>

<style>
    .chart {
        margin: 0;
        border: 1px solid #d3c4ad;
        border-radius: 4px;
        background-color: #fffdf6;
        padding: 0.25rem;
    }

    svg {
        width: 100%;
        height: auto;
        display: block;
    }

    .title {
        font-size: 12px;
        font-weight: bold;
        fill: #2c250d;
    }

    .frame {
        fill: none;
        stroke: #c9be92;
    }

    .grid {
        stroke: #e6dfba;
    }

    .tick {
        font-size: 9px;
        fill: #62531d;
    }

    .series {
        fill: none;
        stroke-width: 1.5;
    }

    .series.mean {
        stroke-width: 2;
    }

    figcaption {
        display: flex;
        gap: 0.5rem;
        align-items: baseline;
        padding: 0 0.35rem 0.15rem;
        font-size: 0.75rem;
        color: #62531d;
    }

    .value {
        font-weight: bold;
        color: #2c250d;
    }
</style>
