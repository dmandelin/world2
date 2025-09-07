<script lang="ts">
    import type { BasicTable } from "./tables";

    let { table } = $props<{ table: BasicTable }>();
</script>

<style>
    table {
        border-collapse: collapse;
        margin: 0 auto;
    }

    tr:first-child {
        font-weight: bold;
    }

    td {
        padding: 0.1em 0.5em;
    }

    td:first-child {
        text-align: left;
    }

    td:not(:first-child) {
        text-align: right;
    }
</style>

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
