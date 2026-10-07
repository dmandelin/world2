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
// separately.

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

// --- Births ------------------------------------------------------------------
//
// What nutrition is worth to the birth rate: a smoothstep from nothing at
// BIRTH_NUTRITION_FLOOR to a full birth rate at BIRTH_NUTRITION_FULL, flat
// either side:
//
//     t = clamp((nutrition - FLOOR) / (FULL - FLOOR), 0, 1)
//     3t^2 - 2t^3
//
// So no births at 40% nutrition or below, 30% of the full rate at 60%, 82%
// at 80%, 98% at 90%, and the full rate from 95%. Being better fed than that
// buys no more births.
export const BIRTH_NUTRITION_FLOOR = 0.4;
export const BIRTH_NUTRITION_FULL = 0.95;

export function nutritionBirthModifier(nutrition: number): number {
    const t = (nutrition - BIRTH_NUTRITION_FLOOR)
        / (BIRTH_NUTRITION_FULL - BIRTH_NUTRITION_FLOOR);
    if (!(t > 0)) return 0;
    if (t >= 1) return 1;
    return t * t * (3 - 2 * t);
}

// --- Famine ------------------------------------------------------------------
//
// The share of a clan's people who die of famine in a year, from its
// nutrition, so a poor diet counts as well as a small one. A power ramp, all
// dead at FAMINE_ALL_DIE and below, none at FAMINE_NONE_DIE and above, with
// the slope easing to nothing at the top:
//
//     u = clamp((NONE - nutrition) / (NONE - ALL), 0, 1)
//     u^p
//
// with p set so 5% die at 60%: about 61% at 45%, 33% at 50%, 15% at 55%,
// 0.8% at 65%.
//
// The clan is taken to share what there is toward its most vulnerable, so
// the share is the same in every age group.
export const FAMINE_ALL_DIE = 0.4;
export const FAMINE_NONE_DIE = 0.7;
export const FAMINE_AT_60 = 0.05;

const FAMINE_EXPONENT = Math.log(FAMINE_AT_60)
    / Math.log((FAMINE_NONE_DIE - 0.6) / (FAMINE_NONE_DIE - FAMINE_ALL_DIE));

export function famineDeathShare(nutrition: number): number {
    const u = (FAMINE_NONE_DIE - nutrition) / (FAMINE_NONE_DIE - FAMINE_ALL_DIE);
    if (!(u > 0)) return 0;
    if (u >= 1) return 1;
    return Math.pow(u, FAMINE_EXPONENT);
}

// --- Hazards -----------------------------------------------------------------
//
// The extra deaths from mishap and illness that a poorly fed clan suffers, as
// a share of the most it ever does: all of it at HAZARD_FULL_AT and below,
// none at HAZARD_NONE_AT and above, along a power ramp between:
//
//     u = clamp((NONE - nutrition) / (NONE - FULL), 0, 1)
//     u^p
//
// So 52% at 70%, 20% at 80%, 4% at 90%. The hazard death rate is multiplied
// by 1 + extra / 2, so at worst it is half as high again.
export const HAZARD_FULL_AT = 0.6;
export const HAZARD_NONE_AT = 1.0;
export const HAZARD_EXPONENT = 2.3;

export function nutritionExtraDeaths(nutrition: number): number {
    const u = (HAZARD_NONE_AT - nutrition) / (HAZARD_NONE_AT - HAZARD_FULL_AT);
    if (!(u > 0)) return 0;
    if (u >= 1) return 1;
    return Math.pow(u, HAZARD_EXPONENT);
}

export function nutritionHazardModifier(nutrition: number): number {
    return 1 + nutritionExtraDeaths(nutrition) / 2;
}

export function nutritionOf(quantity: number, cerealShare: number): number {
    return nutritionFromRaw(rawNutrition(quantity, cerealShare));
}
