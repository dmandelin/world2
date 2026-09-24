// Nutrition: the overall nutritional state of a clan, where 1 means its people
// get everything they normally need.
//
// It is the product of two factors:
//
//     Quantity  food eaten per head, against what the clan needs
//     Balance   how well the mix of foods covers what people need
//
// Short of 1, the product is the nutrition. Past 1, more food does less and
// less good: the excess runs toward a ceiling of NUTRITION_MAX along an
// exponential, which leaves the slope continuous at 1.
//
// Births, deaths, and Fortune all read nutrition rather than quantity and mix
// separately. Starvation deaths still read quantity alone, since they are a
// question of how much food there is, not of how good it is.

// --- Balance -----------------------------------------------------------------
//
// Fishing stands for hunting and gathering generally -- varied, but short of
// some things a farm provides -- and farming for mixed production including
// goats and sheep, which is nourishing but narrow when it is all there is.
// So the best diet is a mix, at 30% cereals. Either side of that balance falls
// off as the square of the distance, steeper toward cereals: 90% at all fish,
// 70% at all cereal. Both halves are parabolas peaking at the ideal, so the
// curve is smooth there.
export const NUTRITION_IDEAL_CEREAL_SHARE = 0.3;
export const BALANCE_AT_NO_CEREAL = 0.9;
export const BALANCE_AT_ALL_CEREAL = 0.7;

export function foodBalance(cerealShare: number): number {
    const d = cerealShare - NUTRITION_IDEAL_CEREAL_SHARE;
    if (d < 0) {
        const t = d / NUTRITION_IDEAL_CEREAL_SHARE;
        return 1 - (1 - BALANCE_AT_NO_CEREAL) * t * t;
    }
    const t = d / (1 - NUTRITION_IDEAL_CEREAL_SHARE);
    return 1 - (1 - BALANCE_AT_ALL_CEREAL) * t * t;
}

// --- Nutrition ---------------------------------------------------------------

export const NUTRITION_MAX = 1.25;

// Quantity times balance, before diminishing returns past 1.
export function rawNutrition(quantity: number, cerealShare: number): number {
    const q = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
    return q * foodBalance(cerealShare);
}

// Past 1, the excess closes the gap to the ceiling exponentially:
//
//     1 + (MAX - 1) * (1 - e^(-(raw - 1) / (MAX - 1)))
//
// whose slope at 1 is 1, matching the straight line below it.
export function nutritionFromRaw(raw: number): number {
    if (raw <= 1) return raw;
    const room = NUTRITION_MAX - 1;
    return 1 + room * -Math.expm1(-(raw - 1) / room);
}

export function nutritionOf(quantity: number, cerealShare: number): number {
    return nutritionFromRaw(rawNutrition(quantity, cerealShare));
}
