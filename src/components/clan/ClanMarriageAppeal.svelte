<script lang="ts">
    import type { ClanDTO } from "../../model/records/dtos";
    import { MarriageConnection } from "../../model/relations/connection";
    import { weightedAverage } from "../../model/lib/modelbasics";
    import { signed } from "../../model/lib/format";
    import EntityLink from "../state/EntityLink.svelte";

    let { clan }: { clan: ClanDTO } = $props();

    let columnClans = $derived.by(() => {
        const world = clan.world;
        const allClans = Array.from(world.clanMap.values());
        return allClans.filter((c) => {
            if (c.uuid === clan.uuid) return false;
            const inSameSettlement = c.settlement?.uuid === clan.settlement?.uuid;
            const conn = world.connections.getForType(c, clan, MarriageConnection);
            const isRelated = conn !== undefined && conn.relatedness > 0;
            return inSameSettlement || isRelated;
        });
    });

    // Prestige = alignment * respect, so the appeal breaks down into those
    // two factors.
    const itemLabels = ["Alignment", "Respect"];

    function getItemValue(observer: ClanDTO, label: string): number | null {
        const world = clan.world;
        if (label === "Alignment") {
            return world.alignmentToward(observer, clan)?.value ?? null;
        }
        return world.respectToward(observer, clan)?.value ?? null;
    }

    function getTotalAppeal(observer: ClanDTO): number | null {
        const world = clan.world;
        if (!world.respectToward(observer, clan)) return null;
        return world.prestigeToward(observer, clan);
    }

    function getItemSummary(label: string): number | null {
        const valid = columnClans
            .map((c) => ({ clan: c, val: getItemValue(c, label) }))
            .filter((x): x is { clan: ClanDTO; val: number } => x.val !== null);
        if (valid.length === 0) return null;
        return weightedAverage(valid, (x) => x.val, (x) => x.clan.population);
    }

    let totalSummary = $derived.by(() => {
        const valid = columnClans
            .map((c) => ({ clan: c, val: getTotalAppeal(c) }))
            .filter((x): x is { clan: ClanDTO; val: number } => x.val !== null);
        if (valid.length === 0) return null;
        return weightedAverage(valid, (x) => x.val, (x) => x.clan.population);
    });
</script>

<div class="marriage-appeal-container">
    <h3>Prestige to Others (Marriage Appeal)</h3>
    {#if columnClans.length === 0}
        <p class="no-data">No relevant clans in settlement or related by marriage.</p>
    {:else}
        <table class="appeal-table">
            <thead>
                <tr>
                    <th class="row-header-th">Component</th>
                    {#each columnClans as c}
                        <th>
                            <EntityLink entity={c} />
                            {#if c.settlement?.uuid !== clan.settlement?.uuid}
                                <span class="out-of-settlement-star">*</span>
                            {/if}
                        </th>
                    {/each}
                    <th class="summary-th">Pop-weighted Avg</th>
                </tr>
            </thead>
            <tbody>
                {#each itemLabels as label}
                    {@const sumVal = getItemSummary(label)}
                    <tr>
                        <td class="row-label">{label}</td>
                        {#each columnClans as c}
                            {@const val = getItemValue(c, label)}
                            <td class="value-td">
                                {val !== null ? signed(val, 1) : ""}
                            </td>
                        {/each}
                        <td class="value-td summary-td">
                            {sumVal !== null ? signed(sumVal, 1) : ""}
                        </td>
                    </tr>
                {/each}
                <tr class="total-row">
                    <td class="row-label total-label">Prestige</td>
                    {#each columnClans as c}
                        {@const totalVal = getTotalAppeal(c)}
                        <td class="value-td total-td">
                            {totalVal !== null ? signed(totalVal, 1) : ""}
                        </td>
                    {/each}
                    <td class="value-td summary-td total-td">
                        {totalSummary !== null ? signed(totalSummary, 1) : ""}
                    </td>
                </tr>
            </tbody>
        </table>
    {/if}
</div>

<style>
    .marriage-appeal-container {
        padding: 1rem;
    }

    h3 {
        margin-top: 0;
        margin-bottom: 1rem;
        font-size: 1.1rem;
        color: #2d3748;
    }

    .no-data {
        color: #718096;
        font-style: italic;
    }

    .appeal-table {
        border-collapse: collapse;
        width: 100%;
        max-width: 900px;
        font-size: 0.9rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
    }

    .appeal-table th,
    .appeal-table td {
        padding: 0.6rem 0.8rem;
        text-align: right;
        border-bottom: 1px solid #e2e8f0;
        border-right: 1px solid #edf2f7;
    }

    .appeal-table th:last-child,
    .appeal-table td:last-child {
        border-right: none;
    }

    .appeal-table th {
        background-color: #f7fafc;
        font-weight: 600;
        color: #4a5568;
    }

    .row-header-th,
    .row-label {
        text-align: left;
        font-weight: 600;
        color: #2d3748;
        background-color: #f8fafc;
        white-space: nowrap;
    }

    .summary-th,
    .summary-td {
        background-color: #f1f5f9;
        font-weight: 700;
    }

    .total-row td {
        border-top: 2px solid #cbd5e0;
        font-weight: 700;
        background-color: #f8fafc;
    }

    .total-label {
        color: #1a202c;
    }

    .total-td {
        color: #1a202c;
    }

    .value-td {
        font-family: inherit;
    }

    .out-of-settlement-star {
        color: #b7791f;
        font-weight: bold;
    }
</style>
