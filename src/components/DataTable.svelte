<script lang="ts">
    let { rows } = $props<{ rows: any[][] }>();
</script>

<style>
    table {
        border-collapse: collapse;
        margin: 0 auto;
    }

    td {
        padding: 0.5em;
        text-align: center;
        border: 1px solid #ccc;
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
