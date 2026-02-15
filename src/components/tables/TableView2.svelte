<script lang="ts">
    import type { Table, TableColumn, TableRow } from "./tables2";
    import Tooltip from "../Tooltip.svelte";

    let { table } : { table: Table<any, any, any>} = $props<{ table: Table<any, any, any>}>();

    function cellValue(row: TableRow<any, any>, column: TableColumn<any, any, any>) {
        return column.valueFn(row.data);
    }

    function cellText(row: TableRow<any, any>, column: TableColumn<any, any, any>) {
        return column.formatFn 
            ? column.formatFn(cellValue(row, column))
            : cellValue(row, column).toString();
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

{#snippet cellHTML(row: TableRow<any, any>, column: TableColumn<any, any, any>)}
    {#if column.imgsrc}
        {#if cellValue(row, column)}
             <img src={cellValue(row, column)} alt="icon" width="16" height="16" />
        {/if}
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
                        onclick={() => column.onClickCell?.(cellValue(row, column), row.data, column.data)}>
                        {#if column.tooltip}
                            <Tooltip>
                                {@render cellHTML(row, column)}
                                 <div slot="tooltip">
                                    {@render column.tooltip(cellValue(row, column), row.data, column.data)}
                                 </div>
                            </Tooltip>
                        {:else if row.tooltip}
                            <Tooltip>
                                {@render cellHTML(row, column)}
                                 <div slot="tooltip">
                                    {@render row.tooltip(cellValue(row, column), row.data, column.data)}
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
