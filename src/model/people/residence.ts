// Reworking residence.
//
// Though this could make sense in some milieux, for us it may
// not make that much sense for clans to have a "residence policy".
// Rather, they will spend various amounts of time in various
// places depending on their activities.
//
// The main activity choice they have now is labor allocation
// between farming and fishing (which represents hunting, gathering,
// and collecting). What we need now is a choice for "mothers",
// specifically referring to the *time* any person spends caring
// for children as opposed to other labor activities.
//
// It seems to be practically universal for men to travel more than
// women, so we will assume that mothers are always less nomadic in
// residence habits. Their choice is between:
//
// *    With dad: living in settlement or not according to the
//      general labor ratio.
// *    By the fields: living in the settlement all the time
// *    Possibly in-between options, but we'll see if they are useful.
//
// Factors that vary based on these:
// *    Happiness and health bonus for families spending time together,
//      wherever that actually is.
// *    Birth rate bonus for mothers spending less time moving.
// *    Possible happiness bonus for mothers spending less time moving,
//      but this might also depend on expectations.
// *    Interactions -- ultimately we need to have types of interactions
//      that are much more effective in settlement. Nomads certain have
//      the interactions they need, but there's a certain density that
//      probably helps especially with information.
//
// Residence level itself will then be calculated from choices, and we
// can infer a residence level category from that.
//
// The final piece is clan ideas and preferences. We may want to track
// the "idea of the village" as clans' own notion of how much that place
// counts. We could rate this by the existence of certain things:
// -    Moveable fields
// -    Moveable child care areas
// -    Permanent fields
// -    Permanent child care and socializing areas
// -    A name
// -    Ancestors buried there
// -    Better houses
// -    A tell
// and perhaps rate the "kind of community" as area, village, town, etc.

// More on putting this together
//
// - We have a standard assumption that 2/3 of adults are workers, 1/3
//   are mothers
// - Where workers spend their time is determined by labor choice. This is
//   a simplification, because there may not actually be farm work to do
//   100% of the time, but we'll assume they're doing other related activities

import { sumFun } from "../lib/basics";
import type { Clan } from "./people";
import { SkillUseLocation } from "./skills";

export class ResidenceLevel {
    // Additive items of residence based on labor.
    laborItems_: {skill: string, fraction: number}[] = [];

    // Fraction of the time that mothers are specifically in the settlement.
    // The rest of the time they are with workers, wherever they are.
    mothersNestingFraction_: number = 0;

    constructor(readonly clan: Clan) {}

    update() {
        this.laborItems_ = [];

        const eitherItems: {skill: string, fraction: number}[] = [];
        let [totalWeight, awayWeight]: [number, number] = [0, 0];

        for (const [skill, laborFraction] of this.clan.laborAllocation.allocs) {
            if (skill.useLocation === SkillUseLocation.HomeOnly) {
                this.laborItems_.push({
                    skill: skill.name,
                    fraction: laborFraction,
                });
                totalWeight += laborFraction * laborFraction;
            } else if (skill.useLocation === SkillUseLocation.AwayOnly) {
                awayWeight += laborFraction * laborFraction;
            } else if (skill.useLocation === SkillUseLocation.Either) {
                eitherItems.push({
                    skill: skill.name,
                    fraction: laborFraction,
                });
            }
        }

        // Assign location for Either skills based on weights, but cut off near 0.
        const baseHomeFraction = totalWeight / (totalWeight + awayWeight);
        const homeFraction = baseHomeFraction < 0.05 ? 0 : baseHomeFraction > 0.95 ? 1 : baseHomeFraction;
        for (const item of eitherItems) {
            this.laborItems_.push({
                skill: item.skill,
                fraction: item.fraction * homeFraction,
            });
        }
    }

    get mothersNestingFraction(): number {
        return this.mothersNestingFraction_;
    }

    get workersFractionInSettlement(): number {
        return sumFun(this.laborItems_, item => item.fraction);
    }

    get mothersFractionInSettlement(): number {
        return this.mothersNestingFraction_ + (1 - this.mothersNestingFraction_) * this.workersFractionInSettlement;
    }

    get fractionInSettlement(): number {
            return 2/3 * this.workersFractionInSettlement + 1/3 * this.mothersFractionInSettlement;
    }
}

export function groupSedentismDescription(sedentismFraction: number): string {
    if (sedentismFraction < 0.25) {
        return 'Cereal Fields';
    } else if (sedentismFraction < 0.5) {
        return 'Farm Camp';
    } else if (sedentismFraction < 0.75) {
        return 'Home Camp';
    } else {
        return 'Settlement';
    }
}

export function clanSedentismDescription(sedentismFraction: number): string {
    if (sedentismFraction < 0.25) {
        return 'Nomadic';
    } else if (sedentismFraction < 0.5) {
        return 'Seminomadic';
    } else if (sedentismFraction < 0.75) {
        return 'Semisedentary';
    } else {
        return 'Sedentary';
    }
}
