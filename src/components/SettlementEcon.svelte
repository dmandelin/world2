<script lang="ts">
    import type { SettlementDTO, ClanDTO } from "../model/records/dtos";
    import type { DirectFlowRecord } from "../model/econ/flows";
    import { TradeGoods, type TradeGood } from "../model/trade";

    let { settlement }: { settlement: SettlementDTO } = $props();

    // Whether to show raw amounts or per-capita amounts (divided by each
    // clan's start-of-turn population).
    let displayMode: "amounts" | "per capita" = $state("amounts");

    const Fish = TradeGoods.Fish;
    const Cereals = TradeGoods.Cereals;

    type Amounts = { fish: number; cereals: number };
    type Flow = { key: string; label: string; order: number } & Amounts;
    type RenderRow = {
        label: string;
        isMain: boolean;
        // One entry per clan; null means the clan has no such flow.
        cells: (Amounts | null)[];
    };

    function fmt(v: number): string {
        if (!v || Math.abs(v) < 0.005) return "";
        return v.toFixed(2);
    }

    // Format a cell value, dividing by start-of-turn population in per-capita mode.
    function fmtCell(v: number, pop: number): string {
        if (displayMode === "per capita") {
            return fmt(pop > 0 ? v / pop : 0);
        }
        return fmt(v);
    }

    function significant(a: Amounts): boolean {
        return Math.abs(a.fish) + Math.abs(a.cereals) >= 0.005;
    }

    // Group donation/gift records by the partner clan (recipient or donor).
    function groupByPartner(
        records: readonly DirectFlowRecord[],
    ): { name: string; uuid: string; fish: number; cereals: number }[] {
        const m = new Map<
            string,
            { name: string; uuid: string; fish: number; cereals: number }
        >();
        for (const r of records) {
            let e = m.get(r.clan.uuid);
            if (!e) {
                e = { name: r.clan.name, uuid: r.clan.uuid, fish: 0, cereals: 0 };
                m.set(r.clan.uuid, e);
            }
            if (r.good === Fish) e.fish += r.amount;
            else if (r.good === Cereals) e.cereals += r.amount;
        }
        return [...m.values()];
    }

    // --- Main-row values --------------------------------------------------

    function initialStock(clan: ClanDTO, good: TradeGood): number {
        const item = clan.stock.m.get(good);
        if (!item) return 0;
        // final = initial + additions - retrievals - retrievalCost - storageLoss
        return (
            item.amount -
            item.additions +
            item.retrievals +
            item.retrievalCost +
            item.storageLoss
        );
    }

    function production(clan: ClanDTO, good: TradeGood): number {
        return clan.production.forGood(good);
    }

    function distributionTotal(clan: ClanDTO, good: TradeGood): number {
        const d = clan.distribution;
        return (
            d.totalToConsumption(good) +
            d.totalToStock(good) +
            d.totalToWaste(good) +
            d.totalToDonated(good)
        );
    }

    function consumptionTotal(clan: ClanDTO, good: TradeGood): number {
        return clan.consumption.totalGood(good);
    }

    // Net amount flowing out of stock this turn (positive = stock shrinking).
    function stockNet(clan: ClanDTO, good: TradeGood): number {
        const item = clan.stock.m.get(good);
        if (!item) return 0;
        return (
            item.retrievals +
            item.retrievalCost +
            item.storageLoss -
            item.additions
        );
    }

    // --- Sub-flows per section -------------------------------------------

    function distributionFlows(clan: ClanDTO): Flow[] {
        const d = clan.distribution;
        const flows: Flow[] = [
            { key: "d-cons", label: "→ Consumption", order: 0, fish: d.totalToConsumption(Fish), cereals: d.totalToConsumption(Cereals) },
            { key: "d-stock", label: "→ Stock", order: 1, fish: d.totalToStock(Fish), cereals: d.totalToStock(Cereals) },
            { key: "d-waste", label: "→ Waste", order: 2, fish: d.totalToWaste(Fish), cereals: d.totalToWaste(Cereals) },
        ];
        for (const g of groupByPartner(d.toDonations)) {
            flows.push({ key: "d-aid-" + g.uuid, label: "→ Aid: " + g.name, order: 3, fish: g.fish, cereals: g.cereals });
        }
        for (const g of groupByPartner(d.toGifts)) {
            flows.push({ key: "d-gift-" + g.uuid, label: "→ Gift: " + g.name, order: 4, fish: g.fish, cereals: g.cereals });
        }
        return flows.filter(significant);
    }

    function consumptionFlows(clan: ClanDTO): Flow[] {
        const c = clan.consumption;
        const flows: Flow[] = [
            { key: "c-prod", label: "← Production", order: 0, fish: c.totalFromProduction(Fish), cereals: c.totalFromProduction(Cereals) },
            { key: "c-stock", label: "← Stock", order: 1, fish: c.totalFromStock(Fish), cereals: c.totalFromStock(Cereals) },
        ];
        for (const g of groupByPartner(c.fromDonations)) {
            flows.push({ key: "c-aid-" + g.uuid, label: "← Aid: " + g.name, order: 2, fish: g.fish, cereals: g.cereals });
        }
        for (const g of groupByPartner(c.fromGifts)) {
            flows.push({ key: "c-gift-" + g.uuid, label: "← Gift: " + g.name, order: 3, fish: g.fish, cereals: g.cereals });
        }
        return flows.filter(significant);
    }

    function stockFlows(clan: ClanDTO): Flow[] {
        const s = clan.stockOutflow;
        const d = clan.distribution;
        const flows: Flow[] = [
            { key: "s-add", label: "← Added from production", order: 0, fish: -d.totalToStock(Fish), cereals: -d.totalToStock(Cereals) },
            { key: "s-cons", label: "→ Consumption", order: 1, fish: s.totalToConsumption(Fish), cereals: s.totalToConsumption(Cereals) },
        ];
        for (const g of groupByPartner(s.toDonations)) {
            flows.push({ key: "s-aid-" + g.uuid, label: "→ Aid: " + g.name, order: 2, fish: g.fish, cereals: g.cereals });
        }
        flows.push({ key: "s-cost", label: "Retrieval cost", order: 3, fish: s.totalRetrievalCost(Fish), cereals: s.totalRetrievalCost(Cereals) });
        flows.push({ key: "s-loss", label: "Storage loss", order: 4, fish: s.totalLost(Fish), cereals: s.totalLost(Cereals) });
        return flows.filter(significant);
    }

    // --- Assemble render rows --------------------------------------------

    const rows = $derived.by<RenderRow[]>(() => {
        const clans = settlement.clans;
        const out: RenderRow[] = [];

        const mainRow = (label: string, fn: (c: ClanDTO) => Amounts) => {
            out.push({ label, isMain: true, cells: clans.map(fn) });
        };

        const section = (
            label: string,
            totalFn: (c: ClanDTO, g: TradeGood) => number,
            flowFn: (c: ClanDTO) => Flow[],
        ) => {
            mainRow(label, (c) => ({ fish: totalFn(c, Fish), cereals: totalFn(c, Cereals) }));

            // Per-clan flow lookups plus a union of rows (keyed) across clans.
            const perClan = clans.map((c) => {
                const map = new Map<string, Flow>();
                for (const f of flowFn(c)) map.set(f.key, f);
                return map;
            });
            const seen = new Map<string, { key: string; label: string; order: number }>();
            for (const map of perClan) {
                for (const f of map.values()) {
                    if (!seen.has(f.key)) seen.set(f.key, { key: f.key, label: f.label, order: f.order });
                }
            }
            const subRows = [...seen.values()].sort(
                (a, b) => a.order - b.order || a.label.localeCompare(b.label),
            );
            for (const sr of subRows) {
                out.push({
                    label: sr.label,
                    isMain: false,
                    cells: perClan.map((map) => {
                        const f = map.get(sr.key);
                        return f ? { fish: f.fish, cereals: f.cereals } : null;
                    }),
                });
            }
        };

        mainRow("Initial Stock", (c) => ({ fish: initialStock(c, Fish), cereals: initialStock(c, Cereals) }));
        mainRow("Production", (c) => ({ fish: production(c, Fish), cereals: production(c, Cereals) }));
        section("Distribution", distributionTotal, distributionFlows);
        section("Consumption", consumptionTotal, consumptionFlows);
        section("Stock", stockNet, stockFlows);

        return out;
    });
</script>

<div class="econ-container">
    <table>
        <thead>
            <tr>
                <th rowspan="2" class="mode-cell">
                    <div class="mode-button-group">
                        <button
                            type="button"
                            class="mode-btn {displayMode === 'amounts'
                                ? 'active'
                                : ''}"
                            onclick={() => (displayMode = "amounts")}
                            >Amounts</button
                        >
                        <button
                            type="button"
                            class="mode-btn {displayMode === 'per capita'
                                ? 'active'
                                : ''}"
                            onclick={() => (displayMode = "per capita")}
                            >Per Capita</button
                        >
                    </div>
                </th>
                {#each settlement.clans as clan}
                    <th colspan="3" class="clan-name">{clan.name}</th>
                {/each}
            </tr>
            <tr>
                {#each settlement.clans as _clan}
                    <th>Fish</th>
                    <th>Cereals</th>
                    <th>Total</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each rows as row}
                <tr class={row.isMain ? "main-row" : "sub-row"}>
                    <td class="metric-label" class:sub-label={!row.isMain}>
                        {row.label}
                    </td>
                    {#each row.cells as cell, i}
                        {#if cell}
                            {@const pop = settlement.clans[i].previousPopulation}
                            <td>{fmtCell(cell.fish, pop)}</td>
                            <td>{fmtCell(cell.cereals, pop)}</td>
                            <td class="total-col">{fmtCell(cell.fish + cell.cereals, pop)}</td>
                        {:else}
                            <td></td>
                            <td></td>
                            <td class="total-col"></td>
                        {/if}
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .econ-container {
        margin-top: 1rem;
        overflow-x: auto;
    }

    .mode-cell {
        vertical-align: bottom;
        padding-bottom: 0.4rem;
    }

    .mode-button-group {
        display: inline-flex;
        gap: 0.25rem;
        background-color: #f3edd8;
        padding: 0.25rem;
        border-radius: 4px;
        align-items: center;
    }

    .mode-btn {
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

    .mode-btn:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }

    .mode-btn.active {
        font-weight: bold;
        background-color: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    table {
        border-collapse: collapse;
        font-size: 0.85rem;
    }

    th,
    td {
        padding: 0.2rem 0.6rem;
        text-align: right;
        border-bottom: 1px solid #e2e8f0;
        white-space: nowrap;
    }

    th:first-child,
    td:first-child {
        text-align: left;
    }

    .clan-name {
        color: #2d3748;
        font-weight: bold;
        text-align: center;
        border-left: 2px solid #cbd5e0;
    }

    thead tr:nth-child(2) th {
        color: #718096;
        font-weight: 500;
    }

    /* Divider between clan column-triplets. */
    td:nth-child(3n + 2),
    thead tr:nth-child(2) th:nth-child(3n + 1) {
        border-left: 2px solid #cbd5e0;
    }

    .metric-label {
        color: #4a5568;
    }

    .main-row td {
        font-weight: 600;
        color: #1a202c;
        border-top: 1px solid #cbd5e0;
    }

    .sub-label {
        padding-left: 1.75rem;
        color: #718096;
        font-weight: normal;
    }

    .sub-row td {
        color: #718096;
    }

    .total-col {
        font-weight: 600;
    }
</style>
