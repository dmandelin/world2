import { clamp, sumFun } from "../lib/basics";
import { pct } from "../lib/format";
import type { Consumption } from "./consumption";
import { getRelativeLocalPrestige } from "../relations/prestige";
import { createTwoSidedQuadratic } from "../lib/modelbasics";
import { omenQolEffect } from "../rituals";
import { feastQolEffect, festivalAppeal, festivalPower, riteQolEffect } from "../festivals";

const foodVarietyAppealFun = createTwoSidedQuadratic(0, -10, 0.7, 2, 1, 0);

export class QualityOfLife {
    readonly m: ReadonlyMap<string, QualityOfLifeItem>;

    constructor(m: ReadonlyMap<string, QualityOfLifeItem>) {
        this.m = m;
    }

    get debugString(): string {
        return `QoL: ${[...this.m.values()].map(item => `${item.name}=${item.value.toFixed(2)}`).join(", ")}`;
    }

    get value(): number {
        return sumFun(this.m.values(), item => item.value);
    }

    valueFrom(tag: string): number {
        return sumFun(this.m.values(), item => item.tag === tag ? item.value : 0);
    }

    static from(consumption: Consumption): QualityOfLife {
        const itemFuns = [
            QualityOfLife.fromLeisure,
            QualityOfLife.fromFoodQuantity,
            QualityOfLife.fromFoodQuality,
            QualityOfLife.fromFlood,
            QualityOfLife.fromConversation,
            QualityOfLife.fromConflict,
            QualityOfLife.fromPrestige,
            QualityOfLife.fromRitualHelp,
            QualityOfLife.fromOmens,
            QualityOfLife.fromGatherings,
            QualityOfLife.fromSerenity,
        ];
        const m = new Map<string, QualityOfLifeItem>();
        for (const itemFun of itemFuns) {
            const item = itemFun(consumption);
            m.set(item.name, item);
        }
        return new QualityOfLife(m);
    }

    static fromFoodQuantity(consumption: Consumption): QualityOfLifeItem {
        const food = Math.max(0.01, consumption.perCapitaFood);
        const value = clamp(50 * Math.log2(food), -100, 100);
        return new QualityOfLifeItem(
            "Food quantity", "material", value, `${pct(consumption.perCapitaFood)} of needs`);
    }

    static fromFoodQuality(consumption: Consumption): QualityOfLifeItem {
        const value = foodVarietyAppealFun(consumption.fishRatio);
        return new QualityOfLifeItem(
            "Food quality", "material", value, `${pct(consumption.fishRatio)} fish`);
    }

    static fromFlood(consumption: Consumption): QualityOfLifeItem {
        const clan = consumption.clan;
        const damageFactor = clan?.settlement?.floodLevel?.damageFactor ?? 0;
        const extreme = clan?.floodDamage?.qolDamage ?? 0;
        const value = -damageFactor * 20 - extreme;
        const note = extreme > 0
            ? `${pct(damageFactor)} damage, ${extreme.toFixed(0)} from flooding`
            : `${pct(damageFactor)} damage`;
        return new QualityOfLifeItem("Flood damage", "natural", value, note);
    }

    static fromConversation(consumption: Consumption): QualityOfLifeItem {
        const value = consumption.clan?.mutualAidPayoff() ?? 0;
        return new QualityOfLifeItem(
            "Conversation", "social", value, `${value.toFixed(1)}`);
    }

    static fromConflict(consumption: Consumption): QualityOfLifeItem {
        const value = consumption.clan?.conflictPayoff() ?? 0;
        return new QualityOfLifeItem(
            "Conflict", "social", value, `${value.toFixed(1)}`);
    }

    static fromPrestige(consumption: Consumption): QualityOfLifeItem {
        // Relative to the settlement's pop-weighted average prestige: being
        // above average boosts social QoL, below average reduces it.
        const value = consumption.clan ? 100 * getRelativeLocalPrestige(consumption.clan) : 0;
        return new QualityOfLifeItem(
            "Prestige", "social", value, `${value.toFixed(1)}`);
    }

    // Standing won by saying the words for a neighbor, or given up by having
    // to ask one. The same quantity the Stress view shows, read the other way
    // round.
    static fromRitualHelp(consumption: Consumption): QualityOfLifeItem {
        const value = consumption.clan?.ritualHelpPayoff() ?? 0;
        return new QualityOfLifeItem(
            "Ritual help", "social", value, `${value.toFixed(1)}`);
    }

    // How this year's portents came out. Each one that was read away leaves
    // the clan a point better off than it was, each one that was not, a point
    // worse; a year without signs is simply zero.
    static fromOmens(consumption: Consumption): QualityOfLifeItem {
        const clan = consumption.clan;
        const value = clan ? omenQolEffect(clan) : 0;
        const count = clan
            ? clan.ritualEvents.filter(e => e.def.key === 'omen').length : 0;
        return new QualityOfLifeItem(
            "Omens", "omens", value,
            count ? `${count} portent${count === 1 ? '' : 's'}` : 'no portents');
    }

    // Gladness at having been at the settlement's feasts: eating well in
    // company, the dancing, the day off from the fields. Kept in its own
    // category rather than folded in with the other social factors, which
    // feed back into births and deaths by a separate route.
    static fromGatherings(consumption: Consumption): QualityOfLifeItem {
        const clan = consumption.clan;
        const value = clan ? feastQolEffect(clan) : 0;
        const appeal = clan ? festivalAppeal(clan) : 0;
        return new QualityOfLifeItem(
            "Gatherings", "festival", value, `Feast appeal ${appeal.toFixed(2)}`);
    }

    // The ease of mind that comes of having given gifts to the ancestors and
    // to the powers of the world, and of believing they were well received:
    // the offerings made, the words said in the order they have to be said
    // in, and everyone there to see it done.
    static fromSerenity(consumption: Consumption): QualityOfLifeItem {
        const clan = consumption.clan;
        const value = clan ? riteQolEffect(clan) : 0;
        const power = clan ? festivalPower(clan) : 0;
        return new QualityOfLifeItem(
            "Serenity", "festival", value, `Rite power ${power.toFixed(2)}`);
    }

    static fromLeisure(consumption: Consumption): QualityOfLifeItem {
        // Avoid -Infinity
        const leisureFraction = Math.max(0.001, consumption.leisureFraction);
        // Appeal 0 at 30% leisure share
        const value = clamp(5 * Math.log2(leisureFraction / 0.3), -20, 20);
        return new QualityOfLifeItem(
            "Leisure", "personal", value, `${pct(leisureFraction)} leisure`);

    }
}

export class QualityOfLifeItem {
    constructor(
        readonly name: string,
        readonly tag: string,
        readonly value: number,
        readonly explanation: string,
    ) { }
}