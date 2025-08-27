<script>
    import { populationChangeTable } from "./tables";

    let { settlement } = $props();
    let table = $derived(populationChangeTable(settlement));
</script>

<style>
    td, th {
        text-align: left;
        padding: 0.125em 0.5em;
    }

    td:not(:first-child), th:not(:first-child) {
        text-align: right;
    }

    tr:last-child {
        font-weight: bold;
    }
</style>

<h3>Population change</h3>

<table>
    <thead>
        <tr>
            {#each table.header as cell}
                <th>{cell}</th>
            {/each}
        </tr>
    </thead>
    <tbody>
        {#each table.rows as row}
            <tr>
                {#each row as cell}
                    <td>{cell}</td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>