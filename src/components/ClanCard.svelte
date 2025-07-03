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

    <!-- Skills and TFP -->
    <table>
        <tbody>
            <tr>
                <td></td>
                {#each clan.skills as [def, _]}
                <td>{def.name.substr(0, 2)}</td>
                {/each}
            </tr>
            <tr>
                <td>𝕊</td>
                {#each clan.skills as [_, skill]}
                <td>{skill.value.toFixed(1)}</td>
                {/each}
            </tr>
            <tr>
                <td>Δ</td>
                {#each clan.skills as [_, skill]}
                <td>
                    <Tooltip>
                        {signed(skill.lastChange?.delta || 0, 1)}
                        <div slot="tooltip" class="ttt">
                            {#if skill.lastChange}
                                <h4>Imitation Sources (t={skill.lastChange.imitationTarget.toFixed(1)})</h4>
                                <h4>Imitation Target = {skill.lastChange.imitationTarget.toFixed(1)}</h4>
                                <DataTable rows={skill.lastChange.imitationTooltip} />
                                <h4>Learning factor = {spct(skill.lastChange.generalLearningFactor)} (Int = {clan.intelligence.toFixed()})</h4>
                                <h4>Skill Changes</h4>
                                <DataTable rows={skill.lastChange.changeSourcesTooltip} />
                            {/if}
                        </div>
                    </Tooltip>
                </td>
                {/each}
            </tr>
            <tr>
                <td>ℙ</td>
                {#each clan.skills as [def, _]}
                <td>
                    <Tooltip>
                        {spct(clan.productivityCalcs.get(def)?.tfp ?? 0)}
                        <div slot="tooltip" class="ttt">
                            <h4>Productivity</h4>
                            <DataTable rows={clan.productivityCalcs.get(def)?.tooltip ?? []} />
                        </div>
                    </Tooltip>
                </td>
                {/each}
            </tr>
        </tbody>
    </table>
</div>