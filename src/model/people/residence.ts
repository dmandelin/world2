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

export class ResidenceLevel {
    constructor(
        readonly index: number,
        readonly name: string,
        readonly description: string,
        readonly useFraction: (farmingRatio: number) => number,
    ) {}
}

export const ResidenceLevels = {
    // Nomadic, no agriculture.
    Nomadic: new ResidenceLevel(0, 'Nomadic',
        'Nomadic',
        (_: number) => 0,
    ),
    // Living near fields while working on them, but otherwise
    // mostly nomadic.
    SemiNomadic: new ResidenceLevel(1, 'Semi-nomadic',
        'Semi-nomadic',
        (farmingRatio: number) => farmingRatio,
    ),
    // Living near fields most of the time, especially when taking
    // care of children, but still spending some time on nomadic
    // hunting and collecting.
    SemiPermanent: new ResidenceLevel(2, 'Semi-permanent',
        'Semi-permanent',
        (farmingRatio: number) => 0.5 * farmingRatio + 0.5,
    ),
    // Permanent: living near the village.
    Permanent: new ResidenceLevel(3, 'Permanent',
        'Permanent',
        (_: number) => 1,
    ),
};