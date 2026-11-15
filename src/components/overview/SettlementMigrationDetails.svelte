<script lang="ts">
    // This year's question of whether some of the village's clans go off to
    // found a new one, round by round. See migration.ts.
    import {
        FOUNDING_BASE,
        FOUNDING_MAX_SHARE,
        FOUNDING_MIN_CLANS,
        FOUNDING_ROUNDS,
        foundingRoundBonus,
        type FoundingAppeal,
        type FoundingVote,
    } from "../../model/people/migration";
    import type { SettlementDTO } from "../../model/records/dtos";
    import { signed } from "../../model/lib/format";
    import { formatYear } from "../../model/records/year";
    import EntityLink from "../state/EntityLink.svelte";
    import Tooltip from "../Tooltip.svelte";
    import FoundingAppealCalc from "../founding/FoundingAppealCalc.svelte";
    import FoundingWeightsCalc from "../founding/FoundingWeightsCalc.svelte";
    import FoundingFactorCalc from "../founding/FoundingFactorCalc.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let decision = $derived(settlement.foundingDecision);
    let rounds = $derived(Array.from({ length: FOUNDING_ROUNDS }, (_, i) => i));
    let votes = $derived(
        decision ? [...decision.votes].sort((a, b) => (b.final?.value ?? 0) - (a.final?.value ?? 0)) : [],
    );

    let everInterested = $derived(
        decision ? decision.votes.filter((v) => v.everInterested).map((v) => ({ name: v.clanName })) : [],
    );

    // Which round's factors to break down: the last one held, unless one
    // has been picked.
    let pickedRound = $state<number | undefined>(undefined);
    let heldRounds = $derived(decision ? decision.interested.length : 0);
    let factorRound = $derived(
        pickedRound !== undefined && pickedRound < heldRounds ? pickedRound : heldRounds - 1,
    );
    const factors = [
        { key: "base", label: "Base", of: () => FOUNDING_BASE },
        { key: "people", label: "People", of: (a: FoundingAppeal) => a.populationTerm },
        { key: "favor", label: "Favor", of: (a: FoundingAppeal) => a.favorTerm },
        { key: "alignment", label: "Alignment", of: (a: FoundingAppeal) => a.alignmentTerm },
        { key: "random", label: "Random", of: (a: FoundingAppeal) => a.random },
        { key: "bonus", label: "Round bonus", of: (a: FoundingAppeal) => a.bonus },
    ] as const;

    const clanOf = (v: FoundingVote) => ({ uuid: v.clan.uuid, name: v.clanName });
    const names = (vs: { name: string }[]) => vs.map((c) => c.name).join(", ");
</script>

<div class="founding">
    {#if !decision}
        <p class="muted">No question of founding a new village this year.</p>
    {:else}
        <p class="current">
            In {formatYear(decision.year)},
            {#if decision.founders.length && decision.prevented}
                <strong>{names(decision.founders)}</strong> would have gone off to found a
                new village, but migration is turned off.
            {:else if decision.founders.length}
                <strong class="goes">{names(decision.founders)}</strong> went off to found a
                new village.
            {:else if decision.interested[decision.interested.length - 1].length}
                {names(decision.interested[decision.interested.length - 1])}
                {decision.interested[decision.interested.length - 1].length === 1 ? "was" : "were"}
                still interested at the end, but it takes at least {FOUNDING_MIN_CLANS} clans
                to found a village, so nobody went.
            {:else if decision.interested.length > 1}
                {names(everInterested)} showed an interest in founding a new village, but by
                round {decision.interested.length - 1} nobody was interested any more.
            {:else}
                nobody wanted to go off and found a new village.
            {/if}
        </p>
        <p class="muted">
            Appeal = base ({signed(FOUNDING_BASE, 0)}) + people + Favor + alignment + random + round
            bonus. A clan is interested when its appeal is above 0, but no more than
            {decision.maxInterested} of the {decision.votes.length} clans
            ({(100 * FOUNDING_MAX_SHARE).toFixed(0)}%), the keenest. Whoever is still interested in
            the last round goes. A round with nobody interested ends it there.
        </p>

        <table class="votes">
            <thead>
                <tr>
                    <th>Clan</th>
                    <th class="n">People</th>
                    <th class="n">Favor</th>
                    <th class="n">Random</th>
                    {#each rounds as r (r)}
                        <th class="n round" class:rule={r === 0}>
                            <Tooltip>
                                <span class="help">R{r}</span>
                                <div slot="tooltip" class="tip">
                                    {#if r === 0}
                                        Each clan supposes a third of the village would go, and goes by its
                                        alignment toward the whole village.
                                    {:else}
                                        Each clan supposes those interested in round {r - 1} would go, with itself,
                                        and goes by its alignment toward them.
                                    {/if}
                                    Round bonus {signed(foundingRoundBonus(r), 2)}.
                                </div>
                            </Tooltip>
                        </th>
                    {/each}
                    <th class="rule">Goes</th>
                </tr>
                <tr class="sub">
                    <th colspan="4"></th>
                    {#each rounds as r (r)}
                        <th class="n" class:rule={r === 0}>
                            {#if decision.interested[r]}
                                {decision.interested[r].length} in · {decision.interestedPeople[r]}
                            {:else}
                                not held
                            {/if}
                        </th>
                    {/each}
                    <th class="rule"></th>
                </tr>
            </thead>
            <tbody>
                {#each votes as v (v.clan.uuid)}
                    <tr class:going={v.goes || v.prevented}>
                        <td>
                            <Tooltip>
                                <EntityLink entity={clanOf(v)} />
                                <div slot="tooltip"><FoundingWeightsCalc vote={v} /></div>
                            </Tooltip>
                        </td>
                        <td class="n">{v.population}</td>
                        <td class="n">
                            <span class:good={v.favor > 0} class:bad={v.favor < 0}>{signed(v.favor, 1)}</span>
                        </td>
                        <td class="n">{signed(v.random, 1)}</td>
                        {#each rounds as r (r)}
                            {@const a = v.rounds[r]}
                            {#if !a}
                                <td class="n appeal" class:rule={r === 0}></td>
                            {:else}
                            <td
                                class="n appeal"
                                class:rule={a.round === 0}
                                class:interested={a.interested}
                                class:crowded={a.crowdedOut}
                            >
                                <Tooltip>
                                    {signed(a.value, 1)}
                                    <div slot="tooltip"><FoundingAppealCalc vote={v} appeal={a} /></div>
                                </Tooltip>
                            </td>
                            {/if}
                        {/each}
                        <td class="rule">
                            {#if v.goes}
                                <span class="goes">Goes</span>
                            {:else if v.prevented}
                                <span class="muted">Would go</span>
                            {:else}
                                <span class="muted">Stays</span>
                            {/if}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
        <p class="muted legend">
            <span class="swatch interested"></span> interested
            <span class="swatch crowded"></span> above 0 but crowded out by keener clans.
            Under each round: how many clans were interested, and how many people they came to.
        </p>

        <h3>
            What went into each clan's appeal in round {factorRound}
            {#if heldRounds > 1}
                <span class="picker">
                    {#each Array.from({ length: heldRounds }, (_, i) => i) as r (r)}
                        <button class:on={r === factorRound} onclick={() => (pickedRound = r)}>R{r}</button>
                    {/each}
                </span>
            {/if}
        </h3>
        <table class="factors">
            <thead>
                <tr>
                    <th>Clan</th>
                    {#each factors as fac (fac.key)}
                        <th class="n">{fac.label}</th>
                    {/each}
                    <th class="n rule">Appeal</th>
                </tr>
            </thead>
            <tbody>
                {#each votes as v (v.clan.uuid)}
                    {@const a = v.rounds[factorRound]}
                    {#if a}
                        <tr>
                            <td>
                                <Tooltip>
                                    <EntityLink entity={clanOf(v)} />
                                    <div slot="tooltip"><FoundingWeightsCalc vote={v} /></div>
                                </Tooltip>
                            </td>
                            {#each factors as fac (fac.key)}
                                {@const value = fac.of(a)}
                                <td class="n">
                                    <Tooltip>
                                        <span class:good={value > 0} class:bad={value < 0}>{signed(value, 1)}</span>
                                        <div slot="tooltip">
                                            <FoundingFactorCalc vote={v} appeal={a} factor={fac.key} />
                                        </div>
                                    </Tooltip>
                                </td>
                            {/each}
                            <td class="n rule appeal" class:interested={a.interested} class:crowded={a.crowdedOut}>
                                <Tooltip>
                                    <strong>{signed(a.value, 1)}</strong>
                                    <div slot="tooltip"><FoundingAppealCalc vote={v} appeal={a} /></div>
                                </Tooltip>
                            </td>
                        </tr>
                    {/if}
                {/each}
            </tbody>
        </table>
    {/if}
</div>

<style>
    .founding {
        max-width: 60rem;
    }

    .current {
        margin: 0 0 0.4rem;
        padding: 0.5rem 0.7rem;
        max-width: 44rem;
        border-left: 3px solid #4a5a2a;
        background-color: #f1f3e6;
    }

    .muted {
        color: #8a7f60;
    }

    .goes {
        font-weight: 600;
        color: #2f7d5b;
    }

    p.muted {
        max-width: 44rem;
        margin: 0 0 0.6rem;
        font-size: 0.85rem;
    }

    table {
        border-collapse: collapse;
        font-size: 0.85rem;
    }

    th {
        font-weight: 600;
        color: #6b5f3a;
        border-bottom: 1px solid #c4b98a;
        padding: 0.15rem 0.5rem;
        text-align: left;
        vertical-align: bottom;
    }

    tr.sub th {
        font-weight: normal;
        font-size: 0.75rem;
        color: #8a7f60;
    }

    td {
        padding: 0.15rem 0.5rem;
        border-bottom: 1px dotted #ded3ae;
    }

    .n {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    .rule {
        border-left: 1px solid #c4b98a;
    }

    td.appeal.interested {
        background-color: #e3f0df;
    }

    td.appeal.crowded {
        background-color: #f3ead0;
    }

    tr.going td:first-child {
        font-weight: 600;
    }

    .good {
        color: #2f7d5b;
    }

    .bad {
        color: #9b2c2c;
    }

    .help {
        cursor: help;
    }

    .tip {
        font-size: 0.8rem;
        font-weight: normal;
        max-width: 20rem;
        white-space: normal;
        color: #2c1e05;
    }

    h3 {
        margin: 1.2rem 0 0.4rem;
        font-size: 1rem;
        color: #62531d;
    }

    .picker {
        margin-left: 0.6rem;
        font-weight: normal;
    }

    .picker button {
        font-size: 0.75rem;
        padding: 0 0.35rem;
        margin-right: 0.15rem;
        border: 1px solid #c4b98a;
        background: #fbf8ec;
        color: #6b5f3a;
        cursor: pointer;
    }

    .picker button.on {
        background: #e3f0df;
        color: #2c1e05;
        font-weight: 600;
    }

    .legend {
        margin-top: 0.4rem;
    }

    .swatch {
        display: inline-block;
        width: 0.8em;
        height: 0.8em;
        margin: 0 0.2em 0 0.6em;
        vertical-align: middle;
        border: 1px solid #c4b98a;
    }

    .swatch.interested {
        background-color: #e3f0df;
        margin-left: 0;
    }

    .swatch.crowded {
        background-color: #f3ead0;
    }
</style>
