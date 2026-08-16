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
    import {
        AID_BUDGET_FOOD_THRESHOLD,
        type FoodAidBidRecord,
        type FoodRedistributionResult,
    } from "../model/econ/redistribution";
    import type {
        FoodGiftRecord,
        FoodGiftsResult,
    } from "../model/econ/gifts";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let world = $derived(settlement.world);
    let viewMode = $state<"Net" | "Gifts" | "Aid">("Net");

    let redistributionResult = $derived<FoodRedistributionResult | undefined>(
        world.lastFoodRedistribution,
    );
    let giftsResult = $derived<FoodGiftsResult | undefined>(
        world.lastFoodGifts,
    );

    function isClanDTO(item: any): item is ClanDTO {
        return typeof item === "object" && item !== null && "uuid" in item;
    }

    function isClanInSettlement(clan: ClanDTO): boolean {
        return settlement.clans.some((c) => c.uuid === clan.uuid);
    }

    function signedRpct(x: number): string {
        const r = Math.round(x * 100);
        return r > 0 ? `+${r}` : `${r}`;
    }

    function buildClansList(): ClanDTO[] {
        const inSettlement = new Set<string>();
        const inSettlementClans: ClanDTO[] = [];
        for (const clan of settlement.clans) {
            if (clan.population > 0) {
                inSettlement.add(clan.uuid);
                inSettlementClans.push(clan);
            }
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
                        if (reqClan && reqClan.population > 0)
                            outSettlementClansMap.set(reqClan.uuid, reqClan);
                    }
                    if (!donorInSettlement) {
                        const donorClan = world.clanMap.get(bid.donorUuid);
                        if (donorClan && donorClan.population > 0)
                            outSettlementClansMap.set(
                                donorClan.uuid,
                                donorClan,
                            );
                    }
                }
            }
        }

        if (giftsResult) {
            for (const gift of giftsResult.records) {
                const reqInSettlement = inSettlement.has(gift.recipientUuid);
                const donorInSettlement = inSettlement.has(gift.donorUuid);

                if (reqInSettlement || donorInSettlement) {
                    if (!reqInSettlement) {
                        const reqClan = world.clanMap.get(gift.recipientUuid);
                        if (reqClan && reqClan.population > 0)
                            outSettlementClansMap.set(reqClan.uuid, reqClan);
                    }
                    if (!donorInSettlement) {
                        const donorClan = world.clanMap.get(gift.donorUuid);
                        if (donorClan && donorClan.population > 0)
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

    function getAidBid(
        rowClan: ClanDTO,
        colClan: ClanDTO,
    ): FoodAidBidRecord | undefined {
        if (!redistributionResult) return undefined;
        return redistributionResult.getBid(rowClan.uuid, colClan.uuid);
    }

    function getFoodGift(
        donorClan: ClanDTO,
        recipientClan: ClanDTO,
    ): FoodGiftRecord | undefined {
        if (!giftsResult) return undefined;
        return giftsResult.getGift(donorClan.uuid, recipientClan.uuid);
    }

    interface NetTransferData {
        rowClan: ClanDTO;
        colClan: ClanDTO;
        giftsReceivedAbs: number;
        giftsGivenAbs: number;
        aidReceivedAbs: number;
        aidGivenAbs: number;
        netAbs: number;
        netPerCapita: number;
    }

    function getNetTransfer(
        rowClan: ClanDTO,
        colClan: ClanDTO,
    ): NetTransferData {
        const giftsReceivedAbs =
            getFoodGift(colClan, rowClan)?.giftAbs ?? 0;
        const giftsGivenAbs =
            getFoodGift(rowClan, colClan)?.giftAbs ?? 0;
        const aidReceivedAbs =
            getAidBid(rowClan, colClan)?.receivedAbs ?? 0;
        const aidGivenAbs =
            getAidBid(colClan, rowClan)?.receivedAbs ?? 0;

        const netAbs =
            giftsReceivedAbs + aidReceivedAbs - (giftsGivenAbs + aidGivenAbs);
        const pop = rowClan.population || 1;
        const netPerCapita = netAbs / pop;

        return {
            rowClan,
            colClan,
            giftsReceivedAbs,
            giftsGivenAbs,
            aidReceivedAbs,
            aidGivenAbs,
            netAbs,
            netPerCapita,
        };
    }

    function buildRedistributionTable() {
        const formatBottomCell = (val: any) =>
            val === null || val === undefined ? "" : rpct(val);

        const formatBottomCellSigned = (val: any) =>
            val === null || val === undefined ? "" : signedRpct(val);

        if (viewMode === "Aid") {
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
                (clan: ClanDTO) => (isClanInSettlement(clan) ? clan.name : `${clan.name} *`),
                (rowClan: ClanDTO, colClan: ClanDTO) => getAidBid(rowClan, colClan),
                (bid: FoodAidBidRecord | undefined) => {
                    if (!bid || bid.requestedPerCapita <= 0) return "-";
                    return `${rpct(bid.receivedPerCapita)} / ${rpct(bid.requestedPerCapita)}`;
                },
                aidCellTooltip as any,
                undefined,
                undefined,
                bottomRows,
                undefined,
                undefined,
                initialCols,
            );
        } else if (viewMode === "Gifts") {
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
                    label: "GREC",
                    valueFn: (clan: ClanDTO) => {
                        const s = giftsResult?.getClanSummary(clan.uuid);
                        return s ? s.totalGiftsReceivedPerCapita : 0;
                    },
                    formatFn: (val: number) => rpct(val),
                    headerTooltip: "Total Gifts Received (per capita)",
                },
                {
                    label: "GGIV",
                    valueFn: (clan: ClanDTO) => {
                        const s = giftsResult?.getClanSummary(clan.uuid);
                        return s ? s.totalGiftsGivenPerCapita : 0;
                    },
                    formatFn: (val: number) => rpct(val),
                    headerTooltip: "Total Gifts Given (per capita)",
                },
            ];

            const bottomRows: RowDataRowSpec<ClanDTO>[] = [
                {
                    label: "Total Gifts Given",
                    valueFn: (colItem: any) => {
                        if (!isClanDTO(colItem)) return null;
                        const s = giftsResult?.getClanSummary(colItem.uuid);
                        return s ? s.totalGiftsGivenPerCapita : 0;
                    },
                    formatFn: formatBottomCell,
                    divider: true,
                },
            ];

            return new CrossTab<ClanDTO, FoodGiftRecord | undefined>(
                clansList,
                (clan: ClanDTO) => (isClanInSettlement(clan) ? clan.name : `${clan.name} *`),
                (rowClan: ClanDTO, colClan: ClanDTO) => getFoodGift(colClan, rowClan),
                (gift: FoodGiftRecord | undefined) => {
                    if (!gift || gift.giftAbs <= 0) return "-";
                    return rpct(gift.giftPerCapita);
                },
                giftCellTooltip as any,
                undefined,
                undefined,
                bottomRows,
                undefined,
                undefined,
                initialCols,
            );
        } else {
            // "Net" mode
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
                    label: "NET",
                    valueFn: (clan: ClanDTO) => {
                        const gSum = giftsResult?.getClanSummary(clan.uuid);
                        const aSum = redistributionResult?.getClanSummary(clan.uuid);
                        const gRec = gSum ? gSum.totalGiftsReceivedAbs : 0;
                        const gGiv = gSum ? gSum.totalGiftsGivenAbs : 0;
                        const aRec = aSum ? aSum.totalReceivedAbs : 0;
                        const aGiv = aSum ? aSum.totalGivenAbs : 0;
                        const pop = clan.population || 1;
                        return (gRec + aRec - (gGiv + aGiv)) / pop;
                    },
                    formatFn: (val: number) => signedRpct(val),
                    headerTooltip: "Net Food Transfers Received (Gifts + Aid Received minus Gifts + Aid Given per capita)",
                },
            ];

            const bottomRows: RowDataRowSpec<ClanDTO>[] = [
                {
                    label: "Net Transfers",
                    valueFn: (colItem: any) => {
                        if (!isClanDTO(colItem)) return null;
                        const gSum = giftsResult?.getClanSummary(colItem.uuid);
                        const aSum = redistributionResult?.getClanSummary(colItem.uuid);
                        const gRec = gSum ? gSum.totalGiftsReceivedAbs : 0;
                        const gGiv = gSum ? gSum.totalGiftsGivenAbs : 0;
                        const aRec = aSum ? aSum.totalReceivedAbs : 0;
                        const aGiv = aSum ? aSum.totalGivenAbs : 0;
                        const pop = colItem.population || 1;
                        return (gGiv + aGiv - (gRec + aRec)) / pop;
                    },
                    formatFn: formatBottomCellSigned,
                    headerTooltip: "Net food transfers given by column clan per capita",
                    divider: true,
                },
            ];

            return new CrossTab<ClanDTO, NetTransferData>(
                clansList,
                (clan: ClanDTO) => (isClanInSettlement(clan) ? clan.name : `${clan.name} *`),
                (rowClan: ClanDTO, colClan: ClanDTO) => getNetTransfer(rowClan, colClan),
                (net: NetTransferData) => {
                    if (Math.abs(net.netAbs) < 0.001) return "-";
                    return signedRpct(net.netPerCapita);
                },
                netCellTooltip as any,
                undefined,
                undefined,
                bottomRows,
                undefined,
                undefined,
                initialCols,
            );
        }
    }

    let redistributionTable = $derived(buildRedistributionTable());
</script>

{#snippet aidCellTooltip(
    bid: FoodAidBidRecord | undefined,
    rowClan: ClanDTO,
    colClan: ClanDTO,
)}
    {#if !isClanDTO(rowClan) || !isClanDTO(colClan)}
    {:else if bid}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
            <strong>Food Aid Request: {rowClan.name} &larr; {colClan.name}</strong>
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
            No food aid requested between {rowClan.name} and {colClan.name}.
        </div>
    {/if}
{/snippet}

{#snippet giftCellTooltip(
    gift: FoodGiftRecord | undefined,
    rowClan: ClanDTO,
    colClan: ClanDTO,
)}
    {#if !isClanDTO(rowClan) || !isClanDTO(colClan)}
    {:else if gift && gift.giftAbs > 0}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 260px;">
            <strong>Food Gift: {rowClan.name} &larr; {colClan.name}</strong>
            <ul
                style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;"
            >
                <li>
                    • Donor Prestige: <strong
                        >{signed(gift.prestige, 2)}</strong
                    >
                </li>
                <li>
                    • Location Factor: <strong
                        >{gift.factor === 0.2
                            ? "0.20 (Local)"
                            : gift.factor === 0.05
                              ? "0.05 (Cluster)"
                              : "0.01 (Other)"}</strong
                    >
                </li>
                <li>
                    • Donor Total Food Production: <strong
                        >{unsigned(gift.totalFoodProd, 1)}</strong
                    >
                </li>
                {#if gift.scaleFactor < 1.0}
                    <li>
                        • Scale Factor (capped at 80% cereals): <strong
                            >{unsigned(gift.scaleFactor, 3)}</strong
                        >
                    </li>
                {/if}
                <hr
                    style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;"
                />
                <li>
                    • <em>Formula:</em> Factor (F) &times; Prestige (A) &times; Total Food Production (P){#if gift.scaleFactor < 1.0} &times; Scale{/if}
                </li>
                <li>
                    • Gift Amount: <strong
                        >{unsigned(gift.giftAbs, 1)}</strong
                    > ({rpct(gift.giftPerCapita)} per capita of recipient)
                </li>
            </ul>
        </div>
    {:else}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            No food gift given from {colClan.name} to {rowClan.name}.
        </div>
    {/if}
{/snippet}

{#snippet netCellTooltip(
    net: NetTransferData | undefined,
    rowClan: ClanDTO,
    colClan: ClanDTO,
)}
    {#if !isClanDTO(rowClan) || !isClanDTO(colClan)}
    {:else if net}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 270px;">
            <strong>Net Food Transfers: {rowClan.name} &harr; {colClan.name}</strong>
            <ul
                style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;"
            >
                <li>
                    • Gifts Received ({colClan.name} &rarr; {rowClan.name}): <strong
                        >{unsigned(net.giftsReceivedAbs, 1)}</strong
                    >
                </li>
                <li>
                    • Aid Received ({colClan.name} &rarr; {rowClan.name}): <strong
                        >{unsigned(net.aidReceivedAbs, 1)}</strong
                    >
                </li>
                <hr
                    style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;"
                />
                <li>
                    • Gifts Given ({rowClan.name} &rarr; {colClan.name}): <strong
                        >{unsigned(net.giftsGivenAbs, 1)}</strong
                    >
                </li>
                <li>
                    • Aid Given ({rowClan.name} &rarr; {colClan.name}): <strong
                        >{unsigned(net.aidGivenAbs, 1)}</strong
                    >
                </li>
                <hr
                    style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;"
                />
                <li>
                    • <strong>Net Transfer to {rowClan.name}: {signed(net.netAbs, 1)}</strong>
                    ({signedRpct(net.netPerCapita)} per capita)
                </li>
            </ul>
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
                    • Food before aid: <strong
                        >{unsigned(summary.initialFood, 1)}</strong
                    > ({rpct(summary.initialFoodPerCapita)} / capita)
                </li>
                <hr
                    style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;"
                />
                <li>
                    • Food retained ({rpct(AID_BUDGET_FOOD_THRESHOLD)} / capita): <strong
                        >{unsigned(summary.initialFood - summary.aidBudget, 1)}</strong
                    > ({rpct((summary.initialFood - summary.aidBudget) / summary.population)} / capita)
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
        <h3 style="margin: 0;">Food Transfers</h3>

        <div class="mode-selector">
            <button
                class:active={viewMode === "Net"}
                onclick={() => (viewMode = "Net")}
            >
                Net
            </button>
            <button
                class:active={viewMode === "Gifts"}
                onclick={() => (viewMode = "Gifts")}
            >
                Gifts
            </button>
            <button
                class:active={viewMode === "Aid"}
                onclick={() => (viewMode = "Aid")}
            >
                Aid
            </button>
        </div>
    </div>

    <p style="font-size: 0.85rem; color: #666; margin-bottom: 1rem;">
        {#if viewMode === "Aid"}
            Shows food aid requests and transfers for the turn. Requesters are shown in rows and donors in columns.
            Cells show "X/Y" where X is aid received and Y is aid requested (per capita of receiving clan).
        {:else if viewMode === "Gifts"}
            Shows food gifts from donor cereal production. Recipients are shown in rows and givers in columns.
            Cells show gift received (per capita of receiving clan).
        {:else}
            Shows net food transfers (Gifts + Aid) for the turn. Values show net per-capita transfer received by the row clan from the column clan.
        {/if}
        Clans from outside this settlement are marked with an asterisk (*).
    </p>

    <div class="table-container">
        <TableView2 table={redistributionTable} />
    </div>
</div>

<style>
    .mode-selector {
        display: flex;
        gap: 0.35rem;
    }

    .mode-selector button {
        padding: 0.3rem 0.85rem;
        border: 1px solid #d3c4ad;
        border-radius: 4px;
        background-color: #faf6ea;
        color: #4a4035;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .mode-selector button:hover {
        background-color: #ede3d1;
    }

    .mode-selector button.active {
        background-color: #8c6d46;
        color: #ffffff;
        border-color: #705535;
    }

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
