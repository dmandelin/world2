<script>
    import { npl, pct, signed, spct, wg } from "../model/lib/format";
    import DataTable from "./DataTable.svelte";
    import LineGraph from "./LineGraph.svelte";
    import MigrationPlan from "./MigrationPlan.svelte";
    import PopulationChange from "./PopulationChange.svelte";
    import PopulationPyramid from "./PopulationPyramid.svelte";
    import Tooltip from "./Tooltip.svelte";
    import { clanTimelineGraphData } from "../model/records/timeline";
    import HousingDecision from "./decisions/HousingDecision.svelte";
    import { appealTable, happinessTable, skillImitationTable } from "./tables";
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
        width: 210px;
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

    .full-row {
        text-align: center; 
        font-weight: bold; 
        font-size: smaller;
    }

    .skills-table img {
        vertical-align: middle;
    }

    .skills-table td {
        padding-left: 2px;
        padding-right: 2px;
        text-align: right;
        height: 24px;
    }

    .stats-table td {
        text-align: center;
        height: 24px;
    }

    .skills-table .rp {
        padding-right: 0.9em;
    }

    .skills-table .rph {
        padding-right: 0.7em;
    }

    hr {
        margin: 0.25rem 0;
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
                <td colspan="3" style="display: flex; text-align: left; vertical-align: middle; gap: 0.5em; justify-content: center;">
                    <img src="stat-population-256.png" alt="Population" width="24" height="24" />
                <Tooltip>
                    {clan.population}
                    <div slot="tooltip" class="ttt">
                        <PopulationPyramid clan={clan} />
                </Tooltip>
                <Tooltip>
                        {clan.lastPopulationChange.change}
                        <div slot="tooltip" style="text-align: left">
                            <PopulationChange clan={clan} />
                        </div>
                </Tooltip>
            </tr>
            <tr>
                <td colspan="3" class="full-row">
                    {pct(clan.laborAllocation.plannedRatioFor(SkillDefs.Agriculture))} farming
                </td>
            </tr>
            <tr>
                <td colspan="3" class="full-row">
                    {clan.residenceLevel.description} 
                    ({pct(clan.residenceFraction)} resident)</td>
            </tr>
            <tr>
                <td colspan="3" class="full-row">{clan.parent ? `Cadet of ${clan.parent.name}` : 'Senior clan'}</td>
            </tr>
            <tr>
                <td colspan="3" class="full-row">
                    <Tooltip>
                        {clan.housing.name}
                        <div slot="tooltip" class="ttt">
                            {#if clan.housingDecision}
                                <HousingDecision clan={clan} decision={clan.housingDecision} />
                            {/if}
                        </div>
                    </Tooltip>
                </td>
            </tr>
            <tr>
                <td colspan="3" class="full-row">{clan.isDitching ? 'Ditching' : 'Not ditching'}</td>
            </tr>
        </tbody>
    </table>
    <hr>
    <table class="stats-table">
        <tbody>
            <tr>
                <td>
                    <Tooltip>
                        <img src="stat-prestige-256.png" alt="Prestige" width="24" height="24" />
                        <div slot="tooltip">Prestige</div>
                    </Tooltip>
                </td>
                <td>
                    <Tooltip>
                        <img src="stat-tenure-256.png" alt="Tenure" width="24" height="24" />
                        <div slot="tooltip">Tenure</div>
                    </Tooltip>
                </td>
                <td>
                    <Tooltip>
                        <img src="stat-subsistence-256.png" alt="Subsistence" width="24" height="24" />
                        <div slot="tooltip">Subsistence</div>
                    </Tooltip>
                </td>
                <td>
                    <Tooltip>
                        <img src="stat-welfare-256.png" alt="Welfare" width="24" height="24" />
                        <div slot="tooltip">Welfare</div>
                    </Tooltip>
                </td>
                <td>
                    <Tooltip>
                        <img src="stat-happiness-256.png" alt="Happiness" width="24" height="24" />
                        <div slot="tooltip">Happiness</div>
                    </Tooltip>
                </td>            
            </tr>
            <tr>
                <td>
                    <Tooltip>
                        {clan.averagePrestige.toFixed()}
                        <div slot="tooltip"  class="timeline-tooltip">
                            <div>Influence {pct(clan.influence)}</div>
                            <div>
                                <LineGraph data={clanTimelineGraphData(clan)} />
                            </div>
                        </div>
                    </Tooltip>
                </td> 
                <td>
                    {clan.seniority}
                </td>
                <td>
                    <Tooltip>
                        {signed(clan.happiness.subsistenceTotal.appeal)}
                        <div slot="tooltip" class="ttt">
                            <h4>Sources</h4>
                            <DataTable rows={appealTable(clan.happiness.subsistenceItems)} />
                        </div>
                    </Tooltip>
                </td>
                <td>
                    <Tooltip>
                        {signed(clan.happiness.total.appeal)}
                        <div slot="tooltip" class="ttt">
                            <h4>Sources</h4>
                            <DataTable rows={appealTable(clan.happiness.items)} />
                        </div>
                    </Tooltip>
                </td>
                <td>
                    <Tooltip>
                        {signed(clan.happiness.total.value)}
                        <div slot="tooltip" class="ttt">
                            <h4>Sources</h4>
                            <DataTable rows={happinessTable(clan.happiness.items)} />
                        </div>
                    </Tooltip>
                </td>
            </tr>
        </tbody>
    </table>
    <hr>
    <!-- Skills and TFP -->
    <table class="skills-table">
        <tbody>
            <tr>
                <td></td>
                {#each clan.skills as [def, _]}
                <td class="rph">
                    <Tooltip>
                        {#if def.icon}
                            <img src={def.icon} alt={def.name} width="20" height="20" />
                        {:else}
                            {def.name.substr(0, 2)}
                        {/if}
                        <div slot="tooltip" class="ttt">
                            <b>{def.name}</b>
                        </div>
                    </Tooltip>
                </td>
                {/each}
            </tr>
            <tr>
                <td>𝕊</td>
                {#each clan.skills as [_, skill]}
                <td class="rp">{skill.value.toFixed()}</td>
                {/each}
            </tr>
            <tr>
                <td>Δ</td>
                {#each clan.skills as [_, skill]}
                <td class="rp">
                    <Tooltip>
                        {signed(skill.lastChange?.delta || 0)}
                        <div slot="tooltip" class="ttt">
                            {#if skill.lastChange}
                                <h4>Imitation Sources</h4>
                                <DataTable rows={skillImitationTable(skill.lastChange)} />
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