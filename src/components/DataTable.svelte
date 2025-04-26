<script lang="ts">
    let { rows } = $props<{ rows: any[][] }>();
</script>

<style>
    table {
        border-collapse: collapse;
        margin: 0 auto;
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
    <tbody>
        {#each rows as row}
        <tr>
            {#each row as cell}
            <td>{cell}</td>
            {/each}
        </tr>
        {/each}
    </tbody>
</table>
