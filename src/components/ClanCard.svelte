<script>
    import { npl, pct, spct, wg } from "../model/format";
    import DataTable from "./DataTable.svelte";
    import PopulationChange from "./PopulationChange.svelte";
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

    .ttt {
        text-align: left;
        font-size: small;
        margin: 0;
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
                <td>Prestige</td>
                <td></td>
                <td>{clan.averagePrestige.toFixed()}</td>
            </tr>
            <tr>
                <td>Influence</td>
                <td></td>
                <td>{pct(clan.influence)}</td>
            </tr>
            <tr>
                <td>Seniority</td>
                <td></td>
                <td>{String.fromCharCode(65 + clan.seniority)}</td>
            </tr>
            <tr>
                <td>People</td>
                <td>{clan.size}</td>
                <td>
                    <Tooltip>
                        ({clan.lastPopulationChange.change})
                        <div slot="tooltip" style="text-align: left">
                            <PopulationChange clan={clan} />
                        </div>
                    </Tooltip>
                </td>
            </tr>
            <tr>
                <td>Skill</td>
                <td>{clan.skill.toFixed()}</td>
                <td>
                    <Tooltip>
                        ({clan.skillChange.delta.toFixed(1)})
                        <div slot="tooltip" class="ttt">
                            <h4>Imitiation sources</h4>
                            <DataTable rows={clan.skillChange.imitationTooltip} />
                            <h4>Skill changes</h4>
                            <DataTable rows={clan.skillChange.changeSourcesTooltip} />
                        </div>
                    </Tooltip>
                </td>
            </tr>
            <tr>
                <td>Prod</td>
                <td></td>
                <td>
                    <Tooltip>
                        {spct(clan.productivity)}
                        <div slot="tooltip" class="ttt">
                            <DataTable rows={clan.productivityTooltip} />
                        </div>
                    </Tooltip>
                </td>
            </tr>
            <tr>
                <td>Cons</td>
                <td></td>
                <td>{spct(clan.perCapitaSubsistenceConsumption)}</td>
            </tr>
            <tr>
                <td>QoL</td>
                <td></td>
                <td>
                    <Tooltip>
                        {clan.qol.toFixed()}
                        <div slot="tooltip">
                            <DataTable rows={clan.qolTable} />
                        </div>
                    </Tooltip>
                </td>
            </tr>
        </tbody>
    </table>
</div>