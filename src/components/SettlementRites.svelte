<script lang="ts">
    import { pct, spct } from "../model/lib/format";

    import DataTable from "./DataTable.svelte";
    import { settlementRitesTable } from "./tables";
    import Tooltip from "./Tooltip.svelte";

    let { settlement } = $props();

    let ritesTable = $derived(settlementRitesTable(settlement));
</script>

<style>
    .table-container {
        background-color: #f3edd8;
        border: 1px solid #62531d;
        border-radius: 5px;
        padding: 0.25rem;
    }

    h3 {
        text-align: center;
    }

    table {
        border-collapse: collapse;
    }

    th, td {
        padding: 0.125em 0.5em;
    }

    th {
        text-align: center;
    }

    td {
        text-align: right;
    }

    th:first-child, td:first-child {
        text-align: left;
    }

    tr:last-child {
        font-weight: bold;
    }

    tbody tr:hover {
        background-color: #f1f1f1;
    }

    .lb {
        border-left: 1px solid #444;
    }
</style>

<div style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
<div class="table-container">
    <table>
        <thead>
            <tr>
                <th>Source</th>
                {#each ritesTable.header as cell}
                <th>{cell}</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each ritesTable.rows as row}
            <tr>
                {#each row as cell}
                <td>
                {cell}
                </td>
                {/each}
            </tr>
            {/each}
        </tbody>
    </table>
</div>
</div>