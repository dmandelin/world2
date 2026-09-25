<script lang="ts">
    // Care in the settlement, clan by clan: what each means to give its
    // children, what it actually gave once the food was reckoned, what its
    // skill made of that, and what it was worth. The model is in care.ts.
    import type { SettlementDTO, ClanDTO } from "../model/records/dtos";
    import { Activities } from "../model/decisions/effort";
    import { SkillDefs } from "../model/econ/econdefs";
    import {
        CARE_EFFORT_MAX,
        CARE_EFFORT_MIN,
        CARE_FOOD_SECURITY,
        careBirthRateModifier,
        careDeathRateModifier,
        careLearningFactor,
        careSkillFactor,
        careSociabilityFactor,
        careComfort,
        careStress,
    } from "../model/people/care";
    import { eudaimoniaAverage } from "../model/self/eudaimonia";
    import { signed } from "../model/lib/format";
    import { sociableTalkFactor } from "../model/people/talkativeness";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let clans = $derived(settlement.clans.filter((c) => c.population > 0));

    type Row = {
        label: string;
        note: string;
        value: (c: ClanDTO) => number;
        format: (v: number) => string;
        // For coloring: a value on the `sense` side of `mid` is good news.
        sense?: 1 | -1;
        mid?: number;
    };

    const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
    const times = (v: number) => `×${v.toFixed(2)}`;
    const whole = (v: number) => v.toFixed(0);

    const careSkill = (c: ClanDTO) => c.skills.v(SkillDefs.Care);
    // As settled when the year's work was planned, rather than read again
    // off traits that may have drifted since.
    const plan = (c: ClanDTO) => c.effortAllocation.carePlan;

    const sections: { label: string; rows: Row[] }[] = [
        {
            label: "Effort",
            rows: [
                {
                    label: "Nurture",
                    note: "How much care the clan wants to give its children. 50 gives the standard, 65 gives 110% of it.",
                    value: (c) => c.traits.nurture,
                    format: whole,
                },
                {
                    label: "Wants to give",
                    note: `Care effort Nurture asked for when the year was planned, against the standard, held between ${pct(CARE_EFFORT_MIN)} and ${pct(CARE_EFFORT_MAX)}.`,
                    value: (c) => plan(c).wanted,
                    format: pct,
                    sense: 1,
                    mid: 1,
                },
                {
                    label: "Food outlook",
                    note: `Nutrition the clan expected from what it would grow with the care it wanted, against its nutrition target. Below ${pct(CARE_FOOD_SECURITY)} it takes effort from care, down to ${pct(CARE_EFFORT_MIN)} of the standard.`,
                    value: (c) => plan(c).foodOutlook,
                    format: pct,
                    sense: 1,
                    mid: CARE_FOOD_SECURITY,
                },
                {
                    label: "Gave",
                    note: "Care effort actually given this year, against the standard.",
                    value: (c) => plan(c).given,
                    format: pct,
                    sense: 1,
                    mid: 1,
                },
                {
                    label: "Cut for food",
                    note: "How much less care the clan gave than it wanted to, to put the effort into food.",
                    value: (c) => Math.max(0, plan(c).wanted - plan(c).given),
                    format: (v) => (v > 0.005 ? `−${pct(v)}` : "–"),
                    sense: -1,
                    mid: 0,
                },
                {
                    label: "Share of year",
                    note: "The Care activity's share of all the clan's effort.",
                    value: (c) => c.effortAllocation.get(Activities.Care),
                    format: pct,
                },
                {
                    label: "Standard share",
                    note: "The share of the year the standard asks for, given how many children the clan has to look after.",
                    value: (c) => c.careStandardShare,
                    format: pct,
                },
            ],
        },
        {
            label: "Provision",
            rows: [
                {
                    label: "Care skill",
                    note: "How good the clan is at looking after people.",
                    value: careSkill,
                    format: whole,
                    sense: 1,
                    mid: 50,
                },
                {
                    label: "Skill factor",
                    note: "How much looking after a unit of care effort gets done. 65 skill gets 110%.",
                    value: (c) => careSkillFactor(careSkill(c)),
                    format: times,
                    sense: 1,
                    mid: 1,
                },
                {
                    label: "Talkativeness factor",
                    note: "Looking after people goes a little better for a clan that likes to talk: 105% per 15 points of Talkativeness above 50.",
                    value: (c) => sociableTalkFactor(c.traits.talkativeness),
                    format: times,
                    sense: 1,
                    mid: 1,
                },
                {
                    label: "Care provided",
                    note: "Effort given times the skill and Talkativeness factors: how much of what the children need was actually done.",
                    value: (c) => c.careProvision,
                    format: pct,
                    sense: 1,
                    mid: 1,
                },
            ],
        },
        {
            label: "What it was worth",
            rows: [
                {
                    label: "Births",
                    note: "Factor on the birth rate. Mothers who are looked after lose fewer pregnancies and recover sooner.",
                    value: (c) => careBirthRateModifier(c.careProvision),
                    format: times,
                    sense: 1,
                    mid: 1,
                },
                {
                    label: "Child deaths",
                    note: "Factor on children's deaths from illness and mishap. Children are looked after first, so nothing is lost until care provided falls below 80%.",
                    value: (c) => careDeathRateModifier(c.careProvision, 0),
                    format: times,
                    sense: -1,
                    mid: 1,
                },
                {
                    label: "Adult deaths",
                    note: "Factor on adults' deaths. Adults in their strength mostly die of things nobody can nurse them through.",
                    value: (c) => careDeathRateModifier(c.careProvision, 1),
                    format: times,
                    sense: -1,
                    mid: 1,
                },
                {
                    label: "Elder deaths",
                    note: "Factor on elders' deaths from illness, mishap, and old age. Elders take the shortfall first when care is short.",
                    value: (c) => careDeathRateModifier(c.careProvision, 3),
                    format: times,
                    sense: -1,
                    mid: 1,
                },
                {
                    label: "Skill learning",
                    note: "Factor on how readily the clan's young take up its skills, and divisor on what is lost in the passing on.",
                    value: (c) => careLearningFactor(c.careProvision),
                    format: times,
                    sense: 1,
                    mid: 1,
                },
                {
                    label: "Getting on",
                    note: "Factor on the goodwill from everyday dealings with a neighbor raised to the standard. The neighbor's own upbringing counts as much.",
                    value: (c) => careSociabilityFactor(c.careProvision, 1),
                    format: times,
                    sense: 1,
                    mid: 1,
                },
                {
                    label: "Comfort",
                    note: "Points of Fortune for how well looked after everyone was: 50 per doubling of care provided from the standard.",
                    value: (c) => careComfort(c.careProvision),
                    format: (v) => signed(v, 1),
                    sense: 1,
                    mid: 0,
                },
                {
                    label: "Stress",
                    note: "Points of Fortune for what the looking after cost: nothing at a fifth of the clan's effort, a little easier below that, and wearing fast above.",
                    value: (c) => careStress(c.effortAllocation.get(Activities.Care)),
                    format: (v) => signed(v, 1),
                    sense: 1,
                    mid: 0,
                },
            ],
        },
    ];

    function settlementValue(row: Row): number {
        return eudaimoniaAverage(
            clans.map((c) => ({ value: row.value(c), weight: c.population })),
        );
    }

    function tone(row: Row, v: number): "pos" | "neg" | "" {
        if (!row.sense) return "";
        const d = row.sense * (v - (row.mid ?? 0));
        return d > 0.005 ? "pos" : d < -0.005 ? "neg" : "";
    }
</script>

<div class="care-container">
    <h3>Care</h3>
    <div class="blurb">
        Each clan gives the care its Nurture asks for, unless it expects to go
        short of food, and its skill decides how much of what the children need
        actually gets done.
    </div>

    {#if clans.length === 0}
        <div class="empty">No clans here.</div>
    {:else}
        <div class="scroll">
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th class="settlement-col">Settlement</th>
                        {#each clans as clan (clan.uuid)}
                            <th>{clan.name}</th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#each sections as section (section.label)}
                        <tr class="row-section">
                            <td colspan={clans.length + 2}>{section.label}</td>
                        </tr>
                        {#each section.rows as row (row.label)}
                            {@const sv = settlementValue(row)}
                            <tr>
                                <td class="rowhead" title={row.note}>{row.label}</td>
                                <td class="val settlement-col {tone(row, sv)}"
                                    >{row.format(sv)}</td
                                >
                                {#each clans as clan (clan.uuid)}
                                    {@const v = row.value(clan)}
                                    <td class="val {tone(row, v)}">{row.format(v)}</td>
                                {/each}
                            </tr>
                        {/each}
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="note">
            Averages in the Settlement column are weighted by population. Hover a
            row name for what it means.
        </div>
    {/if}
</div>

<style>
    .care-container {
        background-color: #f3edd8;
        border: 1px solid #62531d;
        border-radius: 5px;
        padding: 0.5rem;
        margin-top: 1rem;
        display: inline-block;
        min-width: 650px;
        max-width: 100%;
    }

    h3 {
        margin: 0 0 0.25rem;
    }

    .blurb,
    .note {
        font-size: 0.8rem;
        color: #6b5d2a;
        line-height: 1.35;
        max-width: 48rem;
    }

    .note {
        margin-top: 0.4rem;
    }

    .empty {
        font-style: italic;
        color: #6b7280;
    }

    .scroll {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 0.4rem;
    }

    th,
    td {
        padding: 0.2rem 0.5rem;
        text-align: right;
        border-bottom: 1px solid rgba(98, 83, 29, 0.2);
        white-space: nowrap;
    }

    thead th {
        background-color: rgba(98, 83, 29, 0.1);
        font-weight: bold;
        border-bottom: 2px solid #62531d;
    }

    .rowhead {
        text-align: left;
        padding-left: 1.25rem;
        cursor: help;
    }

    .row-section td {
        text-align: left;
        font-weight: 600;
        background-color: rgba(98, 83, 29, 0.05);
    }

    .settlement-col {
        border-right: 1px solid rgba(98, 83, 29, 0.35);
    }

    .val {
        font-family: monospace;
        font-size: 0.9rem;
    }

    .pos {
        color: #1b5e20;
    }

    .neg {
        color: #b71c1c;
    }

    tbody tr:hover {
        background-color: rgba(98, 83, 29, 0.05);
    }
</style>
