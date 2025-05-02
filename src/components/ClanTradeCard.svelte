<script>
    import { pct, spct, wg } from "../model/format";
    import EconomicPolicyDecision from "./EconomicPolicyDecision.svelte";
    import Tooltip from "./Tooltip.svelte";

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
    {#if clan.tradePartners?.length}
    <table>
        <tbody>
            <tr class="sm"><td>Trading with kin</td></tr>
            {#each clan.tradePartners as partner}
            <tr><td>{partner.name} of {partner.settlement}</td></tr>
            <tr class="sm"><td>Sending</td></tr>
                {#each partner.sending as sending}
                <tr><td>{sending}</td></tr>
                {/each}
            <tr class="sm"><td>Receiving</td></tr>
                {#each partner.receiving as receiving}
                <tr><td>{receiving}</td></tr>
                {/each}
            {/each}
        </tbody>
    </table>
    {:else}
    <table>
        <tbody>
            <tr class="sm"><td>No trade partners</td></tr>
        </tbody>
    </table>
    {/if}
</div>
