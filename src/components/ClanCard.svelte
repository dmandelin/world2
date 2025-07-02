<script>
    import { npl, pct, signed, spct, wg } from "../model/lib/format";
    import DataTable from "./DataTable.svelte";
    import LineGraph from "./LineGraph.svelte";
    import MigrationPlan from "./MigrationPlan.svelte";
    import PopulationChange from "./PopulationChange.svelte";
    import PopulationPyramid from "./PopulationPyramid.svelte";
    import Tooltip from "./Tooltip.svelte";
    import { clanTimelineGraphData } from "../model/timeline";
    import { SkillDefs } from "../model/people/skills";

    let { clan } = $props();
    let agsk = $derived.by(() => clan.skills.lastChange(SkillDefs.Agriculture) ?? {
        originalValue: 0,
        delta: 0,
        imitationTarget: 0,
        imitationTooltip: [],
        changeSourcesTooltip: []
    });
    let rtsk = $derived.by(() => clan.skills.lastChange(SkillDefs.Ritual) ?? {
        originalValue: 0,
        delta: 0,
        educationTarget: 0,
        educationTargetDelta: 0,
        imitationTarget: 0,
        imitationTargetDelta: 0,
        imitationTooltip: [],
        changeSourcesTooltip: []
    });

    let clanUpperRightIcon = $derived.by(() => {
        return clan.migrationPlan?.willMigrate
            ? 'migrate-yes-256.png'
            : clan.migrationPlan?.wantToMove
            ? 'migrate-want-256.png'
            : 'migrate-no-256.png';
    });

    let clanUpperRightAlt = $derived.by(() => {
        return clan.migrationPlan?.willMigrate
            ? 'This clan will migrate'
            : 'This clan will not migrate';
    });
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

    .timeline-tooltip {
        width: 300px;
        height: 200px;
    }

    #top {
        position: relative; /* Needed for absolute positioning of the image */
    }

    #clan-upper-right-icon {
        position: absolute;
        top: 0px;
        right: -3px;
        width: 24px;
        height: 24px;
        object-fit: contain;
    }
</style>

<div id="top">
    <div id="clan-upper-right-icon">
        <Tooltip>
            <img width="24" height="24" src={clanUpperRightIcon} alt={clanUpperRightAlt} />    
            <div slot="tooltip" class="ttt">
                <MigrationPlan plan={clan.migrationPlan} />
            </div>
        </Tooltip>
    </div>

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
                <td>
                    Prestige
                </td>
                <td></td>
                <td>
                    <Tooltip>
                        {clan.averagePrestige.toFixed()}
                        <div slot="tooltip" class="timeline-tooltip">
                            <LineGraph data={clanTimelineGraphData(clan)} />
                        </div>
                    </Tooltip>
                </td> 
            </tr>
            <tr>
                <td>Influence</td>
                <td></td>
                <td>{pct(clan.influence)}</td>
            </tr>
            <tr>
                <td>Tenure</td>
                <td></td>
                <td>
                    {clan.seniority}
                </td>
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
                <td>Farming</td>
                <td>{clan.skills.s(SkillDefs.Agriculture)}</td>
                <td>
                    <Tooltip>
                        ({agsk.delta.toFixed(1)})
                        <div slot="tooltip" class="ttt">
                            <div>{agsk.originalValue.toFixed(1)} /
                                 {agsk.delta.toFixed(1)}</div>
                            <h4>Imitation Sources (t={agsk.imitationTarget.toFixed(1)})</h4>
                            <h4>Target: {agsk.imitationTarget.toFixed(1)}</h4>
                            <DataTable rows={agsk.imitationTooltip} />
                            <h4>Skill Changes</h4>
                            <DataTable rows={agsk.changeSourcesTooltip} />
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
                <td>{spct(clan.subsistenceConsumption / clan.size)}</td>
            </tr>
            <tr>
                <td>Rite</td>
                <td>{clan.skills.s(SkillDefs.Ritual)}</td>
                <td>
                    <Tooltip>
                        ({rtsk.delta.toFixed(1)})
                        <div slot="tooltip" class="ttt">
                            <h4>Learning targets</h4>
                            <table>
                                <tbody>
                                    <tr>
                                        <td>Education</td>
                                        <td>{rtsk.educationTarget.toFixed(1)}</td>
                                        <td>{rtsk.educationTargetDelta.toFixed(1)}</td>
                                    </tr>
                                    <tr>
                                        <td>Imitation</td>
                                        <td>{rtsk.imitationTarget.toFixed(1)}</td>
                                        <td>{rtsk.imitationTargetDelta.toFixed(1)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <h4>Imitation Sources</h4>
                            <DataTable rows={rtsk.imitationTooltip} />
                            <h4>Skill Changes</h4>
                            <DataTable rows={rtsk.changeSourcesTooltip} />
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