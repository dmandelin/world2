<script lang="ts">
    import type { CrossTable, Table, TableColumn, TableRow } from "./tables2";
    import Tooltip from "../Tooltip.svelte";

    let { table }: { table: Table<any, any, any> | CrossTable<any, any> } =
        $props<{ table: Table<any, any, any> | CrossTable<any, any> }>();

    function cellValue(
        row: TableRow<any, any>,
        column: TableColumn<any, any, any>,
    ) {
        return column.valueFn(row.data);
    }

    function cellText(
        row: TableRow<any, any>,
        column: TableColumn<any, any, any>,
    ) {
        const val = cellValue(row, column);
        if (column.formatFn) {
            return column.formatFn(val, row.data, column.data);
        }
        return val !== undefined && val !== null ? val.toString() : "";
    }

    let hasRowPrefix = $derived(table.rows.some(r => r.prefix !== undefined));
</script>

{#snippet cellHTML(row: TableRow<any, any>, column: TableColumn<any, any, any>)}
    {#if column.imgsrc}
        {#if cellValue(row, column)}
            <img
                src={cellValue(row, column)}
                alt="icon"
                width="16"
                height="16"
            />
        {/if}
    {:else if column.html}
        {@html cellText(row, column)}
    {:else}
        {cellText(row, column)}
    {/if}
{/snippet}

<table>
    {#if !table.hideHeader}
        <thead>
            <tr>
                {#if hasRowPrefix}
                    <td></td>
                {/if}
                <td class="row-header"></td>
                {#each table.columns as column}
                    <th>
                        {#if column.headerTooltip}
                            <Tooltip>
                                {column.label}
                                <div slot="tooltip">
                                    {column.headerTooltip}
                                </div>
                            </Tooltip>
                        {:else}
                            {column.label}
                        {/if}
                    </th>
                {/each}
            </tr>
        </thead>
    {/if}
    <tbody>
        {#each table.rows as row, rowIndex}
            <tr>
                {#if hasRowPrefix}
                    <td class="row-prefix">{row.prefix ?? ""}</td>
                {/if}
                <td
                    class="row-header"
                    class:bold={true}
                    class:clickable={!!table.onClickRowHeader}
                    onclick={() => table.onClickRowHeader?.(row.data)}
                >
                    {row.label}
                </td>
                {#each table.columns as column, colIndex}
                    <td
                        class:bold={row.bold}
                        class:clickable={!!column.onClickCell}
                        onclick={() =>
                            column.onClickCell?.(
                                cellValue(row, column),
                                row.data,
                                column.data,
                            )}
                    >
                        {#if table.isCrossTable && rowIndex === colIndex}
                            &nbsp;
                        {:else if column.tooltip}
                            <Tooltip>
                                {@render cellHTML(row, column)}
                                <div slot="tooltip">
                                    {@render column.tooltip(
                                        cellValue(row, column),
                                        row.data,
                                        column.data,
                                    )}
                                </div>
                            </Tooltip>
                        {:else if row.tooltip}
                            <Tooltip>
                                {@render cellHTML(row, column)}
                                <div slot="tooltip">
                                    {@render row.tooltip(
                                        cellValue(row, column),
                                        row.data,
                                        column.data,
                                    )}
                                </div>
                            </Tooltip>
                        {:else}
                            {@render cellHTML(row, column)}
                        {/if}
                    </td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>

<style>
    table {
        cursor: default;
        border-collapse: collapse;
    }

    td,
    th {
        padding: 0.1em 0.5em;
    }

    td:first-child,
    th:first-child {
        text-align: left;
    }

    td:not(:first-child),
    th:not(:first-child) {
        text-align: right;
    }

    .bold {
        font-weight: bold;
    }

    .row-header {
        text-align: left !important;
    }

    .row-prefix {
        text-align: center !important;
        padding-right: 0px;
    }
</style>
