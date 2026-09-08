<script lang="ts">
    import type { SettlementDTO, ClanDTO } from "../model/records/dtos";
    import {
        LandQualities,
        QUALITY_INDEXES_BEST_FIRST,
    } from "../model/econ/landquality";
    import { plotsPerRound } from "../model/econ/land";
    import { pct, xm } from "../model/lib/format";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let land = $derived(settlement.land);
    let allocation = $derived(settlement.landAllocation);

    // In the order the clans first got out to the fields, which is the order
    // the allocation keeps them in. Matched back to the view's clans so we
    // can show colors.
    let rows = $derived.by(() => {
        if (!allocation) return [];
        return allocation.holdings.map((holding) => ({
            holding,
            clan: settlement.clans.find(
                (c: ClanDTO) => c.ref === holding.clan,
            ),
        }));
    });

    function plots(n: number): string {
        return n >= 0.05 ? n.toFixed(1) : "-";
    }
</script>

<div class="land">
    <p class="note">
        Nobody owns the alluvium. Every spring it is open again, and the
        families go out to it <strong>first come, first served</strong>: the
        draw for who is next is weighted by how many people a clan still has
        to send and by how ready it is to be out early — piety, wits, farming,
        and knowing the ground. Whoever is drawn works {plotsPerRound(
            land.totalPlots,
        )} plots' worth down from the best land still unclaimed, and then the
        draw is made again. A clan stops being drawn once it has taken up a
        plot for every worker it means to put to farming, so ground nobody has
        hands for stays open.
    </p>

    <h3>The fields at {settlement.name}</h3>
    <p class="subnote">
        {land.totalPlots.toFixed(0)} plots of alluvium, worth {xm(
            land.qualityFactor,
        )} an ordinary plot on average. The farming base is the yield on
        ordinary land, so this is what the ground multiplies it by.
        {#if allocation}
            {allocation.plotsTaken.toFixed(1)} taken up of {allocation.plotsWanted.toFixed(
                1,
            )} wanted; {allocation.plotsLeft.toFixed(1)} left open.
        {/if}
    </p>

    <table>
        <thead>
            <tr>
                <th>Quality</th>
                <th>Yield</th>
                <th>Plots</th>
                <th>Share</th>
                <th>Taken</th>
                <th>Left</th>
            </tr>
        </thead>
        <tbody>
            {#each QUALITY_INDEXES_BEST_FIRST as i}
                {@const quality = LandQualities[i]}
                {@const taken = allocation?.takenAt(i) ?? 0}
                <tr class:empty={land.at(i) === 0}>
                    <td class="quality">
                        <span
                            class="swatch"
                            style="background-color: {quality.color}"
                        ></span>
                        {quality.level}. {quality.name}
                    </td>
                    <td>{pct(quality.productivity)}</td>
                    <td>{land.at(i).toFixed(0)}</td>
                    <td>{pct(land.shareAt(i))}</td>
                    <td>{plots(taken)}</td>
                    <td>{plots(land.at(i) - taken)}</td>
                </tr>
            {/each}
            <tr class="total">
                <td class="quality">Total</td>
                <td>{pct(land.qualityFactor)}</td>
                <td>{land.totalPlots.toFixed(0)}</td>
                <td>100%</td>
                <td>{plots(allocation?.plotsTaken ?? 0)}</td>
                <td>{plots(allocation?.plotsLeft ?? land.totalPlots)}</td>
            </tr>
        </tbody>
    </table>

    <h3>Who took up what</h3>
    {#if !allocation || rows.length === 0}
        <p class="subnote">The year's fields have not been taken up yet.</p>
    {:else}
        <table>
            <thead>
                <tr>
                    <th>Clan</th>
                    <th title="Readiness to be out early, against its size"
                        >Eager</th
                    >
                    <th title="Plots wanted: one to each farming worker"
                        >Wanted</th
                    >
                    <th title="Times this clan came up in the draw">Turns</th>
                    {#each QUALITY_INDEXES_BEST_FIRST as i}
                        <th>
                            <span
                                class="swatch"
                                style="background-color: {LandQualities[i]
                                    .color}"
                            ></span>
                            {LandQualities[i].name}
                        </th>
                    {/each}
                    <th>Plots</th>
                    <th>Land quality</th>
                </tr>
            </thead>
            <tbody>
                {#each rows as { holding, clan }, order}
                    <tr>
                        <td class="clan">
                            <span class="order">{order + 1}.</span>
                            <span style="color: {clan?.color ?? '#334155'}">
                                {clan?.name ?? holding.clan.name}
                            </span>
                        </td>
                        <td>{xm(holding.eagerness)}</td>
                        <td>
                            {holding.wanted.toFixed(1)}
                            {#if holding.fillRate < 0.995}
                                <span class="short"
                                    >{pct(holding.fillRate)}</span
                                >
                            {/if}
                        </td>
                        <td>{holding.rounds}</td>
                        {#each QUALITY_INDEXES_BEST_FIRST as i}
                            <td class:empty={holding.at(i) < 0.05}>
                                {plots(holding.at(i))}
                                <span class="share"
                                    >{holding.at(i) >= 0.05
                                        ? pct(holding.shareAt(i))
                                        : ""}</span
                                >
                            </td>
                        {/each}
                        <td>{holding.totalPlots.toFixed(1)}</td>
                        <td class="factor">{pct(holding.qualityFactor)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
        <p class="subnote">
            Each quality cell gives the plots a clan is farming at that quality
            and the share of its own farmland they come to. "Land quality" is
            what its fields are worth against an ordinary plot — the modifier
            its farm output carries from the land alone, before skill, help,
            the flood, or the year's luck, and the Land quality row in the
            Productivity panel. A clan that came back short of what it wanted
            has its share of it shown beside the figure.
        </p>
    {/if}
</div>

<style>
    .land {
        margin-top: 1rem;
        max-width: 1000px;
        overflow-x: auto;
    }

    .note {
        background-color: #f8fafc;
        border-left: 3px solid #84cc16;
        padding: 0.6rem 0.9rem;
        margin: 0 0 1.25rem 0;
        color: #334155;
        line-height: 1.5;
        max-width: 60em;
    }

    .subnote {
        color: #64748b;
        margin: 0.4rem 0 1rem 0;
        max-width: 60em;
        line-height: 1.4;
    }

    h3 {
        margin: 1.25rem 0 0.25rem 0;
        color: #1e293b;
        font-size: 1.05rem;
    }

    table {
        border-collapse: collapse;
        margin-bottom: 0.5rem;
    }

    th,
    td {
        padding: 0.3rem 0.7rem;
        text-align: right;
        border-bottom: 1px solid #e2e8f0;
        white-space: nowrap;
    }

    th {
        color: #475569;
        font-weight: 600;
        border-bottom: 2px solid #cbd5e0;
    }

    th:first-child,
    td:first-child {
        text-align: left;
    }

    .swatch {
        display: inline-block;
        width: 0.6rem;
        height: 0.6rem;
        border-radius: 2px;
        vertical-align: baseline;
    }

    .order {
        color: #94a3b8;
        margin-right: 0.25rem;
    }

    .clan {
        font-weight: 500;
    }

    .share {
        color: #94a3b8;
        font-size: 0.85em;
        margin-left: 0.35rem;
    }

    .short {
        color: #b45309;
        font-size: 0.85em;
        margin-left: 0.35rem;
    }

    .empty td,
    td.empty {
        color: #cbd5e0;
    }

    .factor {
        font-weight: 600;
        color: #1e293b;
    }

    .total td {
        border-top: 1px solid #cbd5e0;
        font-style: italic;
        color: #475569;
    }
</style>
