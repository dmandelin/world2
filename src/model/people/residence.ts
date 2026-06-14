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
// - Where workers spend their time is determined by labor choice. This is
//   a simplification, because there may not actually be farm work to do
//   100% of the time, but we'll assume they're doing other related activities

import { Activities } from "../decisions/effort";
import { Processes } from "../econ/econdefs";
import { Operation } from "../econ/operation";
import { sumFun } from "../lib/basics";
import type { Clan } from "./people";

export class ResidenceLevel {
    // Additive items of residence based on labor.
    items_: {label: string, fraction: number}[] = [];

    // Fraction of the time that mothers are specifically in the settlement.
    // The rest of the time they are with workers, wherever they are.
    mothersNestingFraction_: number = 0;

    constructor(readonly clan: Clan) {}

    clone() {
        const clone = new ResidenceLevel(this.clan);
        clone.items_ = this.items_.map(item => ({...item}));
        clone.mothersNestingFraction_ = this.mothersNestingFraction_;
        return clone;
    }

    update() {
        this.items_ = [];

        const careItem: {label: string, fraction: number} = {
            label: Activities.Care.name, 
            fraction: this.clan.effortAllocation.get(Activities.Care),
        };
        this.items_.push(careItem);
        const eitherItems: {label: string, fraction: number}[] = [];

        // Build up items that can only take place in one location, and
        // save the rest for later.
        let [totalWeight, homeWeight]: [number, number] = [0, 0];
        for (const [aop, fraction] of this.clan.effortAllocation.flattened()) {
            switch (aop) {
                // Handled above.
                case Activities.Care:
                    break;
                // In settlement.
                case Activities.Help:
                case Processes.Agriculture:
                    totalWeight += fraction * fraction;
                    homeWeight += fraction * fraction;
                    this.items_.push({ label: aop.name, fraction });
                    break;
                // Away from settlement.
                case Processes.Fishing:
                    totalWeight += fraction * fraction;
                    this.items_.push({ label: aop.name, fraction: 0 });
                    break;
                // Either location.
                case Activities.Leisure:
                default:
                    const item = { label: aop.name, fraction };
                    this.items_.push(item);
                    eitherItems.push(item);
                    break;
            }
        }

        // Assign location for Either skills based on weights.
        const baseHomeFraction = homeWeight / totalWeight;
        for (const item of eitherItems) {
            item.fraction *= baseHomeFraction;
        }

        // Assign location for care.
        careItem.fraction *=
            this.mothersNestingFraction_ +
            (1 - this.mothersNestingFraction_) * baseHomeFraction;
    }

    get items(): {label: string, fraction: number}[] {
        return this.items_;
    }

    get mothersNestingFraction(): number {
        return this.mothersNestingFraction_;
    }

    get fractionInSettlement(): number {
        return sumFun(this.items_, item => item.fraction);
    }
}

export function groupSedentismDescription(sedentismFraction: number): string {
    if (sedentismFraction < 0.25) {
        return 'Cereal Fields';
    } else if (sedentismFraction < 0.5) {
        return 'Farming Camp';
    } else if (sedentismFraction < 0.75) {
        return 'Home Camp';
    } else {
        return 'Settlement';
    }
}

export function groupSedentismImage(sedentismFraction: number): string {
    if (sedentismFraction < 0.25) {
        return 'habitation-1.png';
    } else if (sedentismFraction < 0.5) {
        return 'habitation-2.png';
    } else if (sedentismFraction < 0.75) {
        return 'habitation-3.png';
    } else {
        // The habitation-4 image has way too many buildings and way too
        // many building types, but I couldn't get a proper intermediate
        // between the current 2 and 3, which is what we'd really want.
        return 'habitation-3.png';
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
