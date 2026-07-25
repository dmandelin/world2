<script lang="ts">
    import { CrossTab, IterableTable, type RowDataRowSpec } from "./tables/tables2";
    import { MarriageConnection } from "../model/relations/connection";
    import { pct, signed } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import TableView2 from "./tables/TableView2.svelte";
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import { getMarriageDecisions, type MarriageDecisions } from "../model/relations/marriage";
    import type { Snippet } from "svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let world = $derived(settlement.world);

    let marriageOption: "Interest" | "Recent" | "Legacy" = $state("Interest");

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
        for (const clan of settlement.clans) {
            for (const other of world.clanMap.values()) {
                if (inSettlement.has(other.uuid)) continue;
                const mi1 = world.marriageInterestToward(clan, other);
                const mi2 = world.marriageInterestToward(other, clan);
                const conn = world.connections.getForType(clan, other, MarriageConnection);
                if ((mi1 && mi1.value !== 0) || (mi2 && mi2.value !== 0) || conn) {
                    outSettlementClansMap.set(other.uuid, other);
                }
            }
        }

        const sortedOutSettlement = sortedByKey(
            Array.from(outSettlementClansMap.values()),
            (c) => c.name,
        );

        return [...sortedInSettlement, ...sortedOutSettlement];
    }

    function getDecisions(): MarriageDecisions {
        return world.lastMarriageDecisions ?? getMarriageDecisions(world as any);
    }

    function popAvgAppeal(targetClan: ClanDTO): number | null {
        let totalPop = 0;
        let weightedSum = 0;
        const clansList = buildClansList();
        for (const r of clansList) {
            if (r.uuid === targetClan.uuid) continue;
            const mi = world.marriageInterestToward(r, targetClan);
            if (mi) {
                weightedSum += r.population * mi.value;
                totalPop += r.population;
            }
        }
        return totalPop > 0 ? weightedSum / totalPop : null;
    }

    function getPairingCount(decisions: MarriageDecisions, c1: ClanDTO, c2: ClanDTO): number {
        for (const [hClan, map] of decisions.pairingCounts.counts.entries()) {
            if (hClan.uuid === c1.uuid) {
                for (const [wClan, count] of map.entries()) {
                    if (wClan.uuid === c2.uuid) {
                        return count;
                    }
                }
            }
        }
        return 0;
    }

    function getDirectionalMarriageCount(decisions: MarriageDecisions, husbandClan: ClanDTO, wifeClan: ClanDTO): number {
        for (const wifeSet of decisions.potentialWives) {
            if (wifeSet.clan.uuid === wifeClan.uuid) {
                for (const [hClan, count] of wifeSet.marriedTo.entries()) {
                    if (hClan.uuid === husbandClan.uuid) {
                        return count;
                    }
                }
            }
        }
        return 0;
    }

    function totalRecentMarriagesForClan(clan: ClanDTO, decisions: MarriageDecisions): number {
        let sum = 0;
        const clansList = buildClansList();
        for (const other of clansList) {
            if (other.uuid === clan.uuid) continue;
            sum += getPairingCount(decisions, clan, other);
        }
        return sum;
    }

    function recentMarriageFraction(rowClan: ClanDTO, colClan: ClanDTO): number | null {
        if (rowClan.uuid === colClan.uuid) return null;
        const decisions = getDecisions();
        const total = totalRecentMarriagesForClan(colClan, decisions);
        if (total === 0) return null;
        const between = getPairingCount(decisions, rowClan, colClan);
        if (between === 0) return null;
        return between / total;
    }

    function legacyMarriageFraction(rowClan: ClanDTO, colClan: ClanDTO): number | null {
        if (rowClan.uuid === colClan.uuid) return null;
        const conn = world.connections.getForType(rowClan, colClan, MarriageConnection);
        if (!conn || conn.relatedness === 0) return null;
        return conn.relatedness;
    }

    function marriageInterestCellValue(
        rowClan: ClanDTO,
        colClan: ClanDTO,
    ): number | null {
        if (rowClan.uuid === colClan.uuid) return null;
        const mi = world.marriageInterestToward(rowClan, colClan);
        if (!mi) return null;
        return mi.value;
    }

    function marriageInterestFormat(value: number | null, rowClan?: ClanDTO, colClan?: ClanDTO): string {
        if (value === null) {
            return "";
        }

        const formattedNum = signed(value, 0);
        if (!rowClan || !colClan || rowClan.uuid === colClan.uuid) {
            return formattedNum;
        }

        const clansList = buildClansList();
        const targets = clansList.filter((c) => c.uuid !== rowClan.uuid);
        const values = targets
            .map((c) => ({
                clan: c,
                val: marriageInterestCellValue(rowClan, c),
            }))
            .filter((v): v is { clan: ClanDTO; val: number } => v.val !== null);

        values.sort((a, b) => b.val - a.val);

        const rankIdx = values.findIndex((v) => v.clan.uuid === colClan.uuid);

        if (rankIdx === 0) {
            return `${formattedNum}<span style="color: #ffd700; margin-left: 4px; font-weight: bold;">★</span>`;
        } else if (rankIdx === 1) {
            return `${formattedNum}<span style="color: #a0a0a0; margin-left: 4px; font-weight: bold;">★</span>`;
        } else if (rankIdx === 2) {
            return `${formattedNum}<span style="color: #cd7f32; margin-left: 4px; font-weight: bold;">★</span>`;
        }
        return `${formattedNum}<span style="color: transparent; margin-left: 4px; font-weight: bold;">★</span>`;
    }

    function recentSummary1(colClan: ClanDTO): number | null {
        let weightedSum = 0;
        let sumWeights = 0;
        const clansList = buildClansList();
        for (const row of clansList) {
            if (row.uuid === colClan.uuid) continue;
            const weight = recentMarriageFraction(row, colClan);
            if (weight && weight > 0) {
                const mi = world.marriageInterestToward(colClan, row);
                const appeal = mi ? mi.value : 0;
                weightedSum += weight * appeal;
                sumWeights += weight;
            }
        }
        return sumWeights > 0 ? weightedSum / sumWeights : null;
    }

    function recentSummary2(colClan: ClanDTO): number | null {
        let weightedSum = 0;
        let sumWeights = 0;
        const clansList = buildClansList();
        for (const row of clansList) {
            if (row.uuid === colClan.uuid) continue;
            const weight = recentMarriageFraction(row, colClan);
            if (weight && weight > 0) {
                const globalRating = popAvgAppeal(row);
                if (globalRating !== null) {
                    weightedSum += weight * globalRating;
                    sumWeights += weight;
                }
            }
        }
        return sumWeights > 0 ? weightedSum / sumWeights : null;
    }

    function legacySummary1(colClan: ClanDTO): number | null {
        let weightedSum = 0;
        let sumWeights = 0;
        const clansList = buildClansList();
        for (const row of clansList) {
            if (row.uuid === colClan.uuid) continue;
            const weight = legacyMarriageFraction(row, colClan);
            if (weight && weight > 0) {
                const mi = world.marriageInterestToward(colClan, row);
                const appeal = mi ? mi.value : 0;
                weightedSum += weight * appeal;
                sumWeights += weight;
            }
        }
        return sumWeights > 0 ? weightedSum / sumWeights : null;
    }

    function legacySummary2(colClan: ClanDTO): number | null {
        let weightedSum = 0;
        let sumWeights = 0;
        const clansList = buildClansList();
        for (const row of clansList) {
            if (row.uuid === colClan.uuid) continue;
            const weight = legacyMarriageFraction(row, colClan);
            if (weight && weight > 0) {
                const globalRating = popAvgAppeal(row);
                if (globalRating !== null) {
                    weightedSum += weight * globalRating;
                    sumWeights += weight;
                }
            }
        }
        return sumWeights > 0 ? weightedSum / sumWeights : null;
    }

    function getColClass(clan: ClanDTO): string {
        return isClanInSettlement(clan) ? "" : "out-of-settlement";
    }

    function getRowClass(clan: ClanDTO): string {
        return isClanInSettlement(clan) ? "" : "out-of-settlement";
    }

    function buildMarriageTable(): CrossTab<ClanDTO, number | null> {
        const clansList = buildClansList();
        const rowDataRows: RowDataRowSpec<ClanDTO>[] = [];

        if (marriageOption === "Interest") {
            rowDataRows.push({
                label: "Pop Avg",
                valueFn: (col: ClanDTO) => popAvgAppeal(col),
                formatFn: (val: number | null) => val === null ? "" : signed(val, 1),
                tooltip: popAvgRowTooltip as any,
                divider: true,
            });
            const table = new CrossTab<ClanDTO, number | null>(
                clansList,
                (clan: ClanDTO) => {
                    const suffix = isClanInSettlement(clan) ? "" : " *";
                    return clan.name + suffix;
                },
                marriageInterestCellValue,
                marriageInterestFormat as any,
                marriageInterestCellTooltip,
                undefined,
                undefined,
                rowDataRows,
                getColClass,
                getRowClass,
            );
            table.columns.forEach((col) => col.html = true);
            return table;
        } else if (marriageOption === "Recent") {
            rowDataRows.push(
                {
                    label: "Own Rating",
                    valueFn: (col: ClanDTO) => recentSummary1(col),
                    formatFn: (val: number | null) => val === null ? "" : signed(val, 1),
                    tooltip: recentOwnRatingRowTooltip as any,
                    divider: true,
                },
                {
                    label: "Pop Rating",
                    valueFn: (col: ClanDTO) => recentSummary2(col),
                    formatFn: (val: number | null) => val === null ? "" : signed(val, 1),
                    tooltip: recentPopRatingRowTooltip as any,
                }
            );
            return new CrossTab<ClanDTO, number | null>(
                clansList,
                (clan: ClanDTO) => {
                    const suffix = isClanInSettlement(clan) ? "" : " *";
                    return clan.name + suffix;
                },
                recentMarriageFraction,
                (val: number | null) => (!val ? "" : pct(val)),
                recentMarriageCellTooltip,
                undefined,
                undefined,
                rowDataRows,
                getColClass,
                getRowClass,
            );
        } else {
            // Legacy mode
            rowDataRows.push(
                {
                    label: "Own Rating",
                    valueFn: (col: ClanDTO) => legacySummary1(col),
                    formatFn: (val: number | null) => val === null ? "" : signed(val, 1),
                    tooltip: legacyOwnRatingRowTooltip as any,
                    divider: true,
                },
                {
                    label: "Pop Rating",
                    valueFn: (col: ClanDTO) => legacySummary2(col),
                    formatFn: (val: number | null) => val === null ? "" : signed(val, 1),
                    tooltip: legacyPopRatingRowTooltip as any,
                }
            );
            return new CrossTab<ClanDTO, number | null>(
                clansList,
                (clan: ClanDTO) => {
                    const suffix = isClanInSettlement(clan) ? "" : " *";
                    return clan.name + suffix;
                },
                legacyMarriageFraction,
                (val: number | null) => (!val ? "" : pct(val)),
                legacyMarriageCellTooltip,
                undefined,
                undefined,
                rowDataRows,
                getColClass,
                getRowClass,
            );
        }
    }
</script>

{#snippet marriageInterestCellTooltip(
    value: number | null,
    subject: ClanDTO,
    object: ClanDTO,
)}
    {@const mi = world.marriageInterestToward(subject, object)}
    {#if mi && value !== null}
        {@const rawTotal = mi.items.reduce((sum, item) => sum + item.value, 0)}
        {@const infoMultiplier = Math.max(0, Math.min(1, mi.informationValue))}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
            <TableView2
                table={new IterableTable(mi.items, (i) => i.label, [
                    {
                        data: "Value",
                        label: "Value",
                        valueFn: (i) => i.value,
                        formatFn: (i: number) => signed(i, 1),
                    },
                    {
                        data: "Base",
                        label: "Base",
                        valueFn: (i) => i.baseValue,
                        formatFn: (i: number) => signed(i, 1),
                    },
                    {
                        data: "Explanation",
                        label: "Explanation",
                        valueFn: (i) => i.explanation,
                    },
                ])}
            ></TableView2>
            <div style="margin-top: 0.5rem; border-top: 1px solid #ccc; padding-top: 0.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span>Raw Total:</span>
                    <strong>{signed(rawTotal, 1)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span>Information Multiplier:</span>
                    <strong>{infoMultiplier.toFixed(2)}</strong>
                </div>
                <div style="display: flex; justify-top: space-between; margin-top: 0.25rem; border-top: 1px dashed #eee; padding-top: 0.25rem;">
                    <span>Final Value:</span>
                    <strong>{signed(mi.value, 1)}</strong>
                </div>
            </div>
        </div>
    {/if}
{/snippet}

{#snippet recentMarriageCellTooltip(
    value: number | null,
    rowClan: ClanDTO,
    colClan: ClanDTO,
)}
    {@const decisions = getDecisions()}
    {@const rowToColMarriages = getDirectionalMarriageCount(decisions, rowClan, colClan)}
    {@const colToRowMarriages = getDirectionalMarriageCount(decisions, colClan, rowClan)}
    {@const totalMarriages = rowToColMarriages + colToRowMarriages}
    {@const miRowToCol = world.marriageInterestToward(rowClan, colClan)}
    {@const miColToRow = world.marriageInterestToward(colClan, rowClan)}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 260px;">
        <strong>Recent Marriages: {colClan.name} & {rowClan.name}</strong>
        <ul style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;">
            <li>• Marriages with {rowClan.name} husbands: {rowToColMarriages}</li>
            <li>• Marriages with {colClan.name} husbands: {colToRowMarriages}</li>
            <li>• Total Marriages Last Turn: <strong>{totalMarriages}</strong></li>
            <li>• % of {colClan.name}'s Marriages: <strong>{value !== null ? pct(value) : "0%"}</strong></li>
            <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;" />
            <li>• Marriage Appeal ({rowClan.name} → {colClan.name}): <strong>{miRowToCol ? signed(miRowToCol.value, 1) : "N/A"}</strong></li>
            <li>• Marriage Appeal ({colClan.name} → {rowClan.name}): <strong>{miColToRow ? signed(miColToRow.value, 1) : "N/A"}</strong></li>
        </ul>
    </div>
{/snippet}

{#snippet legacyMarriageCellTooltip(
    value: number | null,
    rowClan: ClanDTO,
    colClan: ClanDTO,
)}
    {@const recentFrac = recentMarriageFraction(rowClan, colClan)}
    {@const miRowToCol = world.marriageInterestToward(rowClan, colClan)}
    {@const miColToRow = world.marriageInterestToward(colClan, rowClan)}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 260px;">
        <strong>Marriage Legacy: {colClan.name} & {rowClan.name}</strong>
        <ul style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none;">
            <li>• % Related by Marriage: <strong>{value !== null ? pct(value) : "0%"}</strong></li>
            <li>• % of Recent Marriages (last turn): <strong>{recentFrac !== null ? pct(recentFrac) : "0%"}</strong></li>
            <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;" />
            <li>• Marriage Appeal ({rowClan.name} → {colClan.name}): <strong>{miRowToCol ? signed(miRowToCol.value, 1) : "N/A"}</strong></li>
            <li>• Marriage Appeal ({colClan.name} → {rowClan.name}): <strong>{miColToRow ? signed(miColToRow.value, 1) : "N/A"}</strong></li>
        </ul>
    </div>
{/snippet}

{#snippet popAvgRowTooltip(val: number | null, spec: any, colClan: ClanDTO)}
    {#if val !== null}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            <strong>Population-Weighted Average Appeal toward {colClan.name}:</strong> {signed(val, 1)}
            <br />
            <span style="font-size: 0.85em; color: #666;">
                Average marriage appeal of all other clans toward {colClan.name}, weighted by population.
            </span>
        </div>
    {/if}
{/snippet}

{#snippet recentOwnRatingRowTooltip(val: number | null, spec: any, colClan: ClanDTO)}
    {#if val !== null}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            <strong>Own Rating for {colClan.name}:</strong> {signed(val, 1)}
            <br />
            <span style="font-size: 0.85em; color: #666;">
                Average marriage appeal of {colClan.name} toward its marriage partners last turn, weighted by % of recent marriages.
            </span>
        </div>
    {/if}
{/snippet}

{#snippet recentPopRatingRowTooltip(val: number | null, spec: any, colClan: ClanDTO)}
    {#if val !== null}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            <strong>Pop Rating for {colClan.name}:</strong> {signed(val, 1)}
            <br />
            <span style="font-size: 0.85em; color: #666;">
                Average global popularity (pop-weighted average appeal) of {colClan.name}'s marriage partners last turn, weighted by % of recent marriages.
            </span>
        </div>
    {/if}
{/snippet}

{#snippet legacyOwnRatingRowTooltip(val: number | null, spec: any, colClan: ClanDTO)}
    {#if val !== null}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            <strong>Own Rating for {colClan.name}:</strong> {signed(val, 1)}
            <br />
            <span style="font-size: 0.85em; color: #666;">
                Average marriage appeal of {colClan.name} toward its partners, weighted by % related by marriage.
            </span>
        </div>
    {/if}
{/snippet}

{#snippet legacyPopRatingRowTooltip(val: number | null, spec: any, colClan: ClanDTO)}
    {#if val !== null}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            <strong>Pop Rating for {colClan.name}:</strong> {signed(val, 1)}
            <br />
            <span style="font-size: 0.85em; color: #666;">
                Average global popularity (pop-weighted average appeal) of {colClan.name}'s partners, weighted by % related by marriage.
            </span>
        </div>
    {/if}
{/snippet}

<div style="padding: 1rem 2rem;">
    <div style="display: flex; flex-direction: row; align-items: center; gap: 1rem; margin-bottom: 1rem;">
        <h3 style="margin: 0;">Marriages</h3>
        <div class="stress-button-group">
            <button
                type="button"
                class="stress-btn {marriageOption === 'Interest' ? 'active' : ''}"
                onclick={() => (marriageOption = "Interest")}>Interest</button
            >
            <button
                type="button"
                class="stress-btn {marriageOption === 'Recent' ? 'active' : ''}"
                onclick={() => (marriageOption = "Recent")}>Recent</button
            >
            <button
                type="button"
                class="stress-btn {marriageOption === 'Legacy' ? 'active' : ''}"
                onclick={() => (marriageOption = "Legacy")}>Legacy</button
            >
        </div>
    </div>

    {#if marriageOption === "Interest"}
        <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">
            Clans from outside this settlement are marked with an asterisk (*) and shaded. Stars indicate top 3 marriage targets for each row clan.
        </p>
    {:else if marriageOption === "Recent"}
        <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">
            Shows the % of last turn's marriages that each column clan engaged in with each row clan.
        </p>
    {:else}
        <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">
            Shows the % related by marriage between clans based on historical marriages.
        </p>
    {/if}

    <div class="table-container">
        <TableView2 table={buildMarriageTable()} />
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
