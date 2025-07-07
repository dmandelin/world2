<script lang="ts">
    import { settlementProductionTable } from "./tables";

    let { settlement } = $props();

    let table = $derived.by(() => settlementProductionTable(settlement));
</script>

<style>
    #top {
        background-color: #f3edd8;
        border: 1px solid #62531d;
        border-radius: 5px;
        padding: 0.25rem;
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

<div style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
<div id="top">
    <table>
        <thead>
            <tr>
                <th></th>
                {#each table.header as cell}
                    <th colspan="4">{cell}</th>
                {/each}
            </tr>
            <tr>
                <th></th>
                {#each table.header as cell}
                    <th class='lb'>L%</th>
                    <th>L</th>
                    <th>ℙ</th>
                    <th>Y</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each table.rows as row}
            <tr>
                {#each row as cell, index}
                <td class={(index - 1) % 4 === 0 ? 'lb' : ''}>
                    {cell}
                </td>
                {/each}
            </tr>
            {/each}
        </tbody>
    </table>
</div>
</div>

