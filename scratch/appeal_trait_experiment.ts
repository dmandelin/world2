// Randomized experiment: what does a clan's appeal, as its neighbors see it,
// do when its traits change? After a warm-up, every clan gets an independent
// +/-1 SD shock to each trait at once. A clan's appeal to its neighbors, and
// each alignment and respect item behind it, is recorded before the shock and
// some years after, as is how many of its eligible men were betrothed.
// Writes one JSON line per clan; analyze with scratch/appeal_trait_analysis.py.
//   npx esbuild scratch/appeal_trait_experiment.ts --bundle --platform=node --outfile=<tmp>/x.cjs && node <tmp>/x.cjs [runs] [warmup] > out.jsonl
import { World } from '../src/model/world';
import { getPrestige } from '../src/model/relations/prestige';
import type { Clan } from '../src/model/people/people';

const runs = Number(process.argv[2] ?? 10);
const warmup = Number(process.argv[3] ?? 60);
const CHECKPOINTS = [5, 15];

// Trait, shock size (about one SD across clans), getter and setter.
const TRAITS: [string, number][] = [
    ['giving', 15], ['peaceableness', 12], ['sociability', 15],
    ['righteousness', 12], ['intellect', 12], ['tenderness', 12],
    ['diligence', 12], ['ditchingEffort', 0.03], ['festivalGiving', 0.15],
];
function getTrait(c: Clan, t: string): number {
    return (c.traits as any)[t] as number;
}
function setTrait(c: Clan, t: string, v: number): void {
    (c.traits as any)[t] = v;
}

// How the clan's neighbors see it: appeal, alignment, respect, and each item,
// averaged over the other clans of its settlement, weighted by population.
function seenBy(clan: Clan): Record<string, number> | undefined {
    const others = clan.settlement.clans.filter(o => o !== clan && o.population > 0);
    if (!others.length) return undefined;
    const out: Record<string, number> = {};
    let w = 0;
    for (const o of others) {
        const p = clan.world.perceptions.get(o, clan);
        if (!p) continue;
        const ow = o.population;
        w += ow;
        const add = (k: string, v: number) => { out[k] = (out[k] ?? 0) + ow * v; };
        add('P', getPrestige(o, clan));
        add('A', p.alignment.value);
        add('R', p.respect.value);
        add('info', p.information.value);
        for (const i of p.alignment.items) add('A:' + i.label, i.value);
        for (const i of p.respect.items) add('R:' + i.label, i.value);
    }
    if (w <= 0) return undefined;
    for (const k of Object.keys(out)) out[k] /= w;
    out.pop = clan.population;
    return out;
}

for (let run = 0; run < runs; ++run) {
    const world = new World({ headless: true });
    world.initialize();
    for (let y = 1; y <= warmup; ++y) world.advanceHeadless(1);

    type Track = {
        clan: Clan, settlement: string, shocks: Record<string, number>,
        before: Record<string, number>, after: Record<number, Record<string, number>>,
        men: number, taken: number,
    };
    const tracks: Track[] = [];
    for (const clan of world.allClans) {
        const before = seenBy(clan);
        if (!before) continue;
        const shocks: Record<string, number> = {};
        for (const [t, d] of TRAITS) {
            const old = getTrait(clan, t);
            setTrait(clan, t, old + (Math.random() < 0.5 ? -d : d));
            shocks[t] = (getTrait(clan, t) - old) / d;
        }
        tracks.push({ clan, settlement: clan.settlement.uuid, shocks, before, after: {}, men: 0, taken: 0 });
    }
    const last = Math.max(...CHECKPOINTS);
    for (let y = 1; y <= last; ++y) {
        world.advanceHeadless(1);
        const d = world.lastMarriageDecisions;
        for (const t of tracks) {
            const h = d?.husbandsOf(t.clan);
            if (h) { t.men += h.count; t.taken += h.taken; }
            if (CHECKPOINTS.includes(y) && world.allClans.includes(t.clan)
                && t.clan.settlement.uuid === t.settlement) {
                const s = seenBy(t.clan);
                if (s) t.after[y] = s;
            }
        }
    }
    for (const t of tracks) {
        console.log(JSON.stringify({
            run: `${process.pid}-${run}`, settlement: t.settlement, shocks: t.shocks,
            before: t.before, after: t.after, men: t.men, taken: t.taken,
        }));
    }
}
