<script lang="ts">
    import {
        CrossTab,
        type RowDataColumnSpec,
        type RowDataRowSpec,
    } from "./tables/tables2";
    import { pct, rpct, signed, unsigned } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import TableView2 from "./tables/TableView2.svelte";
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import type {
        FoodAidBidRecord,
        FoodRedistributionResult,
    } from "../model/econ/redistribution";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let world = $derived(settlement.world);
    let redistributionResult = $derived<FoodRedistributionResult | undefined>(
        world.lastFoodRedistribution,
    );

    function isClanDTO(item: any): item is ClanDTO {
        return typeof item === "object" && item !== null && "uuid" in item;
    }

    function isClanInSettlement(clan: ClanDTO): boolean {
        return settlement.clans.some((c) => c.uuid === clan.uuid);
    }

    function buildClansList(): ClanDTO[] {
        const inSettlement = new Set<string>();
        const inSettlementClans: ClanDTO[] = [];
        for (const clan of settlement.clans) {
            inSettlement.add(clan.uuid);
            inSettlementClans.push(clan);
        }

        const sortedInSettlement = sortedByKey(
            inSettlementClans,
            (c) => c.name,
        );

        const outSettlementClansMap = new Map<string, ClanDTO>();
        if (redistributionResult) {
            for (const bid of redistributionResult.bids) {
                const reqInSettlement = inSettlement.has(bid.requesterUuid);
                const donorInSettlement = inSettlement.has(bid.donorUuid);

                if (reqInSettlement || donorInSettlement) {
                    if (!reqInSettlement) {
                        const reqClan = world.clanMap.get(bid.requesterUuid);
                        if (reqClan)
                            outSettlementClansMap.set(reqClan.uuid, reqClan);
                    }
                    if (!donorInSettlement) {
                        const donorClan = world.clanMap.get(bid.donorUuid);
                        if (donorClan)
                            outSettlementClansMap.set(
                                donorClan.uuid,
                                donorClan,
                            );
                    }
                }
            }
        }

        const sortedOutSettlement = sortedByKey(
            Array.from(outSettlementClansMap.values()),
            (c) => c.name,
        );

        return [...sortedInSettlement, ...sortedOutSettlement];
    }

    let clansList = $derived(buildClansList());

    function getBid(
        rowClan: ClanDTO,
        colClan: ClanDTO,
    ): FoodAidBidRecord | undefined {
        if (!redistributionResult) return undefined;
        return redistributionResult.getBid(rowClan.uuid, colClan.uuid);
    }

    function buildRedistributionTable() {
        const initialCols: RowDataColumnSpec<ClanDTO>[] = [
            {
                label: "IFA",
                valueFn: (clan: ClanDTO) => {
                    const s = redistributionResult?.getClanSummary(clan.uuid);
                    return s ? s.initialFoodPerCapita : 0;
                },
                formatFn: (val: number) => rpct(val),
                headerTooltip: "Initial Food Available",
            },
            {
                label: "IFS",
                valueFn: (clan: ClanDTO) => {
                    const s = redistributionResult?.getClanSummary(clan.uuid);
                    return s ? s.initialStockPerCapita : 0;
                },
                formatFn: (val: number) => rpct(val),
                headerTooltip: "Initial Food Storage",
            },
            {
                label: "REC",
                valueFn: (clan: ClanDTO) => {
                    const s = redistributionResult?.getClanSummary(clan.uuid);
                    return s ? s.totalReceivedPerCapita : 0;
                },
                formatFn: (val: number) => rpct(val),
                headerTooltip: "Total Aid Received",
            },
            {
                label: "REQ",
                valueFn: (clan: ClanDTO) => {
                    const s = redistributionResult?.getClanSummary(clan.uuid);
                    return s ? s.totalRequestedPerCapita : 0;
                },
                formatFn: (val: number) => rpct(val),
                headerTooltip: "Total Aid Requested",
            },
        ];

        function isClanDTO(item: any): item is ClanDTO {
            return typeof item === "object" && item !== null && "uuid" in item;
        }

        const formatBottomCell = (val: any) =>
            val === null || val === undefined ? "" : rpct(val);

        const bottomRows: RowDataRowSpec<ClanDTO>[] = [
            {
                label: "Aid Budget",
                valueFn: (colItem: any) => {
                    if (!isClanDTO(colItem)) return null;
                    const s = redistributionResult?.getClanSummary(colItem.uuid);
                    return s ? s.aidBudgetPerCapita : 0;
                },
                formatFn: formatBottomCell,
                tooltip: aidBudgetRowTooltip as any,
                divider: true,
            },
            {
                label: "Requests",
                valueFn: (colItem: any) => {
                    if (!isClanDTO(colItem)) return null;
                    const s = redistributionResult?.getClanSummary(colItem.uuid);
                    return s ? s.totalRequestedFromPerCapita : 0;
                },
                formatFn: formatBottomCell,
            },
            {
                label: "Given",
                valueFn: (colItem: any) => {
                    if (!isClanDTO(colItem)) return null;
                    const s = redistributionResult?.getClanSummary(colItem.uuid);
                    return s ? s.totalGivenPerCapita : 0;
                },
                formatFn: formatBottomCell,
                tooltip: totalGivenRowTooltip as any,
            },
        ];

        return new CrossTab<ClanDTO, FoodAidBidRecord | undefined>(
            clansList,
            (clan: ClanDTO) => {
                const suffix = isClanInSettlement(clan) ? "" : " *";
                return clan.name + suffix;
            },
            (rowClan: ClanDTO, colClan: ClanDTO) => getBid(rowClan, colClan),
            (bid: FoodAidBidRecord | undefined) => {
                if (!bid || bid.requestedPerCapita <= 0) return "-";
                return `${rpct(bid.receivedPerCapita)} / ${rpct(bid.requestedPerCapita)}`;
            },
            cellTooltip as any,
            undefined,
            undefined,
            bottomRows,
            undefined,
            undefined,
            initialCols,
        );
    }

    let redistributionTable = $derived(buildRedistributionTable());
</script>

{#snippet cellTooltip(
    bid: FoodAidBidRecord | undefined,
    rowClan: ClanDTO,
    colClan: ClanDTO,
)}
    {#if bid}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
            <strong>Request: {rowClan.name} &larr; {colClan.name}</strong>
            <ul
                style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;"
            >
                <li>
                    • Donor Alignment to Requester: <strong
                        >{signed(bid.alignment, 2)}</strong
                    >
                </li>
                <li>
                    • Request Weight: <strong
                        >{unsigned(bid.weight, 1)}</strong
                    >
                </li>
                <li>
                    • Normalized Share: <strong
                        >{pct(bid.normalizedShare, 1)}</strong
                    >
                </li>
                <hr
                    style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;"
                />
                <li>
                    • Absolute Aid Requested: <strong
                        >{unsigned(bid.requestedAbs, 1)}</strong
                    > ({rpct(bid.requestedPerCapita)} per capita)
                </li>
                <li>
                    • Absolute Aid Received: <strong
                        >{unsigned(bid.receivedAbs, 1)}</strong
                    > ({rpct(bid.receivedPerCapita)} per capita)
                </li>
            </ul>
        </div>
    {:else}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            No aid requested between {rowClan.name} and {colClan.name}.
        </div>
    {/if}
{/snippet}

{#snippet aidBudgetRowTooltip(val: number, arg2: any, arg3?: any)}
    {@const colClan = isClanDTO(arg3) ? arg3 : isClanDTO(arg2) ? arg2 : null}
    {@const summary = colClan ? redistributionResult?.getClanSummary(colClan.uuid) : undefined}
    {#if summary && colClan}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 260px;">
            <strong>Aid Budget Calculation: {colClan.name}</strong>
            <ul
                style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;"
            >
                <li>
                    • Cereal Production: <strong
                        >{unsigned(summary.prodCereals, 1)}</strong
                    > ({rpct(summary.prodCerealsPerCapita)} / capita)
                </li>
                <li>
                    • Production Used: <strong
                        >{unsigned(summary.prodCerealsUsed, 1)}</strong
                    > ({rpct(summary.prodCerealsUsedPerCapita)} / capita)
                </li>
                <li>
                    • Surplus Production: <strong
                        >{unsigned(summary.surplusProd, 1)}</strong
                    > ({rpct(summary.availSurplusProdPerCapita)} / capita)
                </li>
                <hr
                    style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;"
                />
                <li>
                    • Half Cereal Stock: <strong
                        >{unsigned(summary.halfStock, 1)}</strong
                    > ({rpct(summary.halfStock / summary.population)} / capita)
                </li>
                <hr
                    style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;"
                />
                <li>
                    • Total Aid Budget: <strong
                        >{unsigned(summary.aidBudget, 1)}</strong
                    > ({rpct(summary.aidBudgetPerCapita)} / capita)
                </li>
            </ul>
        </div>
    {/if}
{/snippet}

{#snippet totalGivenRowTooltip(val: number, arg2: any, arg3?: any)}
    {@const colClan = isClanDTO(arg3) ? arg3 : isClanDTO(arg2) ? arg2 : null}
    {@const summary = colClan ? redistributionResult?.getClanSummary(colClan.uuid) : undefined}
    {#if summary && colClan}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 240px;">
            <strong>Total Aid Given: {colClan.name}</strong>
            <ul
                style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;"
            >
                <li>
                    • Total Food Given: <strong
                        >{unsigned(summary.totalGivenAbs, 1)}</strong
                    >
                </li>
                <li>
                    • Per Capita of Donor: <strong
                        >{rpct(summary.totalGivenPerCapita)}</strong
                    >
                </li>
            </ul>
        </div>
    {/if}
{/snippet}

<div style="padding: 1rem 2rem;">
    <div
        style="display: flex; flex-direction: row; align-items: center; gap: 1rem; margin-bottom: 1rem;"
    >
        <h3 style="margin: 0;">Food Redistribution</h3>
    </div>

    <p style="font-size: 0.85rem; color: #666; margin-bottom: 1rem;">
        Shows food aid requests and transfers for the turn. Requesters are shown in rows and donors in columns.
        Cells show "X/Y" where X is aid received and Y is aid requested (per capita of receiving clan).
        Clans from outside this settlement are marked with an asterisk (*).
    </p>

    <div class="table-container">
        <TableView2 table={redistributionTable} />
    </div>
</div>

<style>
    .table-container {
        overflow-x: auto;
        max-width: 100%;
        width: fit-content;
        border: 1px solid #e2d9c8;
        border-radius: 6px;
        background-color: #faf6ea;
        font-size: 0.85rem;
    }
</style>
