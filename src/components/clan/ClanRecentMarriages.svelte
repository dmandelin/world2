<script lang="ts">
    import type { ClanDTO, WorldDTO } from "../../model/records/dtos";
    import { BRIDE_SERVICE_YEARS, type MarriageDecisions } from "../../model/relations/marriage";
    import { formatYear } from "../../model/records/year";
    import { populationAverage, weightedAverage } from "../../model/lib/modelbasics";
    import { signed } from "../../model/lib/format";
    import EntityLink from "../state/EntityLink.svelte";

    let { clan }: { clan: ClanDTO } = $props();

    // Betrothals of husbands of c1 to wives of c2 in the last generation.
    function getPairingCount(decisions: MarriageDecisions | undefined, c1: ClanDTO, c2: ClanDTO): number {
        if (!decisions) return 0;
        for (const [hClan, map] of decisions.recentByHusband.counts.entries()) {
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
            c => world.prestigeToward(partner, c)
        );
    }

    let partnerData = $derived.by(() => {
        const world = clan.world;
        const decisions = world.lastMarriageDecisions;
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
                const hasTheirView = world.respectToward(other, clan) !== undefined;
                const hasOurView = world.respectToward(clan, other) !== undefined;
                partnerList.push({
                    clan: other,
                    marriages,
                    theirAppealToUs: hasTheirView ? world.prestigeToward(other, clan) : null,
                    theirAppealToOthers: getAvgAppealToOthers(other, world),
                    ourAppealToThem: hasOurView ? world.prestigeToward(clan, other) : null,
                });
            }
        }

        return partnerList;
    });

    // This clan's betrothals still in service, either side.
    let betrothals = $derived(clan.world.betrothals.filter(b =>
        b.husbandClan.uuid === clan.uuid || b.wifeClan.uuid === clan.uuid));

    // Marriages made this year, as service ended.
    let completedThisYear = $derived.by(() => {
        const decisions = clan.world.lastMarriageDecisions;
        const rows: { husbandClan: string, wifeClan: string, count: number }[] = [];
        if (!decisions) return rows;
        for (const [h, w, count] of decisions.completed.entries()) {
            if (h.uuid === clan.uuid || w.uuid === clan.uuid) {
                rows.push({ husbandClan: h.name, wifeClan: w.name, count });
            }
        }
        return rows;
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
    <h3>Betrothals in Service</h3>
    {#if betrothals.length === 0}
        <p class="no-data">{clan.name} has no betrothals in service.</p>
    {:else}
        <table class="marriage-details-table" style="margin-bottom: 1rem;">
            <thead>
                <tr>
                    <th class="row-header-th">Betrothal</th>
                    <th>Couples</th>
                    <th>Since</th>
                    <th>Years left</th>
                    <th>Labor</th>
                </tr>
            </thead>
            <tbody>
                {#each betrothals as b}
                    {@const ours = b.husbandClan.uuid === clan.uuid}
                    <tr>
                        <td class="row-label">
                            {#if ours}
                                Men of {clan.name} to women of {b.wifeClan.name}
                            {:else}
                                Women of {clan.name} to men of {b.husbandClan.name}
                            {/if}
                        </td>
                        <td class="value-td">{b.count}</td>
                        <td class="value-td">{formatYear(b.year)}</td>
                        <td class="value-td">{b.yearsLeft}</td>
                        <td class="value-td">
                            {ours ? `${b.count} away` : `${b.count} here`}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
        <p class="no-data" style="font-size: 0.85rem;">
            A betrothed man lives, eats and works {BRIDE_SERVICE_YEARS} years
            with his bride's clan; then they marry and she joins his.
        </p>
    {/if}

    {#if completedThisYear.length > 0}
        <h3>Married This Year</h3>
        <ul style="margin: 0 0 1rem; padding-left: 1.2rem;">
            {#each completedThisYear as c}
                <li>{c.count} of {c.wifeClan}'s daughters married into {c.husbandClan}</li>
            {/each}
        </ul>
    {/if}

    <h3>Recent Marriages</h3>
    {#if partnerData.length === 0}
        <p class="no-data">{clan.name} has made no betrothals in the last 20 years.</p>
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
                            <div class="marriage-count">({p.marriages} betrothal{p.marriages > 1 ? 's' : ''}, 20 yrs)</div>
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
