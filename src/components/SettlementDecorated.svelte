<script lang="ts">
    import {
        formatTellHeight,
        signed,
        signedFormat,
        stressColor,
    } from "../model/lib/format";
    import { pct } from "../model/lib/format";
    import { SettlementDTO, type ClanDTO } from "../model/records/dtos";
    import {
        groupSedentismDescription,
        groupSedentismImage,
    } from "../model/people/residence";
    import { populationAverage } from "../model/lib/modelbasics";
    import { IterableTable, TwoDArrayTable } from "./tables/tables2";
    import TableView2 from "./tables/TableView2.svelte";
    import ButtonPanel from "./ButtonPanel.svelte";
    import Settlement from "./Settlement.svelte";
    import Tooltip from "./Tooltip.svelte";
    import EntityLink from "./state/EntityLink.svelte";

    let {
        settlement,
        onSelect,
    }: { settlement: SettlementDTO; onSelect: (uuid: string) => void } =
        $props();

    interface StressItem {
        label: string;
        value: number;
    }

    function getStressTooltipTable(
        clans: ClanDTO[],
    ): IterableTable<StressItem, [number]> {
        const labelsSet = new Set<string>();
        for (const clan of clans) {
            for (const item of clan.stress.items) {
                labelsSet.add(item.label);
            }
        }
        const labels = Array.from(labelsSet);

        const items: StressItem[] = [];
        for (const label of labels) {
            const relevantClans = clans.filter((c) =>
                c.stress.items.some((item) => item.label === label),
            );
            const avgVal = populationAverage(
                relevantClans,
                (c) =>
                    c.stress.items.find((item) => item.label === label)
                        ?.value ?? 0,
            );
            items.push({ label, value: avgVal });
        }

        return new IterableTable(items, (item) => item.label, [
            {
                data: "Value",
                label: "Value",
                valueFn: (item) => item.value,
                formatFn: signedFormat(1),
            },
        ]);
    }

    let settlementStress = $derived(
        populationAverage<ClanDTO>(
            settlement.clans,
            (clan) => clan.stress.value,
        ),
    );
    let clusterStress = $derived(
        populationAverage<ClanDTO>(
            settlement.cluster.clans,
            (clan) => clan.stress.value,
        ),
    );

    let settlementStressTooltipTable = $derived(
        getStressTooltipTable(settlement.clans),
    );
    let clusterStressTooltipTable = $derived(
        getStressTooltipTable(settlement.cluster.clans),
    );
    let ditchTooltipTable = $derived(
        new TwoDArrayTable(settlement.ditchTooltip),
    );
</script>

<div id="top">
    <div style="display: flex; gap: 1rem; margin-top: 0.25rem">
        <div>
            <img
                style="display: block"
                src={groupSedentismImage(settlement.residenceFraction)}
                alt="Residents"
                width="150"
                height="100"
            />
            <div class="sm">
                Last flood level:
                <Tooltip>
                    {settlement.floodLevel.name}
                    <div slot="tooltip">
                        River shift probability: {pct(
                            settlement.floodLevel.riverShiftProbability(),
                        )}
                    </div>
                </Tooltip>
            </div>
            <div class="sm">
                <Tooltip>
                    {#if settlement.ditchingLevel}
                        Ditch: {pct(settlement.ditchQuality)}
                    {:else}
                        No ditch
                    {/if}
                    <div slot="tooltip">
                        <TableView2 table={ditchTooltipTable} />
                    </div>
                </Tooltip>
            </div>
        </div>
        <div>
            <h4>
                <EntityLink entity={settlement.cluster} /> |
                <img
                    src="stat-population-256.png"
                    alt="Population"
                    width="20"
                    height="20"
                    style="padding-bottom: 2px;"
                />{settlement.cluster.population}&nbsp;
                <Tooltip>
                    <img
                        src="stat-welfare-256.png"
                        alt="Stress"
                        width="20"
                        height="20"
                        style="padding-bottom: 4px;"
                    />
                    <div slot="tooltip">Stress</div>
                </Tooltip>
                <Tooltip>
                    <span style="color: {stressColor(clusterStress)}"
                        >{signed(clusterStress, 0)}</span
                    >
                    <div
                        slot="tooltip"
                        style="text-align: left; color: initial;"
                    >
                        <TableView2 table={clusterStressTooltipTable} />
                    </div>
                </Tooltip>&nbsp;
                <img
                    src="stat-happiness-256.png"
                    alt="Happiness"
                    width="20"
                    height="20"
                    style="padding-bottom: 4px;"
                />{signed(settlement.cluster.averageHappiness, 0)}
            </h4>
            <h1 style="white-space: nowrap;">
                {settlement.name} |
                <img
                    src="stat-population-256.png"
                    alt="Population"
                    width="40"
                    height="40"
                    style="padding-bottom: 4px;"
                />{settlement.population}&nbsp;
                <Tooltip>
                    <img
                        src="stat-welfare-256.png"
                        alt="Stress"
                        width="40"
                        height="40"
                        style="padding-bottom: 8px;"
                    />
                    <div slot="tooltip">Stress</div>
                </Tooltip>
                <Tooltip>
                    <span style="color: {stressColor(settlementStress)}"
                        >{signed(settlementStress, 0)}</span
                    >
                    <div
                        slot="tooltip"
                        style="text-align: left; color: initial;"
                    >
                        <TableView2 table={settlementStressTooltipTable} />
                    </div>
                </Tooltip>&nbsp;
                <img
                    src="stat-happiness-256.png"
                    alt="Happiness"
                    width="40"
                    height="40"
                    style="padding-bottom: 8px;"
                />{signed(settlement.averageHappiness, 0)}
            </h1>
            <div>
                {groupSedentismDescription(settlement.residenceFraction)}
                ({pct(settlement.residenceFraction)} resident) &centerdot;
                {#if settlement.refoundedAfterRiverShift}
                    <b>Refounded after river shift!</b>
                {:else if settlement.residenceFraction > 0.5}
                    {#if settlement.yearsInPlace >= 100}
                        Settled &ndash; {formatTellHeight(
                            settlement.tellHeightInMeters,
                        )}
                        <span style="color:grey"
                            >(founded {settlement.yearsInPlace} years ago)</span
                        >
                    {:else if settlement.yearsInPlace >= 20}
                        {settlement.yearsInPlace} years in place
                    {:else}
                        New settlement
                    {/if}
                {:else}
                    Mobile communities
                {/if}
            </div>
            <div>
                {pct(settlement.farmingRatio)} farming
            </div>

            <ButtonPanel
                config={{
                    buttons: settlement.cluster.settlements.map(
                        (s: SettlementDTO) => ({
                            label: `${s.name}<br>${s.population}`,
                            data: s,
                        }),
                    ),
                }}
                onSelected={(_, data) => {
                    onSelect(data.uuid);
                }}
            />
        </div>
    </div>

    <Settlement {settlement} />
</div>

<style>
    #top {
        margin-left: 1rem;
    }

    h1 {
        margin: 0;
    }

    h4 {
        margin: 0;
    }

    img {
        vertical-align: middle;
    }

    .sm {
        font-size: smaller;
    }
</style>
