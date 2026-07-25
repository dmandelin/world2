<script lang="ts">
    import type { ClanDTO, WorldDTO } from "../../model/records/dtos";
    import { getMarriageDecisions, type MarriageDecisions } from "../../model/relations/marriage";
    import { populationAverage, weightedAverage } from "../../model/lib/modelbasics";
    import { signed } from "../../model/lib/format";
    import EntityLink from "../state/EntityLink.svelte";

    let { clan }: { clan: ClanDTO } = $props();

    function getPairingCount(decisions: MarriageDecisions, c1: ClanDTO, c2: ClanDTO): number {
        for (const [hClan, map] of decisions.pairingCounts.counts.entries()) {
            if (hClan.uuid === c1.uuid) {
                for (const [wClan, count] of map.entries()) {
                    if (wClan.uuid === c2.uuid) {
                        return count;
                    }
                }
            }
        }
        return 0;
    }

    function getAvgAppealToOthers(partner: ClanDTO, world: WorldDTO): number {
        const others = Array.from(world.clanMap.values()).filter(c => c.uuid !== partner.uuid);
        if (others.length === 0) return 0;
        return populationAverage(
            others,
            c => world.marriageInterestToward(partner, c)?.value ?? 0
        );
    }

    let partnerData = $derived.by(() => {
        const world = clan.world;
        const decisions = world.lastMarriageDecisions ?? getMarriageDecisions(world as any);
        const allClans = Array.from(world.clanMap.values());
        
        const partnerList: {
            clan: ClanDTO;
            marriages: number;
            theirAppealToUs: number | null;
            theirAppealToOthers: number;
            ourAppealToThem: number | null;
        }[] = [];

        for (const other of allClans) {
            if (other.uuid === clan.uuid) continue;
            const marriages = getPairingCount(decisions, clan, other) + getPairingCount(decisions, other, clan);
            if (marriages > 0) {
                const map1 = world.marriageInterestToward(other, clan);
                const map2 = world.marriageInterestToward(clan, other);
                partnerList.push({
                    clan: other,
                    marriages,
                    theirAppealToUs: map1 ? map1.value : null,
                    theirAppealToOthers: getAvgAppealToOthers(other, world),
                    ourAppealToThem: map2 ? map2.value : null,
                });
            }
        }

        return partnerList;
    });

    let summaryData = $derived.by(() => {
        if (partnerData.length === 0) return null;
        const validTheirAppealToUs = partnerData.filter(p => p.theirAppealToUs !== null);
        const validOurAppealToThem = partnerData.filter(p => p.ourAppealToThem !== null);

        const avgTheirAppealToUs = validTheirAppealToUs.length > 0
            ? weightedAverage(validTheirAppealToUs, p => p.theirAppealToUs!, p => p.clan.population)
            : null;

        const avgTheirAppealToOthers = weightedAverage(partnerData, p => p.theirAppealToOthers, p => p.clan.population);

        const avgOurAppealToThem = validOurAppealToThem.length > 0
            ? weightedAverage(validOurAppealToThem, p => p.ourAppealToThem!, p => p.clan.population)
            : null;

        return {
            theirAppealToUs: avgTheirAppealToUs,
            theirAppealToOthers: avgTheirAppealToOthers,
            ourAppealToThem: avgOurAppealToThem,
        };
    });
</script>

<div class="recent-marriages-container">
    <h3>Recent Marriages</h3>
    {#if partnerData.length === 0}
        <p class="no-data">No marriages were conducted by {clan.name} last turn.</p>
    {:else}
        <table class="marriage-details-table">
            <thead>
                <tr>
                    <th class="row-header-th">Metric</th>
                    {#each partnerData as p}
                        <th>
                            <EntityLink entity={p.clan} />
                            {#if p.clan.settlement?.uuid !== clan.settlement?.uuid}
                                <span class="out-of-settlement-star">*</span>
                            {/if}
                            <div class="marriage-count">({p.marriages} marriage{p.marriages > 1 ? 's' : ''})</div>
                        </th>
                    {/each}
                    <th class="summary-th">Pop-weighted Avg</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="row-label">Their appeal to us</td>
                    {#each partnerData as p}
                        <td class="value-td">
                            {p.theirAppealToUs !== null ? signed(p.theirAppealToUs, 1) : ""}
                        </td>
                    {/each}
                    <td class="value-td summary-td">
                        {summaryData?.theirAppealToUs !== null && summaryData?.theirAppealToUs !== undefined ? signed(summaryData.theirAppealToUs, 1) : ""}
                    </td>
                </tr>
                <tr>
                    <td class="row-label">Their appeal to others</td>
                    {#each partnerData as p}
                        <td class="value-td">
                            {signed(p.theirAppealToOthers, 1)}
                        </td>
                    {/each}
                    <td class="value-td summary-td">
                        {summaryData !== null && summaryData !== undefined ? signed(summaryData.theirAppealToOthers, 1) : ""}
                    </td>
                </tr>
                <tr>
                    <td class="row-label">Our appeal to them</td>
                    {#each partnerData as p}
                        <td class="value-td">
                            {p.ourAppealToThem !== null ? signed(p.ourAppealToThem, 1) : ""}
                        </td>
                    {/each}
                    <td class="value-td summary-td">
                        {summaryData?.ourAppealToThem !== null && summaryData?.ourAppealToThem !== undefined ? signed(summaryData.ourAppealToThem, 1) : ""}
                    </td>
                </tr>
            </tbody>
        </table>
    {/if}
</div>

<style>
    .recent-marriages-container {
        padding: 1rem;
    }

    h3 {
        margin-top: 0;
        margin-bottom: 1rem;
        font-size: 1.1rem;
        color: #2d3748;
    }

    .no-data {
        color: #718096;
        font-style: italic;
    }

    .marriage-details-table {
        border-collapse: collapse;
        width: 100%;
        max-width: 900px;
        font-size: 0.9rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
    }

    .marriage-details-table th,
    .marriage-details-table td {
        padding: 0.6rem 0.8rem;
        text-align: right;
        border-bottom: 1px solid #e2e8f0;
        border-right: 1px solid #edf2f7;
    }

    .marriage-details-table th:last-child,
    .marriage-details-table td:last-child {
        border-right: none;
    }

    .marriage-details-table th {
        background-color: #f7fafc;
        font-weight: 600;
        color: #4a5568;
    }

    .row-header-th,
    .row-label {
        text-align: left;
        font-weight: 600;
        color: #2d3748;
        background-color: #f8fafc;
        white-space: nowrap;
    }

    .summary-th,
    .summary-td {
        background-color: #f1f5f9;
        font-weight: 700;
    }

    .value-td {
        font-family: inherit;
    }

    .marriage-count {
        font-size: 0.75rem;
        font-weight: normal;
        color: #718096;
    }

    .out-of-settlement-star {
        color: #b7791f;
        font-weight: bold;
    }
</style>
