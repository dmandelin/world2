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
                <td></td>
                {#each table.columns as column}
                    <th>{column.label}</th>
                {/each}
            </tr>
        </thead>
    {/if}
    <tbody>
        {#each table.rows as row, rowIndex}
            <tr>
                <td
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
</style>
