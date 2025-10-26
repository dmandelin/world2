<script lang="ts">
    import type { Table } from "./tablebuilder";
    import Tooltip from "./Tooltip.svelte";

    let { table } = $props<{ table: Table }>();
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
    <thead>
        <tr>
            <td></td>
            {#each table.columns as column}
                <th>{column.label}</th>
            {/each}
        </tr>
    </thead>
    <tbody>
        {#each table.rows as row}
            <tr>
                <td class:bold={true}>{row.label}</td>
                {#each table.columns as column}
                    <td class:bold={row.bold}>
                        {#if row.tooltip}
                            <Tooltip>
                                {row.items[column.label]?.toFixed(2)}
                                 <div slot="tooltip">
                                    {@render row.tooltip(row.data, column.data)}
                                 </div>
                            </Tooltip>
                        {:else}
                            {row.items[column.label]?.toFixed(2)}
                        {/if}
                    </td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
