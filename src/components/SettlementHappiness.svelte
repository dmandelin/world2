<script lang="ts">
    import { HappinessTable } from "./tables";

    let { settlement } = $props();
    let table = $derived(new HappinessTable(settlement));
</script>

<style>
</style>

<table>
    <thead>
        <tr>
        {#each table.header as header}
            <th>{header}</th>
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