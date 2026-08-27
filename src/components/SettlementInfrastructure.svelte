<script lang="ts">
    import { pct, spct, unsigned } from "../model/lib/format";
    import { populationAverage } from "../model/lib/modelbasics";
    import { FLOOD_LEVELS } from "../model/environment/flood";
    import { ditchSkillFactor } from "../model/infrastructure";
    import type { FloodLevel } from "../model/environment/flood";
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import type { Table, TableColumn, TableRow } from "./tables/tables2";
    import TableView2 from "./tables/TableView2.svelte";
    import EntityLink from "./state/EntityLink.svelte";
    import DitchGauge from "./widgets/DitchGauge.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let ditch = $derived(settlement.ditch);
    let clans = $derived(settlement.clans);
    let work = $derived((clan: ClanDTO) => ditch?.forClan(clan.uuid));
    let yields = $derived(settlement.floodLevel.agricultureOn("alluvium"));

    // --- Who worked on the ditches ------------------------------------------

    interface ClanRow {
        label: string;
        tooltip?: string;
        value: (clan: ClanDTO) => number;
        format: (v: number) => string;
        // What to show in the settlement-wide column: an average over the
        // clans, a total, or a figure of its own.
        aggregate?: "average" | "sum" | "none";
        // For "none": the settlement-wide figure to show instead.
        total?: () => number;
        // Rule above this row, to mark off a step of the calculation.
        divider?: boolean;
        // Per-cell detail, e.g. the productivity items behind a factor.
        cellTooltip?: boolean;
    }

    let clanRows = $derived.by<ClanRow[]>(() => [
        {
            label: "Willingness",
            tooltip:
                "Disposition: the share of its own effort this clan is willing "
                + "to spend on the ditches. Set at random when the clan forms "
                + "and drifting slowly after.",
            value: (c) => c.traits.ditchingEffort,
            format: (v) => pct(v, 1),
        },
        {
            label: "Expects of others",
            tooltip:
                "Disposition: the share this clan thinks every clan ought to "
                + "be spending. It judges its neighbors against this figure.",
            value: (c) => c.traits.ditchingExpectation,
            format: (v) => pct(v, 1),
        },
        {
            label: "Admires digging",
            tooltip:
                "Disposition: alignment this clan grants a neighbor per point "
                + "of effort dug past what it expected -- and takes away, per "
                + "point short.",
            value: (c) => c.traits.ditchingAdmiration,
            format: (v) => v.toFixed(3),
        },
        {
            label: "Irrigation skill",
            value: (c) => c.skills.v(IRRIGATION),
            format: (v) => unsigned(v),
        },
        {
            label: "Effort on ditches",
            tooltip: "Share of this clan's own year that went to the ditches.",
            value: (c) => work(c)?.effortShare ?? 0,
            format: (v) => pct(v, 1),
            aggregate: "none",
            total: () => ditch?.effortShare ?? 0,
            divider: true,
        },
        {
            label: "× Workers",
            tooltip: "Hands the clan has to spend at all: its adults.",
            value: (c) => work(c)?.workers ?? c.workers,
            format: (v) => v.toFixed(0),
            aggregate: "sum",
        },
        {
            label: "= Worker-turns",
            tooltip: "Share of effort times workers: the plain time spent digging.",
            value: (c) => work(c)?.labor ?? 0,
            format: (v) => v.toFixed(1),
            aggregate: "sum",
        },
        {
            label: "× Productivity",
            tooltip:
                "How much ditch this clan moves per worker-turn, against a clan "
                + "of middling irrigation skill. Hover a cell for the parts.",
            value: (c) => work(c)?.productivity.tfp ?? 1,
            format: (v) => spct(v),
            aggregate: "none",
            total: () => ditch?.productivity ?? 1,
            cellTooltip: true,
        },
        {
            label: "= Effort dug",
            tooltip:
                "Productivity-adjusted worker-turns. This is the effort the ditch "
                + "depth is figured from.",
            value: (c) => work(c)?.adjustedLabor ?? 0,
            format: (v) => v.toFixed(1),
            aggregate: "sum",
        },
        {
            label: "Share of the work",
            value: (c) =>
                ditch && ditch.effort > 0
                    ? (work(c)?.adjustedLabor ?? 0) / ditch.effort : 0,
            format: (v) => pct(v),
            aggregate: "sum",
        },
    ]);

    let clanTable = $derived.by<Table<ClanRow, ClanDTO | null, any>>(() => {
        const columns: TableColumn<ClanRow, ClanDTO | null, string>[] = [
            {
                data: null,
                label: "Settlement",
                class: "col-header",
                headerSnippet: settlementHeader,
                valueFn: (row: ClanRow) => {
                    if (clans.length === 0) return "-";
                    if (row.aggregate === "none") {
                        return row.format(row.total ? row.total() : 0);
                    }
                    if (row.aggregate === "sum") {
                        return row.format(
                            clans.reduce((t, c) => t + row.value(c), 0));
                    }
                    return row.format(populationAverage(clans, row.value));
                },
            },
            ...clans.map((clan): TableColumn<ClanRow, ClanDTO | null, string> => ({
                data: clan,
                label: clan.name,
                class: "col-header",
                headerSnippet: clanHeader,
                valueFn: (row: ClanRow) => row.format(row.value(clan)),
            })),
        ];

        const rows: TableRow<ClanRow, ClanDTO | null>[] = clanRows.map((row) => ({
            data: row,
            label: row.label,
            headerTooltip: row.tooltip,
            divider: row.divider,
            tooltip: row.cellTooltip ? productivityTooltip : undefined,
        }));

        return { columns: columns as any, rows };
    });

    // --- What the ditches came to -------------------------------------------

    interface FactRow {
        label: string;
        value: string;
        note?: string;
    }

    let factRows = $derived.by<FactRow[]>(() => {
        if (!ditch?.building) return [];
        return [
            {
                label: "Organization",
                value: settlement.ditchingMethod.name,
                note: settlement.ditchingMethod.description,
            },
            {
                label: "Land to ditch",
                value: ditch.land.toFixed(0),
                note: "The fields under cultivation, which the ditch has to run "
                    + "around. Cost goes as the square root of this",
            },
            {
                label: "Effort for a full ditch",
                value: ditch.requiredEffort.toFixed(1),
                note: `What a rating of 100 around ${ditch.land.toFixed(0)} of land `
                    + `would cost. There is no threshold: less effort simply digs `
                    + `a shallower ditch`,
            },
            {
                label: "Effort given",
                value: ditch.rawEffort.toFixed(1),
                note: `Worker-turns actually spent digging, `
                    + `${pct(ditch.effortShare)} of everyone's year`,
            },
            {
                label: "Effort dug",
                value: ditch.effort.toFixed(1),
                note: `Those worker-turns at ${spct(ditch.productivity)} productivity, `
                    + `which is what the depth is figured from`,
            },
            {
                label: "Rating from digging",
                value: ditch.baseRating.toFixed(0),
                note: "Depth goes as the square root of the effort over the fourth "
                    + "root of the land, so digging twice as long makes a ditch "
                    + "about half again as deep",
            },
            {
                label: "Work at cross-purposes",
                value: ditch.coordinationPenalty > 0
                    ? `-${ditch.coordinationPenalty.toFixed(0)}` : "none",
                note: `${settlement.ditchingMethod.name} holds `
                    + `${settlement.ditchingMethod.coordinatedEffort.toFixed(0)} `
                    + `worker-turns together; the `
                    + `${ditch.uncoordinatedEffort.toFixed(1)} beyond that cost a `
                    + `point of rating each`,
            },
            {
                label: "Ditch rating",
                value: ditch.rating.toFixed(0),
            },
            {
                label: "This year's flood",
                value: `${settlement.floodLevel.name} (${settlement.floodRating.toFixed(0)})`,
                note: settlement.ditchHolds
                    ? "The ditches are built for all of it"
                    : `The ditches are built for ${pct(ditch.depthCreditAgainst(settlement.floodRating))} of it`,
            },
            {
                label: "Worth this year",
                value: pct(settlement.ditchEffect),
                note: `Of a full ditch: ${pct(ditch.depthCreditAgainst(settlement.floodRating))} `
                    + `for depth, times ${pct(ditchSkillFactor(ditch.skill))} for the `
                    + `crew's skill`,
            },
        ];
    });

    let factTable = $derived.by<Table<FactRow, string, [string]>>(() => ({
        hideHeader: true,
        columns: [
            {
                data: "Value",
                label: "Value",
                valueFn: (row: FactRow) => row.value,
            },
            {
                data: "Note",
                label: "Note",
                class: "note-col",
                valueFn: (row: FactRow) => row.note ?? "",
            },
        ] as any,
        rows: factRows.map((row) => ({ data: row, label: row.label })),
    }));

    // --- What it would be worth against each level of flood -----------------

    let levelTable = $derived.by<Table<FloodLevel, string, any>>(() => {
        // The typical push at each level, before the year's few points of
        // luck either way.
        const ratingOf = (level: FloodLevel) => 20 * (level.index + 1) - 10;
        const effectOf = (level: FloodLevel) =>
            ditch?.effectAgainst(ratingOf(level)) ?? 0;

        return {
            columns: [
                {
                    data: "flood",
                    label: "Flood",
                    valueFn: (level: FloodLevel) => ratingOf(level).toFixed(0),
                },
                {
                    data: "depth",
                    label: "Built for",
                    headerTooltip:
                        "Share of that much water the ditches are built for. "
                        + "A ditch short of the flood is not wasted; it does its "
                        + "share of the good.",
                    valueFn: (level: FloodLevel) =>
                        ditch?.building
                            ? pct(ditch.depthCreditAgainst(ratingOf(level)))
                            : "-",
                },
                {
                    data: "effect",
                    label: "Ditch worth",
                    valueFn: (level: FloodLevel) => pct(effectOf(level)),
                },
                {
                    data: "bare",
                    label: "Bare yield",
                    valueFn: (level: FloodLevel) =>
                        pct(level.agricultureOn("alluvium").unditched),
                },
                {
                    data: "yield",
                    label: "Yield now",
                    valueFn: (level: FloodLevel) =>
                        pct(level.agricultureOn("alluvium").at(effectOf(level))),
                },
            ] as any,
            rows: FLOOD_LEVELS.map((level) => ({
                data: level,
                label: level.name,
                class: level === settlement.floodLevel ? "this-year" : "",
            })),
        };
    });
</script>

<script lang="ts" module>
    import { SkillDefs } from "../model/econ/econdefs";
    const IRRIGATION = SkillDefs.Irrigation;
</script>

{#snippet productivityTooltip(_value: any, _row: ClanRow, clan: ClanDTO | null)}
    {#if clan}
        {@const p = work(clan)?.productivity}
        <div><strong>{clan.name}</strong> at ditching</div>
        {#if p}
            {#each p.items as item, i (i)}
                <div>{item.label}: {spct(item.value)} &centerdot; {item.explanation}</div>
            {/each}
            <div>Together: {spct(p.tfp)}</div>
        {:else}
            <div>Did no work on the ditches this year.</div>
        {/if}
    {:else}
        <div>Everyone's worker-turns together, weighted by what each is worth.</div>
    {/if}
{/snippet}

{#snippet settlementHeader()}
    <div class="col-header-inner">
        <div><strong>Settlement</strong></div>
        <div class="pop-sub">pop {settlement.population}</div>
    </div>
{/snippet}

{#snippet clanHeader(clan: ClanDTO | null)}
    <div class="col-header-inner">
        <div><EntityLink entity={clan!} /></div>
        <div class="pop-sub">pop {clan!.population}</div>
    </div>
{/snippet}

<div class="infrastructure">
    <div class="summary">
        <div class="gauge-block">
            <DitchGauge {settlement} width={120} />
        </div>
        <p class="lede">
            {#if ditch?.building}
                {ditch.items.length} of
                {settlement.clans.length} clans worked on the ditches this year, putting
                in {pct(ditch.effortShare)} of the settlement's effort. The ditches
                rate <strong>{ditch.rating.toFixed(0)}</strong> against water
                pushing at <strong>{settlement.floodRating.toFixed(0)}</strong>,
                {#if settlement.ditchEffect > 0.005}
                    so the harvest runs {pct(yields.at(settlement.ditchEffect))} of
                    normal instead of {pct(yields.unditched)}.
                {:else}
                    but they are worth too little this year to move the harvest off
                    {pct(yields.unditched)} of normal.
                {/if}
            {:else}
                Nobody worked on the ditches this year, so the fields take the
                water as it comes: {pct(yields.unditched)} of a normal harvest.
            {/if}
        </p>
    </div>

    <h3>Who dug</h3>
    <TableView2 table={clanTable} />

    {#if ditch?.building}
        <h3>What the ditches came to</h3>
        <TableView2 table={factTable} />
    {/if}

    <h3>Against each level of flood</h3>
    <p class="caption">
        What these ditches would be worth in a typical year at each level, and
        what the fields would yield. This year's level is marked.
    </p>
    <TableView2 table={levelTable} />
</div>

<style>
    .infrastructure {
        max-width: 60rem;
    }

    .summary {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .gauge-block {
        flex: 0 0 auto;
        padding-top: 0.2rem;
    }

    .lede {
        margin: 0;
        max-width: 44rem;
    }

    .caption {
        margin: 0 0 0.4rem;
        font-size: 0.85rem;
        color: #6b5f3a;
        max-width: 44rem;
    }

    h3 {
        margin: 1.2rem 0 0.4rem;
        font-size: 1rem;
        color: #62531d;
    }

    .col-header-inner {
        text-align: center;
    }

    .pop-sub {
        font-size: 0.75em;
        font-weight: normal;
        color: #888;
    }

    /* The note column is prose, so let it sit left and wrap. */
    :global(.infrastructure td.note-col) {
        text-align: left !important;
        font-size: 0.85em;
        color: #6b5f3a;
        max-width: 30rem;
        white-space: normal;
    }

    :global(.infrastructure tr td.this-year) {
        background-color: #f3edd8;
        font-weight: bold;
    }
</style>
