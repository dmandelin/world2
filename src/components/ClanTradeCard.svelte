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

    td:not(first-child) {
        text-align: right;
    }

    td {
        white-space: nowrap;
    }
</style>

<div id="top">
    {#if clan.tradePartners?.length}
    <table>
        <tbody>
            {#each clan.tradePartners as partner}
            <tr>
                <td>
                    Kin {partner}
                </td>
            </tr>
            {/each}
        </tbody>
    </table>
    {:else}
    <div style="text-align: center">Not trading</div>
    {/if}
</div>
