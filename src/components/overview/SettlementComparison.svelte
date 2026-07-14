<script lang="ts">
    import type { SettlementDTO } from "../../model/records/dtos";
    import { type ClanTimePoint, type TimePoint } from "../../model/records/timeline";
    import OrdinalGraph from "../OrdinalGraph.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    const metrics: { key: keyof ClanTimePoint; label: string }[] = [
        { key: "marriageAppealAverage", label: "Avg Marriage Appeal" },
        { key: "brModifier", label: "Birth Rate Modifier" },
        { key: "drModifier", label: "Death Rate Modifier" },
        { key: "food", label: "Food" },
        { key: "foodSecurity", label: "Food Security" },
        { key: "foodStorage", label: "Food Storage" },
        { key: "appeal", label: "Happiness" },
        { key: "marriageAppealStdDev", label: "Marriage Appeal SD" },
        { key: "subsistenceAppeal", label: "Material Welfare" },
        { key: "population", label: "Population" },
        { key: "averagePrestige", label: "Prestige" },
        { key: "qol", label: "Quality of Life" },
        { key: "residenceFraction", label: "Residence Fraction" },
        { key: "socialAppeal", label: "Social Welfare" },
        { key: "stress", label: "Stress" },
        { key: "supportRatio", label: "Support Ratio" },
        { key: "targetFood", label: "Target Food" },
        { key: "workers", label: "Workers" },
    ];

    let selectedMetricKey = $state<keyof ClanTimePoint>("marriageAppealAverage");
    let mode = $state<"order" | "values">("order");

    let labels = $derived(settlement.world.timeline.points.map((tp) => tp.year.toString()));

    let datasets = $derived.by(() => {
        return settlement.clans.map((clan) => {
            return {
                id: clan.uuid,
                label: clan.name,
                color: clan.color || "gray",
                values: settlement.world.timeline.points.map((tp: TimePoint) => {
                    const clanData = tp.clans.get(clan.uuid);
                    if (!clanData) return undefined;
                    const val = clanData[selectedMetricKey] as number;
                    return typeof val === "number" && !isNaN(val) ? val : undefined;
                }),
            };
        });
    });

    let selectedMetricLabel = $derived(
        metrics.find((m) => m.key === selectedMetricKey)?.label ?? "Comparison",
    );
</script>

<div class="comparison-container">
    <div class="controls-row">
        <div class="control-group">
            <label for="metric-select">Compare by</label>
            <select id="metric-select" bind:value={selectedMetricKey}>
                {#each metrics as metric}
                    <option value={metric.key}>{metric.label}</option>
                {/each}
            </select>
        </div>

        <div class="control-group">
            <span class="label-span">Display Mode</span>
            <div class="toggle-group">
                <button
                    class:active={mode === "order"}
                    onclick={() => (mode = "order")}
                >
                    Ordinal
                </button>
                <button
                    class:active={mode === "values"}
                    onclick={() => (mode = "values")}
                >
                    Values
                </button>
            </div>
        </div>
    </div>

    <div class="graph-wrapper">
        <OrdinalGraph
            {labels}
            {datasets}
            {mode}
            title={`${selectedMetricLabel} Over Time`}
        />
    </div>
</div>

<style>
    .comparison-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        width: 100%;
        max-width: 900px;
        background: transparent;
        border: none;
        padding: 0;
        box-shadow: none;
    }

    .controls-row {
        display: flex;
        flex-wrap: wrap;
        gap: 2rem;
        align-items: center;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        padding-bottom: 1rem;
    }

    .control-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    label, .label-span {
        font-size: 0.75rem;
        font-weight: 700;
        color: #4a5568;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    select {
        padding: 0.5rem 2rem 0.5rem 1rem;
        font-size: 0.875rem;
        color: #2d3748;
        background-color: #fff;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        outline: none;
        cursor: pointer;
        transition: border-color 0.15s ease-in-out;
    }

    select:focus {
        border-color: #4299e1;
        box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
    }

    .toggle-group {
        display: flex;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        overflow: hidden;
    }

    .toggle-group button {
        background: #f7fafc;
        border: none;
        border-right: 1px solid #cbd5e0;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        color: #4a5568;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.15s ease;
    }

    .toggle-group button:last-child {
        border-right: none;
    }

    .toggle-group button:hover {
        background: #edf2f7;
        color: #2d3748;
    }

    .toggle-group button.active {
        background: #4299e1;
        color: #fff;
        cursor: default;
    }

    .graph-wrapper {
        width: 100%;
        height: 400px;
        background: transparent;
        border: none;
        padding: 0;
    }
</style>
