<script lang="ts">
    import type { ClanDTO } from "../../model/records/dtos";
    import {
        BRIDE_MIN_AGE,
        GROOM_MIN_AGE,
        MARRIAGE_MAX_AGE,
        OFFER_ACCEPTANCE_HALF_LIFE,
        RECENT_OFFER_YEARS,
        type MarriageOffer,
    } from "../../model/relations/marriage";
    import { FEMALE, MALE } from "../../model/people/demography";
    import { formatYear } from "../../model/records/year";
    import { pct, signed } from "../../model/lib/format";
    import { weightedAverage, zScore } from "../../model/lib/modelbasics";
    import EntityLink from "../state/EntityLink.svelte";

    let { clan }: { clan: ClanDTO } = $props();

    // --- Where the clan stands on the marriage market now ---

    // Ages as a short list, repeats folded: "20, 21 ×2, 25".
    function agesText(ages: readonly number[]): string {
        const parts: string[] = [];
        for (let i = 0; i < ages.length;) {
            let j = i;
            while (j < ages.length && ages[j] === ages[i]) ++j;
            parts.push(j - i > 1 ? `${ages[i]} ×${j - i}` : `${ages[i]}`);
            i = j;
        }
        return parts.join(", ");
    }

    function meanAge(ages: readonly number[]): string {
        if (ages.length === 0) return "-";
        return (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
    }

    let eligibleRows = $derived([
        { label: "Men", from: GROOM_MIN_AGE, ages: clan.eligibleAges[MALE] },
        { label: "Women", from: BRIDE_MIN_AGE, ages: clan.eligibleAges[FEMALE] },
    ]);

    // A clan's marriage appeal to the other clans of its settlement: how
    // they rate it, weighted by their populations, among those that know it
    // well enough to have a view. Undefined if none do.
    function localAppeal(target: ClanDTO): number | undefined {
        const world = clan.world;
        const observers = (target.settlement?.clans ?? []).filter((c) =>
            c.uuid !== target.uuid && world.respectToward(c, target) !== undefined);
        if (observers.length === 0) return undefined;
        return weightedAverage(
            observers, (c) => world.prestigeToward(c, target), (c) => c.population);
    }

    // Every clan of the settlement by local appeal, best first, with its rank
    // and z-score among them. Clans no one has a view of come last, unranked.
    let localStanding = $derived.by(() => {
        const clans = clan.settlement?.clans ?? [clan];
        const rows = clans.map((c) => ({ clan: c, appeal: localAppeal(c) }));
        const values = rows.flatMap((r) => r.appeal === undefined ? [] : [r.appeal]);
        const ranked = rows
            .filter((r) => r.appeal !== undefined)
            .sort((a, b) => b.appeal! - a.appeal!);
        return [
            ...ranked.map((r, i) => ({
                ...r,
                rank: i + 1 as number | undefined,
                z: values.length > 1 ? zScore(r.appeal!, values) : undefined,
            })),
            ...rows.filter((r) => r.appeal === undefined)
                .map((r) => ({ ...r, rank: undefined, z: undefined })),
        ];
    });

    let ownStanding = $derived(localStanding.find((r) => r.clan.uuid === clan.uuid));
    let rankedCount = $derived(localStanding.filter((r) => r.rank !== undefined).length);

    // Offers in a year's matching, from the point of view of this clan:
    // those its men made, and those made for its women.
    type YearOffers = {
        year: number;
        made: MarriageOffer[];
        received: MarriageOffer[];
    };

    let offers = $derived(clan.world.recentMarriageOffers);

    let years = $derived.by(() => {
        const byYear = new Map<number, YearOffers>();
        const of = (year: number) => {
            let y = byYear.get(year);
            if (!y) byYear.set(year, y = { year, made: [], received: [] });
            return y;
        };
        for (const o of offers) {
            if (o.husbandClan.uuid === clan.uuid) of(o.year).made.push(o);
            else if (o.wifeClan.uuid === clan.uuid) of(o.year).received.push(o);
        }
        // Newest first; within a year, by round, then best-ranked suitor first.
        const byRound = (a: MarriageOffer, b: MarriageOffer) =>
            a.round - b.round || a.suitorRank - b.suitorRank;
        const list = [...byYear.values()].sort((a, b) => b.year - a.year);
        for (const y of list) {
            y.made.sort(byRound);
            y.received.sort(byRound);
        }
        return list;
    });

    // Who the wife's clan did take in the round an offer was made in.
    function chosenWith(o: MarriageOffer): MarriageOffer[] {
        return offers.filter((p) =>
            p.year === o.year && p.round === o.round
            && p.wifeClan.uuid === o.wifeClan.uuid
            && p.outcome === "accepted");
    }

    // Offers that count toward the share accepted: all but those withdrawn.
    function counted(list: MarriageOffer[]): MarriageOffer[] {
        return list.filter((o) => o.outcome !== "withdrawn");
    }

    function acceptedCount(list: MarriageOffer[]): number {
        return list.filter((o) => o.outcome === "accepted").length;
    }

    let totals = $derived.by(() => {
        const made = years.flatMap((y) => y.made);
        const received = years.flatMap((y) => y.received);
        return {
            made: counted(made).length,
            madeAccepted: acceptedCount(made),
            received: counted(received).length,
            receivedAccepted: acceptedCount(received),
        };
    });

    function appeal(v: number): string {
        return signed(100 * v, 0);
    }

    function rowClass(o: MarriageOffer): string {
        if (o.outcome === "accepted") return "chosen";
        if (o.outcome === "withdrawn") return "withdrawn";
        return "passed-over";
    }

    // Why an offer didn't come to anything, in a few words.
    function declinedReason(o: MarriageOffer): string {
        switch (o.outcome) {
            case "full": return "no women left";
            case "ages": return "no women of a fitting age left";
            case "withdrawn": return "withdrawn: matched elsewhere first";
            default: return "";
        }
    }

    function matches(n: number): string {
        return `${n} match${n === 1 ? "" : "es"}`;
    }

    // The newest year starts open, the rest closed.
    function isNewest(y: YearOffers): boolean {
        return y === years[0];
    }
</script>

<div class="offers-container">
    <h3>Marriage Offers</h3>
    <h4>Free to marry now</h4>
    <table class="offers-table market-table">
        <thead>
            <tr>
                <th class="la"></th>
                <th>Count</th>
                <th>Avg age</th>
                <th class="la">Ages</th>
            </tr>
        </thead>
        <tbody>
            {#each eligibleRows as r}
                <tr>
                    <td class="la">
                        {r.label}
                        <span class="note">({r.from}&ndash;{MARRIAGE_MAX_AGE - 1})</span>
                    </td>
                    <td>{r.ages.length}</td>
                    <td>{meanAge(r.ages)}</td>
                    <td class="la ages">{r.ages.length > 0 ? agesText(r.ages) : "none"}</td>
                </tr>
            {/each}
        </tbody>
    </table>
    <p class="note">
        Unmarried or widowed, and not promised. Wives may be at most two years
        older than their husbands.
    </p>

    <h4>Local marriage appeal</h4>
    {#if ownStanding?.appeal === undefined}
        <p class="no-data">
            No other clan in {clan.settlement?.name ?? "its settlement"} has a view
            of {clan.name} yet.
        </p>
    {:else}
        <p class="standing">
            <strong>{signed(ownStanding.appeal, 0)}</strong>,
            rank <strong>{ownStanding.rank}</strong> of {rankedCount}
            in {clan.settlement?.name}{#if ownStanding.z !== undefined},
                z-score <strong>{signed(ownStanding.z, 2)}</strong>{/if}
        </p>
    {/if}
    <table class="offers-table market-table">
        <thead>
            <tr>
                <th title="Rank by local marriage appeal, highest first.">Rank</th>
                <th class="la">Clan</th>
                <th title="How the other clans of the settlement rate this one as a marriage partner, weighted by their populations. Same scale as Prestige.">Local appeal</th>
                <th title="Standard deviations above or below the settlement's clans' average local appeal.">Z-score</th>
                <th>Men free</th>
                <th>Women free</th>
            </tr>
        </thead>
        <tbody>
            {#each localStanding as r (r.clan.uuid)}
                <tr class={r.clan.uuid === clan.uuid ? "this-clan" : ""}>
                    <td>{r.rank ?? "-"}</td>
                    <td class="la"><EntityLink entity={r.clan} /></td>
                    <td>{r.appeal === undefined ? "-" : signed(r.appeal, 0)}</td>
                    <td>{r.z === undefined ? "-" : signed(r.z, 2)}</td>
                    <td>{r.clan.eligibleAges[MALE].length}</td>
                    <td>{r.clan.eligibleAges[FEMALE].length}</td>
                </tr>
            {/each}
        </tbody>
    </table>
    <p class="note">
        Z-scores are among the settlement's clans, each counting once{#if rankedCount < 4};
            with so few clans they say little{/if}.
    </p>

    <h4>Offers</h4>
    <p class="intro">
        Each year clans with men to marry offer for other clans' women, best-liked
        first, a few clans a round, round after round until their men are
        matched or there is no one left to ask. A clan with several
        offers in a round takes the ones from the clans it rates highest, as long
        as it has women of a fitting age left. Ratings are marriage appeal at the
        time of the offer, on the same scale as Prestige.
    </p>

    <table class="summary-table">
        <tbody>
            <tr>
                <th>Offers accepted</th>
                <td>
                    {clan.offerAcceptance === undefined ? "-" : pct(clan.offerAcceptance)}
                </td>
                <td class="note">
                    of {clan.name}'s offers, recent ones counting most
                    (half as much after {OFFER_ACCEPTANCE_HALF_LIFE} years)
                </td>
            </tr>
            <tr>
                <th>Made, last {RECENT_OFFER_YEARS} years</th>
                <td>
                    {totals.madeAccepted} / {totals.made}
                    {#if totals.made > 0}({pct(totals.madeAccepted / totals.made)}){/if}
                </td>
                <td class="note">offers by {clan.name}'s men accepted</td>
            </tr>
            <tr>
                <th>Received, last {RECENT_OFFER_YEARS} years</th>
                <td>
                    {totals.receivedAccepted} / {totals.received}
                    {#if totals.received > 0}({pct(totals.receivedAccepted / totals.received)}){/if}
                </td>
                <td class="note">offers for {clan.name}'s women it accepted</td>
            </tr>
        </tbody>
    </table>

    {#if years.length === 0}
        <p class="no-data">
            {clan.name} has made and received no offers of marriage in the last
            {RECENT_OFFER_YEARS} years.
        </p>
    {/if}

    {#each years as y (y.year)}
        <details open={isNewest(y)}>
            <summary>
                <strong>{formatYear(y.year)}</strong>
                <span class="year-summary">
                    made {counted(y.made).length}, {acceptedCount(y.made)} accepted;
                    received {counted(y.received).length}, {acceptedCount(y.received)} accepted
                </span>
            </summary>

            <h4>Offers made by {clan.name}</h4>
            {#if y.made.length === 0}
                <p class="no-data">None.</p>
            {:else}
                <table class="offers-table">
                    <thead>
                        <tr>
                            <th>Round</th>
                            <th class="la">To</th>
                            <th title="This clan's rating of the other clan as a marriage partner (its prestige in this clan's eyes), at the time of the offer. Same scale as Prestige.">How we rate them</th>
                            <th title="The other clan's rating of this clan as a marriage partner (this clan's prestige in its eyes), at the time of the offer. Same scale as Prestige.">How they rate us</th>
                            <th title="Where this clan's offer ranked among all the offers the other clan had that round, by how the other clan rated each suitor.">Our place</th>
                            <th class="la">Outcome</th>
                            <th class="la" title="The grooms' clans the other clan accepted that round, best-rated first: how it rated each (same scale as How they rate us), and the matches each got.">They took<br /><span class="note">rating, matches</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each y.made as o, i}
                            {@const newRound = i > 0 && y.made[i - 1].round !== o.round}
                            {@const chosen = chosenWith(o)}
                            <tr class="{rowClass(o)} {newRound ? 'round-start' : ''}">
                                <td>{o.round}</td>
                                <td class="la"><EntityLink entity={o.wifeClan} /></td>
                                <td>{appeal(o.appealOfWifeClan)}</td>
                                <td>{appeal(o.appealOfHusbandClan)}</td>
                                <td>{o.suitorRank} of {o.suitors}</td>
                                <td class="la wrap">
                                    {#if o.outcome === "accepted"}
                                        <strong>Chosen</strong>: {matches(o.matches)}
                                    {:else if o.outcome === "withdrawn"}
                                        {declinedReason(o)}
                                    {:else}
                                        <strong>Not chosen</strong> ({declinedReason(o)})
                                    {/if}
                                </td>
                                <td class="la took">
                                    {#each chosen as c}
                                        {@const us = c.husbandClan.uuid === clan.uuid}
                                        <div class:us>
                                            <EntityLink entity={c.husbandClan} />
                                            {appeal(c.appealOfHusbandClan)}, {c.matches}
                                        </div>
                                    {:else}
                                        <span class="note">nobody</span>
                                    {/each}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}

            <h4>Offers received for {clan.name}'s women</h4>
            {#if y.received.length === 0}
                <p class="no-data">None.</p>
            {:else}
                <table class="offers-table">
                    <thead>
                        <tr>
                            <th>Round</th>
                            <th class="la">From</th>
                            <th title="This clan's rating of the other clan as a marriage partner (its prestige in this clan's eyes), at the time of the offer. Same scale as Prestige.">How we rate them</th>
                            <th title="The other clan's rating of this clan as a marriage partner (this clan's prestige in its eyes), at the time of the offer. Same scale as Prestige.">How they rate us</th>
                            <th title="Where this offer ranked among all the offers this clan had that round, by how this clan rated each suitor.">Their place</th>
                            <th class="la">Outcome</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each y.received as o, i}
                            {@const newRound = i > 0 && y.received[i - 1].round !== o.round}
                            <tr class="{rowClass(o)} {newRound ? 'round-start' : ''}">
                                <td>{o.round}</td>
                                <td class="la"><EntityLink entity={o.husbandClan} /></td>
                                <td>{appeal(o.appealOfHusbandClan)}</td>
                                <td>{appeal(o.appealOfWifeClan)}</td>
                                <td>{o.suitorRank} of {o.suitors}</td>
                                <td class="la">
                                    {#if o.outcome === "accepted"}
                                        <strong>Chosen</strong>: {matches(o.matches)}
                                    {:else if o.outcome === "withdrawn"}
                                        {declinedReason(o)}
                                    {:else}
                                        <strong>Not chosen</strong> ({declinedReason(o)})
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}
        </details>
    {/each}
</div>

<style>
    .offers-container {
        padding: 1rem;
    }

    h3 {
        margin-top: 0;
        margin-bottom: 0.5rem;
        font-size: 1.1rem;
        color: #2d3748;
    }

    h4 {
        margin: 0.75rem 0 0.4rem;
        font-size: 0.95rem;
        color: #2d3748;
    }

    .intro {
        max-width: 900px;
        font-size: 0.85rem;
        color: #4a5568;
        margin: 0 0 1rem;
    }

    .no-data {
        color: #718096;
        font-style: italic;
        margin: 0.25rem 0;
    }

    .note {
        color: #718096;
        font-size: 0.85rem;
    }

    p.note {
        margin: 0.25rem 0 1rem;
        max-width: 900px;
    }

    .standing {
        margin: 0 0 0.5rem;
        font-size: 0.95rem;
    }

    .market-table {
        width: auto;
        min-width: 24rem;
        max-width: 900px;
        background: #fff;
    }

    .offers-table td.ages {
        white-space: normal;
    }

    .offers-table tr.this-clan td {
        background-color: #fdf6e3;
        font-weight: 600;
    }

    .summary-table {
        border-collapse: collapse;
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }

    .summary-table th {
        text-align: left;
        padding: 0.2rem 1rem 0.2rem 0;
        font-weight: 600;
        white-space: nowrap;
    }

    .summary-table td {
        text-align: right;
        padding: 0.2rem 0.75rem 0.2rem 0;
        white-space: nowrap;
    }

    .summary-table td.note {
        text-align: left;
        color: #718096;
        font-size: 0.85rem;
        white-space: normal;
    }

    details {
        margin-bottom: 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: #fff;
        padding: 0.4rem 0.75rem 0.6rem;
        max-width: 900px;
        /* Narrow panes scroll the tables rather than spill out of the box. */
        overflow-x: auto;
    }

    summary {
        cursor: pointer;
    }

    .year-summary {
        margin-left: 0.75rem;
        color: #718096;
        font-size: 0.85rem;
    }

    .offers-table {
        border-collapse: collapse;
        width: 100%;
        font-size: 0.85rem;
    }

    .offers-table th,
    .offers-table td {
        padding: 0.3rem 0.6rem;
        text-align: right;
        border-bottom: 1px solid #edf2f7;
    }

    .offers-table th {
        background-color: #f7fafc;
        font-weight: 600;
        color: #4a5568;
        vertical-align: bottom;
    }

    .offers-table td {
        white-space: nowrap;
    }

    .offers-table .la {
        text-align: left;
    }

    .offers-table td.wrap {
        white-space: normal;
        min-width: 9rem;
    }

    .offers-table td.la.took {
        min-width: 10rem;
        white-space: nowrap;
    }

    .offers-table td.took div.us {
        font-weight: 700;
    }

    /* The outcome says the most, so it gets the room. */
    .offers-table td.la:last-child {
        white-space: normal;
        min-width: 16rem;
    }

    .offers-table tr.chosen td {
        background-color: #ecfdf3;
    }

    .offers-table tr.passed-over td {
        background-color: #fdf2f2;
    }

    .offers-table tr.withdrawn td {
        color: #a0aec0;
    }

    .offers-table tr.round-start td {
        border-top: 2px solid #e2e8f0;
    }
</style>
