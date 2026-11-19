// Does a clan's appeal (to its local wife-givers) change how many of its
// eligible men get betrothed each year? Buckets clan-years by appeal rank
// within the settlement.
import { World } from '../src/model/world';
import { getLocalPrestige } from '../src/model/relations/prestige';

const runs = Number(process.argv[2] ?? 4), years = Number(process.argv[3] ?? 200);
const buckets = [0, 1, 2, 3].map(() => ({ men: 0, taken: 0, women: 0, wtaken: 0, n: 0 }));
for (let r = 0; r < runs; ++r) {
    const world = new World({ headless: true });
    world.initialize();
    for (let y = 1; y <= years; ++y) {
        // Rank before the year's marriages, from planning-time perceptions.
        world.advanceHeadless(1);
        if (y < 30) continue;
        const d = world.lastMarriageDecisions;
        if (!d) continue;
        for (const s of world.allSettlements) {
            const clans = s.clans.filter(c => d.husbandsOf(c));
            if (clans.length < 4) continue;
            const ranked = [...clans].sort((a, b) => getLocalPrestige(a) - getLocalPrestige(b));
            ranked.forEach((c, i) => {
                const q = Math.min(3, Math.floor(4 * i / ranked.length));
                const h = d.husbandsOf(c)!, w = d.wivesOf(c)!;
                buckets[q].men += h.count; buckets[q].taken += h.taken;
                buckets[q].women += w.count; buckets[q].wtaken += w.taken; buckets[q].n++;
            });
        }
    }
}
buckets.forEach((b, q) => console.log(`appeal quartile ${q + 1}: clan-years ${b.n}  eligible men/yr ${(b.men / b.n).toFixed(2)}  betrothed ${(100 * b.taken / b.men).toFixed(1)}%   eligible women/yr ${(b.women / b.n).toFixed(2)} betrothed ${(100 * b.wtaken / b.women).toFixed(1)}%`));
