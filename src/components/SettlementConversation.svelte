<script lang="ts">
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import { CrossTab, IterableTable } from "./tables/tables2";
    import {
        pct,
        signed,
        unsigned,
        unsignedFormat,
    } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import TableView2 from "./tables/TableView2.svelte";
    import type { Snippet } from "svelte";
    import Tooltip2 from "./Tooltip2.svelte";
    import {
        Conversation,
        GROUP_SOURCES,
        TieSources,
        appealOf,
        getRelativeAttention,
        type ConversationSource,
        type ConversationItem,
    } from "../model/relations/conversation";
    import { getPrestige } from "../model/relations/prestige";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let world = $derived(settlement.world);

    // All possible conversation sources.
    const ALL_SOURCES: ConversationSource[] = [
        ...GROUP_SOURCES,
        TieSources.Help,
        TieSources.Marriage,
        TieSources.Kin,
        TieSources.Friendship,
    ];

    const ALL_SOURCE_NAMES = ALL_SOURCES.map((s) => s.name);

    // Filter selection for Conversation Offer crosstab
    let selectedSources = $state<string[]>([...ALL_SOURCE_NAMES]);
    let selectedFilterKey = $state<string>("all");

    function isClanDTO(obj: any): obj is ClanDTO {
        return (
            obj &&
            typeof obj === "object" &&
            "uuid" in obj &&
            "name" in obj &&
            "population" in obj
        );
    }

    function handleFilterChange(e: Event) {
        const val = (e.target as HTMLSelectElement).value;
        selectedFilterKey = val;
        if (val === "all") {
            selectedSources = [...ALL_SOURCE_NAMES];
        } else if (val === "group_all") {
            selectedSources = GROUP_SOURCES.map((s) => s.name);
        } else if (val === "ties_all") {
            selectedSources = [
                TieSources.Help.name,
                TieSources.Marriage.name,
                TieSources.Kin.name,
                TieSources.Friendship.name,
            ];
        } else {
            selectedSources = [val];
        }
    }

    // --- Crosstab Cell Values --------------------------------------------------

    // Appeal: appealOf(row, col)
    function appealCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        return appealOf(rowClan, colClan);
    }

    // Offer: Sum of offered strength from rowClan -> colClan for selected sources
    function offerCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        if (rowClan.uuid === colClan.uuid) return 0;
        const interactions = world.interactionsWith(rowClan, colClan);
        const conv = interactions.find((i) => i instanceof Conversation);
        if (!conv) return 0;

        let total = 0;
        for (const item of conv.items) {
            if (selectedSources.includes(item.source.name)) {
                total += item.offeredFrom(rowClan, conv);
            }
        }
        return total;
    }

    // Amount: Matched conversation strength
    function amountCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        return getRelativeAttention(rowClan, colClan);
    }

    // Value: Same as amount for now
    function valueCellValue(rowClan: ClanDTO, colClan: ClanDTO): number {
        return getRelativeAttention(rowClan, colClan);
    }

    // Offer Supply Totals
    function rowSupplyTotal(rowClan: ClanDTO): number {
        let total = 0;
        for (const item of rowClan.conversationBudget.items) {
            if (selectedSources.includes(item.source.name)) {
                total += item.supply;
            }
        }
        return total;
    }

    function grandSupplyTotal(): number {
        let total = 0;
        for (const rowClan of settlement.clans) {
            total += rowSupplyTotal(rowClan);
        }
        return total;
    }

    // Offer Totals
    function rowOfferTotal(rowClan: ClanDTO): number {
        let total = 0;
        for (const colClan of settlement.clans) {
            if (rowClan.uuid !== colClan.uuid) {
                total += offerCellValue(rowClan, colClan);
            }
        }
        return total;
    }

    function colOfferTotal(colClan: ClanDTO): number {
        let total = 0;
        for (const rowClan of settlement.clans) {
            if (rowClan.uuid !== colClan.uuid) {
                total += offerCellValue(rowClan, colClan);
            }
        }
        return total;
    }

    function grandOfferTotal(): number {
        let total = 0;
        for (const rowClan of settlement.clans) {
            total += rowOfferTotal(rowClan);
        }
        return total;
    }

    // Appeal Averages
    function rowAppealAvg(rowClan: ClanDTO): number {
        let sum = 0;
        let count = 0;
        for (const colClan of settlement.clans) {
            if (rowClan.uuid !== colClan.uuid) {
                sum += appealCellValue(rowClan, colClan);
                count++;
            }
        }
        return count > 0 ? sum / count : 0;
    }

    function colAppealAvg(colClan: ClanDTO): number {
        let sum = 0;
        let count = 0;
        for (const rowClan of settlement.clans) {
            if (rowClan.uuid !== colClan.uuid) {
                sum += appealCellValue(rowClan, colClan);
                count++;
            }
        }
        return count > 0 ? sum / count : 0;
    }

    function grandAppealAvg(): number {
        let sum = 0;
        let count = 0;
        for (const rowClan of settlement.clans) {
            for (const colClan of settlement.clans) {
                if (rowClan.uuid !== colClan.uuid) {
                    sum += appealCellValue(rowClan, colClan);
                    count++;
                }
            }
        }
        return count > 0 ? sum / count : 0;
    }

    // Amount Totals
    function rowAmountTotal(rowClan: ClanDTO): number {
        let total = 0;
        for (const colClan of settlement.clans) {
            if (rowClan.uuid !== colClan.uuid) {
                total += amountCellValue(rowClan, colClan);
            }
        }
        return total;
    }

    function colAmountTotal(colClan: ClanDTO): number {
        let total = 0;
        for (const rowClan of settlement.clans) {
            if (rowClan.uuid !== colClan.uuid) {
                total += amountCellValue(rowClan, colClan);
            }
        }
        return total;
    }

    function grandAmountTotal(): number {
        let total = 0;
        for (const rowClan of settlement.clans) {
            total += rowAmountTotal(rowClan);
        }
        return total;
    }

    // Value Totals
    function rowValueTotal(rowClan: ClanDTO): number {
        let total = 0;
        for (const colClan of settlement.clans) {
            if (rowClan.uuid !== colClan.uuid) {
                total += valueCellValue(rowClan, colClan);
            }
        }
        return total;
    }

    function colValueTotal(colClan: ClanDTO): number {
        let total = 0;
        for (const rowClan of settlement.clans) {
            if (rowClan.uuid !== colClan.uuid) {
                total += valueCellValue(rowClan, colClan);
            }
        }
        return total;
    }

    function grandValueTotal(): number {
        let total = 0;
        for (const rowClan of settlement.clans) {
            total += rowValueTotal(rowClan);
        }
        return total;
    }

    // Helper for explaining offer items
    function getItemExplanation(
        item: ConversationItem,
        subject: ClanDTO,
        object: ClanDTO,
        conv: Conversation,
    ): string {
        const share = item.shareFor(subject, conv);
        const appeal = appealOf(subject, object);
        const source = item.source;

        if (source.name === "Settlement") {
            return `Living in settlement (${pct(share)} year), appeal ${unsigned(appeal, 2)}`;
        } else if (source.name === "Ditching") {
            return `Ditching work (${pct(share)} year), appeal ${unsigned(appeal, 2)}`;
        } else if (source.name === "Festivals") {
            return `Festival attendance (${pct(share)} year), appeal ${unsigned(appeal, 2)}`;
        } else if (source.name === "Help") {
            return `Field help exchange (${pct(share)} year)`;
        } else if (source.name === "Marriage") {
            return `Visits from marriage tie (${pct(share)} year)`;
        } else if (source.name === "Kin") {
            return `Visits between kin clans (${pct(share)} year)`;
        } else if (source.name === "Friendship") {
            return `Visits between friendly clans (${pct(share)} year)`;
        }
        return source.note;
    }

    // --- Table Builders -------------------------------------------------------

    function buildCrossTab<CellValue>(
        valueFn: (rowClan: ClanDTO, colClan: ClanDTO) => CellValue,
        formatFn: (value: CellValue, row?: ClanDTO, col?: ClanDTO) => string,
        cellTooltip: Snippet<[CellValue, ClanDTO, ClanDTO]>,
        showDiagonal: boolean = false,
        initialRowDataCols?: any[],
        initialRowDataRows?: any[],
    ): CrossTab<ClanDTO, CellValue> {
        const sortedClans: ClanDTO[] = sortedByKey(
            settlement.clans,
            (c) => c.name,
        );

        const table = new CrossTab<ClanDTO, CellValue>(
            sortedClans,
            (clan: ClanDTO) => clan.name,
            valueFn,
            formatFn as any,
            cellTooltip,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            initialRowDataCols,
            initialRowDataRows,
        );
        table.showDiagonal = showDiagonal;
        return table;
    }

    // Build Offer table (Supply & Total columns, Total row)
    let offerTable = $derived.by(() => {
        const initialCols = [
            {
                label: "Supply",
                valueFn: (row: any) =>
                    isClanDTO(row) ? rowSupplyTotal(row) : grandSupplyTotal(),
                formatFn: (v: number) => unsigned(v, 2),
                class: "total-col",
            },
            {
                label: "Total",
                valueFn: (row: any) =>
                    isClanDTO(row) ? rowOfferTotal(row) : grandOfferTotal(),
                formatFn: (v: number) => unsigned(v, 2),
                class: "total-col",
            },
        ];

        const initialRows = [
            {
                label: "Total",
                divider: true,
                valueFn: (col: any) =>
                    col === "Supply"
                        ? grandSupplyTotal()
                        : isClanDTO(col)
                        ? colOfferTotal(col)
                        : grandOfferTotal(),
                formatFn: (v: number) => unsigned(v, 2),
                class: "total-row",
            },
        ];

        return buildCrossTab(
            offerCellValue,
            unsignedFormat(2),
            offerCellTooltip,
            false,
            initialCols,
            initialRows,
        );
    });

    // Build Appeal table (Avg column & Avg row)
    let appealTable = $derived.by(() => {
        const initialCols = [
            {
                label: "Avg",
                valueFn: (row: any) =>
                    isClanDTO(row) ? rowAppealAvg(row) : grandAppealAvg(),
                formatFn: (v: number) => unsigned(v, 2),
                class: "total-col",
            },
        ];

        const initialRows = [
            {
                label: "Avg",
                divider: true,
                valueFn: (col: any) =>
                    isClanDTO(col) ? colAppealAvg(col) : grandAppealAvg(),
                formatFn: (v: number) => unsigned(v, 2),
                class: "total-row",
            },
        ];

        return buildCrossTab(
            appealCellValue,
            unsignedFormat(2),
            appealCellTooltip,
            false,
            initialCols,
            initialRows,
        );
    });

    // Build Amount table (Total column & Total row)
    let amountTable = $derived.by(() => {
        const initialCols = [
            {
                label: "Total",
                valueFn: (row: any) =>
                    isClanDTO(row) ? rowAmountTotal(row) : grandAmountTotal(),
                formatFn: (v: number) => unsigned(v, 2),
                class: "total-col",
            },
        ];

        const initialRows = [
            {
                label: "Total",
                divider: true,
                valueFn: (col: any) =>
                    isClanDTO(col) ? colAmountTotal(col) : grandAmountTotal(),
                formatFn: (v: number) => unsigned(v, 2),
                class: "total-row",
            },
        ];

        return buildCrossTab(
            amountCellValue,
            unsignedFormat(2),
            amountCellTooltip,
            false,
            initialCols,
            initialRows,
        );
    });

    // Build Value table (Total column & Total row)
    let valueTable = $derived.by(() => {
        const initialCols = [
            {
                label: "Total",
                valueFn: (row: any) =>
                    isClanDTO(row) ? rowValueTotal(row) : grandValueTotal(),
                formatFn: (v: number) => unsigned(v, 2),
                class: "total-col",
            },
        ];

        const initialRows = [
            {
                label: "Total",
                divider: true,
                valueFn: (col: any) =>
                    isClanDTO(col) ? colValueTotal(col) : grandValueTotal(),
                formatFn: (v: number) => unsigned(v, 2),
                class: "total-row",
            },
        ];

        return buildCrossTab(
            valueCellValue,
            unsignedFormat(2),
            valueCellTooltip,
            false,
            initialCols,
            initialRows,
        );
    });
</script>

{#snippet appealCellTooltip(value: number, subject: ClanDTO, object: ClanDTO)}
    {@const alignment = world.alignmentToward(subject, object)?.value ?? 0}
    {@const respect = (world.respectToward(subject, object)?.value ?? 0) / 100}
    {@const prestige = getPrestige(subject, object)}
    {@const appeal = appealOf(subject, object)}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
        <div style="font-weight: bold; margin-bottom: 0.35rem; border-bottom: 1px dashed #ccc; padding-bottom: 0.2rem;">
            Conversation Appeal: {subject.name} &rarr; {object.name}
        </div>
        <ul style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none; font-size: 0.9em;">
            <li>• Alignment (goodness): {signed(alignment, 2)}</li>
            <li>• Respect (capability): {unsigned(respect, 2)}</li>
            <li>• Combined Prestige: {signed(prestige, 2)}</li>
            <hr style="margin: 0.25rem 0; border: none; border-top: 1px solid #ccc;" />
            <li><strong>Appeal Formula:</strong> max(0.15, 1 + 1.2 &times; {signed(prestige, 2)}) = <strong>{unsigned(appeal, 2)}</strong></li>
        </ul>
    </div>
{/snippet}

{#snippet offerCellTooltip(value: number, subject: ClanDTO, object: ClanDTO)}
    {#if (object as any) === "Supply" && isClanDTO(subject)}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 250px;">
            <div style="font-weight: bold; margin-bottom: 0.35rem; border-bottom: 1px dashed #ccc; padding-bottom: 0.2rem;">
                Acquaintance Supply: {subject.name}
            </div>
            <ul style="margin: 0.25rem 0; padding-left: 1.2rem; list-style-type: none; font-size: 0.9em;">
                <li>• Filtered Supply: <strong>{unsigned(value, 2)}</strong></li>
            </ul>
        </div>
    {:else if isClanDTO(subject) && isClanDTO(object)}
        {@const interactions = world.interactionsWith(subject, object)}
        {@const conv = interactions.find((i) => i instanceof Conversation)}
        <div style="font-size: 0.9em; padding: 0.25rem; min-width: 420px;">
            <div style="font-weight: bold; margin-bottom: 0.35rem; border-bottom: 1px dashed #ccc; padding-bottom: 0.2rem;">
                Conversation Offer: {subject.name} &rarr; {object.name}
            </div>
            {#if conv}
                <div style="margin-bottom: 0.4rem;">
                    <strong>Filtered Offer Strength:</strong> {unsigned(value, 2)}
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
                    <thead>
                        <tr style="border-bottom: 1px solid #ccc; text-align: left;">
                            <th style="padding-right: 0.5rem;">Source</th>
                            <th style="padding-right: 0.5rem;">Explanation</th>
                            <th style="text-align: right; padding-right: 0.5rem;">Offered Strength</th>
                            <th style="text-align: center;">Active Filter</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each conv.items as item}
                            {@const isSelected = selectedSources.includes(item.source.name)}
                            <tr style="border-bottom: 1px solid #eee; opacity: {isSelected ? 1 : 0.4};">
                                <td style="font-weight: 600; padding-right: 0.5rem;">{item.source.name}</td>
                                <td style="font-size: 0.85em; color: #554422; padding-right: 0.5rem;">{getItemExplanation(item, subject, object, conv)}</td>
                                <td style="text-align: right; padding-right: 0.5rem;">{unsigned(item.offeredFrom(subject, conv), 2)}</td>
                                <td style="text-align: center;">{isSelected ? "✓" : "—"}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {:else}
                <div>No conversation offer recorded.</div>
            {/if}
        </div>
    {:else}
        <div style="font-size: 0.9em; padding: 0.25rem;">
            Total conversation offer summary cell.
        </div>
    {/if}
{/snippet}

{#snippet amountCellTooltip(value: number, subject: ClanDTO, object: ClanDTO)}
    {@const interactions = world.interactionsWith(subject, object)}
    {@const conv = interactions.find((i) => i instanceof Conversation)}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 280px;">
        <div style="font-weight: bold; margin-bottom: 0.35rem; border-bottom: 1px dashed #ccc; padding-bottom: 0.2rem;">
            Conversation Amount: {subject.name} &amp; {object.name}
        </div>
        {#if conv}
            <div style="margin-bottom: 0.4rem;">
                <strong>Matched Conversation Strength:</strong> {unsigned(conv.strength, 2)}
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
                <thead>
                    <tr style="border-bottom: 1px solid #ccc; text-align: left;">
                        <th>Source</th>
                        <th style="text-align: right;">Matched Strength</th>
                    </tr>
                </thead>
                <tbody>
                    {#each conv.items as item}
                        <tr style="border-bottom: 1px solid #eee;">
                            <td>{item.source.name}</td>
                            <td style="text-align: right; font-weight: bold;">{unsigned(item.strength, 2)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {:else}
            <div>No conversation amount between these clans.</div>
        {/if}
    </div>
{/snippet}

{#snippet valueCellTooltip(value: number, subject: ClanDTO, object: ClanDTO)}
    <div style="font-size: 0.9em; padding: 0.25rem; min-width: 260px;">
        <div style="font-weight: bold; margin-bottom: 0.35rem; border-bottom: 1px dashed #ccc; padding-bottom: 0.2rem;">
            Conversation Value: {subject.name} &amp; {object.name}
        </div>
        <div>
            <strong>Value Score:</strong> {unsigned(value, 2)}
        </div>
        <div style="font-size: 0.85em; color: #666; margin-top: 0.35rem; font-style: italic;">
            Currently equals matched conversation amount; will be elaborated with relationship dynamics in future updates.
        </div>
    </div>
{/snippet}

{#snippet offerSection()}
    <div class="crosstab-section">
        <div class="section-header">
            <h3 class="section-title">
                <span>Conversation Offer</span>
                <span class="info-badge">ℹ️</span>
                <Tooltip2>
                    <div class="header-tooltip-box">
                        Offers made from row clan to column clan. Includes total rows and columns at top and left. Filter using the dropdown above.
                    </div>
                </Tooltip2>
            </h3>
            <div class="source-filter-bar">
                <label for="source-filter-select" class="filter-label">Filter Sources:</label>
                <select
                    id="source-filter-select"
                    class="source-filter-select"
                    value={selectedFilterKey}
                    onchange={handleFilterChange}
                >
                    <option value="all">All Sources</option>
                    <optgroup label="Group Activities">
                        <option value="group_all">Group Activities (All)</option>
                        <option value="Settlement">Settlement</option>
                        <option value="Ditching">Ditching</option>
                        <option value="Festivals">Festivals</option>
                    </optgroup>
                    <optgroup label="Standing Ties & Help">
                        <option value="ties_all">Ties & Help (All)</option>
                        <option value="Help">Help</option>
                        <option value="Marriage">Marriage</option>
                        <option value="Kin">Kin</option>
                        <option value="Friendship">Friendship</option>
                    </optgroup>
                </select>
            </div>
        </div>
        <TableView2 table={offerTable} />
    </div>
{/snippet}

{#snippet appealSection()}
    <div class="crosstab-section">
        <div class="section-header">
            <h3 class="section-title">
                <span>Conversation Appeal</span>
                <span class="info-badge">ℹ️</span>
                <Tooltip2>
                    <div class="header-tooltip-box">
                        How much the row clan wants to converse with the column clan: based on prestige (alignment and respect). Includes average rows and columns at top and left.
                    </div>
                </Tooltip2>
            </h3>
        </div>
        <TableView2 table={appealTable} />
    </div>
{/snippet}

{#snippet amountSection()}
    <div class="crosstab-section">
        <div class="section-header">
            <h3 class="section-title">
                <span>Conversation Amount</span>
                <span class="info-badge">ℹ️</span>
                <Tooltip2>
                    <div class="header-tooltip-box">
                        Matched conversation strength between clans across all active sources. Includes total rows and columns at top and left.
                    </div>
                </Tooltip2>
            </h3>
        </div>
        <TableView2 table={amountTable} />
    </div>
{/snippet}

{#snippet valueSection()}
    <div class="crosstab-section">
        <div class="section-header">
            <h3 class="section-title">
                <span>Conversation Value</span>
                <span class="info-badge">ℹ️</span>
                <Tooltip2>
                    <div class="header-tooltip-box">
                        Subjective value of conversation between clans (currently identical to conversation amount). Includes total rows and columns at top and left.
                    </div>
                </Tooltip2>
            </h3>
        </div>
        <TableView2 table={valueTable} />
    </div>
{/snippet}

<div class="conversation-panel">
    <div class="crosstabs-grid">
        {@render offerSection()}
        {@render appealSection()}
        {@render amountSection()}
        {@render valueSection()}
    </div>

    <div class="formulas-card">
        <div class="formulas-header">
            <h4>📐 Conversation Offer &amp; Matching Mechanics</h4>
        </div>
        <div class="formulas-grid">
            <div class="formula-box">
                <div class="box-title">🏛️ Group Activities (Settlement, Ditching, Festivals)</div>
                <div class="formula-content">
                    <div class="formula-line">
                        <strong>Acquaintance Supply:</strong> <code>Time Share × Intensity × √(Pop₁ / 20)</code>
                    </div>
                    <div class="formula-line">
                        <strong>Partner Preference:</strong> <code>Weight₁→₂ = Appeal(c₁ → c₂)</code>
                    </div>
                    <div class="formula-line">
                        <strong>Appeal Formula:</strong> <code>max(0.15, 1 + 1.2 × Prestige)</code>
                    </div>
                    <div class="formula-line">
                        <strong>Offered Strength:</strong> <code>Allocated Supply</code>
                    </div>
                    <ul class="param-list">
                        <li>• <strong>Settlement:</strong> Time = residence share, Intensity = 2.0</li>
                        <li>• <strong>Ditching:</strong> Time = ditching share, Intensity = 6.0</li>
                        <li>• <strong>Festivals:</strong> Time = festival share, Intensity = 8.0</li>
                    </ul>
                </div>
            </div>

            <div class="formula-box">
                <div class="box-title">🤝 Standing Ties &amp; Help (Help, Marriage, Kin, Friendship)</div>
                <div class="formula-content">
                    <div class="formula-line">
                        <strong>Acquaintance Supply:</strong> <code>Visit Share × Intensity × Reach × √(Pop₁ / 20)</code>
                    </div>
                    <div class="formula-line">
                        <strong>Reach (Distance):</strong> <code>1.0 in settlement, max(0, 1 - 0.045 × miles) elsewhere</code>
                    </div>
                    <div class="formula-line">
                        <strong>Offered Strength:</strong> <code>Supply</code>
                    </div>
                    <ul class="param-list">
                        <li>• <strong>Help:</strong> Share = field help allocation, Intensity = 6.0</li>
                        <li>• <strong>Marriage:</strong> Share = 12% × relatedness, Intensity = 8.0</li>
                        <li>• <strong>Kin:</strong> Share = 4%, Intensity = 8.0</li>
                        <li>• <strong>Friendship:</strong> Share = 6%, Intensity = 8.0</li>
                    </ul>
                </div>
            </div>

            <div class="formula-box full-width">
                <div class="box-title">⚖️ Matching &amp; Acquaintance Calculation</div>
                <div class="formula-content inline-flex-content">
                    <div>
                        <strong>Matched Item Strength:</strong> <code>min(Offer₁→₂, Offer₂→₁, 1.0)</code>
                    </div>
                    <div>
                        <strong>Total Pair Strength:</strong> <code>min(1.0, ∑ Item Strengths)</code>
                    </div>
                    <div>
                        <strong>Acquaintances Matched:</strong> <code>Total Strength × Pop₂</code>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .conversation-panel {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .crosstabs-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.25rem;
        align-items: start;
    }

    @media (max-width: 1200px) {
        .crosstabs-grid {
            grid-template-columns: 1fr;
        }
    }

    .crosstab-section {
        background: #fff;
        border: 1px solid #e2d9c4;
        border-radius: 6px;
        padding: 1rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .section-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
    }

    .section-title {
        margin: 0;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        color: #332211;
        cursor: help;
    }

    .info-badge {
        font-size: 0.75em;
        opacity: 0.65;
        transition: opacity 0.15s ease;
    }

    .section-title:hover .info-badge {
        opacity: 1;
    }

    .header-tooltip-box {
        font-size: 0.85rem;
        max-width: 260px;
        font-weight: normal;
        color: #222;
        line-height: 1.4;
        padding: 0.2rem;
    }

    .source-filter-bar {
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .filter-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #554422;
    }

    .source-filter-select {
        font-size: 0.85rem;
        padding: 0.25rem 0.5rem;
        background: #fdfbf7;
        border: 1px solid #c8bca8;
        border-radius: 4px;
        color: #443311;
        font-weight: 500;
        cursor: pointer;
    }

    .source-filter-select:focus {
        outline: none;
        border-color: #4a6da7;
        box-shadow: 0 0 0 2px rgba(74, 109, 167, 0.2);
    }

    /* Formulas Reference Card */
    .formulas-card {
        background: #fcfaf4;
        border: 1px solid #dcd4be;
        border-radius: 6px;
        padding: 1rem;
        margin-top: 0.5rem;
    }

    .formulas-header h4 {
        margin: 0 0 0.75rem 0;
        color: #443311;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .formulas-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
    }

    @media (max-width: 900px) {
        .formulas-grid {
            grid-template-columns: 1fr;
        }
    }

    .formula-box {
        background: #ffffff;
        border: 1px solid #e5dcc6;
        border-radius: 4px;
        padding: 0.75rem;
    }

    .formula-box.full-width {
        grid-column: 1 / -1;
    }

    .box-title {
        font-weight: bold;
        font-size: 0.85rem;
        color: #554422;
        border-bottom: 1px solid #eee5d3;
        padding-bottom: 0.35rem;
        margin-bottom: 0.5rem;
    }

    .formula-content {
        font-size: 0.82rem;
        color: #444;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .formula-content.inline-flex-content {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 1.5rem;
    }

    .formula-line code {
        background: #f4efe2;
        padding: 0.1rem 0.35rem;
        border-radius: 3px;
        font-family: monospace;
        font-size: 0.82rem;
        color: #332211;
    }

    .param-list {
        margin: 0.35rem 0 0 0;
        padding-left: 0.8rem;
        list-style: none;
        font-size: 0.8rem;
        color: #665544;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }
</style>
