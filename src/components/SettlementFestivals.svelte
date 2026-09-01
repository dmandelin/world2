<script lang="ts">
    import { pct, signed, unsigned, xm } from "../model/lib/format";
    import { populationAverage } from "../model/lib/modelbasics";
    import {
        ALL_RITUAL_ASPECTS,
        FEAST_ALIGNMENT_MAX,
        FEAST_HEALTH_SWING,
        FEAST_INFORMATION_CONTACT,
        FEAST_QOL_MAX,
        RITE_QOL_MAX,
        RITE_RESPECT_MAX,
        SKILL_FACTOR_BASE_LEVEL,
        SKILL_FACTOR_TOP_LEVEL,
        festivalEffect,
        ritualScaleFactor,
    } from "../model/festivals";
    import type {
        FestivalAspectCalc,
        RitualAspectDef,
    } from "../model/festivals";
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import {
        ABANDONED_SUPPORTER_RIGIDITY_FACTOR,
        INITIATOR_RIGIDITY_FACTOR,
        ritualChangeQolFor,
    } from "../model/ritualchange";
    import type {
        RitualChangeEvent,
        RitualChangeStance,
        RitualOpinion,
        RitualRole,
        RitualVoteRecord,
    } from "../model/ritualchange";
    import type { Table, TableColumn, TableRow } from "./tables/tables2";
    import TableView2 from "./tables/TableView2.svelte";
    import EntityLink from "./state/EntityLink.svelte";
    import { formatYear } from "../model/records/year";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let festivals = $derived(settlement.festivals);
    // Whether the way of holding the festival is settled this year, and when
    // it was last unsettled.
    let ritualChange = $derived(settlement.ritualChangeThisTurn);
    let pastRitualChanges = $derived(
        [...settlement.ritualChanges].reverse().slice(0, 5),
    );

    // The settlement's standing record of what it has settled, with what each
    // change is still worth to each clan that took part. This is where the
    // "Ritual change" line of everyone's quality of life comes from.
    let changelog = $derived.by(() => {
        const year = settlement.world.yearValue;
        return [...settlement.ritualChanges]
            .reverse()
            .map((event: RitualChangeEvent) => ({
                event,
                age: year - event.year,
                marks: settlement.clans.map((clan: ClanDTO) => {
                    const stance = event.stances.find(
                        (st) => st.clan.uuid === clan.uuid,
                    );
                    return stance
                        ? {
                              role: stance.role,
                              value: ritualChangeQolFor(
                                  event,
                                  stance.role,
                                  year - event.year,
                              ),
                          }
                        : undefined;
                }),
            }))
            .filter((row) => row.marks.some((m) => m && m.value !== 0));
    });

    const ROLE_LABELS: Record<RitualRole, string> = {
        initiator: "Raised it",
        supporter: "For",
        opponent: "Against",
    };

    // Alignment runs -1 to 1 and is shown throughout as Favor x100.
    function favor(alignment: number | undefined): string {
        return alignment === undefined ? "—" : signed(100 * alignment, 0);
    }

    function sideLabel(opinion: RitualOpinion): string {
        return opinion === "for" ? "For" : "Against";
    }

    // What the clan's disposition means, plus the standing modifiers that
    // apply to it. What it actually counted for in any given round is on that
    // round's own cell, since the abandoned-supporter discount comes and goes
    // with whether the initiators are still behind their proposal.
    function rigidityNote(stance: RitualChangeStance): string {
        const lines = [
            `Gives way once more than ${pct(stance.rigidity)} of the clans`
                + ` are against it.`,
        ];
        if (stance.initiator) {
            lines.push(
                `Counted ${INITIATOR_RIGIDITY_FACTOR}× here` +
                    ` (${(stance.rigidity * INITIATOR_RIGIDITY_FACTOR).toFixed(2)}):` +
                    ` it is their own proposal to give up.`,
            );
        } else if (stance.opinion === "for") {
            lines.push(
                `Counted ${ABANDONED_SUPPORTER_RIGIDITY_FACTOR}×` +
                    ` (${(stance.rigidity * ABANDONED_SUPPORTER_RIGIDITY_FACTOR).toFixed(2)})` +
                    ` in any round after the clans who raised it drop it.`,
            );
        }
        return lines.join(" ");
    }

    function roundNote(rec: RitualVoteRecord | undefined): string {
        if (!rec) return "";
        const faced = `${pct(rec.opposingShare)} of the clans were voting the other way, against a rigidity of ${rec.rigidity.toFixed(2)}`;
        return rec.switched
            ? `Gave way: ${faced}.`
            : `Held firm: ${faced}.`;
    }
    let clans = $derived(settlement.clans);
    let feast = $derived(festivals?.feast);
    let rite = $derived(festivals?.rite);

    // What one clan brought to one aspect, as it stood when the festival was
    // held rather than as the clan stands now.
    let part = $derived(
        (calc: FestivalAspectCalc | undefined, clan: ClanDTO) =>
            calc?.forClan(clan.uuid),
    );

    // --- Who took part ------------------------------------------------------

    interface ClanRow {
        label: string;
        tooltip?: string;
        value: (clan: ClanDTO) => number;
        format: (v: number) => string;
        // What to show in the settlement-wide column: an average over the
        // clans, a total, or a figure of its own.
        aggregate?: "average" | "sum" | "none";
        total?: () => number;
        divider?: boolean;
    }

    let clanRows = $derived.by<ClanRow[]>(() => [
        {
            label: "Openhandedness",
            tooltip:
                "Disposition: what this clan means to bring, as a factor on "
                + "the notional standard for a clan its size. Set at random "
                + "when the clan forms and drifting slowly after.",
            value: (c) => c.traits.festivalGiving,
            format: (v) => pct(v),
        },
        {
            label: "Expects of others",
            tooltip:
                "Disposition: the factor this clan thinks every clan ought to "
                + "be bringing. It judges its neighbors against this.",
            value: (c) => c.traits.festivalExpectation,
            format: (v) => pct(v),
        },
        {
            label: "Admires giving",
            tooltip:
                "Disposition: alignment this clan grants a neighbor per whole "
                + "standard's worth brought past what it expected -- and takes "
                + "away, per standard short. A few clans keep no count at all.",
            value: (c) => c.traits.festivalAdmiration,
            format: (v) => v.toFixed(3),
        },
        {
            label: "Seen to bring",
            tooltip:
                "What the clan actually brought, in time and food together, "
                + "against the plain standard for a clan its size. This is "
                + "what the neighbors judge -- its own open-handedness, cut "
                + "down by whatever its year would not stretch to.",
            value: (c) => festivals?.givingSeenBy(c.uuid) ?? 0,
            format: (v) => pct(v),
            aggregate: "none",
            total: () => festivals?.givingSeen ?? 0,
        },
        {
            label: "Craft skill",
            tooltip:
                "Making and performing. Kept up at the feast, which is the "
                + "only place this model yet gives it to do. The settlement "
                + "figure is the geometric mean weighted by clan population.",
            value: (c) => c.skills.v(CRAFT),
            format: (v) => unsigned(v),
            aggregate: "none",
            total: () => feast?.skill ?? 0,
        },
        {
            label: "Ritual skill",
            tooltip:
                "Kept up at the rite itself, which is the only place the "
                + "words get said in the order they have to be said in. The "
                + "settlement figure is a CES mean at r = -2 weighted by clan "
                + "population, so the worst part is very nearly the whole "
                + "story.",
            value: (c) => c.skills.v(RITUAL),
            format: (v) => unsigned(v),
            aggregate: "none",
            total: () => rite?.skill ?? 0,
        },
        {
            label: "Effort on festivals",
            tooltip:
                "Share of this clan's own year that went to the settlement's "
                + "festivals. The notional standard is 5% for the feast and 5% "
                + "for the rite, scaled by how open-handed the clan is.",
            value: (c) => part(feast, c)?.effortShare ?? c.festivalEffortShare,
            format: (v) => pct(v, 1),
            aggregate: "none",
            total: () => festivals?.effortShare ?? 0,
            divider: true,
        },
        {
            label: "× Workers",
            tooltip: "Hands the clan has to spend at all: its adults.",
            value: (c) => part(feast, c)?.workers ?? c.workers,
            format: (v) => v.toFixed(0),
            aggregate: "sum",
        },
        {
            label: "= Worker-turns",
            tooltip:
                "Share of effort times workers: the time actually spent "
                + "preparing for and keeping the festivals.",
            value: (c) =>
                (part(feast, c)?.labor ?? 0) + (part(rite, c)?.labor ?? 0),
            format: (v) => v.toFixed(1),
            aggregate: "sum",
        },
        {
            label: "Food laid on",
            tooltip:
                "Brought to the festivals out of this year's production. A "
                + "clan with nothing to spare brings less rather than going "
                + "hungry for it.",
            value: (c) =>
                (part(feast, c)?.food ?? 0) + (part(rite, c)?.food ?? 0),
            format: (v) => v.toFixed(2),
            aggregate: "sum",
        },
        {
            label: "— eaten",
            tooltip:
                "Most of a festival is a meal, and the people who brought the "
                + "food eat it. This counts toward what the clan ate this year.",
            value: (c) =>
                (part(feast, c)?.foodEaten ?? 0) + (part(rite, c)?.foodEaten ?? 0),
            format: (v) => v.toFixed(2),
            aggregate: "sum",
        },
        {
            label: "— sacrificed",
            tooltip:
                "Burnt, poured out, or left to spoil on the offering table. "
                + "This is the part that is really given up.",
            value: (c) =>
                (part(feast, c)?.foodSacrificed ?? 0)
                + (part(rite, c)?.foodSacrificed ?? 0),
            format: (v) => v.toFixed(2),
            aggregate: "sum",
        },
        {
            label: "Feast time",
            tooltip:
                "Worker-turns brought, against this clan's share of what the "
                + "settlement's festival asks. The clan brings a share of its "
                + "own hands; the festival asks by heads, so a clan heavy with "
                + "children falls short of its share.",
            value: (c) => part(feast, c)?.timeRatio ?? 0,
            format: (v) => pct(v),
            aggregate: "none",
            total: () => feast?.timeRatio ?? 0,
            divider: true,
        },
        {
            label: "Feast food",
            value: (c) => part(feast, c)?.foodRatio ?? 0,
            format: (v) => pct(v),
            aggregate: "none",
            total: () => feast?.foodRatio ?? 0,
        },
        {
            label: "Rite time",
            value: (c) => part(rite, c)?.timeRatio ?? 0,
            format: (v) => pct(v),
            aggregate: "none",
            total: () => rite?.timeRatio ?? 0,
        },
        {
            label: "Rite food",
            value: (c) => part(rite, c)?.foodRatio ?? 0,
            format: (v) => pct(v),
            aggregate: "none",
            total: () => rite?.foodRatio ?? 0,
        },
        {
            label: "Share of the work",
            tooltip:
                "This clan's worker-turns as a share of everyone's. With every "
                + "clan doing the standard, this is simply how big it is.",
            value: (c) => {
                const total =
                    (feast?.labor ?? 0) + (rite?.labor ?? 0);
                if (total <= 0) return 0;
                return (
                    ((part(feast, c)?.labor ?? 0)
                        + (part(rite, c)?.labor ?? 0)) / total
                );
            },
            format: (v) => pct(v),
            aggregate: "sum",
            divider: true,
        },
    ]);

    let clanTable = $derived.by<Table<ClanRow, ClanDTO | null, any>>(() => {
        const columns: TableColumn<ClanRow, ClanDTO | null, string>[] = [
            {
                data: null,
                label: "Settlement",
                class: "col-header",
                headerSnippet: settlementHeader,
                valueFn: (row: ClanRow) => {
                    if (clans.length === 0) return "-";
                    if (row.aggregate === "none") {
                        return row.format(row.total ? row.total() : 0);
                    }
                    if (row.aggregate === "sum") {
                        return row.format(
                            clans.reduce((t, c) => t + row.value(c), 0),
                        );
                    }
                    return row.format(populationAverage(clans, row.value));
                },
            },
            ...clans.map(
                (clan): TableColumn<ClanRow, ClanDTO | null, string> => ({
                    data: clan,
                    label: clan.name,
                    class: "col-header",
                    headerSnippet: clanHeader,
                    valueFn: (row: ClanRow) => row.format(row.value(clan)),
                }),
            ),
        ];

        const rows: TableRow<ClanRow, ClanDTO | null>[] = clanRows.map(
            (row) => ({
                data: row,
                label: row.label,
                headerTooltip: row.tooltip,
                divider: row.divider,
            }),
        );

        return { columns: columns as any, rows };
    });

    // --- What each aspect came to -------------------------------------------

    interface FactRow {
        label: string;
        value: string;
        note?: string;
        divider?: boolean;
    }

    function aspectRows(calc: FestivalAspectCalc | undefined): FactRow[] {
        if (!calc) return [];
        const a = calc.aspect;
        return [
            {
                label: "Time it asks",
                value: calc.standardLabor.toFixed(1),
                note: `Worker-turns, by heads: the festival has to be put on `
                    + `for everyone who lives here, so its demands go with `
                    + `${calc.population} people rather than with the hands `
                    + `there are to do it`,
            },
            {
                label: "Time given",
                value: calc.labor.toFixed(1),
                note: `${pct(calc.timeRatio)} of what it asks. Every clan `
                    + `gives ${pct(a.standardEffortShare)} of its own year, so `
                    + `what the settlement can raise depends on how many of `
                    + `its people are grown`,
            },
            {
                label: "Food it asks",
                value: calc.standardFood.toFixed(2),
                note: `The notional standard is ${pct(a.standardFoodShare)} `
                    + `of every clan's year's eating`
                    + (a.key === "rite"
                        ? `; less by the basketful than the feast, but it has `
                          + `to be the best of everything`
                        : ``),
            },
            {
                label: "Food laid on",
                value: calc.food.toFixed(2),
                note: `${pct(calc.foodRatio)} of the standard`
                    + (calc.foodRatio < 0.995
                        ? `, the larder being what it is`
                        : ``),
            },
            {
                label: "— eaten",
                value: calc.foodEaten.toFixed(2),
                note: `${pct(calc.structure.foodEatenShare)} of it, which is `
                    + `the point of laying on food. It counts toward what `
                    + `these clans ate this year`,
            },
            {
                label: "— sacrificed",
                value: calc.foodSacrificed.toFixed(2),
                note: `Burnt, poured out, or left to spoil on the offering `
                    + `table. This is the part that is really given up`,
            },
            {
                label: "Time and food together",
                value: calc.baseValue.toFixed(2),
                divider: true,
                note: `Combined with r = ${a.rho}, so `
                    + (a.rho <= -2
                        ? `neither makes up for the other`
                        : `each makes up for the other only up to a point`)
                    + `, and returns of ${a.nu} to the pair. The standard, `
                    + `fully met, comes to 1.00`,
            },
            {
                label: "× How the day went",
                value: xm(calc.luck),
                note: "Whether the weather held, whether the dancing caught, "
                    + "what the signs during it looked like",
            },
            {
                label: `${a.skillName} skill`,
                value: calc.skill.toFixed(0),
                note: `The settlement's level, taken as the `
                    + `${a.skillCombinationLabel}`,
            },
            {
                label: "× Skill",
                value: xm(calc.skillFactor),
                note: `${SKILL_FACTOR_BASE_LEVEL} is ordinary and worth `
                    + `nothing either way; ${SKILL_FACTOR_TOP_LEVEL} is worth `
                    + `${xm(a.skillFactorAtTop)}, and the curve is `
                    + `exponential between and past`,
            },
            {
                label: "× Scale",
                value: xm(calc.scaleFactor),
                note: `${calc.structure.name} under ${calc.leadership.name} `
                    + `works best at about `
                    + `${calc.structure.scale[a.key].peakPopulation} people, `
                    + `and is worth half as much every `
                    + `${calc.structure.scale[a.key].halfLifeDoublings} `
                    + `doublings past that; this settlement has `
                    + `${calc.population}`,
            },
            {
                label: a.valueName,
                value: calc.value.toFixed(2),
                divider: true,
            },
        ];
    }

    function factTable(
        calc: FestivalAspectCalc | undefined,
    ): Table<FactRow, string, [string]> {
        return {
            hideHeader: true,
            columns: [
                {
                    data: "Value",
                    label: "Value",
                    valueFn: (row: FactRow) => row.value,
                },
                {
                    data: "Note",
                    label: "Note",
                    class: "note-col",
                    valueFn: (row: FactRow) => row.note ?? "",
                },
            ] as any,
            rows: aspectRows(calc).map((row) => ({
                data: row,
                label: row.label,
                divider: row.divider,
            })),
        };
    }

    // --- What it is worth ---------------------------------------------------

    interface EffectRow {
        aspect: string;
        label: string;
        value: string;
        note: string;
        divider?: boolean;
    }

    let effectRows = $derived.by<EffectRow[]>(() => {
        const appeal = settlement.festivalAppeal;
        const power = settlement.festivalPower;
        const fa = festivalEffect(appeal);
        const fp = festivalEffect(power);
        return [
            {
                aspect: "Feast",
                label: "Gatherings (QoL)",
                value: signed(FEAST_QOL_MAX * fa, 1),
                note: `Gladness at having been there, out of at most `
                    + `${FEAST_QOL_MAX}`,
                divider: true,
            },
            {
                aspect: "Feast",
                label: "Birth rate",
                value: xm(1 + FEAST_HEALTH_SWING * fa),
                note: "People who meet at the feasts marry more readily",
            },
            {
                aspect: "Feast",
                label: "Death rate",
                value: xm(1 - FEAST_HEALTH_SWING * fa),
                note: "Eating well in company a few times a year tells",
            },
            {
                aspect: "Feast",
                label: "Alignment",
                value: signed(100 * FEAST_ALIGNMENT_MAX * fa, 1),
                note: "Favor every clan here grants every other, for having "
                    + "danced at the same fires",
            },
            {
                aspect: "Feast",
                label: "Acquaintance",
                value: signed(FEAST_INFORMATION_CONTACT * fa, 2),
                note: "Contact toward every other clan in the settlement at "
                    + "once: a feast is broadcast, not conversation",
            },
            {
                aspect: "Rite",
                label: "Serenity (QoL)",
                value: signed(RITE_QOL_MAX * fp, 1),
                note: `The comfort of having given gifts to the ancestors and `
                    + `to the powers of the world, and of believing they were `
                    + `well received, out of at most ${RITE_QOL_MAX}`,
                divider: true,
            },
            {
                aspect: "Rite",
                label: "Respect",
                value: signed(RITE_RESPECT_MAX * fp, 1),
                note: "Granted every clan that took its part, by everyone who "
                    + "saw it done",
            },
        ];
    });

    let effectTable = $derived.by<Table<EffectRow, string, any>>(() => ({
        columns: [
            {
                data: "aspect",
                label: "From",
                valueFn: (row: EffectRow) => row.aspect,
            },
            {
                data: "value",
                label: "Worth",
                valueFn: (row: EffectRow) => row.value,
            },
            {
                data: "note",
                label: "",
                class: "note-col",
                valueFn: (row: EffectRow) => row.note,
            },
        ] as any,
        rows: effectRows.map((row) => ({
            data: row,
            label: row.label,
            divider: row.divider,
        })),
    }));

    // --- What the arrangement is worth at each size -------------------------

    const SIZES = [10, 25, 50, 100, 150, 200, 300, 400, 600, 800];

    // The size the festivals were actually reckoned at -- before this year's
    // births and deaths, which is where the fact rows above read it -- slotted
    // in among the sample sizes so it is always there to be marked.
    let here = $derived(festivals?.population ?? settlement.population);

    let sizes = $derived(
        [...new Set([...SIZES, here])].sort((a, b) => a - b),
    );

    let scaleTable = $derived.by<Table<number, string, any>>(() => ({
        columns: [
            ...ALL_RITUAL_ASPECTS.map((aspect: RitualAspectDef) => ({
                data: aspect.key,
                label: aspect.name,
                headerTooltip:
                    `What ${settlement.ritualStructure.name} under `
                    + `${settlement.ritualLeadership.name} is worth for the `
                    + `${aspect.name.toLowerCase()} at that size. Best at `
                    + `${settlement.ritualStructure.scale[aspect.key].peakPopulation}, `
                    + `then halving every `
                    + `${settlement.ritualStructure.scale[aspect.key].halfLifeDoublings} `
                    + `doublings.`,
                valueFn: (population: number) =>
                    pct(
                        settlement.ritualLeadership.scaleFactor
                            * ritualScaleFactor(
                                population,
                                settlement.ritualStructure.scale[aspect.key],
                            ),
                    ),
            })),
        ] as any,
        rows: sizes.map((population) => ({
            data: population,
            label: population === here ? `${population} (here)` : `${population}`,
            class: population === here ? "this-size" : "",
        })),
    }));
</script>

<script lang="ts" module>
    import { SkillDefs } from "../model/econ/econdefs";
    const RITUAL = SkillDefs.Ritual;
    const CRAFT = SkillDefs.Craft;
</script>

{#snippet settlementHeader()}
    <div class="col-header-inner">
        <div><strong>Settlement</strong></div>
        <div class="pop-sub">pop {settlement.population}</div>
    </div>
{/snippet}

{#snippet clanHeader(clan: ClanDTO | null)}
    <div class="col-header-inner">
        <div><EntityLink entity={clan!} /></div>
        <div class="pop-sub">pop {clan!.population}</div>
    </div>
{/snippet}

<div class="festivals">
    <p class="lede">
        {#if festivals?.held}
            {settlement.name} keeps its festivals as
            <strong>{settlement.ritualStructure.name}</strong>, held together by
            the <strong>{settlement.ritualLeadership.name}</strong>. This year
            they took {pct(festivals.effortShare)} of everyone's time and
            {festivals.food.toFixed(1)} of food — of which
            {festivals.foodEaten.toFixed(1)} was eaten and
            {festivals.foodSacrificed.toFixed(1)} given up — and came to a feast of
            <strong>{settlement.festivalAppeal.toFixed(2)}</strong> appeal and a
            rite of <strong>{settlement.festivalPower.toFixed(2)}</strong> power,
            where the standard done as it has always been done and at full scale
            would come to 1.00 each.
        {:else}
            No festival worth the name was held here this year.
        {/if}
    </p>
    <p class="caption">
        {settlement.ritualStructure.description}
        &centerdot; {settlement.ritualLeadership.description}
    </p>

    {#if ritualChange}
        <p class="ritual-change">
            <strong>{ritualChange.label}.</strong>
            How the festival is held is no longer simply how it has always been
            held: {ritualChange.causeDetail}.
            {#if ritualChange.initiators.length}
                {ritualChange.initiatorNames}
                {ritualChange.initiators.length > 1 ? "have" : "has"} raised it,
                and the clans have it to settle among themselves.
            {:else}
                The clans have it to settle among themselves.
            {/if}
            <span class="rc-split">{ritualChange.splitLabel}</span>, and it was
            <span class="rc-outcome {ritualChange.outcome}"
                >{ritualChange.decision.detail}</span
            >.
        </p>

        <table class="stances">
            <thead>
                <tr>
                    <th>Clan</th>
                    <th class="rap" title="How far a clan can be outnumbered before it gives way, as a share of the clans present.">Rigidity</th>
                    <th class="rap">Favor to initiator</th>
                    <th class="rap">Favor to the rest</th>
                    <th class="rap">Difference</th>
                    <th class="rap">Chance for</th>
                    <th title="What the clan wanted. This never changes.">Wanted</th>
                    {#each ritualChange.decision.rounds as round (round.number)}
                        <th
                            class="round"
                            title="Tally after round {round.number}: {round.tallyLabel} for-against."
                            >R{round.number}</th
                        >
                    {/each}
                    <th title="What the clan ended up voting.">Settled on</th>
                </tr>
            </thead>
            <tbody>
                {#each ritualChange.stances as stance (stance.clan.uuid)}
                    <tr>
                        <td>
                            <EntityLink entity={stance.clan} />
                            {#if stance.initiator}<span class="rc-raiser"
                                    >raised it</span
                                >{/if}
                        </td>
                        <td class="rap" title={rigidityNote(stance)}
                            >{stance.rigidity.toFixed(2)}</td
                        >
                        <td class="rap">{favor(stance.alignmentToInitiators)}</td>
                        <td class="rap">{favor(stance.alignmentToOthers)}</td>
                        <td class="rap">{favor(stance.difference)}</td>
                        <td class="rap"
                            >{stance.supportChance === undefined
                                ? "—"
                                : pct(stance.supportChance)}</td
                        >
                        <td class="side {stance.opinion}"
                            >{sideLabel(stance.opinion)}</td
                        >
                        {#each ritualChange.decision.rounds as round (round.number)}
                            {@const rec = round.recordFor(stance.clan)}
                            <td
                                class="side round {rec?.to ?? ''}"
                                class:switched={rec?.switched}
                                title={roundNote(rec)}
                            >
                                {#if rec}
                                    {rec.switched ? "↷ " : ""}{sideLabel(rec.to)}
                                {:else}—{/if}
                            </td>
                        {/each}
                        <td class="side {stance.vote}"
                            >{sideLabel(stance.vote)}{#if stance.assented}<span
                                    class="rc-assent"
                                    title="Voted against what it wanted, to keep the settlement of one mind."
                                    >gave way</span
                                >{/if}</td
                        >
                    </tr>
                {/each}
            </tbody>
        </table>
        {#if ritualChange.decision.rounds.length === 0}
            <p class="caption">
                They were of one mind from the start; there was nothing to argue
                about.
            </p>
        {/if}
    {/if}

    {#if changelog.length}
        <h3>What the settlement has settled, and what it still costs</h3>
        <p class="caption">
            Getting your way wears off; being overruled keeps; a settlement
            that could not decide carries it longest of all. Each clan's mark
            is the one its own part in the thing earned it, and together they
            are the Ritual change line of its quality of life.
        </p>
        <table class="stances changelog">
            <thead>
                <tr>
                    <th>Settled</th>
                    <th>Outcome</th>
                    <th class="rap">Years on</th>
                    {#each settlement.clans as clan (clan.uuid)}
                        <th class="rap"><EntityLink entity={clan} /></th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each changelog as row (row.event.year + row.event.settlement.uuid)}
                    <tr>
                        <td>{formatYear(row.event.year)}</td>
                        <td class="rc-outcome {row.event.outcome}"
                            >{row.event.decision.label}</td
                        >
                        <td class="rap">{row.age}</td>
                        {#each row.marks as mark}
                            <td
                                class="rap"
                                class:good={mark && mark.value > 0}
                                class:bad={mark && mark.value < 0}
                                title={mark ? ROLE_LABELS[mark.role] : ""}
                            >
                                {#if mark && mark.value !== 0}
                                    {signed(mark.value, 2)}
                                {:else}—{/if}
                            </td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}

    {#if pastRitualChanges.length}
        <h3>When the old way came into question</h3>
        <ul class="ritual-change-list">
            {#each pastRitualChanges as change}
                <li>
                    <span class="rc-year">{formatYear(change.year)}</span>
                    <span class="rc-label">{change.label}</span>
                    <span class="rc-detail">{change.causeDetail}</span>
                    {#if change.initiators.length}
                        <span class="rc-detail"
                            >raised by {change.initiatorNames}</span
                        >
                    {/if}
                    <span class="rc-detail">{change.splitLabel}</span>
                    <span class="rc-detail rc-outcome {change.outcome}"
                        >{change.decision.detail}</span
                    >
                </li>
            {/each}
        </ul>
    {/if}

    <h3>Who took part</h3>
    <TableView2 table={clanTable} />

    {#if festivals}
        {#each festivals.calcs as calc (calc.aspect.key)}
            <h3>{calc.aspect.icon} {calc.aspect.name}</h3>
            <p class="caption">{calc.aspect.description}</p>
            <TableView2 table={factTable(calc)} />
        {/each}

        <h3>What it was worth</h3>
        <TableView2 table={effectTable} />

        <h3>This way of doing it, at each size</h3>
        <p class="caption">
            One household is not a festival and a town is a crowd. What
            {settlement.ritualStructure.name} under
            {settlement.ritualLeadership.name} is worth at each size, before
            anything the clans actually bring.
        </p>
        <TableView2 table={scaleTable} />
    {/if}
</div>

<style>
    .festivals {
        max-width: 60rem;
    }

    .lede {
        margin: 0;
        max-width: 44rem;
    }

    .caption {
        margin: 0.2rem 0 0.4rem;
        font-size: 0.85rem;
        color: #6b5f3a;
        max-width: 44rem;
    }

    h3 {
        margin: 1.2rem 0 0.4rem;
        font-size: 1rem;
        color: #62531d;
    }

    .ritual-change {
        margin: 0.6rem 0 0;
        padding: 0.5rem 0.7rem;
        max-width: 44rem;
        border-left: 3px solid #975a16;
        background-color: #faf3e0;
    }

    .rc-split {
        font-weight: 600;
    }

    .stances {
        margin-top: 0.4rem;
        border-collapse: collapse;
        font-size: 0.85rem;
    }

    .stances th {
        font-weight: 600;
        color: #6b5f3a;
        border-bottom: 1px solid #c4b98a;
        padding: 0.15rem 0.5rem;
        text-align: left;
    }

    .stances td {
        padding: 0.15rem 0.5rem;
        border-bottom: 1px dotted #ded3ae;
    }

    .stances .rap {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    .rc-raiser {
        font-size: 0.75em;
        color: #975a16;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-left: 0.3rem;
    }

    .side {
        font-weight: 600;
    }

    .side.for {
        color: #2f7d5b;
    }

    .side.against {
        color: #9b2c2c;
    }

    /* Round columns are a trace of the argument, so they read lighter than
       the opinion and the settled vote on either side of them. */
    .stances th.round,
    .stances td.side.round {
        font-weight: normal;
        opacity: 0.75;
        border-left: 1px dotted #ded3ae;
    }

    .stances td.side.round.switched {
        font-weight: 600;
        opacity: 1;
    }

    .changelog td.good {
        color: #2f7d5b;
    }

    .changelog td.bad {
        color: #9b2c2c;
    }

    .rc-assent {
        font-size: 0.75em;
        color: #975a16;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-left: 0.3rem;
        font-weight: normal;
    }

    .rc-outcome {
        font-weight: 600;
    }

    .rc-outcome.accepted {
        color: #2f7d5b;
    }

    .rc-outcome.rejected {
        color: #9b2c2c;
    }

    .rc-outcome.deadlock {
        color: #7b341e;
    }

    .ritual-change-list {
        margin: 0.2rem 0 0;
        padding-left: 1.1rem;
        max-width: 44rem;
        font-size: 0.85rem;
    }

    .rc-year {
        font-variant-numeric: tabular-nums;
        color: #a08c5a;
        margin-right: 0.4rem;
    }

    .rc-detail {
        color: #6b5f3a;
    }

    .rc-detail::before {
        content: " — ";
    }

    .col-header-inner {
        text-align: center;
    }

    .pop-sub {
        font-size: 0.75em;
        font-weight: normal;
        color: #888;
    }

    /* The note column is prose, so let it sit left and wrap. */
    :global(.festivals td.note-col) {
        text-align: left !important;
        font-size: 0.85em;
        color: #6b5f3a;
        max-width: 30rem;
        white-space: normal;
    }

    :global(.festivals tr td.this-size) {
        background-color: #f3edd8;
        font-weight: bold;
    }
</style>
