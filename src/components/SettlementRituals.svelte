<script lang="ts">
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import type { RitualEvent } from "../model/rituals";
    import { ALL_RITUAL_TYPES, officiantAppeal } from "../model/rituals";
    import { pct, signed, unsigned } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import { populationAverage } from "../model/lib/modelbasics";
    import { rankBadges } from "./rankbadge";
    import RankBadge from "./RankBadge.svelte";
    import Tooltip from "./Tooltip.svelte";
    import RitualDetails from "./RitualDetails.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let world = $derived(settlement.world);

    // Life first, then by officiant, so the year's serious business reads at
    // the top.
    let events = $derived(
        sortedByKey(
            settlement.world.ritualsIn(settlement),
            (e: RitualEvent) =>
                `${e.def.foodCostFraction > 0 ? 0 : 1}|${e.performer.name}`,
        ),
    );

    let clans = $derived(sortedByKey(settlement.clans, (c: ClanDTO) => c.name));

    // Everyone but the clan itself: holiness here means what the neighbors
    // make of it, so its own view is shown on its own row rather than folded
    // into the average.
    function raters(clan: ClanDTO): ClanDTO[] {
        return settlement.clans.filter((c) => c.uuid !== clan.uuid);
    }

    // Population-weighted average of one holiness component across raters.
    function itemAverage(clan: ClanDTO, label: string): number {
        return populationAverage(raters(clan), (rater) => {
            const h = world.holinessToward(rater, clan);
            return h?.items.find((i) => i.label === label)?.value ?? 0;
        });
    }

    function judgmentsAverage(clan: ClanDTO): number {
        return populationAverage(
            raters(clan),
            (rater) => world.holinessToward(rater, clan)?.currentItemsTotal ?? 0,
        );
    }

    // The component rows, taken from whatever holiness assessment the
    // settlement actually has, so new components show up without editing this.
    let itemLabels = $derived.by(() => {
        for (const clan of clans) {
            for (const rater of raters(clan)) {
                const h = world.holinessToward(rater, clan);
                if (h && h.items.length) return h.items.map((i) => i.label);
            }
        }
        return [];
    });

    let holinessRanks = $derived(
        rankBadges(
            clans,
            (c: ClanDTO) => c.uuid,
            (c: ClanDTO) => c.holinessAverage,
            (rank, value, zStr) =>
                `Rank #${rank} (Holiness: ${unsigned(value, 1)}, Z-Score: ${zStr})`,
        ),
    );
</script>

<h3>Holiness</h3>
{#if clans.length}
    <table class="rituals holiness">
        <thead>
            <tr>
                <th></th>
                {#each clans as clan}
                    {@const badge = holinessRanks.get(clan.uuid)}
                    <th class="num">
                        <div class="clan-head">
                            {#if badge}<RankBadge {badge} />{/if}
                            <span>{clan.name}</span>
                        </div>
                    </th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each itemLabels as label}
                <tr>
                    <th class="rowlabel">{label}</th>
                    {#each clans as clan}
                        <td class="num">{signed(itemAverage(clan, label), 1)}</td>
                    {/each}
                </tr>
            {/each}
            <tr class="divider">
                <th class="rowlabel">Current judgments</th>
                {#each clans as clan}
                    <td class="num">{signed(judgmentsAverage(clan), 1)}</td>
                {/each}
            </tr>
            <tr class="total">
                <th class="rowlabel">Holiness</th>
                {#each clans as clan}
                    <td class="num">{unsigned(clan.holinessAverage, 1)}</td>
                {/each}
            </tr>
            <tr>
                <th class="rowlabel">Its own view</th>
                {#each clans as clan}
                    <td class="num"
                        >{unsigned(
                            world.holinessToward(clan, clan)?.value ?? 0,
                            1,
                        )}</td
                    >
                {/each}
            </tr>
            <tr>
                <th class="rowlabel">Weighs itself at</th>
                {#each clans as clan}
                    <td class="num"
                        >{unsigned(officiantAppeal(clan.ref, clan.ref), 1)}</td
                    >
                {/each}
            </tr>
        </tbody>
    </table>
    <div class="quiet caption">
        What the settlement's other clans make of each clan, population
        weighted, and how it stands with itself. A clan weighing up who to ask
        uses its own view, adding its Pride when it considers itself.
    </div>
{/if}

<h3>Rituals This Year</h3>

{#if events.length === 0}
    <p class="quiet">
        No trouble this year called for a rite beyond the clans' own ancestral
        rounds.
    </p>
{:else}
    <table class="rituals">
        <thead>
            <tr>
                <th></th>
                <th>Officiant</th>
                <th>For</th>
                <th>Occasion</th>
                <th>Stake</th>
                <th class="num">Chance</th>
                <th class="num">Roll</th>
                <th>Result</th>
                <th class="num">Heard by</th>
            </tr>
        </thead>
        <tbody>
            {#each events as event}
                <tr>
                    <td class="icon {event.success ? 'good' : 'bad'}"
                        >{event.def.icon}</td
                    >
                    <td>
                        {event.performer.name}
                        {#if event.wasAsked}<span class="quiet">asked</span>{/if}
                    </td>
                    <td>{event.beneficiary.name}</td>
                    <td>
                        <Tooltip>
                            <span class="linky">{event.def.label}</span>
                            <div slot="tooltip" style="color: initial;">
                                <RitualDetails {event} />
                            </div>
                        </Tooltip>
                    </td>
                    <td>{event.def.stakeLabel}</td>
                    <td class="num">{pct(event.successChance)}</td>
                    <td class="num">{pct(event.roll)}</td>
                    <td class={event.success ? "good" : "bad"}
                        >{event.resultLabel}</td
                    >
                    <td class="num">{event.heardBy.length}</td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}

<h3>What Calls for a Rite</h3>
<table class="rituals">
    <thead>
        <tr>
            <th></th>
            <th>Occasion</th>
            <th>Stake</th>
            <th class="num">Offering</th>
            <th class="num">Fee if asked</th>
            <th class="num">Chance range</th>
            <th class="num">Expected/yr</th>
        </tr>
    </thead>
    <tbody>
        {#each ALL_RITUAL_TYPES as def}
            {@const range = def.chanceRange}
            <tr>
                <td class="icon">{def.icon}</td>
                <td>
                    {def.label}
                    <div class="quiet">{def.description}</div>
                </td>
                <td>{def.stakeLabel}</td>
                <td class="num"
                    >{def.foodCostFraction > 0
                        ? pct(def.foodCostFraction)
                        : "—"}</td
                >
                <td class="num"
                    >{def.askGiftFraction > 0
                        ? pct(def.askGiftFraction)
                        : "\u2014"}</td
                >
                <td class="num">{pct(range[0])}&ndash;{pct(range[1])}</td>
                <td class="num">
                    {unsigned(
                        settlement.clans.reduce(
                            (sum, c) => sum + def.rateFor(c.ref),
                            0,
                        ),
                        2,
                    )}
                </td>
            </tr>
        {/each}
    </tbody>
</table>

<style>
    h3 {
        margin: 1rem 0 0.5rem;
    }
    h3:first-child {
        margin-top: 0;
    }
    .quiet {
        color: #6e5b47;
        font-style: italic;
        font-size: 0.9em;
    }
    table.rituals {
        border-collapse: collapse;
    }
    table.rituals th,
    table.rituals td {
        padding: 0.15rem 0.6rem 0.15rem 0;
        text-align: left;
        vertical-align: top;
    }
    table.rituals th {
        border-bottom: 1px solid #62531d;
        white-space: nowrap;
    }
    .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }
    .icon {
        font-size: 1.2em;
    }
    table.holiness th.rowlabel {
        border-bottom: none;
        font-weight: normal;
        text-align: left;
        padding-right: 1.2rem;
    }
    table.holiness .clan-head {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    }
    table.holiness tr.divider td,
    table.holiness tr.divider th {
        border-top: 1px solid #ccc;
    }
    table.holiness tr.total td,
    table.holiness tr.total th {
        font-weight: bold;
        border-top: 1px solid #62531d;
    }
    .caption {
        max-width: 34rem;
        margin-top: 0.4rem;
    }
    .linky {
        border-bottom: 1px dotted #6e5b47;
        cursor: help;
    }
    .good {
        color: #15803d;
    }
    .bad {
        color: #b91c1c;
    }
</style>
