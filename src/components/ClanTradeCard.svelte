<script>
    let { clan } = $props();
</script>

<style>
    #top {
        background-color: #f3edd8;
        border: 1px solid #62531d;
        border-radius: 5px;
        padding: 0.25rem;
        width: 134px;
    }

    #top table {
        width: 100%;
        border-collapse: collapse;
    }

    td {
        text-align: center;
        white-space: nowrap;
    }

    .sm {
        font-size: smaller;
        font-weight: bold;
    }
</style>

<div id="top">
    {#if clan.tradeRelationships?.length}
    <table>
        <tbody>
            <tr>
                <td colspan="3" style:color={clan.color} style:font-weight="bold" style:text-align="center">{clan.name}</td>
            </tr>
            <tr class="sm"><td>Trading with kin</td></tr>
            {#each clan.tradeRelationships as relationship}
            <tr><td>{relationship.name}</td></tr>
            <tr class="sm"><td>Sending</td></tr>
                {#each relationship.sending as sending}
                <tr><td>{sending}</td></tr>
                {/each}
            <tr class="sm"><td>Receiving</td></tr>
                {#each relationship.receiving as receiving}
                <tr><td>{receiving}</td></tr>
                {/each}
            {/each}
        </tbody>
    </table>
    {:else}
    <table>
        <tbody>
            <tr>
                <td colspan="3" style:color={clan.color} style:font-weight="bold" style:text-align="center">{clan.name}</td>
            </tr>
            <tr class="sm"><td>No trade partners</td></tr>
        </tbody>
    </table>
    {/if}
</div>
