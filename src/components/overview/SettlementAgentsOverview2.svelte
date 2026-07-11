<script lang="ts">
    import { FilteredIterableTable, IterableTable, SingleMapTable } from "../tables/tables2";
    import { pct, signed, signedFormat, spct, tsigned, unsigned, unsignedFormat } from "../../model/lib/format";
    import { safeDiv, sortedByKey } from "../../model/lib/basics";
    import ClanEffortMiniBar from "../items/ClanEffortMiniBar.svelte";
    import ClanResidenceTooltip from "../items/ClanResidenceTooltip.svelte";
    import EntityLink from "../state/EntityLink.svelte";
    import PopulationChange from "../PopulationChange.svelte";
    import PopulationPyramid from "../PopulationPyramid.svelte";
    import SkillDelta from "../SkillDelta.svelte";
    import TableView2 from "../tables/TableView2.svelte";
    import Tooltip from "../Tooltip.svelte";
    import { getClanLastTurnSnapshots, SettlementDTO, type ClanDTO, type WorldDTO } from "../../model/records/dtos";
    import type { Process } from "../../model/econ/process";
    import SimpleTooltip from "../widgets/SimpleTooltip.svelte";
    import { getAreaPrestige, getLocalPrestige, getLocalRespect, getRespect, getRespectInScopeDetail } from "../../model/relations/respect";
    import { get } from "svelte/store";
    import { connectionsOf } from "../../model/relations/connection";
    import ClanMigrationIcon from "../ClanMigrationIcon.svelte";
    
	let { 
        settlement, 
        title,
        predictMode,
    }: { 
        settlement: SettlementDTO, 
        title: string, 
        predictMode?: boolean,
    } = $props();

    let csnaps = $derived(getClanLastTurnSnapshots(settlement));

    let relevantProcesses = $derived.by(() =>
        sortedByKey(
            new Set(csnaps.flatMap(cs => cs.e.production.rs.map(opr => opr.operation.process))),
            process => process.sortKey));

    function clanSustenanceTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.consumption.m.values(),
            cg => cg.good.name,
            cg => cg.good.isSubsistence,
            [{
                data: 'Consumed',
                label: 'Consumed',
                valueFn: cg => cg.consumed,
                formatFn: unsignedFormat(2),
            }, {
                data: 'Stored',
                label: 'Stored',
                valueFn: cg => cg.stock,

                formatFn: unsignedFormat(2),
            }, {
                data: 'Storage loss',
                label: 'Storage loss',
                valueFn: cg => cg.stockLoss,
                formatFn: unsignedFormat(2),
            }, {
                data: 'Wasted',
                label: 'Wasted',
                valueFn: cg => cg.wasted,
                formatFn: unsignedFormat(2),
            }]);
    }

    function clanFoodStockTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.consumption.m.values(),
            cg => cg.good.name,
            cg => cg.good.isSubsistence,
            [{
                data: 'Stock',
                label: 'Stock',
                valueFn: cg => cg.stock,
                formatFn: unsignedFormat(2),
            }]);
    }

    function clanStressTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.stress.items,
            item => item.label,
            _ => true,
            [{
                data: 'Value',
                label: 'Value',
                valueFn: item => item.value,
                formatFn: signedFormat(),
            }]);
    }

    function clanQolTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.qol.m.values(),
            item => item.name,
            _ => true,
            [{
                data: 'Value',
                label: 'Value',
                valueFn: item => item.value,
                formatFn: signedFormat(),
            }, {
                data: 'Explanation',
                label: '',
                valueFn:  item => item.explanation,
             }]);
    }

    function clanRespectTooltipTable(clan: ClanDTO) {
        return new IterableTable(
            getRespectInScopeDetail(clan, clan.settlement.clans),
            item => item.label,
            [{
                data: 'Respect',
                label: 'Respect',
                valueFn: item => item.respect,
                formatFn: (v: number) => signed(v * 100),
            }, {
                data: 'Weight',
                label: 'Weight',
                valueFn: item => item.weight,
                formatFn: (v: number) => pct(v, 0),
            }, {
                data: 'Weighted Respect',
                label: 'Weighted Respect',
                valueFn: item => item.weightedValue,
                formatFn: (v: number) => signed(v * 100),
            }]);
    }

    function clanSustenanceHappinessTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.happiness.items.values(),
             item => item.label,
             item => item.isSubsistence,
             [{
                data: 'State',
                label: 'State',
                valueFn: item => item.stateDisplay,
            }, {
                data: 'Appeal',
                label: 'Appeal',
                valueFn: item => item.appeal,
                formatFn: (v: number) => signed(v, 0),
            }]);
    }

    function clanSocialHappinessTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.happiness.items.values(),
             item => item.label,
             item => item.isSocial,
             [{
                data: 'State',
                label: 'State',
                valueFn: item => item.stateDisplay,
            }, {
                data: 'Appeal',
                label: 'Appeal',
                valueFn: item => item.appeal,
                formatFn: (v: number) => signed(v, 3),
            }]);
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
        return new IterableTable(
            societyItem.subitems,
            subitem => subitem.otherName,
            [{
                data: 'Rel',
                label: 'Rel',
                valueFn: subitem => subitem.relativeAttention,
                formatFn: (v: number) => pct(v, 0),
            }, {
                data: 'Aln',
                label: 'Aln',
                valueFn: subitem => subitem.alignment,
                formatFn: (v: number) => pct(v, 0),
            }, {
                data: 'Appeal',
                label: 'Appeal',
                valueFn: subitem => subitem.value,
                formatFn: (v: number) => signed(v, 2),
            }]);
    }

    function clanConnectionsTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            connectionsOf(clan),
             ([other, connections]) => other.name,
             _ => true,
             [{
                data: 'Att',
                label: 'Att',
                valueFn: ([other, connections]) => clan.world.attentionTo(clan, other),
                formatFn: (v: number) => v.toFixed(0),
              }, {
                data: 'Rel',
                label: 'Rel',
                valueFn: ([other, connections]) => 
                    clan.world.attentionTo(clan, other) / (other.population || 1),
                formatFn: pct,
              }, {
                data: 'Kind',
                label: 'Kind',
                valueFn: ([other, connections]) => connections.map(c => c.debugString()).join(', '),
            }]);
    }

    function productivityModifierTooltipTable(clan: ClanDTO, process: Process) {
        return new IterableTable(
            clan.production.forProcess(process)?.productivity.items ?? [],
            item => item.label,
            [{
                data: 'Value',
                label: 'Value',
                valueFn: item => item.value,
                formatFn: (v: number) => spct(v, 0),
            }, {
                data: 'Explanation',
                label: 'Explanation',
                valueFn: item => item.explanation,
            }]);
    }

    function netLaborProductivity(clan: ClanDTO, process: Process): number {
        const r = clan.production.forProcess(process);
        if (!r) {
            return 1;
        }
        return r.laborProductivityFactor * Math.min(r.labor, r.land) / r.labor;
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
    <td class={delta >= 0 ? 'delta-positive' : delta <= 0 ? 'delta-negative' : delta >=0 ? 'delta-negative' : ''}>
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

{#snippet clanNotifications(clan: ClanDTO)}
    {#each clan.notifications as n}
        <SimpleTooltip tip={n.message}>{n.tag}</SimpleTooltip>
    {/each}
{/snippet}

<div id="top" class={predictMode ? 'predict' : ''}>
    <h3 style="margin-block-end: 0.5em;">{title}</h3>

    <table>
        <thead>
            <tr>
                <td></td>
                {#each csnaps as cs}
                    <td class="clan-header" colspan="2">
                        <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 0.2em;">
                            <EntityLink 
                                entity={cs.c}
                                extra={clanNotifications} />
                            <ClanMigrationIcon clan={cs.c} />
                        </div>
                    </td>
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
                                <div>Workers: {unsigned(cs.e.workers)}</div>
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
                                <TableView2 table={new IterableTable(
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
                                <TableView2 table={new IterableTable(
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
            <tr><td style="height: 0.5em"></td></tr>
            <tr class="actual">
                <td>Area Prestige</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {signed(100 * getAreaPrestige(cs.e))}
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => 100 * getAreaPrestige(c), signed)}
                {/each}
            </tr>    
            <tr class="actual">
                <td>Local Prestige</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {signed(100 * getLocalPrestige(cs.e))}
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => 100 * getLocalPrestige(c), signed)}
                {/each}
            </tr>    
            <tr class="actual">
                <td>Local Respect</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {signed(100 * getLocalRespect(cs.e))}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanRespectTooltipTable(cs.e)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => 100 * getLocalRespect(c), signed)}
                {/each}
            </tr>            
            <tr><td style="height: 0.5em"></td></tr>
            <tr class="actual">
                <td>Stress</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {signed(cs.e.stress.value)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanStressTooltipTable(cs.e)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => c.stress.value, signed)}
                {/each}
            </tr>
            <tr class="actual">
                <td>QoL</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {signed(cs.e.qol.value)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanQolTooltipTable(cs.e)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => c.qol.value, signed)}
                {/each}
            </tr>
            <tr><td style="height: 0.5em"></td></tr>
            <tr class="actual">
                <td>Food</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {pct(cs.e.consumption.perCapitaFood)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanSustenanceTooltipTable(cs.e)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => c.consumption.perCapitaFood, pct)}
                {/each}
            </tr>
            <tr class="actual">
                <td>&nbsp;Target</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {pct(cs.e.targetPerCapitaFood)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanSustenanceTooltipTable(cs.e)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => c.targetPerCapitaFood, pct)}
                {/each}
            </tr>
            <tr class="actual">
                <td>Food Storage</td>
                {#each csnaps as cs}
                    <td class="ra">
                        <Tooltip>
                            {pct(cs.e.consumption.perCapitaFoodStock)}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanFoodStockTooltipTable(cs.e)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => c.consumption.perCapitaFoodStock, pct)}
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
                                <p>Base from production: {pct(cs.e.consumption.foodInsecurity.base)}</p>
                                <p>Base buffering: {pct(cs.e.consumption.foodInsecurity.baseBuffering)}
                                    from {(cs.e.consumption.perCapitaFoodStock*365).toFixed()} days stored
                                </p>
                                <p>Storage failure risk: {pct(cs.e.consumption.foodInsecurity.storageRisk)}</p>
                                <p>Risk-adjusted buffering: {pct(cs.e.consumption.foodInsecurity.buffering)}</p>
                                <p>Total risk: {pct(cs.e.consumption.foodInsecurity.value)}</p>
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
            <tr><td style="height: 0.5em"></td></tr>
            <tr class="actual">
                <td>Connections</td>
                {#each csnaps as cs}
                    <td class="rap">
                        <Tooltip>
                            {[...connectionsOf(cs.e)].length}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <TableView2 table={clanConnectionsTooltipTable(cs.e)}></TableView2>
                            </div>
                        </Tooltip>
                    </td>
                    {@render deltaCell(cs, c => [...connectionsOf(c)].length, signed)}
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
            <tr>
                <td>Activities</td>
                {#each csnaps as cs}
                    <td colspan="2"><ClanEffortMiniBar clan={cs.e} m={cs.e.effortAllocation.m} /></td>
                {/each}
            </tr>
            <tr>
                <td>(Previous)</td>
                {#each csnaps as cs}
                    <td colspan="2">{#if cs.p}<ClanEffortMiniBar clan={cs.p} m={cs.p.effortAllocation.m} />{/if}</td>
                {/each}
            </tr>
            <tr>
                <td>Processes</td>
                {#each csnaps as cs}
                    <td colspan="2"><ClanEffortMiniBar clan={cs.e} m={cs.e.effortAllocation.pm} /></td>
                {/each}
            </tr>
            <tr>
                <td>(Previous)</td>
                {#each csnaps as cs}
                    <td colspan="2">{#if cs.p}<ClanEffortMiniBar clan={cs.p} m={cs.p.effortAllocation.pm} />{/if}</td>
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
            <tr><td style="height: 0.5em"></td></tr>
            {#each relevantProcesses as process}
                <tr class="actual">
                    <td>{process.name}</td>
                </tr>
                <tr class="actual">
                    <td>&nbsp;Production</td>
                    {#each csnaps as cs}
                        <td class="rap">
                            <Tooltip>
                                {cs.e.production.getForProcess(process, "amount")?.toFixed(0) ?? 0}
                            </Tooltip>
                        </td>
                        {@render deltaCell(cs, c => c.production.getForProcess(process, "amount") ?? 0, v => v.toFixed(0))}
                    {/each}
                </tr>
                <tr class="actual">
                    <td>&nbsp;Land</td>
                    {#each csnaps as cs}
                        <td class="rap">
                            <Tooltip>
                                {cs.e.production.getForProcess(process, "land")?.toFixed(0) ?? 0}
                            </Tooltip>
                        </td>
                        {@render deltaCell(cs, c => c.production.getForProcess(process, "land") ?? 0, v => v.toFixed(0))}
                    {/each}
                </tr>
                <tr class="actual">
                    <td>&nbsp;Labor</td>
                    {#each csnaps as cs}
                        <td class="rap">
                            <Tooltip>
                                {cs.e.production.getForProcess(process, "labor")?.toFixed(0) ?? 0}
                                <div slot="tooltip">
                                </div>
                            </Tooltip>
                        </td>
                        {@render deltaCell(cs, c => c.production.getForProcess(process, "labor") ?? 0, v => v.toFixed(0))}
                    {/each}
                </tr>
                <tr class="actual">
                    <td>&nbsp;Help</td>
                    {#each csnaps as cs}
                        <td class="rap">
                            <Tooltip>
                                {cs.e.production.getForProcess(process, "help")?.toFixed(0) ?? 0}
                                <div slot="tooltip">
                                </div>
                            </Tooltip>
                        </td>
                        {@render deltaCell(cs, c => c.production.getForProcess(process, "help") ?? 0, v => v.toFixed(0))}
                    {/each}
                </tr>
                <tr class="actual">
                    <td>&nbsp;Productivity</td>
                    {#each csnaps as cs}
                        <td class="rap">
                            <Tooltip>
                                {spct(cs.e.production.getForProcess(process, "laborProductivityFactor") ?? 0)}
                                <div slot="tooltip">
                                    <TableView2 table={productivityModifierTooltipTable(cs.e, process)} />
                                </div>
                            </Tooltip>
                        </td>
                        {@render deltaCell(cs, c => c.production.getForProcess(process, "laborProductivityFactor") ?? 0, v => v.toFixed(2))}
                    {/each}
                </tr>
                <tr class="actual">
                    <td>&nbsp;Net Labor Prod</td>
                    {#each csnaps as cs}
                        <td class="rap">
                            <Tooltip>
                                {spct(netLaborProductivity(cs.e, process))}
                                <div slot="tooltip">
                                </div>
                            </Tooltip>
                        </td>
                        {@render deltaCell(cs, c => netLaborProductivity(c, process), v => v.toFixed(2))}
                    {/each}
                </tr>
            {/each}
            <tr><td style="height: 0.5em"></td></tr>
            {#each csnaps[0].e.skills.keys() as skill}
                <tr class="actual">
                    <td>{skill.name}</td>
                    {#each csnaps as cs}
                        <td class="rap">
                            <Tooltip>
                                {unsigned(cs.e.skills.v(skill))}
                                <div slot="tooltip"></div>
                            </Tooltip>
                        </td>
                        <td><SkillDelta skill={skill} clan={cs.e}></SkillDelta></td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>