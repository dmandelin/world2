// The quality of a plot of farmland, and the mix of qualities a fresh
// stretch of alluvium comes in.
//
// This is a leaf module on purpose: econdefs.ts needs the mean quality of
// fresh alluvium to set the farming base, and land.ts needs everything here,
// so anything that imported econdefs back would close a cycle.

// One of the five levels a plot of land can sit at. The productivity number
// is a straight multiplier on what a worker gets off that plot, with
// ordinary land as the unit.
export class LandQuality {
    constructor(
        readonly level: number,
        readonly name: string,
        readonly productivity: number,
        readonly color: string,
    ) { }
}

// Indexed by level - 1, worst first.
export const LandQualities: readonly LandQuality[] = [
    new LandQuality(1, 'Poor', 0.50, '#b45309'),
    new LandQuality(2, 'Marginal', 0.75, '#d97706'),
    new LandQuality(3, 'Normal', 1.00, '#9ca3af'),
    new LandQuality(4, 'Good', 1.50, '#84cc16'),
    new LandQuality(5, 'Prime', 2.00, '#15803d'),
];

// Best first: the order a clan takes plots in when its turn to pick comes.
export const QUALITY_INDEXES_BEST_FIRST: readonly number[] =
    LandQualities.map((_, i) => i).reverse();

// The mix a fresh stretch of alluvium is drawn from: about a third prime,
// half good, a sixth ordinary. Nothing starts out poor or marginal -- land
// only falls that far later, by salt or by exhaustion, which this model does
// not yet do. Each settlement's own weights are jostled around these before
// its plots are drawn, so no two stretches of river come out quite alike.
export const FRESH_ALLUVIUM_WEIGHTS: readonly number[] = [0, 0, 1 / 6, 1 / 2, 1 / 3];

// How far a settlement's own mix may stray from the weights above: each
// weight is multiplied by a draw from this range before the plots are dealt.
export const ALLUVIUM_MIX_JOSTLE_MIN = 0.55;
export const ALLUVIUM_MIX_JOSTLE_MAX = 1.45;

// What the fresh-alluvium mix is worth on average -- about 1.58 ordinary
// plots to the plot. Used for a clan with no holding to read, and for
// setting the farming base in econdefs.ts.
export const FRESH_ALLUVIUM_QUALITY_FACTOR = FRESH_ALLUVIUM_WEIGHTS.reduce(
    (acc, w, i) => acc + w * LandQualities[i].productivity, 0);
