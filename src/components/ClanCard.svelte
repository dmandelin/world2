<script>
    import { npl, pct, signed, spct, wg } from "../model/lib/format";
    import DataTable from "./DataTable.svelte";
    import PopulationChange from "./PopulationChange.svelte";
    import PopulationPyramid from "./PopulationPyramid.svelte";
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
                <td>Tenure</td>
                <td></td>
                <td>{clan.seniority}</td>
            </tr>
            <tr>
                <td>People</td>
                <td>
                    <Tooltip>
                    {clan.size}
                    <div slot="tooltip" class="ttt">
                        <PopulationPyramid clan={clan} />
                    </Tooltip>
                </td>
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
                <td>Hort</td>
                <td>{clan.skill.toFixed()}</td>
                <td>
                    <Tooltip>
                        ({clan.skillChange.delta.toFixed(1)})
                        <div slot="tooltip" class="ttt">
                            <div>{clan.skillChange.originalValue.toFixed(1)} /
                                 {clan.skillChange.delta.toFixed(1)}</div>
                            <h4>Imitation Sources (t={clan.skillChange.imitationTarget.toFixed(1)})</h4>
                            <h4>Target: {clan.skillChange.imitationTarget.toFixed(1)}</h4>
                            <DataTable rows={clan.skillChange.imitationTooltip} />
                            <h4>Skill Changes</h4>
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
                <td>Rite</td>
                <td>{clan.ritualSkill.toFixed()}</td>
                <td>
                    <Tooltip>
                        ({clan.ritualSkillChange.delta.toFixed(1)})
                        <div slot="tooltip" class="ttt">
                            <h4>Learning targets</h4>
                            <table>
                                <tbody>
                                    <tr>
                                        <td>Education</td>
                                        <td>{clan.ritualSkillChange.educationTarget.toFixed(1)}</td>
                                        <td>{clan.ritualSkillChange.educationTargetDelta.toFixed(1)}</td>
                                    </tr>
                                    <tr>
                                        <td>Imitation</td>
                                        <td>{clan.ritualSkillChange.imitationTarget.toFixed(1)}</td>
                                        <td>{clan.ritualSkillChange.imitationTargetDelta.toFixed(1)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <h4>Imitation Sources</h4>
                            <DataTable rows={clan.ritualSkillChange.imitationTooltip} />
                            <h4>Skill Changes</h4>
                            <DataTable rows={clan.ritualSkillChange.changeSourcesTooltip} />
                        </div>
                    </Tooltip>
                </td>
            </tr>
            <tr>
                <td>REff</td>
                <td></td>
                <td>
                    <Tooltip>
                        {spct(clan.ritualEffectiveness)}
                        <div slot="tooltip" class="ttt">
                            <DataTable rows={clan.ritualEffectivenessTooltip} />
                        </div>
                    </Tooltip>
                </td>
            </tr>
            <tr>
                <td>QoL</td>
                <td></td>
                <td>
                    <Tooltip>
                        {signed(clan.qol)}
                        <div slot="tooltip" class="ttt">
                            <h4>Needs & Satisfaction</h4>
                            <DataTable rows={clan.qolCalc.satsTable} />
                            <h4>Sources</h4>
                            <DataTable rows={clan.qolCalc.itemsTable} />
                        </div>
                    </Tooltip>
                </td>
            </tr>
        </tbody>
    </table>
</div>