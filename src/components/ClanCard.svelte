<script>
    import { npl, spct, wg } from "../model/format";
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
</style>

<div id="top">
    <table>
        <tbody>
            <tr>
                <td colspan="3" style:color={clan.color} style:font-weight="bold" style:text-align="center">{clan.name}</td>
            </tr>
            <tr>
                <td colspan="3" style="text-align: center; font-weight: bold; font-size: smaller">{clan.parent ? `Cadet of ${clan.parent.name}` : 'Senior clan'}</td>
            </tr>
            <tr>
                <td colspan="3" style="text-align: center; font-weight: bold; font-size: smaller">{npl(clan.cadets.length, 'cadet')}</td>
            </tr>
            <tr>
                <td>Seniority</td>
                <td></td>
                <td>{String.fromCharCode(65 + clan.seniority)}</td>
            </tr>
            <tr>
                <td>People</td>
                <td>{clan.size}</td>
                <td>({clan.lastSizeChange})</td>
            </tr>
            <tr>
                <td>Prod</td>
                <td></td>
                <td>
                    <Tooltip>
                        {spct(clan.productivity)}
                      
                        <div slot="tooltip">
                          <table>
                            <tbody>
                                <tr>
                                    <td>Strength</td>
                                    <td>{wg(clan.strength)}</td>
                                </tr>
                                <tr>
                                    <td>Intelligence</td>
                                    <td>{wg(clan.intelligence)}</td>
                                </tr>
                                <tr>
                                    <td>Collecting</td>
                                    <td>{wg(clan.productionAbility)}</td>
                                </tr>
                            </tbody>
                          </table>
                        </div>
                    </Tooltip>
                </td>
            </tr>
            <tr>
                <td>Cons</td>
                <td></td>
                <td>{spct(clan.perCapitaConsumption)}</td>
            </tr>
            <tr>
                <td>QoL</td>
                <td></td>
                <td>{clan.qol.toFixed()}</td>
            </tr>
        </tbody>
    </table>
</div>