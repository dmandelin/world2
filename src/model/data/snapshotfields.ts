// Hardcoded config for what gets captured in entity snapshots.
//
// Each entity type has an ordered list of fields. Adding a column here is
// all it takes to start recording it; the sessions route reads the names
// straight off the stream.

import { SkillDefs } from "../econ/econdefs";
import { NUMERIC_TRAITS } from "../people/traits";
import { sumFun } from "../lib/basics";
import { weightedAverage } from "../lib/modelbasics";
import type { Clan } from "../people/people";
import type { Perceptions } from "../relations/perceptions";
import type { Settlement } from "../people/settlement";
import type { SnapshotValue } from "./sessions";

export type FieldSpec<T> = {
    readonly name: string;
    get(entity: T): SnapshotValue;
};

// Population-weighted average, over the subjects who hold a perception of
// this clan. Self is excluded: clans have no perceptions of themselves.
function averageToward(clan: Clan, pick: (p: Perceptions) => number): number {
    let weighted = 0;
    let weight = 0;
    for (const [subjectUuid, perceptions] of clan.world.perceptions.getRegarding(clan)) {
        const subject = clan.world.clanMap.get(subjectUuid);
        if (!subject || subject === clan || subject.population <= 0) continue;
        weighted += pick(perceptions) * subject.population;
        weight += subject.population;
    }
    return weight > 0 ? weighted / weight : 0;
}

export const SETTLEMENT_FIELDS: readonly FieldSpec<Settlement>[] = [
    { name: 'name', get: s => s.name },
    { name: 'population', get: s => s.population },
    { name: 'yearsInExistence', get: s => s.yearsInPlace },
    {
        name: 'foodProductionPerCapita',
        get: s => s.population > 0
            ? sumFun(s.clans, c => c.production.totalFood()) / s.population
            : 0,
    },
    {
        name: 'foodConsumptionPerCapita',
        get: s => s.population > 0
            ? sumFun(s.clans, c => c.consumption.totalFood) / s.population
            : 0,
    },
    { name: 'qol', get: s => weightedAverage(s.clans, c => c.qol.value, c => c.population) },
    { name: 'materialQol', get: s => weightedAverage(s.clans, c => c.qol.valueFrom('material'), c => c.population) },
    { name: 'socialQol', get: s => weightedAverage(s.clans, c => c.qol.valueFrom('social'), c => c.population) },
    { name: 'residence', get: s => s.residenceFraction },
];

export const CLAN_FIELDS: readonly FieldSpec<Clan>[] = [
    { name: 'name', get: c => c.name },
    { name: 'settlementUuid', get: c => c.settlement?.uuid ?? null },
    { name: 'settlement', get: c => c.settlement?.name ?? null },
    { name: 'population', get: c => c.population },
    { name: 'yearsInExistence', get: c => c.world.year.sub(c.foundedYear) },
    {
        name: 'foodProductionPerCapita',
        get: c => c.population > 0 ? c.production.totalFood() / c.population : 0,
    },
    { name: 'foodConsumptionPerCapita', get: c => c.consumption.perCapitaFood },
    { name: 'qol', get: c => c.qol.value },
    { name: 'materialQol', get: c => c.qol.valueFrom('material') },
    { name: 'socialQol', get: c => c.qol.valueFrom('social') },
    { name: 'residence', get: c => c.residenceFraction },

    // Share of production effort going to agriculture rather than fishing.
    // farmingRatio is 0/0 when the clan is doing no production at all.
    {
        name: 'agricultureShare',
        get: c => {
            const ratio = c.effortAllocation.farmingRatio();
            return Number.isFinite(ratio) ? ratio : 0;
        },
    },

    // Skills, one column each.
    ...Object.values(SkillDefs).map((skillDef): FieldSpec<Clan> => ({
        name: `skill.${skillDef.name.replace(/\s+/g, '')}`,
        get: c => c.skills.v(skillDef),
    })),

    // Traits, one column each.
    ...NUMERIC_TRAITS.map((trait): FieldSpec<Clan> => ({
        name: `trait.${trait}`,
        get: c => c.traits.get(trait),
    })),
    // Giving and Aggression aren't 0-100 traits, so they're not part of
    // NUMERIC_TRAITS, but they live in the same place conceptually.
    { name: 'trait.giving', get: c => c.traits.giving },
    { name: 'trait.aggression', get: c => c.traits.aggression },

    // How other clans see this one.
    { name: 'respectFromOthers', get: c => averageToward(c, p => p.respect.value) },
    { name: 'favorFromOthers', get: c => 100 * averageToward(c, p => p.alignment.value) },
    { name: 'prestigeFromOthers', get: c => 100 * averageToward(c, p => Math.sign(p.alignment.value) * Math.sqrt(Math.abs(p.alignment.value) * (p.respect.value / 100))) },

    // Food transfers, absolute amounts for the turn just ended.
    {
        name: 'foodDonated',
        get: c => c.distribution.totalFoodAidGiven + c.stockOutflow.totalFoodAidGiven,
    },
    { name: 'foodDonationsReceived', get: c => c.consumption.totalFoodAidReceived },
    { name: 'foodGiftsGiven', get: c => c.distribution.totalFoodGiftsGiven },
    { name: 'foodGiftsReceived', get: c => c.consumption.totalFoodGiftsReceived },
];
