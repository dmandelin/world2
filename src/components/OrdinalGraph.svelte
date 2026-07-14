<script lang="ts">
    import { onMount } from "svelte";
    import {
        DefaultScaler,
        ZeroCenteredScaler,
        type YAxisScaler,
    } from "./linegraph";
    import { type ClanTimePoint } from "../model/records/timeline";

    interface Dataset {
        id: string;
        label: string;
        color: string;
        values: (number | undefined)[];
    }

    let {
        labels,
        datasets,
        mode,
        smoothing = "exact",
        title,
    }: {
        labels: string[];
        datasets: Dataset[];
        mode: "order" | "values";
        smoothing?: "exact" | "smoothed";
        title?: string;
    } = $props();

    let width = $state(0);
    let height = $state(0);

    const margin = 40;
    const bottomMargin = 60;
    const topMargin = 40;
    const rightMargin = 140; // Spacing for legend on the right

    let gw = $derived(Math.max(0, width - margin - rightMargin));
    let gh = $derived(Math.max(0, height - topMargin - bottomMargin));

    function smoothValues(values: (number | undefined)[], alpha = 0.4): (number | undefined)[] {
        const smoothed: (number | undefined)[] = [];
        let lastVal: number | undefined = undefined;
        for (let i = 0; i < values.length; i++) {
            const val = values[i];
            if (val === undefined || isNaN(val)) {
                smoothed.push(undefined);
                lastVal = undefined; // Reset smoothing state across gaps
            } else {
                if (lastVal === undefined) {
                    smoothed.push(val);
                    lastVal = val;
                } else {
                    const newVal: number = alpha * val + (1 - alpha) * lastVal;
                    smoothed.push(newVal);
                    lastVal = newVal;
                }
            }
        }
        return smoothed;
    }

    // 1. Process rankings and apply smoothing reactively
    let processedDatasets = $derived.by(() => {
        let base: { id: string; label: string; color: string; plottedValues: (number | undefined)[]; values: (number | undefined)[] }[];

        if (mode === "order") {
            const rankLists: (number | undefined)[][] = datasets.map(() => []);

            for (let t = 0; t < labels.length; t++) {
                const vals = datasets
                    .map((ds, idx) => ({ idx, val: ds.values[t] }))
                    .filter(
                        (item): item is { idx: number; val: number } =>
                            item.val !== undefined && !isNaN(item.val),
                    );

                // Sort descending (highest value is Rank #1)
                vals.sort((a, b) => b.val - a.val);

                let rank = 1;
                const yearRanks = Array(datasets.length).fill(undefined);
                for (let i = 0; i < vals.length; i++) {
                    if (i > 0 && vals[i].val !== vals[i - 1].val) {
                        rank = i + 1;
                    }
                    yearRanks[vals[i].idx] = rank;
                }

                for (let idx = 0; idx < datasets.length; idx++) {
                    rankLists[idx].push(yearRanks[idx]);
                }
            }

            base = datasets.map((ds, idx) => ({
                ...ds,
                plottedValues: rankLists[idx],
            }));
        } else {
            base = datasets.map((ds) => ({
                ...ds,
                plottedValues: ds.values,
            }));
        }

        if (smoothing === "smoothed") {
            return base.map((ds) => ({
                ...ds,
                plottedValues: smoothValues(ds.plottedValues),
            }));
        }

        return base;
    });

    // 2. Reactively compute the value range
    let yRange = $derived.by(() => {
        const allVals = processedDatasets.flatMap((ds) =>
            ds.plottedValues.filter((v): v is number => v !== undefined),
        );
        if (allVals.length === 0) {
            return { min: 0, max: 1 };
        }
        let min = Math.min(...allVals);
        let max = Math.max(...allVals);
        if (min === max) {
            min -= 1;
            max += 1;
        }
        return { min, max };
    });

    // 3. Compute ticks on Y-axis
    let yTicks = $derived.by(() => {
        if (mode === "order") {
            const ticks: number[] = [];
            for (let r = 1; r <= yRange.max; r++) {
                ticks.push(r);
            }
            return ticks;
        } else {
            const ticks: number[] = [];
            const numTicks = 5;
            const step = (yRange.max - yRange.min) / (numTicks - 1);
            for (let i = 0; i < numTicks; i++) {
                ticks.push(yRange.min + i * step);
            }
            return ticks;
        }
    });

    // 3b. Determine which X axis labels to show
    let visibleXLabelIndexes = $derived.by(() => {
        const visible: number[] = [];
        for (let i = 0; i < labels.length; i++) {
            const label = labels[i];
            const yearNum = parseInt(label);
            if (!isNaN(yearNum) && yearNum % 100 === 0) {
                visible.push(i);
            }
        }
        if (visible.length === 0 && labels.length > 0) {
            visible.push(labels.length - 1);
        }
        return visible;
    });

    function getXPixel(index: number): number {
        if (labels.length <= 1) return margin + gw / 2;
        return margin + (index / (labels.length - 1)) * gw;
    }

    function getYPixel(val: number): number {
        if (mode === "order") {
            const maxRank = yRange.max;
            if (maxRank <= 1) return topMargin + gh / 2;
            return topMargin + ((val - 1) / (maxRank - 1)) * gh;
        } else {
            const denom = yRange.max - yRange.min;
            return topMargin + gh - ((val - yRange.min) / denom) * gh;
        }
    }

    // 3c. Pre-calculate paths reactively to avoid Svelte template reactivity issues
    let datasetsWithPaths = $derived.by(() => {
        return processedDatasets.map((ds) => {
            const validPoints = ds.plottedValues
                .map((val, t) => ({ val, t }))
                .filter(
                    (p): p is { val: number; t: number } =>
                        p.val !== undefined && !isNaN(p.val),
                );

            let pathD = "";
            if (validPoints.length > 1) {
                pathD = validPoints
                    .map((p, idx) => {
                        const x = getXPixel(p.t);
                        const y = getYPixel(p.val);
                        return idx === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                    })
                    .join(" ");
            }

            return {
                ...ds,
                pathD,
            };
        });
    });

    // 4. Mouse interaction
    let hoveredYearIndex = $state<number | null>(null);
    let mouseX = $state(0);
    let mouseY = $state(0);

    function handleMouseMove(event: MouseEvent) {
        const target = event.currentTarget as SVGElement;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (
            x >= margin &&
            x <= margin + gw &&
            y >= topMargin &&
            y <= topMargin + gh
        ) {
            const fraction = (x - margin) / gw;
            hoveredYearIndex = Math.round(fraction * (labels.length - 1));
            mouseX = x + 15;
            mouseY = y + 15;
        } else {
            hoveredYearIndex = null;
        }
    }

    function handleMouseLeave() {
        hoveredYearIndex = null;
    }

    let hoveredDatasetId = $derived.by(() => {
        if (hoveredYearIndex === null) return null;

        let minDistance = Infinity;
        let closestId: string | null = null;

        for (const ds of processedDatasets) {
            const val = ds.plottedValues[hoveredYearIndex];
            if (val !== undefined) {
                const yPixel = getYPixel(val);
                const dist = Math.abs(mouseY - yPixel);
                if (dist < minDistance && dist < 40) {
                    minDistance = dist;
                    closestId = ds.id;
                }
            }
        }

        return closestId;
    });

    let sortedHoverItems = $derived.by(() => {
        if (hoveredYearIndex === null) return [];

        const items = processedDatasets.map((ds) => {
            const val = ds.plottedValues[hoveredYearIndex!];
            const rawVal = ds.values[hoveredYearIndex!];
            return {
                label: ds.label,
                color: ds.color,
                value: val,
                displayValue:
                    val !== undefined
                        ? mode === "order"
                            ? `#${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)} (${rawVal?.toFixed(1) ?? ""})`
                            : val % 1 === 0
                              ? val.toFixed(0)
                              : val.toFixed(1)
                        : "N/A",
            };
        });

        items.sort((a, b) => {
            if (a.value === undefined) return 1;
            if (b.value === undefined) return -1;
            if (mode === "order") {
                return a.value - b.value;
            } else {
                return b.value - a.value;
            }
        });

        return items;
    });

    let containerElement = $state<HTMLElement | null>(null);

    onMount(() => {
        if (containerElement) {
            width = containerElement.clientWidth;
            height = containerElement.clientHeight;
        }
    });
</script>

<div
    class="comparison-graph-container"
    bind:this={containerElement}
    bind:clientWidth={width}
    bind:clientHeight={height}
    style="position: relative; width: 100%; height: 100%;"
>
    {#if width > 0 && height > 0}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <svg
            viewBox={`0 0 ${width} ${height}`}
            onmousemove={handleMouseMove}
            onmouseleave={handleMouseLeave}
        >
            <!-- Title -->
            {#if title}
                <text
                    x={width / 2}
                    y={topMargin / 2}
                    font-size="14"
                    font-weight="bold"
                    text-anchor="middle"
                    alignment-baseline="middle"
                    fill="#333"
                >
                    {title}
                </text>
            {/if}

            <!-- Chart Boundary Box -->
            <rect
                x={margin}
                y={topMargin}
                width={gw}
                height={gh}
                stroke="#ddd"
                fill="none"
                stroke-width="1"
            />

            <!-- Y Axis Ticks and Labels -->
            {#each yTicks as tick}
                {@const y = getYPixel(tick)}
                <line
                    x1={margin}
                    y1={y}
                    x2={margin + gw}
                    y2={y}
                    stroke="#eee"
                    stroke-width="1"
                />
                <text
                    x={margin - 8}
                    {y}
                    font-size="10"
                    text-anchor="end"
                    alignment-baseline="middle"
                    fill="#666"
                >
                    {mode === "order" ? `#${tick}` : tick.toFixed(1)}
                </text>
            {/each}

            <!-- X Axis Labels (Years) -->
            {#each labels as label, i}
                {@const x = getXPixel(i)}
                <line
                    x1={x}
                    y1={topMargin}
                    x2={x}
                    y2={topMargin + gh}
                    stroke="#eee"
                    stroke-width="1"
                />
                {#if visibleXLabelIndexes.includes(i)}
                    <text
                        {x}
                        y={topMargin + gh + 10}
                        font-size="10"
                        text-anchor="end"
                        alignment-baseline="hanging"
                        transform={`rotate(-45 ${x} ${topMargin + gh + 10})`}
                        fill="#666"
                    >
                        {label}
                    </text>
                {/if}
            {/each}

            <!-- Hover Crosshair (Vertical Line) -->
            {#if hoveredYearIndex !== null}
                {@const x = getXPixel(hoveredYearIndex)}
                <line
                    x1={x}
                    y1={topMargin}
                    x2={x}
                    y2={topMargin + gh}
                    stroke="#aaa"
                    stroke-dasharray="4"
                    stroke-width="1"
                />
            {/if}

            <!-- SVG Paths (Lines) -->
            {#each datasetsWithPaths as dataset (dataset.id)}
                {@const isHighlighted = hoveredDatasetId === dataset.id}
                <path
                    d={dataset.pathD || ""}
                    stroke={dataset.color}
                    stroke-width={isHighlighted ? 4 : 2}
                    fill="none"
                    style="transition: stroke-width 0.1s ease;"
                />
            {/each}

            <!-- Data Circles -->
            {#each datasetsWithPaths as dataset (dataset.id)}
                {@const isHighlighted = hoveredDatasetId === dataset.id}
                {#each dataset.plottedValues as val, t (t)}
                    {#if val !== undefined}
                        <circle
                            cx={getXPixel(t)}
                            cy={getYPixel(val)}
                            r={isHighlighted ? 5 : 3.5}
                            fill={dataset.color}
                            stroke="white"
                            stroke-width="1.5"
                            style="transition: r 0.1s ease;"
                        />
                    {/if}
                {/each}
            {/each}

            <!-- Static Legend on the Right -->
            <g transform={`translate(${margin + gw + 15}, ${topMargin})`}>
                {#each datasetsWithPaths as dataset, idx (dataset.id)}
                    {@const isHighlighted = hoveredDatasetId === dataset.id}
                    <g
                        transform={`translate(0, ${idx * 18})`}
                        style="cursor: pointer;"
                        opacity={hoveredDatasetId === null || isHighlighted
                            ? 1
                            : 0.4}
                    >
                        <rect
                            width="10"
                            height="10"
                            fill={dataset.color}
                            rx="2"
                        />
                        <text
                            x="16"
                            y="9"
                            font-size="11"
                            font-weight={isHighlighted ? "bold" : "normal"}
                            fill="#333"
                            alignment-baseline="middle"
                        >
                            {dataset.label}
                        </text>
                    </g>
                {/each}
            </g>
        </svg>

        <!-- Floating HTML Tooltip -->
        {#if hoveredYearIndex !== null}
            <div
                class="comparison-tooltip"
                style="position: absolute; left: {mouseX}px; top: {mouseY}px; z-index: 100;"
            >
                <div class="tooltip-title">Year {labels[hoveredYearIndex]}</div>
                <div class="tooltip-divider"></div>
                <ul class="tooltip-list">
                    {#each sortedHoverItems as item}
                        <li class="tooltip-item">
                            <span
                                class="color-indicator"
                                style="background-color: {item.color};"
                            ></span>
                            <span class="item-label">{item.label}:</span>
                            <span class="item-val">{item.displayValue}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    {/if}
</div>

<style>
    .comparison-graph-container {
        font-family:
            system-ui,
            -apple-system,
            sans-serif;
    }

    svg {
        width: 100%;
        height: 100%;
        overflow: visible;
    }

    .comparison-tooltip {
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        padding: 8px 12px;
        pointer-events: none;
        font-size: 11px;
        color: #1a202c;
    }

    .tooltip-title {
        font-weight: bold;
        color: #4a5568;
        margin-bottom: 4px;
    }

    .tooltip-divider {
        height: 1px;
        background: #edf2f7;
        margin: 4px 0;
    }

    .tooltip-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .tooltip-item {
        display: flex;
        align-items: center;
        margin: 3px 0;
    }

    .color-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 6px;
    }

    .item-label {
        color: #718096;
        margin-right: 4px;
    }

    .item-val {
        font-weight: 600;
        margin-left: auto;
    }
</style>
