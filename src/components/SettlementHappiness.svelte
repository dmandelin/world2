<script lang="ts">
    import { HappinessTable } from "./tables";

    let { settlement } = $props();
    let table = $derived(new HappinessTable(settlement));
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
        /* border: 1px solid #ddd; */
        text-align: right;
        padding: 0.125em 0.5em;
    }

    th:first-child, td:first-child {
        text-align: left;
    }

    tr:first-child > th {
        text-align: center;
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

<div id="top">
<table>
    <thead>
        <tr>
            <th>{table.header[0]}</th>
            {#each table.header.slice(1) as cell}
                <th colspan="3" class="lb">{cell}</th>
            {/each}
        </tr>
        <tr>
            {#each table.subheader as cell, i}
                <th class:lb={i % 3 === 1}>{cell}</th>
            {/each}
        </tr>
    </thead>
    <tbody>
        {#each table.rows as row}
            <tr>
                {#each row as cell, i}
                    <td class:lb={i % 3 === 1}>{cell}</td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
</div>