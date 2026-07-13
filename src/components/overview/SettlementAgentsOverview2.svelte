<script lang="ts">
    import type { Snippet } from "svelte";
    import { FilteredIterableTable, IterableTable, SingleMapTable } from "../tables/tables2";
    import { pct, signed, signedFormat, spct, tsigned, unsigned, unsignedFormat, stressColor } from "../../model/lib/format";
    import { safeDiv, sortedByKey } from "../../model/lib/basics";
    import ClanEffortMiniBar from "../items/ClanEffortMiniBar.svelte";
    import ClanResidenceTooltip from "../items/ClanResidenceTooltip.svelte";
    import EntityLink from "../state/EntityLink.svelte";
    import PopulationChange from "../PopulationChange.svelte";
    import PopulationPyramid from "../PopulationPyramid.svelte";
    import SkillDelta from "../SkillDelta.svelte";
    import TableView2 from "../tables/TableView2.svelte";
    import Tooltip from "../Tooltip.svelte";
    import { getClanLastTurnSnapshots, SettlementDTO, type ClanDTO, type WorldDTO, type ClanLastTurnSnapshots } from "../../model/records/dtos";
    import type { Process } from "../../model/econ/process";
    import SimpleTooltip from "../widgets/SimpleTooltip.svelte";
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

    interface RowDef {
        label: string;
        class?: string;
        isHeader?: boolean;
        colspan?: number;
        cellClass?: string;

        // Value definition
        value?: (c: ClanDTO) => any;
        format?: (v: any) => string;
        renderValueSnippet?: Snippet<[ClanLastTurnSnapshots]>;
        renderSnippet?: Snippet<[ClanLastTurnSnapshots]>;

        // Tooltip definition
        useTooltip?: boolean;
        tooltipSnippet?: Snippet<[ClanLastTurnSnapshots, any]>;
        context?: any;

        // Delta definition
        deltaValue?: (c: ClanDTO) => number;
        deltaFormat?: (v: number) => string;
        customDeltaSnippet?: Snippet<[ClanLastTurnSnapshots, any]>;
        customDeltaContext?: any;
    }

    let rowGroups = $derived.by<RowDef[][]>(() => {
        const groups: RowDef[][] = [];

        // Group 1: Demographics / Population
        groups.push([
            {
                label: 'People',
                class: 'actual',
                cellClass: 'rap',
                value: c => c.population,
                tooltipSnippet: peopleTooltip,
                customDeltaSnippet: peopleDeltaCell,
            },
            {
                label: '&nbsp;Next support ratio',
                class: 'actual',
                cellClass: 'rap',
                value: c => safeDiv(c.population, c.workers),
                format: v => v.toFixed(1),
                tooltipSnippet: nextSupportRatioTooltip,
                deltaValue: c => safeDiv(c.population, c.workers),
                deltaFormat: v => v.toFixed(1),
            },
            {
                label: 'Birth rate modifier',
                class: 'actual',
                cellClass: 'rap',
                value: c => c.lastPopulationChange.brModifier,
                format: spct,
                tooltipSnippet: brModifierTooltip,
                deltaValue: c => c.lastPopulationChange.brModifier,
                deltaFormat: pct,
            },
            {
                label: 'Death rate modifier',
                class: 'actual',
                cellClass: 'rap',
                value: c => c.lastPopulationChange.drModifier,
                format: spct,
                tooltipSnippet: drModifierTooltip,
                deltaValue: c => c.lastPopulationChange.drModifier,
                deltaFormat: pct,
            },
            {
                label: 'Support Ratio',
                class: 'actual',
                cellClass: 'rap',
                renderValueSnippet: supportRatioValueRender,
                deltaValue: c => safeDiv(c.population, c.workers),
                deltaFormat: v => v.toFixed(1),
            }
        ]);

        // Group 2: Welfare & Residence (Happiness, Social Welfare, Material Welfare, QoL, Stress, Residence)
        groups.push([
            {
                label: 'Happiness',
                class: 'actual',
                cellClass: 'rap',
                value: c => c.happiness.appeal,
                format: signed,
                tooltipSnippet: happinessTooltip,
                deltaValue: c => c.happiness.appeal,
                deltaFormat: signed,
            },
            {
                label: 'Social Welfare',
                class: 'actual',
                cellClass: 'rap',
                value: c => c.happiness.socialAppeal,
                format: signed,
                tooltipSnippet: socialWelfareTooltip,
                deltaValue: c => c.happiness.socialAppeal,
                deltaFormat: signed,
            },
            {
                label: 'Material Welfare',
                class: 'actual',
                cellClass: 'rap',
                value: c => c.happiness.subsistenceAppeal,
                format: signed,
                tooltipSnippet: materialWelfareTooltip,
                deltaValue: c => c.happiness.subsistenceAppeal,
                deltaFormat: signed,
            },
            {
                label: 'QoL',
                class: 'actual',
                cellClass: 'rap',
                value: c => c.qol.value,
                format: signed,
                tooltipSnippet: qolTooltip,
                deltaValue: c => c.qol.value,
                deltaFormat: signed,
            },
            {
                label: 'Stress',
                class: 'actual',
                cellClass: 'rap',
                renderValueSnippet: stressValueRender,
                tooltipSnippet: stressTooltip,
                deltaValue: c => c.stress.value,
                deltaFormat: signed,
            },
            {
                label: 'Residence',
                cellClass: 'ra',
                value: c => c.residenceLevel.fractionInSettlement,
                format: pct,
                tooltipSnippet: residenceTooltip,
                deltaValue: c => c.residenceLevel.fractionInSettlement,
                deltaFormat: pct,
            }
        ]);

        // Group 3: Food
        groups.push([
            {
                label: 'Food',
                class: 'actual',
                cellClass: 'ra',
                value: c => c.consumption.perCapitaFood,
                format: pct,
                tooltipSnippet: foodTooltip,
                deltaValue: c => c.consumption.perCapitaFood,
                deltaFormat: pct,
            },
            {
                label: '&nbsp;Target',
                class: 'actual',
                cellClass: 'ra',
                value: c => c.targetPerCapitaFood,
                format: pct,
                tooltipSnippet: targetFoodTooltip,
                deltaValue: c => c.targetPerCapitaFood,
                deltaFormat: pct,
            },
            {
                label: 'Food Storage',
                class: 'actual',
                cellClass: 'ra',
                value: c => c.consumption.perCapitaFoodStock,
                format: pct,
                tooltipSnippet: foodStorageTooltip,
                deltaValue: c => c.consumption.perCapitaFoodStock,
                deltaFormat: pct,
            },
            {
                label: 'Food Security',
                class: 'actual',
                cellClass: 'ra',
                value: c => 1 - c.consumption.foodInsecurity.value,
                format: pct,
                tooltipSnippet: foodSecurityTooltip,
                deltaValue: c => 1 - c.consumption.foodInsecurity.value,
                deltaFormat: pct,
            }
        ]);

        // Group 4: Activities & Processes (Effort Allocation)
        groups.push([
            {
                label: 'Activities',
                colspan: 2,
                renderSnippet: activitiesRender,
            },
            {
                label: '(Previous)',
                colspan: 2,
                renderSnippet: activitiesPrevRender,
            },
            {
                label: 'Processes',
                colspan: 2,
                renderSnippet: processesRender,
            },
            {
                label: '(Previous)',
                colspan: 2,
                renderSnippet: processesPrevRender,
            }
        ]);

        // Group 5: Processes (dynamic)
        for (const process of relevantProcesses) {
            groups.push([
                {
                    label: process.name,
                    class: 'actual',
                    isHeader: true,
                },
                {
                    label: '&nbsp;Production',
                    class: 'actual',
                    cellClass: 'rap',
                    useTooltip: true,
                    value: c => c.production.getForProcess(process, "amount") ?? 0,
                    format: v => v.toFixed(0),
                    deltaValue: c => c.production.getForProcess(process, "amount") ?? 0,
                    deltaFormat: v => v.toFixed(0),
                },
                {
                    label: '&nbsp;Land',
                    class: 'actual',
                    cellClass: 'rap',
                    useTooltip: true,
                    value: c => c.production.getForProcess(process, "land") ?? 0,
                    format: v => v.toFixed(0),
                    deltaValue: c => c.production.getForProcess(process, "land") ?? 0,
                    deltaFormat: v => v.toFixed(0),
                },
                {
                    label: '&nbsp;Labor',
                    class: 'actual',
                    cellClass: 'rap',
                    useTooltip: true,
                    value: c => c.production.getForProcess(process, "labor") ?? 0,
                    format: v => v.toFixed(0),
                    deltaValue: c => c.production.getForProcess(process, "labor") ?? 0,
                    deltaFormat: v => v.toFixed(0),
                },
                {
                    label: '&nbsp;Help',
                    class: 'actual',
                    cellClass: 'rap',
                    useTooltip: true,
                    value: c => c.production.getForProcess(process, "help") ?? 0,
                    format: v => v.toFixed(0),
                    deltaValue: c => c.production.getForProcess(process, "help") ?? 0,
                    deltaFormat: v => v.toFixed(0),
                },
                {
                    label: '&nbsp;Productivity',
                    class: 'actual',
                    cellClass: 'rap',
                    value: c => c.production.getForProcess(process, "laborProductivityFactor") ?? 0,
                    format: spct,
                    tooltipSnippet: processProductivityTooltip,
                    context: process,
                    deltaValue: c => c.production.getForProcess(process, "laborProductivityFactor") ?? 0,
                    deltaFormat: v => v.toFixed(2),
                },
                {
                    label: '&nbsp;Net Labor Prod',
                    class: 'actual',
                    cellClass: 'rap',
                    useTooltip: true,
                    value: c => netLaborProductivity(c, process),
                    format: spct,
                    deltaValue: c => netLaborProductivity(c, process),
                    deltaFormat: v => v.toFixed(2),
                }
            ]);
        }

        // Group 6: Skills (dynamic)
        if (csnaps.length > 0) {
            const skillGroup: RowDef[] = [];
            for (const skill of csnaps[0].e.skills.keys()) {
                skillGroup.push({
                    label: skill.name,
                    class: 'actual',
                    cellClass: 'rap',
                    useTooltip: true,
                    value: c => c.skills.v(skill),
                    format: unsigned,
                    customDeltaSnippet: skillDeltaCell,
                    customDeltaContext: skill,
                });
            }
            if (skillGroup.length > 0) {
                groups.push(skillGroup);
            }
        }

        return groups;
    });

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

    function clanHappinessTooltipTable(clan: ClanDTO) {
        return new FilteredIterableTable(
            clan.happiness.items.values(),
             item => item.label,
             _ => true,
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

{#snippet deltaCell(cs: ClanLastTurnSnapshots, valueFunc: (c: ClanDTO) => number, fmt: (v: number) => string = v => v.toString())}
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

{#snippet happinessTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanHappinessTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet peopleTooltip(cs: ClanLastTurnSnapshots)}
    <PopulationPyramid clan={cs.e} />
    <hr>
    <div>Workers: {unsigned(cs.e.workers)}</div>
    <div>Population Per Worker: {safeDiv(cs.e.population, cs.e.workers).toFixed(1)}</div>
{/snippet}

{#snippet peopleDeltaTooltip(cs: ClanLastTurnSnapshots)}
    <PopulationChange clan={cs.e} />
{/snippet}

{#snippet peopleDeltaCell(cs: ClanLastTurnSnapshots)}
    <td class="delta">
        <Tooltip>
            {cs.e.lastPopulationChange ? tsigned(cs.e.lastPopulationChange.change) : ''}
            <div slot="tooltip" style="text-align: left; color: initial;">
                {@render peopleDeltaTooltip(cs)}
            </div>
        </Tooltip>
    </td>
{/snippet}

{#snippet nextSupportRatioTooltip(cs: ClanLastTurnSnapshots)}
    <div>Workers: {cs.e.workers}</div>
    <div>Carers and Dependents: {cs.e.population - cs.e.workers}</div>
    <div>Population Per Worker: {safeDiv(cs.e.population, cs.e.workers).toFixed(1)}</div>
{/snippet}

{#snippet brModifierTooltip(cs: ClanLastTurnSnapshots)}
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
{/snippet}

{#snippet drModifierTooltip(cs: ClanLastTurnSnapshots)}
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
{/snippet}

{#snippet stressValueRender(cs: ClanLastTurnSnapshots)}
    <span style="color: {stressColor(cs.e.stress.value)}">{signed(cs.e.stress.value)}</span>
{/snippet}

{#snippet stressTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanStressTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet qolTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanQolTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet foodTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanSustenanceTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet targetFoodTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanSustenanceTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet foodStorageTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanFoodStockTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet foodSecurityTooltip(cs: ClanLastTurnSnapshots)}
    <h3>Production Risks</h3>
    <p>Base from production: {pct(cs.e.consumption.foodInsecurity.base)}</p>
    <p>Base buffering: {pct(cs.e.consumption.foodInsecurity.baseBuffering)}
        from {(cs.e.consumption.perCapitaFoodStock*365).toFixed()} days stored
    </p>
    <p>Storage failure risk: {pct(cs.e.consumption.foodInsecurity.storageRisk)}</p>
    <p>Risk-adjusted buffering: {pct(cs.e.consumption.foodInsecurity.buffering)}</p>
    <p>Total risk: {pct(cs.e.consumption.foodInsecurity.value)}</p>
{/snippet}

{#snippet materialWelfareTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanSustenanceHappinessTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet connectionsTooltip(cs: ClanLastTurnSnapshots)}
    <TableView2 table={clanConnectionsTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet socialWelfareTooltip(cs: ClanLastTurnSnapshots)}
    <h4>Sources</h4>
    <TableView2 table={clanSocialHappinessTooltipTable(cs.e)}></TableView2>
    <h4>Society Detail</h4>
    <TableView2 table={clanSocietyHappinessDetailTooltipTable(cs.e)}></TableView2>
{/snippet}

{#snippet activitiesRender(cs: ClanLastTurnSnapshots)}
    <ClanEffortMiniBar clan={cs.e} m={cs.e.effortAllocation.m} />
{/snippet}

{#snippet activitiesPrevRender(cs: ClanLastTurnSnapshots)}
    {#if cs.p}<ClanEffortMiniBar clan={cs.p} m={cs.p.effortAllocation.m} />{/if}
{/snippet}

{#snippet processesRender(cs: ClanLastTurnSnapshots)}
    <ClanEffortMiniBar clan={cs.e} m={cs.e.effortAllocation.pm} />
{/snippet}

{#snippet processesPrevRender(cs: ClanLastTurnSnapshots)}
    {#if cs.p}<ClanEffortMiniBar clan={cs.p} m={cs.p.effortAllocation.pm} />{/if}
{/snippet}

{#snippet residenceTooltip(cs: ClanLastTurnSnapshots)}
    <ClanResidenceTooltip clan={cs.e} />
{/snippet}

{#snippet supportRatioPrevTooltip(cs: ClanLastTurnSnapshots)}
    {#if cs.p}
        <div>Workers: {cs.p.workers}</div>
        <div>Carers and Dependents: {cs.p.population - cs.p.workers}</div>
        <div>Population Per Worker: {safeDiv(cs.p.population, cs.p.workers).toFixed(1)}</div>
    {/if}
{/snippet}

{#snippet supportRatioValueRender(cs: ClanLastTurnSnapshots)}
    {#if cs.p}
        <Tooltip>
            {safeDiv(cs.p.population, cs.p.workers).toFixed(1)}
            <div slot="tooltip" style="text-align: left; color: initial;">
                {@render supportRatioPrevTooltip(cs)}
            </div>
        </Tooltip>
    {:else}
        -
    {/if}
{/snippet}

{#snippet processProductivityTooltip(cs: ClanLastTurnSnapshots, process: Process)}
    <TableView2 table={productivityModifierTooltipTable(cs.e, process)} />
{/snippet}

{#snippet skillDeltaCell(cs: ClanLastTurnSnapshots, skill: any)}
    <td><SkillDelta {skill} clan={cs.e}></SkillDelta></td>
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
            {#each rowGroups as group, groupIdx}
                {#if groupIdx > 0}
                    <tr><td style="height: 0.5em"></td></tr>
                {/if}
                {#each group as row}
                    <tr class={row.class ?? ''}>
                        {#if row.isHeader}
                            <td colspan={1 + csnaps.length * 2}>{row.label}</td>
                        {:else}
                            <td>{@html row.label}</td>
                            {#each csnaps as cs}
                                {#if row.colspan === 2}
                                    <td colspan="2">
                                        {#if row.renderSnippet}
                                            {@render row.renderSnippet(cs)}
                                        {/if}
                                    </td>
                                {:else}
                                    <td class={row.cellClass}>
                                        {#if row.renderValueSnippet}
                                            {@render row.renderValueSnippet(cs)}
                                        {:else if row.value}
                                            {@const val = row.value(cs.e)}
                                            {#if row.tooltipSnippet || row.useTooltip}
                                                <Tooltip>
                                                    {row.format ? row.format(val) : val}
                                                    <div slot="tooltip" style="text-align: left; color: initial;">
                                                        {#if row.tooltipSnippet}
                                                            {@render row.tooltipSnippet(cs, row.context)}
                                                        {/if}
                                                    </div>
                                                </Tooltip>
                                            {:else}
                                                {row.format ? row.format(val) : val}
                                            {/if}
                                        {/if}
                                    </td>
                                    {#if row.customDeltaSnippet}
                                        {@render row.customDeltaSnippet(cs, row.customDeltaContext)}
                                    {:else if row.deltaValue}
                                        {@render deltaCell(cs, row.deltaValue, row.deltaFormat)}
                                    {:else}
                                        <td></td>
                                    {/if}
                                {/if}
                            {/each}
                        {/if}
                    </tr>
                {/each}
            {/each}
        </tbody>
    </table>
</div>