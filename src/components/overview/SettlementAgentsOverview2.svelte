<script lang="ts">
    import { pct, signed, spct, tsigned } from "../../model/lib/format";
    import type { HappinessItem } from "../../model/people/happiness";
    import { SkillDefs } from "../../model/people/skills";
    import ClanRelationshipsDetails from "../clan/ClanRelationshipsDetails.svelte";
    import DataTable2 from "../DataTable2.svelte";
    import type { ClanDTO, StandaloneSettlementDTO } from "../../model/records/dtos";
    import ClanResidenceTooltip from "../items/ClanResidenceTooltip.svelte";
    import PopulationChange from "../PopulationChange.svelte";
    import PopulationPyramid from "../PopulationPyramid.svelte";
    import { laborAllocationPlanTable } from "../tables";
    import { SingleRecordTable, ValueMapTable } from "../tables/tables2";
    import TableView2 from "../tables/TableView2.svelte";
    import Tooltip from "../Tooltip.svelte";

	let { 
        settlement, 
        title,
        predictMode,
    }: { 
        settlement: StandaloneSettlementDTO, 
        title: string, 
        predictMode?: boolean,
    } = $props();

    let tsnaps = $derived(settlement.turnSnapshots);
    let csnaps = $derived([...tsnaps.byClan.entries()]
        .map(([clan, snapshots]) => ({c: clan, b: snapshots.bot, e: snapshots.eot})));

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

    .predict .actual {
        opacity: 0.0;
    }
</style>

<div id="top" class={predictMode ? 'predict' : ''}>
    <h3 style="margin-block-end: 0.5em;">{title}</h3>

    <table>
        <thead>
            <tr>
                <td></td>
                {#each csnaps as cs}
                    <td class="bold">{cs.c.name}</td>
                {/each}
            </tr>
        </thead>
        <tbody>
            <tr class="actual">
                <td>People</td>
                {#each csnaps as cs}
                    <td class="rap">
                        <Tooltip>
                            {cs.e.population}
                            <div slot="tooltip">
                                <PopulationPyramid clan={cs.e} />
                                <hr>
                                <div>Workers: {cs.e.workers}</div>
                                <div>Carers and Dependents: {cs.e.population - cs.e.workers}</div>
                                <div>Population Per Worker: {(cs.e.population / cs.e.workers).toFixed(1)}</div>
                            </div>
                        </Tooltip>
                        <Tooltip>
                            {cs.e.lastPopulationChange ? tsigned(cs.e.lastPopulationChange.change) : ''}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <PopulationChange clan={cs.e} />
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr class="actual">
                <td>Food</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {pct(cs.e.consumption.perCapitaSubsistence())}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanSustenanceTooltipTable(cs.e)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr class="actual">
                <td>&nbsp;Sat</td>
                {#each csnaps as cs}
                    <td class="rap">
                        <Tooltip>
                            {signed(cs.e.happiness.subsistenceAppeal)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanSustenanceHappinessTooltipTable(cs.e)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr><td style="height: 0.5em"></td></tr>
            <tr class="actual">
                <td>Agri Coop</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {spct(cs.e.relationships.getProductivityFactor(SkillDefs.Agriculture))}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <ClanRelationshipsDetails clan={cs.e} skill={SkillDefs.Agriculture} />
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr class="actual">
                <td>Fish Coop</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {spct(cs.e.relationships.getProductivityFactor(SkillDefs.Fishing))}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <ClanRelationshipsDetails clan={cs.e} skill={SkillDefs.Fishing} />
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr><td style="height: 0.5em"></td></tr>
            <tr>
                <td>Residence</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {pct(cs.e.residenceLevel.fractionInSettlement)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <ClanResidenceTooltip clan={cs.e} />
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr>
                <td>Farming</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {pct(cs.e.laborAllocation.plannedRatioFor(SkillDefs.Agriculture) ?? 0)}
                            <div slot="tooltip" class="ttt">
                                H {cs.e.laborAllocation.allocationPlan.happiness.toFixed()} |
                                {pct(cs.e.laborAllocation.allocationPlan.experimentProbability)}
                                ({(cs.e.laborAllocation.allocationPlan.experimentingRoll * 100).toFixed()})
                                {#if cs.e.laborAllocation.allocationPlan.experimenting}
                                    - experimenting
                                {:else}
                                    - maintaining traditions
                                {/if}
                                <DataTable2 table={laborAllocationPlanTable(cs.e)} />
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr><td style="height: 0.5em"></td></tr>
            {#each settlement.localTradeGoods as tradeGood}
            {@const productionsForGood = csnaps.map(cs => cs.e.production.goods.find(g => g.good === tradeGood))}
            <tr class="actual">
                <td>{tradeGood.name}: workers</td>
                {#each productionsForGood as productionItem}
                    <td class="rap">
                        {(productionItem?.workers ?? 0).toFixed(0)}
                        <Tooltip>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr class="actual">
                <td>{tradeGood.name}: land</td>
                {#each productionsForGood as productionItem}
                    <td class="rap">
                        {(productionItem?.land ?? 0).toFixed(0)}
                        <Tooltip>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            <tr class="actual">
                <td>{tradeGood.name}: land/worker</td>
                {#each productionsForGood as productionItem}
                    <td class="ra">
                        {productionItem && productionItem.workers ? (productionItem.land / productionItem.workers).toFixed(2) : '-'}
                        <Tooltip>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
            {/each}
        </tbody>
    </table>
</div>