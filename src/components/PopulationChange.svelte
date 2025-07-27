<script>
    let { clan } = $props();
    let c = $derived(clan.lastPopulationChange);
</script>

<style>
    td, th {
        padding: 0 0.25em;
    }

    td:not(:first-child), th:not(:first-child) {
        text-align: right;
    }

    tr:last-child {
        font-weight: bold;
    }
</style>

<div style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
<div id="top">
    <table>
        <thead>
            <tr>
                <th>Source</th>
                <th>m</th>
                <th>𝕊</th>
                <th>𝔼</th>
                <th>𝔸</th>
                <th>Δ</th>
            </tr>
        </thead>
        <tbody>
            {#each [...c.items, c.total] as item}
            <tr>
                {#each item.asRow as cell}
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