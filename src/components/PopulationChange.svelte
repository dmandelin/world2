<script>
    import { dcr, npl, pct, spct, wg } from "../model/format";
    import DataTable from "./DataTable.svelte";
    import Tooltip from "./Tooltip.svelte";

    let { clan } = $props();
    let c = $derived(clan.lastPopulationChange);
</script>

<style>
    td {
        text-align: right;
    }
</style>

<div id="top">
    QoL: {clan.qol.toFixed()}
    <table>
        <tbody>
            <tr>
                <td></td>
                <td>Births</td>
                <td>Deaths</td>
                <td>Change</td>
            </tr>
            <tr>
                <td>QoL modifier</td>
                <td>{spct(c.qbrf)}</td>
                <td>{spct(c.qdrf)}</td>
                <td></td>
            </tr>
            <tr>
                <td>Expected rates</td>
                <td>{dcr(c.ebr)}</td>
                <td>{dcr(c.edr)}</td>
                <td>{dcr(c.ebr - c.edr)}</td>
            </tr>
            <tr>
                <td>Std expected rates</td>
                <td>{dcr(c.sebr)}</td>
                <td>{dcr(c.sedr)}</td>
                <td>{dcr(c.sebr - c.sedr)}</td>
            </tr>
            <tr>
                <td>Actual rates</td>
                <td>{dcr(c.br)}</td>
                <td>{dcr(c.dr)}</td>
                <td>{dcr(c.br - c.dr)}</td>
            </tr>
            <tr>
                <td>Actual</td>
                <td>{c.births}</td>
                <td>{c.deaths}</td>
                <td>{c.change}</td>
            </tr>
        </tbody>
    </table>
</div>