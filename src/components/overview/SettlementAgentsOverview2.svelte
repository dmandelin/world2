<script lang="ts">
    import { pct, signed, spct } from "../../model/lib/format";
    import type { HappinessItem } from "../../model/people/happiness";
    import { SkillDef, SkillDefs } from "../../model/people/skills";
    import ClanRelationshipsDetails from "../clan/ClanRelationshipsDetails.svelte";
    import type { ClanDTO, SettlementDTO } from "../dtos";
    import ClanResidence from "../items/ClanResidence.svelte";
    import ClanResidenceTooltip from "../items/ClanResidenceTooltip.svelte";
    import PopulationChange from "../PopulationChange.svelte";
    import PopulationPyramid from "../PopulationPyramid.svelte";
    import { SingleRecordTable, ValueMapTable } from "../tables/tables2";
    import TableView2 from "../tables/TableView2.svelte";
    import Tooltip from "../Tooltip.svelte";

	let { settlement }: { settlement: SettlementDTO } = $props();
    $effect(() => {
        for (const c of settlement.clans) {
            console.log(c.lastPopulationChange);
        }
    });

    function clanSustenanceTooltipTable(clan: ClanDTO) {
        return new SingleRecordTable(
            clan.consumption.perCapitaSubistenceAmounts,
            v => v.toFixed(2));
    }

    function clanSustenanceHappinessTooltipTable(clan: ClanDTO) {
        return new ValueMapTable(
            clan.happiness.items,
            (item: HappinessItem<any>) => item.appeal,
            (item: HappinessItem<any>) => item.isSubsistence,
            (v: number) => signed(v, 0));
    }
</script>

<style>
    td {
        padding: 0 0.5em;
    }

    td.rap {
        padding-right: 1.3em;
    }

    .delta {
        color: #464;
    }
</style>

<div id="top">
    <h3 style="margin-block-end: 0.5em;">Situation</h3>

    <table>
        <thead>
            <tr>
                <td></td>
                {#each settlement.clans as clan}
                    <td class="bold">{clan.name}</td>
                {/each}
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>People</td>
                {#each settlement.clans as clan}
                    <td class="rap">
                        <Tooltip>
                            {clan.population}
                            <div slot="tooltip">
                                <PopulationPyramid clan={clan} />
                                <hr>
                                <div>Workers: {clan.workers}</div>
                                <div>Carers and Dependents: {clan.population - clan.workers}</div>
                                <div>Population Per Worker: {(clan.population / clan.workers).toFixed(1)}</div>
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr>
                <td>&nbsp;&Delta;</td>
                {#each settlement.clans as clan}
                    <td class="rap delta">
                        <Tooltip>
                            {clan.lastPopulationChange ? signed(clan.lastPopulationChange.change) : ''}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <PopulationChange clan={clan} />
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr>
                <td>Food</td>
                {#each settlement.clans as clan}
                    <td class="ra">
                        <Tooltip>
                            {pct(clan.consumption.perCapitaSubsistence())}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanSustenanceTooltipTable(clan)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr>
                <td>&nbsp;Sat</td>
                {#each settlement.clans as clan}
                    <td class="rap">
                        <Tooltip>
                            {signed(clan.happiness.subsistenceAppeal)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanSustenanceHappinessTooltipTable(clan)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr><td style="height: 0.5em"></td></tr>
            <tr>
                <td>Agri Coop</td>
                {#each settlement.clans as clan}
                    <td class="ra">
                        <Tooltip>
                            {spct(clan.relationships.getProductivityFactor(SkillDefs.Agriculture))}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <ClanRelationshipsDetails clan={clan} skill={SkillDefs.Agriculture} />
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr>
                <td>Fish Coop</td>
                {#each settlement.clans as clan}
                    <td class="ra">
                        <Tooltip>
                            {spct(clan.relationships.getProductivityFactor(SkillDefs.Fishing))}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <ClanRelationshipsDetails clan={clan} skill={SkillDefs.Fishing} />
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr><td style="height: 0.5em"></td></tr>
            <tr>
                <td>Residence</td>
                {#each settlement.clans as clan}
                    <td class="ra">
                        <Tooltip>
                            {pct(clan.residenceLevel.fractionInSettlement)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <ClanResidenceTooltip clan={clan} />
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
        </tbody>
    </table>
</div>