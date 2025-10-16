<script lang="ts">
    import { buildConsumptionTable } from "./tablebuilders";
    import { settlementProductionTable } from "./tables";
    import TableView from "./TableView.svelte";

    let { settlement } = $props();

    let prodTable = $derived.by(() => settlementProductionTable(settlement));
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

    tbody tr:hover {
        background-color: #f1f1f1;
    }

    .lb {
        border-left: 1px solid #444;
    }
</style>

<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 1rem;">
<h3>Consumption Review</h3>

<TableView table={buildConsumptionTable(settlement)}></TableView>

<h3>Production &#x1F834;</h3>
<div class="table-container">
    <table>
        <thead>
            <tr>
                <th></th>
                {#each prodTable.header as cell}
                    <th colspan="6">{cell}</th>
                {/each}
            </tr>
            <tr>
                <th></th>
                {#each prodTable.header as cell}
                    <th class='lb'>K</th>
                    <th>L%</th>
                    <th>L</th>
                    <th>LP</th>
                    <th>TFP</th>
                    <th>Y</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each prodTable.rows as row}
            <tr>
                {#each row as cell, index}
                <td class={(index - 1) % 6 === 0 ? 'lb' : ''}>
                    {cell}
                </td>
                {/each}
            </tr>
            {/each}
        </tbody>
    </table>
</div>
</div>