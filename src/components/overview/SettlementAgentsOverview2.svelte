<script lang="ts">
    import { pct, pctFormat, signed, signedFormat, spct, tsigned, unsigned, unsignedFormat } from "../../model/lib/format";
    import type { HappinessItem } from "../../model/people/happiness";
    import { SkillDefs } from "../../model/people/skills";
    import ClanRelationshipsDetails from "../clan/ClanRelationshipsDetails.svelte";
    import DataTable2 from "../DataTable2.svelte";
    import type { ClanDTO, StandaloneSettlementDTO } from "../../model/records/dtos";
    import ClanResidenceTooltip from "../items/ClanResidenceTooltip.svelte";
    import PopulationChange from "../PopulationChange.svelte";
    import PopulationPyramid from "../PopulationPyramid.svelte";
    import { laborAllocationPlanTable } from "../tables";
    import { IterableTable, RecordTable, SingleRecordTable, ValueMapTable } from "../tables/tables2";
    import TableView2 from "../tables/TableView2.svelte";
    import Tooltip from "../Tooltip.svelte";
    import { TradeGoods, type TradeGood } from "../../model/trade";
    import { safeDiv } from "../../model/lib/basics";
    import { getClanLastTurnSnapshots } from "../../model/records/snapreg";
    import EntityLink from "../state/EntityLink.svelte";

	let { 
        settlement, 
        title,
        predictMode,
    }: { 
        settlement: StandaloneSettlementDTO, 
        title: string, 
        predictMode?: boolean,
    } = $props();

    let csnaps = $derived([...getClanLastTurnSnapshots(settlement).entries()]
        .map(([_, snapshots]) => ({ p: snapshots.p, e: snapshots.e!})));

    function productionCooperationFactor(clan: ClanDTO, good: TradeGood): number {
        const item = clan.production.goods.find(g => g.good === good);
        if (!item) return 1;
        return item.productivity.items.find(i => i.label === 'Relationships')?.fp ?? 1;
    }

    function productionWorkers(clan: ClanDTO, good: TradeGood): number {
        return clan.production.goods.find(g => g.good === good)?.workers ?? 0;
    }

    function productionLand(clan: ClanDTO, good: TradeGood): number {
        return clan.production.goods.find(g => g.good === good)?.land ?? 0;
    }

    function productionLandPerWorker(clan: ClanDTO, good: TradeGood): number {
        const prod = clan.production.goods.find(g => g.good === good);
        return prod && prod.workers ? prod.land / prod.workers : 0;
    }

    function clanSustenanceTooltipTable(clan: ClanDTO) {
        return new IterableTable(
            clan.consumption.ledger.values(),
            cg => cg.good.name,
            cg => cg.good.isSubsistence,
            [{
                data: 'Consumed',
                label: 'Consumed',
                valueFn: cg => cg.consumed / clan.consumption.population,
                formatFn: unsignedFormat(2),
            }, {
                data: 'Stored',
                label: 'Stored',
                valueFn: cg => cg.stock / clan.consumption.population,
                formatFn: unsignedFormat(2),
            }, {
                data: 'Wasted',
                label: 'Wasted',
                valueFn: cg => cg.wasted / clan.consumption.population,
                formatFn: unsignedFormat(2),
            }]);
    }

    function clanFoodStockTooltipTable(clan: ClanDTO) {
        return new IterableTable(
            clan.consumption.ledger.values(),
            cg => cg.good.name,
            cg => cg.good.isSubsistence,
            [{
                data: 'Stock',
                label: 'Stock',
                valueFn: cg => cg.stock / clan.consumption.population,
                formatFn: unsignedFormat(2),
            }]);
    }

    function clanFoodSecurityTooltipTable(clan: ClanDTO) {
        return new IterableTable(
            clan.consumption.foodInsecurity.productionInsecurityItems,
            item => item.source,
            _ => true,
            [{
                data: 'Base Risk',
                label: 'Base Risk',
                valueFn: item => item.insecurity,
                formatFn: pctFormat(2),
            }, {
                data: 'Reliance',
                label: 'Reliance',
                valueFn: item => item.consumptionRatio,
                formatFn: pctFormat(2),
            }, {
                data: 'Risk',
                label: 'Risk',
                valueFn: item => item.scaledInsecurity,
                formatFn: pctFormat(2),
            }]);
    }

    function clanSustenanceHappinessTooltipTable(clan: ClanDTO) {
        return new ValueMapTable(
            clan.happiness.items,
            (item: HappinessItem<any>) => item.appeal,
            (item: HappinessItem<any>) => item.isSubsistence,
            (v: number) => signed(v, 0));
    }

    function clanSocialHappinessTooltipTable(clan: ClanDTO) {
        return new ValueMapTable(
            clan.happiness.items,
            (item: HappinessItem<any>) => item.appeal,
            (item: HappinessItem<any>) => item.isSocial,
            (v: number) => signed(v, 0));
    }

    function clanSocietyHappinessDetailTooltipTable(clan: ClanDTO) {
        const societyItem = clan.happiness.getSocietyItem();
        if (!societyItem) {
            return {
                columns: [{
                    data: 'No society item',
                    label: 'No society item',
                    valueFn: () => 0,
                }],
                rows: [],
            };
        }
        return new RecordTable(
            societyItem.subitems,
            subitem => subitem.otherName,
            [{
                data: 'Vol',
                label: 'Vol',
                valueFn: subitem => subitem.interactionVolume,
                formatFn: (v: number) => v.toFixed(0),
            }, {
                data: 'Rel',
                label: 'Rel',
                valueFn: subitem => subitem.cooperationLevel,
                formatFn: (v: number) => pct(v, 0),
            }, {
                data: 'Appeal',
                label: 'Appeal',
                // TODO - Avoid having to hack in this 0.1 here.
                valueFn: subitem => 0.1 * subitem.interactionValue,
                formatFn: (v: number) => signed(v, 0),
            }]);
    }
</script>

<style>
    td {
        padding: 0 0.5em;
    }

    td.rap {
        padding-right: 1.3em;
    }

    .delta-positive {
        color: #464;
    }

    .delta-negative {
        color: #644;
    }

    .predict .actual {
        opacity: 0.0;
    }

    .clan-header {
        text-align: center;
        font-weight: bold;
    }
</style>

{#snippet deltaCell(cs: {p?: ClanDTO, e: ClanDTO}, valueFunc: (c: ClanDTO) => number, fmt: (v: number) => string = v => v.toString())}
    {@const delta = cs.p ? valueFunc(cs.e) - valueFunc(cs.p) : 0}
    <td class={delta > 0 ? 'delta-positive' : delta < 0 ? 'delta-negative' : ''}>
        <Tooltip>
            {#if cs.p}
                {tsigned(delta, fmt)}
            {:else}
                -
            {/if}
            <div slot="tooltip" style="text-align: left; color: initial;">
                {#if cs.p}
                    {fmt(valueFunc(cs.p))}
                {:else}
                    ?
                {/if}
                &rarr;
                {fmt(valueFunc(cs.e))}
            </div>
        </Tooltip>
    </td>
{/snippet}

<div id="top" class={predictMode ? 'predict' : ''}>
    <h3 style="margin-block-end: 0.5em;">{title}</h3>

    <table>
        <thead>
            <tr>
                <td></td>
                {#each csnaps as cs}
                    <td class="clan-header" colspan="2"><EntityLink entity={cs.e} /></td>
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
                                <div>Population Per Worker: {safeDiv(cs.e.population, cs.e.workers).toFixed(1)}</div>
                            </div>
                        </Tooltip>
                    </td>
                    <td class="delta">
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
                <td>&nbsp;Next support ratio</td>
                {#each csnaps as cs}
                    <td class="rap">
                        <Tooltip>
                            {safeDiv(cs.e.population, cs.e.workers).toFixed(1)}
                            <div slot="tooltip">
                                <div>Workers: {cs.e.workers}</div>
                                <div>Carers and Dependents: {cs.e.population - cs.e.workers}</div>
                                <div>Population Per Worker: {safeDiv(cs.e.population, cs.e.workers).toFixed(1)}</div>
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => safeDiv(c.population, c.workers), v => v.toFixed(1))}
                {/each}
            </tr>
            <tr class="actual">
                <td>Birth rate modifier</td>
                {#each csnaps as cs}
                    <td class="rap">
                        <Tooltip>
                            {spct(cs.e.lastPopulationChange.brModifier)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={new RecordTable(
                                    cs.e.lastPopulationChange.brModifiers,
                                    item => item.source,
                                    [{
                                         data: 'State',
                                         label: '',
                                         valueFn: item => item.inputValue,
                                         formatFn: (v: number|string) => typeof v === 'number' ? v.toFixed(2) : v,
                                    },
                                    {
                                        data: 'Value',
                                        label: '',
                                        valueFn: item => item.value,
                                        formatFn: (v: number) => spct(v, 0),
                                    }])} />
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => c.lastPopulationChange.brModifier, pct)}
                {/each}
            </tr>
            <tr class="actual">
                <td>Death rate modifier</td>
                {#each csnaps as cs}
                    <td class="rap">
                        <Tooltip>
                            {spct(cs.e.lastPopulationChange.drModifier)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={new RecordTable(
                                    cs.e.lastPopulationChange.drModifiers,
                                    item => item.source,
                                    [{
                                         data: 'State',
                                         label: '',
                                         valueFn: item => item.inputValue,
                                         formatFn: (v: number|string) => typeof v === 'number' ? v.toFixed(2) : v,
                                    }, {
                                        data: 'Value',
                                        label: '',
                                        valueFn: item => item.value,
                                        formatFn: (v: number) => spct(v, 0),
                                    }])} />
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => c.lastPopulationChange.drModifier, pct)}
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
                    {@render deltaCell(cs, c => c.consumption.perCapitaSubsistence(), pct)}
                {/each}
            </tr>
            <tr class="actual">
                <td>Food Storage</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {pct(cs.e.consumption.perCapitaFoodStock())}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanFoodStockTooltipTable(cs.e)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => c.consumption.perCapitaFoodStock(), pct)}
                {/each}
            </tr>
            <tr class="actual">
                <td>Food Security</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {pct(1 - cs.e.consumption.foodInsecurity.value)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <h3>Production Risks</h3>
                                <TableView2 table={clanFoodSecurityTooltipTable(cs.e)}></TableView2>

                                <p>Base risk: {pct(cs.e.consumption.foodInsecurity.productionInsecurity)}</p>
                                <p>Buffering: {pct(cs.e.consumption.foodInsecurity.storageBuffering)}
                                    from {(cs.e.consumption.foodInsecurity.storage*365).toFixed()} days stored
                                </p>
                                <p>Risk: {pct(cs.e.consumption.foodInsecurity.value)}</p>
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => 1 - c.consumption.foodInsecurity.value, pct)}
                {/each}
            </tr>
            <tr class="actual">
                <td>Material Welfare</td>
                {#each csnaps as cs}
                    <td class="rap">
                        <Tooltip>
                            {signed(cs.e.happiness.subsistenceAppeal)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanSustenanceHappinessTooltipTable(cs.e)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => c.happiness.subsistenceAppeal, signed)}
                {/each}
            </tr>
            <tr class="actual">
                <td>Social Welfare</td>
                {#each csnaps as cs}
                    <td class="rap">
                        <Tooltip>
                            {signed(cs.e.happiness.socialAppeal)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <h4>Sources</h4>
                                <TableView2 table={clanSocialHappinessTooltipTable(cs.e)}></TableView2>
                                <h4>Society Detail</h4>
                                <TableView2 table={clanSocietyHappinessDetailTooltipTable(cs.e)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => c.happiness.socialAppeal, signed)}
                {/each}
            </tr>
            <tr><td style="height: 0.5em"></td></tr>
            <tr class="actual">
                <td>Agri Coop</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {spct(productionCooperationFactor(cs.e, TradeGoods.Cereals))}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <ClanRelationshipsDetails clan={cs.e} skill={SkillDefs.Agriculture} />
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => productionCooperationFactor(c, TradeGoods.Cereals), pct)}
                {/each}
            </tr>
            <tr class="actual">
                <td>Fish Coop</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {spct(productionCooperationFactor(cs.e, TradeGoods.Fish))}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <ClanRelationshipsDetails clan={cs.e} skill={SkillDefs.Fishing} />
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => productionCooperationFactor(c, TradeGoods.Fish), pct)}
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
                    {@render deltaCell(cs, c => c.residenceLevel.fractionInSettlement, pct)}
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
                    {@render deltaCell(cs, c => c.laborAllocation.plannedRatioFor(SkillDefs.Agriculture) ?? 0, pct)}
                {/each}
            </tr>
            <tr><td style="height: 0.5em"></td></tr>
            <tr class="actual">
                <td>Support Ratio</td>
                {#each csnaps as cs}
                    <td class="rap">
                        {#if cs.p}
                            <Tooltip>
                                {safeDiv(cs.p.population, cs.p.workers).toFixed(1)}
                                <div slot="tooltip">
                                    <div>Workers: {cs.p.workers}</div>
                                    <div>Carers and Dependents: {cs.p.population - cs.p.workers}</div>
                                    <div>Population Per Worker: {safeDiv(cs.p.population, cs.p.workers).toFixed(1)}</div>
                                </div>
                            </Tooltip>
                        {:else}
                        -
                        {/if}
                    </td>
                    {@render deltaCell(cs, c => safeDiv(c.population, c.workers), v => v.toFixed(1))}
                {/each}
            </tr>
            {#each settlement.localTradeGoods as tradeGood}
            <tr class="actual">
                <td>{tradeGood.name}: workers</td>
                {#each csnaps as cs}
                    <td class="rap">
                        {productionWorkers(cs.e, tradeGood).toFixed(0)}
                        <Tooltip>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => productionWorkers(c, tradeGood), v => v.toFixed(0))}
                {/each}
            </tr>
            <tr class="actual">
                <td>{tradeGood.name}: land</td>
                {#each csnaps as cs}
                    <td class="rap">
                        {productionLand(cs.e, tradeGood).toFixed(0)}
                        <Tooltip>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => productionLand(c, tradeGood), v => v.toFixed(0))}
                {/each}
            </tr>
            <tr class="actual">
                <td>{tradeGood.name}: land/worker</td>
                {#each csnaps as cs}
                    <td class="ra">
                        {productionLandPerWorker(cs.e, tradeGood).toFixed(2)}
                        <Tooltip>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => productionLandPerWorker(c, tradeGood), v => v.toFixed(2))}
                {/each}
            </tr>
            {/each}
        </tbody>
    </table>
</div>