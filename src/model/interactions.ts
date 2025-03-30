import { poisson } from "./distributions";
import type { Clan } from "./people";

export function exchangeGifts(c: Clan, d: Clan) {
    // Assume both cooperate, small benefit to both.
    c.interactionModifier += 1;
    d.interactionModifier += 1;
}

export function resolveDisputes(c: Clan, d: Clan) {
    // Assume both cooperate so that losses are shared.
    const loss = poisson(1);
    c.interactionModifier -= loss;
    d.interactionModifier -= loss;
}
