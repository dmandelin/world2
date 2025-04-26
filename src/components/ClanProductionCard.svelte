<script>
    import { pct, spct, wg } from "../model/format";
    import Tooltip from "./Tooltip.svelte";

    let { clan } = $props();
</script>

<style>
    #top {
        background-color: #f3edd8;
        border: 1px solid #62531d;
        border-radius: 5px;
        padding: 0.25rem;
    }

    table {
        width: 120px;
    }

    td:not(first-child) {
        text-align: right;
    }

    td {
        white-space: nowrap;
    }
</style>

<div id="top">
    <table>
        <tbody>
            <tr>
                <td colspan="2" style:font-weight="bold" style:text-align="center">{clan.economicPolicy.name}</td>
            </tr>
            {#if clan.economicReport.commonFraction != 0.0 && clan.economicReport.commonFraction != 1.0}
            <tr>
                <td>Base</td>
                <td>{clan.economicReport.baseProduce.toFixed()}</td>
            </tr>
            <tr>
                <td>%Common</td>
                <td>{pct(clan.economicReport.commonFraction)}</td>
            </tr>
            {/if}
            {#if clan.economicReport.commonProduce != 0.0}
            <tr>
                <td>Common</td>
                <td>{clan.economicReport.commonProduce.toFixed()}</td>
            </tr>
            {/if}
            {#if clan.economicReport.clanProduce != 0.0}
            <tr>
                <td>Hoarded</td>
                <td>{clan.economicReport.clanProduce.toFixed()}</td>
            </tr>
            {/if}
        </tbody>
    </table>
</div>