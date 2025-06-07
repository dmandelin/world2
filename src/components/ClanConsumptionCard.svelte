<script>
    import { spct } from "../model/format";
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
                <td colspan="3" style:font-weight="bold" style:text-align="center">
                    Goods
                </td>
            </tr>
            {#each clan.consumption?.ledger as [good, sourceMap]}
            <tr>
                <td>{good.name}</td>
                <td>
                    <Tooltip>
                        {clan.consumption?.amount(good).toFixed()}
                        <div slot="tooltip">
                            {#each sourceMap as [source, amount]}
                                <div>{amount.toFixed()} from {source}</div>
                            {/each}
                        </div>
                    </Tooltip>
                </td>
                <td>{spct(clan.consumption?.perCapita(good))}</td>
            </tr>
            {/each}
        </tbody>
    </table>
</div>