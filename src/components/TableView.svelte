<script lang="ts">
    import type { Table } from "./tablebuilder";
    import Tooltip from "./Tooltip.svelte";

    let { table } = $props<{ table: Table }>();

    function cellValue<RowData extends Object, ColumnData extends Object>(
        row: TableRow<RowData, ColumnData>,
        column: TableColumn<ColumnData>
    ): string {
        const value = row.items[column.label];
        const formatFn = column.formatFn ?? String;
        return formatFn(value);
    }
</script>

<style>
    table {
        cursor: default;
        border-collapse: collapse;
    }

    td, th {
        padding: 0.1em 0.5em;
    }

    td:first-child, th:first-child {
        text-align: left;
    }

    td:not(:first-child), th:not(:first-child) {
        text-align: right;
    }

    .bold {
        font-weight: bold;
    }
</style>

<table>
    {#if !table.hideColumnHeaders}
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
        {#each table.rows as row}
            <tr>
                <td 
                    class:bold={true} 
                    class:clickable={!!table.onClickRowHeader}
                    onclick={() => table.onClickRowHeader?.(row.data)}>
                    {row.label}
                </td>
                {#each table.columns as column}
                    <td 
                        class:bold={row.bold} 
                        class:clickable={!!column.onClickCell}
                        onclick={() => column.onClickCell?.(row.data, column.data)}>
                        {#if column.tooltip}
                            <Tooltip>
                                {cellValue(row, column)}
                                 <div slot="tooltip">
                                    {@render column.tooltip(row.data, column.data)}
                                 </div>
                            </Tooltip>
                        {:else if row.tooltip}
                            <Tooltip>
                                {cellValue(row, column)}
                                 <div slot="tooltip">
                                    {@render row.tooltip(row.data, column.data)}
                                 </div>
                            </Tooltip>
                        {:else}
                            {cellValue(row, column)}
                        {/if}
                    </td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
