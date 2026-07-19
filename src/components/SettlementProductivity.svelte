<script lang="ts">
    import type { SettlementDTO, ClanDTO } from "../model/records/dtos";
    import type { Process } from "../model/econ/process";
    import { sortedByKey } from "../model/lib/basics";
    import { spct } from "../model/lib/format";
    import { Processes } from "../model/econ/econdefs";

    let { settlement }: { settlement: SettlementDTO } = $props();

    // Get all relevant processes run by any clan with labor > 0
    let relevantProcesses = $derived.by<Process[]>(() => {
        const set = new Set<Process>();
        for (const clan of settlement.clans) {
            for (const r of clan.production.rs) {
                if (r.labor > 0) {
                    set.add(r.operation.process);
                }
            }
        }
        return sortedByKey(Array.from(set), (p) => p.sortKey);
    });

    // Helper to get active report for a clan and process
    function getReport(clan: ClanDTO, process: Process) {
        const r = clan.production.forProcess(process);
        if (r && r.labor > 0) {
            return r;
        }
        return undefined;
    }

    // Helper to get unique modifier labels for a process across all clans
    function getModifierLabels(process: Process): string[] {
        const labels = new Set<string>();
        for (const clan of settlement.clans) {
            const r = getReport(clan, process);
            if (r) {
                for (const item of r.productivity.items) {
                    labels.add(item.label);
                }
            }
        }
        return Array.from(labels).sort();
    }

    // Helper to calculate ratio of net productivity agriculture/fishing
    function getNetProductivityRatio(clan: ClanDTO): string {
        const agri = clan.production.forProcess(Processes.Agriculture);
        const fish = clan.production.forProcess(Processes.Fishing);

        if (agri && agri.labor > 0 && fish && fish.labor > 0) {
            const netAgri = agri.amount / agri.labor;
            const netFish = fish.amount / fish.labor;
            if (netFish > 0) {
                return (netAgri / netFish).toFixed(2);
            }
        }
        return "";
    }
</script>

<div class="productivity-container">
    <table>
        <thead>
            <tr>
                <th></th>
                {#each settlement.clans as clan}
                    <th style="color: #2d3748; font-weight: bold;">
                        {clan.name}
                    </th>
                {/each}
            </tr>
        </thead>
        <tbody>
            <tr class="data-row ratio-row">
                <td class="metric-label font-bold">Agriculture/Fishing (Net)</td
                >
                {#each settlement.clans as clan}
                    <td class="font-bold">
                        {getNetProductivityRatio(clan)}
                    </td>
                {/each}
            </tr>
            <tr class="spacer-row">
                <td colspan={1 + settlement.clans.length}></td>
            </tr>

            {#each relevantProcesses as process}
                {@const modifierLabels = getModifierLabels(process)}

                <!-- Subheader row naming the Operation/Process, empty cells -->
                <tr class="subheader-row">
                    <td><strong>{process.name}</strong></td>
                    {#each settlement.clans as clan}
                        <td></td>
                    {/each}
                </tr>

                <!-- Base row -->
                <tr class="data-row">
                    <td class="metric-label">Base</td>
                    {#each settlement.clans as clan}
                        {@const r = getReport(clan, process)}
                        <td>
                            {#if r}
                                {process.outputPerWorker.toFixed(2)}
                            {/if}
                        </td>
                    {/each}
                </tr>

                <!-- Modifier rows -->
                {#each modifierLabels as label}
                    <tr class="data-row modifier-row">
                        <td class="metric-label modifier-label">{label}</td>
                        {#each settlement.clans as clan}
                            {@const r = getReport(clan, process)}
                            {@const item = r?.productivity.items.find(
                                (i) => i.label === label,
                            )}
                            <td>
                                {#if item}
                                    {spct(item.value, 0)}
                                {/if}
                            </td>
                        {/each}
                    </tr>
                {/each}

                <!-- Subtotal row -->
                <tr class="data-row subtotal-row">
                    <td class="metric-label font-italic">Subtotal</td>
                    {#each settlement.clans as clan}
                        {@const r = getReport(clan, process)}
                        <td>
                            {#if r && r.land < r.labor}
                                {spct(r.laborProductivityFactor, 0)}
                            {/if}
                        </td>
                    {/each}
                </tr>

                <!-- Land Shortage row -->
                <tr class="data-row shortage-row">
                    <td class="metric-label font-italic">Land Shortage</td>
                    {#each settlement.clans as clan}
                        {@const r = getReport(clan, process)}
                        <td>
                            {#if r && r.land < r.labor}
                                {spct(r.land / r.labor, 0)}
                            {/if}
                        </td>
                    {/each}
                </tr>

                <!-- Total row -->
                <tr class="data-row total-row">
                    <td class="metric-label">Total</td>
                    {#each settlement.clans as clan}
                        {@const r = getReport(clan, process)}
                        <td>
                            {#if r}
                                {spct(
                                    (Math.min(r.land, r.labor) / r.labor) *
                                        r.laborProductivityFactor,
                                    0,
                                )}
                            {/if}
                        </td>
                    {/each}
                </tr>

                <!-- Net row -->
                <tr class="data-row net-row">
                    <td class="metric-label font-bold">Net</td>
                    {#each settlement.clans as clan}
                        {@const r = getReport(clan, process)}
                        <td class="font-bold">
                            {#if r}
                                {(r.amount / r.labor).toFixed(2)}
                            {/if}
                        </td>
                    {/each}
                </tr>

                <!-- Spacer row between process groups -->
                <tr class="spacer-row">
                    <td colspan={1 + settlement.clans.length}></td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .productivity-container {
        margin-top: 1rem;
        overflow-x: auto;
    }

    table {
        border-collapse: collapse;
        width: 100%;
        max-width: 800px;
    }

    th,
    td {
        padding: 0.35rem 0.75rem;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
    }

    th:not(:first-child),
    td:not(:first-child) {
        text-align: right;
    }

    .subheader-row {
        background-color: #f7fafc;
    }

    .subheader-row td {
        border-bottom: 2px solid #cbd5e0;
        font-size: 1rem;
    }

    .metric-label {
        color: #4a5568;
    }

    .modifier-label {
        padding-left: 1.5rem;
    }

    .font-italic {
        font-style: italic;
    }

    .subtotal-row td,
    .shortage-row td {
        color: #718096;
    }

    .total-row {
        border-top: 1px solid #cbd5e0;
    }

    .total-row td {
        font-weight: 500;
        color: #2d3748;
    }

    .net-row td {
        background-color: #f8fafc;
        border-bottom: 2px solid #cbd5e0;
        color: #1a202c;
    }

    .font-bold {
        font-weight: bold;
    }

    .spacer-row td {
        height: 1.5rem;
        border: none;
        background: transparent;
    }
</style>
