<script lang="ts">
    import type { SettlementDTO, ClanDTO } from "../model/records/dtos";
    import { DEATH_CAUSES } from "../model/people/population";
    import { signed } from "../model/lib/format";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let clans = $derived(settlement.clans);

    type RowDef =
        | { label: string; kind: "births" }
        | { label: string; kind: "cause"; cause: string }
        | { label: string; kind: "totalDeaths" }
        | { label: string; kind: "totalChange" };

    const rowDefs: RowDef[] = [
        { label: "Births", kind: "births" },
        ...DEATH_CAUSES.map((c) => ({
            label: c,
            kind: "cause" as const,
            cause: c,
        })),
        { label: "Total Deaths", kind: "totalDeaths" },
        { label: "Total Change", kind: "totalChange" },
    ];

    function itemFor(clan: ClanDTO, row: RowDef) {
        const pc = clan.lastPopulationChange;
        switch (row.kind) {
            case "births":
                return pc.birthsItem;
            case "cause":
                return pc.items.find((i) => i.name === row.cause);
            case "totalDeaths":
                return pc.totalDeathsItem;
            case "totalChange":
                return pc.totalChangeItem;
        }
    }

    // Per clan: base risk ratio (this cause alone), risk rate (after accounting
    // for competing risks), actual rate, actual change in people.
    function clanCell(clan: ClanDTO, row: RowDef) {
        const item = itemFor(clan, row);
        return {
            base: item?.riskRate ?? 0,
            risk: item?.expectedRate ?? 0,
            actualRate: item?.actualRate ?? 0,
            number: item?.actual ?? 0,
        };
    }

    // Settlement aggregate: population-weighted rates and summed counts.
    function aggregateCell(row: RowDef) {
        let prevSize = 0,
            baseSum = 0,
            riskSum = 0,
            actCount = 0;
        for (const clan of clans) {
            const pc = clan.lastPopulationChange;
            const item = itemFor(clan, row);
            prevSize += pc.previousSize;
            baseSum += (item?.riskRate ?? 0) * pc.previousSize;
            riskSum += (item?.expectedRate ?? 0) * pc.previousSize;
            actCount += item?.actual ?? 0;
        }
        return {
            base: prevSize > 0 ? baseSum / prevSize : 0,
            risk: prevSize > 0 ? riskSum / prevSize : 0,
            actualRate: prevSize > 0 ? actCount / prevSize : 0,
            number: actCount,
        };
    }

    // The change row can be positive or negative; everything else is
    // one-directional and shown as a magnitude.
    const isSigned = (row: RowDef) => row.kind === "totalChange";

    // Rates are shown per thousand people per year.
    function fmtRate(v: number, signedRow: boolean): string {
        const perMille = v * 1000;
        return signedRow ? signed(perMille, 1) : Math.abs(perMille).toFixed(1);
    }
    function fmtNum(v: number, signedRow: boolean): string {
        const n = Math.round(v);
        return signedRow ? signed(n, 0) : Math.abs(n).toString();
    }

    let diseaseLoad = $derived(settlement.cluster.diseaseLoad.value);
</script>

<div class="demographics">
    <p class="caption">
        Rates are per thousand people per year. <strong>Base</strong> is the risk
        ratio for that cause alone; <strong>Risk</strong> is the rate after
        accounting for competing risks; <strong>Act</strong> is the realized rate
        (people born or died / starting count); <strong>&#916;</strong> is the
        actual change in people. Disease load: {(diseaseLoad * 1000).toFixed()}.
    </p>
    <div class="table-scroll">
        <table>
            <thead>
                <tr>
                    <th rowspan="2" class="metric">Cause</th>
                    <th colspan="4" class="group agg-group">Settlement</th>
                    {#each clans as clan}
                        <th colspan="4" class="group">{clan.name}</th>
                    {/each}
                </tr>
                <tr>
                    <th class="agg sub group-start">Base</th>
                    <th class="agg sub">Risk</th>
                    <th class="agg sub">Act</th>
                    <th class="agg sub">&#916;</th>
                    {#each clans as _clan}
                        <th class="sub group-start">Base</th>
                        <th class="sub">Risk</th>
                        <th class="sub">Act</th>
                        <th class="sub">&#916;</th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each rowDefs as row}
                    {@const agg = aggregateCell(row)}
                    {@const sgn = isSigned(row)}
                    <tr
                        class:total-row={row.kind === "totalDeaths" ||
                            row.kind === "totalChange"}
                    >
                        <td class="metric">{row.label}</td>
                        <td class="agg group-start">{fmtRate(agg.base, sgn)}</td>
                        <td class="agg">{fmtRate(agg.risk, sgn)}</td>
                        <td class="agg">{fmtRate(agg.actualRate, sgn)}</td>
                        <td class="agg num">{fmtNum(agg.number, sgn)}</td>
                        {#each clans as clan}
                            {@const cell = clanCell(clan, row)}
                            <td class="group-start">{fmtRate(cell.base, sgn)}</td
                            >
                            <td>{fmtRate(cell.risk, sgn)}</td>
                            <td>{fmtRate(cell.actualRate, sgn)}</td>
                            <td class="num">{fmtNum(cell.number, sgn)}</td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>

<style>
    .demographics {
        margin-top: 1rem;
    }

    .caption {
        max-width: 52rem;
        margin: 0 0 0.75rem;
        font-size: 0.85rem;
        color: #4a5568;
    }

    .table-scroll {
        overflow-x: auto;
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

    th.metric,
    td.metric {
        text-align: left;
        font-weight: 500;
        color: #4a5568;
    }

    .group {
        text-align: center;
        font-weight: bold;
        color: #2d3748;
    }

    /* Divider before each column group (settlement + each clan). */
    .group,
    .group-start,
    .agg-group {
        border-left: 2px solid #cbd5e0;
    }

    .sub {
        color: #718096;
        font-weight: 500;
    }

    /* Tint the settlement aggregate columns. */
    .agg,
    .agg-group {
        background-color: #f7f5ec;
    }

    .num {
        font-weight: 600;
    }

    .total-row td {
        font-weight: 700;
        color: #1a202c;
        border-top: 1px solid #cbd5e0;
    }
</style>
