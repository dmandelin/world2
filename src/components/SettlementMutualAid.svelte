<script lang="ts">
    import { CrossTab, type RowDataRowSpec } from "./tables/tables2";
    import { MutualAidInteraction, clanHelpDemand } from "../model/relations/mutualaid";
    import { pct, unsigned } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import TableView2 from "./tables/TableView2.svelte";
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import type { Interaction } from "../model/relations/interaction";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let world = $derived(settlement.world);

    let mutualAidOption: "Amount" | "Value" | "Trust" = $state("Amount");

    function isClanInSettlement(clan: ClanDTO): boolean {
        return settlement.clans.some(c => c.uuid === clan.uuid);
    }

    function buildClansList(): ClanDTO[] {
        const inSettlement = new Set<string>();
        const inSettlementClans: ClanDTO[] = [];
        for (const clan of settlement.clans) {
            inSettlement.add(clan.uuid);
            inSettlementClans.push(clan);
        }

        const sortedInSettlement = sortedByKey(inSettlementClans, (c) => c.name);

        const outSettlementClansMap = new Map<string, ClanDTO>();
        for (const clan of settlement.clans) {
            for (const [other, ma] of world.interactionsForType(clan, MutualAidInteraction)) {
                if (!inSettlement.has(other.uuid)) {
                    outSettlementClansMap.set(other.uuid, other);
                }
            }
        }

        const sortedOutSettlement = sortedByKey(Array.from(outSettlementClansMap.values()), (c) => c.name);

        return [...sortedInSettlement, ...sortedOutSettlement];
    }

    function totalHelpReceivedAmount(clan: ClanDTO): number {
        let sum = 0;
        const allClansList = buildClansList();
        for (const other of allClansList) {
            if (clan.uuid === other.uuid) continue;
            const interactions = world.interactions.get(clan.ref, other.ref);
            const interaction = interactions.find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined;
            if (interaction) {
                sum += interaction.amount;
            }
        }
        return sum;
    }

    function totalHelpReceivedValue(clan: ClanDTO): number {
        let sum = 0;
        const allClansList = buildClansList();
        for (const other of allClansList) {
            if (clan.uuid === other.uuid) continue;
            const interactions = world.interactions.get(clan.ref, other.ref);
            const interaction = interactions.find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined;
            if (interaction) {
                sum += interaction.amount * (1 - interaction.icebergCost) * interaction.trust;
            }
        }
        return sum;
    }

    function totalHelpLostAmount(clan: ClanDTO): number {
        let sum = 0;
        const allClansList = buildClansList();
        for (const other of allClansList) {
            if (clan.uuid === other.uuid) continue;
            const interactions = world.interactions.get(clan.ref, other.ref);
            const interaction = interactions.find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined;
            if (interaction) {
                sum += interaction.amount * interaction.icebergCost;
            }
        }
        return sum;
    }

    function averageTrustAll(clan: ClanDTO): number {
        let sum = 0;
        let count = 0;
        const allClansList = buildClansList();
        for (const other of allClansList) {
            if (clan.uuid === other.uuid) continue;
            const interactions = world.interactions.get(clan.ref, other.ref);
            const interaction = interactions.find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined;
            if (interaction) {
                sum += interaction.trust;
                count++;
            }
        }
        return count > 0 ? sum / count : 0.5;
    }

    function averageTrustValue(clan: ClanDTO): number {
        let sumValue = 0;
        let sumAmount = 0;
        const allClansList = buildClansList();
        for (const other of allClansList) {
            if (clan.uuid === other.uuid) continue;
            const interactions = world.interactions.get(clan.ref, other.ref);
            const interaction = interactions.find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined;
            if (interaction && interaction.amount > 0) {
                sumValue += interaction.amount * interaction.trust;
                sumAmount += interaction.amount;
            }
        }
        return sumAmount > 0 ? sumValue / sumAmount : 0.5;
    }

    function newMutualAidCellValue(rowClan: ClanDTO, colClan: ClanDTO): number | null {
        if (rowClan.uuid === colClan.uuid) return null;
        const interactions = world.interactions.get(rowClan.ref, colClan.ref);
        const interaction = interactions.find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined;
        if (!interaction) return null;

        if (mutualAidOption === "Amount") return interaction.amount;
        if (mutualAidOption === "Trust") return interaction.trust;
        return interaction.amount * (1 - interaction.icebergCost) * interaction.trust;
    }

    function newMutualAidFormat(value: number | null): string {
        if (value === null) return "";
        if (mutualAidOption === "Trust") {
            return unsigned(value, 2);
        }
        return unsigned(value, 1);
    }

    function getColClass(clan: ClanDTO): string {
        return isClanInSettlement(clan) ? "" : "out-of-settlement";
    }

    function getRowClass(clan: ClanDTO): string {
        return isClanInSettlement(clan) ? "" : "out-of-settlement";
    }

    function buildNewMutualAidTable() {
        const clansList = buildClansList();
        const rowDataRows: RowDataRowSpec<ClanDTO>[] = [];

        if (mutualAidOption === "Trust") {
            rowDataRows.push({
                label: "Average",
                valueFn: (col: ClanDTO) => {
                    if (!isClanInSettlement(col)) return null;
                    return averageTrustAll(col);
                },
                formatFn: (val: number | null) => val === null ? "" : unsigned(val, 2),
                tooltip: averageTrustRowTooltip as any,
                headerTooltip: rowHeaderMetricTooltip as any,
                divider: true,
            });
        } else if (mutualAidOption === "Amount") {
            rowDataRows.push(
                {
                    label: "Sat",
                    valueFn: (col: ClanDTO) => {
                        if (!isClanInSettlement(col)) return null;
                        const gross = totalHelpReceivedAmount(col);
                        const cost = totalHelpLostAmount(col);
                        const net = gross - cost;
                        const demand = clanHelpDemand(col.population);
                        return demand > 0 ? net / demand : 0;
                    },
                    formatFn: (val: number | null) => val === null ? "" : pct(val),
                    tooltip: amountSatRowTooltip as any,
                    headerTooltip: rowHeaderMetricTooltip as any,
                    divider: true,
                },
                {
                    label: "Demand",
                    valueFn: (col: ClanDTO) => {
                        if (!isClanInSettlement(col)) return null;
                        return clanHelpDemand(col.population);
                    },
                    formatFn: (val: number | null) => val === null ? "" : unsigned(val, 1),
                    tooltip: amountDemandRowTooltip as any,
                    headerTooltip: rowHeaderMetricTooltip as any,
                },
                {
                    label: "Total",
                    valueFn: (col: ClanDTO) => {
                        if (!isClanInSettlement(col)) return null;
                        return totalHelpReceivedAmount(col);
                    },
                    formatFn: (val: number | null) => val === null ? "" : unsigned(val, 1),
                    tooltip: amountTotalRowTooltip as any,
                    headerTooltip: rowHeaderMetricTooltip as any,
                },
                {
                    label: "Cost",
                    valueFn: (col: ClanDTO) => {
                        if (!isClanInSettlement(col)) return null;
                        return totalHelpLostAmount(col);
                    },
                    formatFn: (val: number | null) => val === null ? "" : unsigned(val, 1),
                    tooltip: amountCostRowTooltip as any,
                    headerTooltip: rowHeaderMetricTooltip as any,
                }
            );
        } else if (mutualAidOption === "Value") {
            rowDataRows.push(
                {
                    label: "Trust",
                    valueFn: (col: ClanDTO) => {
                        if (!isClanInSettlement(col)) return null;
                        return averageTrustValue(col);
                    },
                    formatFn: (val: number | null) => val === null ? "" : unsigned(val, 2),
                    tooltip: valueTrustRowTooltip as any,
                    headerTooltip: rowHeaderMetricTooltip as any,
                    divider: true,
                },
                {
                    label: "Total",
                    valueFn: (col: ClanDTO) => {
                        if (!isClanInSettlement(col)) return null;
                        return totalHelpReceivedValue(col);
                    },
                    formatFn: (val: number | null) => val === null ? "" : unsigned(val, 1),
                    tooltip: valueTotalRowTooltip as any,
                    headerTooltip: rowHeaderMetricTooltip as any,
                }
            );
        }

        return new CrossTab<ClanDTO, number | null>(
            clansList,
            (clan: ClanDTO) => {
                const suffix = isClanInSettlement(clan) ? "" : " *";
                return clan.name + suffix;
            },
            newMutualAidCellValue,
            newMutualAidFormat,
            newMutualAidCellTooltip,
            undefined,
            undefined,
            rowDataRows,
            getColClass,
            getRowClass,
        );
    }
</script>

{#snippet newMutualAidCellTooltip(value: number | null, rowClan: ClanDTO, colClan: ClanDTO)}
    {#if value !== null}
        {@const interactions = world.interactions.get(rowClan.ref, colClan.ref)}
        {@const ma = interactions.find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined}
        {#if ma}
            {@const demand = clanHelpDemand(colClan.population)}
            {@const grossVal = ma.amount}
            {@const travelCostVal = ma.amount * ma.icebergCost}
            {@const netVal = ma.amount * (1 - ma.icebergCost)}
            {@const valueVal = netVal * ma.trust}
            <div style="font-size: 0.9em; padding: 0.25rem; min-width: 220px;">
                <strong>Mutual Aid Details:</strong>
                <ul style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;">
                    <li>• Helpee (Col): {colClan.name} {#if isClanInSettlement(colClan)}(Demand: {unsigned(demand, 1)}){/if}</li>
                    <li>• Helper (Row): {rowClan.name}</li>
                    <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;" />
                    <li>• Distance: {unsigned(ma.distance, 1)} miles</li>
                    <li>• Iceberg Cost Rate: {pct(ma.icebergCost)}</li>
                    <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;" />
                    <li>• Amount Sent: {unsigned(grossVal, 1)}</li>
                    <li>• Lost in Transit: {unsigned(travelCostVal, 1)}</li>
                    <li>• Net Amount Received: {unsigned(netVal, 1)}</li>
                    <li>• Trust Factor: {unsigned(ma.trust, 2)}</li>
                    <li>• Value (Net × Trust): {unsigned(valueVal, 1)}</li>
                </ul>
            </div>
        {/if}
    {:else}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            No mutual aid interaction between {rowClan.name} and {colClan.name}.
        </div>
    {/if}
{/snippet}

{#snippet rowHeaderMetricTooltip(spec: any)}
    <div style="font-size: 0.9em; padding: 0.25rem;">
        <strong>{spec.label}:</strong>
        {#if spec.label === "Sat"}
            Help satisfaction ratio (Net Help Received / Demand)
        {:else if spec.label === "Demand"}
            Help demand based on population
        {:else if spec.label === "Total"}
            Total help amount or value received
        {:else if spec.label === "Cost"}
            Total help amount lost in transit (Amount × Iceberg Cost)
        {:else if spec.label === "Trust"}
            Weighted average trust factor
        {:else if spec.label === "Average"}
            Average trust factor
        {/if}
    </div>
{/snippet}

{#snippet averageTrustRowTooltip(value: number | null, spec: any, colClan: ClanDTO)}
    {#if value !== null}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            <strong>Average Trust of {colClan.name} Relationships:</strong> {unsigned(value, 2)}
            <br />
            <span style="font-size: 0.85em; color: #666;">
                Average of the fixed 0.5 trust factor across all connected relationships.
            </span>
        </div>
    {/if}
{/snippet}

{#snippet amountSatRowTooltip(value: number | null, spec: any, colClan: ClanDTO)}
    {#if value !== null}
        {@const gross = totalHelpReceivedAmount(colClan)}
        {@const cost = totalHelpLostAmount(colClan)}
        {@const net = gross - cost}
        {@const demand = clanHelpDemand(colClan.population)}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            <strong>Help Satisfaction (Sat) for {colClan.name}:</strong> {pct(value)}
            <ul style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;">
                <li>• Gross help amount: {unsigned(gross, 1)}</li>
                <li>• Travel cost (lost): {unsigned(cost, 1)}</li>
                <li>• Net help received (net): {unsigned(net, 1)}</li>
                <li>• Help demand: {unsigned(demand, 1)}</li>
                <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;" />
                <li><strong>Formula:</strong> Net Received / Demand = {pct(value)}</li>
            </ul>
        </div>
    {/if}
{/snippet}

{#snippet amountDemandRowTooltip(value: number | null, spec: any, colClan: ClanDTO)}
    {#if value !== null}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            <strong>Help Demand for {colClan.name}:</strong> {unsigned(value, 1)}
            <ul style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;">
                <li>• Population: {colClan.population}</li>
                <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;" />
                <li><strong>Formula:</strong> {colClan.population} × √(10 / {colClan.population}) = {unsigned(value, 1)}</li>
            </ul>
        </div>
    {/if}
{/snippet}

{#snippet amountTotalRowTooltip(value: number | null, spec: any, colClan: ClanDTO)}
    {#if value !== null}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 200px;">
            <strong>Total Help Received by {colClan.name} Breakdown:</strong>
            <ul style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;">
                {#each buildClansList() as other}
                    {#if colClan.uuid !== other.uuid}
                        {@const interactions = world.interactions.get(colClan.ref, other.ref)}
                        {@const ma = interactions.find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined}
                        {#if ma && ma.amount > 0}
                            <li>• From helper {other.name}: {unsigned(ma.amount, 1)}</li>
                        {/if}
                    {/if}
                {/each}
                <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;" />
                <li><strong>Total Help Received:</strong> {unsigned(value, 1)}</li>
            </ul>
        </div>
    {/if}
{/snippet}

{#snippet valueTrustRowTooltip(value: number | null, spec: any, colClan: ClanDTO)}
    {#if value !== null}
        {@const sumVal = totalHelpReceivedValue(colClan)}
        {@const sumAmt = totalHelpReceivedAmount(colClan)}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            <strong>Weighted Average Trust for {colClan.name}:</strong> {unsigned(value, 2)}
            <ul style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;">
                <li>• Total help value (amount × trust): {unsigned(sumVal, 1)}</li>
                <li>• Total help amount: {unsigned(sumAmt, 1)}</li>
                <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;" />
                <li><strong>Formula:</strong> {unsigned(sumVal, 1)} / {unsigned(sumAmt, 1)} = {unsigned(value, 2)}</li>
            </ul>
        </div>
    {/if}
{/snippet}

{#snippet valueTotalRowTooltip(value: number | null, spec: any, colClan: ClanDTO)}
    {#if value !== null}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 200px;">
            <strong>Total Help Value Received by {colClan.name} Breakdown:</strong>
            <ul style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;">
                {#each buildClansList() as other}
                    {#if colClan.uuid !== other.uuid}
                        {@const interactions = world.interactions.get(colClan.ref, other.ref)}
                        {@const ma = interactions.find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined}
                        {#if ma && ma.amount > 0}
                            {@const netVal = ma.amount * (1 - ma.icebergCost)}
                            {@const valueVal = netVal * ma.trust}
                            <li>• From helper {other.name}: {unsigned(valueVal, 1)} (gross: {unsigned(ma.amount, 1)} -> net: {unsigned(netVal, 1)} × trust: {unsigned(ma.trust, 2)})</li>
                        {/if}
                    {/if}
                {/each}
                <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;" />
                <li><strong>Total Help Value:</strong> {unsigned(value, 1)}</li>
            </ul>
        </div>
    {/if}
{/snippet}

{#snippet amountCostRowTooltip(value: number | null, spec: any, colClan: ClanDTO)}
    {#if value !== null}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 200px;">
            <strong>Total Help Lost in Transit for {colClan.name} Breakdown:</strong>
            <ul style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;">
                {#each buildClansList() as other}
                    {#if colClan.uuid !== other.uuid}
                        {@const interactions = world.interactions.get(colClan.ref, other.ref)}
                        {@const ma = interactions.find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined}
                        {#if ma && ma.amount > 0 && ma.icebergCost > 0}
                            <li>• From helper {other.name}: {unsigned(ma.amount * ma.icebergCost, 1)} (amount: {unsigned(ma.amount, 1)} × cost: {pct(ma.icebergCost)})</li>
                        {/if}
                    {/if}
                {/each}
                <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;" />
                <li><strong>Total Cost (Lost):</strong> {unsigned(value, 1)}</li>
            </ul>
        </div>
    {/if}
{/snippet}

<div style="padding: 1rem 2rem;">
    <div style="display: flex; flex-direction: row; align-items: center; gap: 1rem; margin-bottom: 1rem;">
        <h3 style="margin: 0;">Mutual Aid Interactions</h3>
        <div class="stress-button-group">
            <button
                type="button"
                class="stress-btn {mutualAidOption === 'Amount' ? 'active' : ''}"
                onclick={() => (mutualAidOption = 'Amount')}
            >Amount</button>
            <button
                type="button"
                class="stress-btn {mutualAidOption === 'Value' ? 'active' : ''}"
                onclick={() => (mutualAidOption = 'Value')}
            >Value</button>
            <button
                type="button"
                class="stress-btn {mutualAidOption === 'Trust' ? 'active' : ''}"
                onclick={() => (mutualAidOption = 'Trust')}
            >Trust</button>
        </div>
    </div>
    
    <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">
        This matrix shows help exchanges between helpers (rows) and helpees (columns).
        Clans from outside this settlement are marked with an asterisk (*) and shaded.
    </p>

    <div class="table-container">
        <TableView2
            table={buildNewMutualAidTable()}
        />
    </div>
</div>

<style>
    .stress-button-group {
        display: inline-flex;
        gap: 0.25rem;
        background-color: #f3edd8;
        padding: 0.25rem;
        border-radius: 4px;
        align-items: center;
    }
    .stress-btn {
        all: unset;
        font-size: 0.9rem;
        padding: 0.25rem 0.75rem;
        cursor: pointer;
        border-radius: 3px;
        color: #333;
        transition:
            background-color 0.2s,
            font-weight 0.2s;
    }
    .stress-btn:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }
    .stress-btn.active {
        font-weight: bold;
        background-color: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .table-container {
        overflow-x: auto;
        max-width: 100%;
        width: fit-content;
        border: 1px solid #e2d9c8;
        border-radius: 6px;
        background-color: #faf6ea;
    }
</style>
