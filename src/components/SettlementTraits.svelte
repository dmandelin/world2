<script lang="ts">
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";

    let { settlement }: { settlement: SettlementDTO } = $props();

    type AxisKey = "generosity" | "bellicosity" | "giving" | "aggression";

    interface AxisDef {
        key: AxisKey;
        label: string;
        get: (c: ClanDTO) => number;
        decimals: number;
    }

    const AXES: Record<AxisKey, AxisDef> = {
        generosity: {
            key: "generosity",
            label: "Generosity",
            get: (c) => c.generosityAverage,
            decimals: 1,
        },
        bellicosity: {
            key: "bellicosity",
            label: "Bellicosity",
            get: (c) => c.bellicosityAverage,
            decimals: 1,
        },
        giving: {
            key: "giving",
            label: "Giving",
            get: (c) => c.traits.giving,
            decimals: 3,
        },
        aggression: {
            key: "aggression",
            label: "Aggression",
            get: (c) => c.traits.aggression,
            decimals: 3,
        },
    };

    const AXIS_OPTIONS = Object.values(AXES);

    const QUICK_SELECTS: { label: string; x: AxisKey; y: AxisKey }[] = [
        { label: "Generosity / Bellicosity", x: "generosity", y: "bellicosity" },
        { label: "Giving / Aggression", x: "giving", y: "aggression" },
        { label: "Giving / Generosity", x: "giving", y: "generosity" },
        { label: "Aggression / Bellicosity", x: "aggression", y: "bellicosity" },
    ];

    let xKey = $state<AxisKey>("generosity");
    let yKey = $state<AxisKey>("bellicosity");

    function setAxes(x: AxisKey, y: AxisKey) {
        xKey = x;
        yKey = y;
    }

    let xAxis = $derived(AXES[xKey]);
    let yAxis = $derived(AXES[yKey]);

    let points = $derived(
        settlement.clans.map((clan) => ({
            clan,
            x: xAxis.get(clan),
            y: yAxis.get(clan),
        })),
    );

    // Plot geometry.
    const width = 560;
    const height = 420;
    const margin = { top: 20, right: 24, bottom: 46, left: 60 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    // Domain with a little padding so dots never sit on the frame; falls
    // back to a small span when every clan lands on the same value.
    function domain(values: number[]): [number, number] {
        if (values.length === 0) return [0, 1];
        let lo = Math.min(...values);
        let hi = Math.max(...values);
        if (lo === hi) {
            const pad = Math.abs(lo) * 0.1 || 0.5;
            lo -= pad;
            hi += pad;
        } else {
            const pad = (hi - lo) * 0.12;
            lo -= pad;
            hi += pad;
        }
        return [lo, hi];
    }

    let xDomain = $derived(domain(points.map((p) => p.x)));
    let yDomain = $derived(domain(points.map((p) => p.y)));

    function xScale(v: number): number {
        const [lo, hi] = xDomain;
        return margin.left + ((v - lo) / (hi - lo || 1)) * plotW;
    }

    function yScale(v: number): number {
        const [lo, hi] = yDomain;
        return margin.top + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
    }

    function fmt(v: number, decimals: number): string {
        return v.toFixed(decimals);
    }

    function tooltipText(p: { clan: ClanDTO; x: number; y: number }): string {
        return (
            `${p.clan.name}\n` +
            `${xAxis.label}: ${fmt(p.x, xAxis.decimals)}\n` +
            `${yAxis.label}: ${fmt(p.y, yAxis.decimals)}`
        );
    }
</script>

<div class="scatter-panel">
    <h3 style="margin: 0 0 0.5rem 0;">Traits</h3>
    <p style="font-size: 0.9rem; color: #666; margin: 0 0 1rem 0;">
        Each dot is a clan, plotted by the two stats below: Generosity and
        Bellicosity are what other clans have come to think of it; Giving and
        Aggression are its own dispositions.
    </p>

    <div class="controls">
        <label>
            X axis
            <select bind:value={xKey}>
                {#each AXIS_OPTIONS as ax}
                    <option value={ax.key}>{ax.label}</option>
                {/each}
            </select>
        </label>
        <label>
            Y axis
            <select bind:value={yKey}>
                {#each AXIS_OPTIONS as ax}
                    <option value={ax.key}>{ax.label}</option>
                {/each}
            </select>
        </label>
        <div class="quick-selects">
            {#each QUICK_SELECTS as qs}
                <button
                    type="button"
                    class:active={xKey === qs.x && yKey === qs.y}
                    onclick={() => setAxes(qs.x, qs.y)}
                >
                    {qs.label}
                </button>
            {/each}
        </div>
    </div>

    {#if points.length === 0}
        <p style="font-size: 0.9rem; color: #666;">No clans to plot.</p>
    {:else}
        <svg viewBox="0 0 {width} {height}" class="scatter-svg">
            <rect
                x={margin.left}
                y={margin.top}
                width={plotW}
                height={plotH}
                fill="none"
                stroke="#c9bfa0"
            />

            {#if xDomain[0] < 0 && xDomain[1] > 0}
                <line
                    x1={xScale(0)}
                    y1={margin.top}
                    x2={xScale(0)}
                    y2={margin.top + plotH}
                    stroke="#ddd2b0"
                    stroke-dasharray="3"
                />
            {/if}
            {#if yDomain[0] < 0 && yDomain[1] > 0}
                <line
                    x1={margin.left}
                    y1={yScale(0)}
                    x2={margin.left + plotW}
                    y2={yScale(0)}
                    stroke="#ddd2b0"
                    stroke-dasharray="3"
                />
            {/if}

            <text
                x={margin.left}
                y={height - margin.bottom + 16}
                font-size="10"
                text-anchor="start">{fmt(xDomain[0], xAxis.decimals)}</text
            >
            <text
                x={margin.left + plotW}
                y={height - margin.bottom + 16}
                font-size="10"
                text-anchor="end">{fmt(xDomain[1], xAxis.decimals)}</text
            >
            <text
                x={margin.left + plotW / 2}
                y={height - 6}
                font-size="11"
                text-anchor="middle"
                font-weight="bold">{xAxis.label}</text
            >

            <text
                x={margin.left - 8}
                y={margin.top + plotH}
                font-size="10"
                text-anchor="end"
                alignment-baseline="middle"
                >{fmt(yDomain[0], yAxis.decimals)}</text
            >
            <text
                x={margin.left - 8}
                y={margin.top}
                font-size="10"
                text-anchor="end"
                alignment-baseline="middle"
                >{fmt(yDomain[1], yAxis.decimals)}</text
            >
            <text
                x={14}
                y={margin.top + plotH / 2}
                font-size="11"
                text-anchor="middle"
                font-weight="bold"
                transform="rotate(-90 14 {margin.top + plotH / 2})"
                >{yAxis.label}</text
            >

            {#each points as p}
                {@const px = xScale(p.x)}
                {@const py = yScale(p.y)}
                <g>
                    <circle
                        cx={px}
                        cy={py}
                        r="7"
                        fill={p.clan.color || "#8a6d3b"}
                        stroke="#3a2f1d"
                        stroke-width="1"
                    >
                        <title>{tooltipText(p)}</title>
                    </circle>
                    <text x={px + 10} y={py + 4} font-size="11"
                        >{p.clan.name}</text
                    >
                </g>
            {/each}
        </svg>
    {/if}
</div>

<style>
    .scatter-panel {
        padding: 1rem 2rem;
    }
    .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.75rem;
    }
    label {
        display: flex;
        flex-direction: column;
        font-size: 0.8rem;
        color: #666;
        gap: 0.15rem;
    }
    select {
        font: inherit;
        padding: 0.2rem 0.4rem;
    }
    .quick-selects {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
    }
    .quick-selects button {
        all: unset;
        font-size: 0.85rem;
        padding: 0.3rem 0.6rem;
        cursor: pointer;
        border-radius: 4px;
        background-color: #f3edd8;
        color: #333;
    }
    .quick-selects button:hover {
        background-color: #e8dfc4;
    }
    .quick-selects button.active {
        font-weight: bold;
        background-color: #d8c9a0;
    }
    .scatter-svg {
        width: 100%;
        max-width: 640px;
        height: auto;
        background-color: #faf6ea;
        border: 1px solid #e2d9c8;
        border-radius: 6px;
    }
    text {
        fill: #333;
    }
</style>
