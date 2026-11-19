// Samples marriage appeal (prestige) and its alignment/respect items across
// clan pairs in headless runs, for typical values.
import { World } from '../src/model/world';
import { getPrestige } from '../src/model/relations/prestige';

const runs = Number(process.argv[2] ?? 2);
const years = Number(process.argv[3] ?? 150);
const sampleEvery = 25;

type Acc = Map<string, number[]>;
const acc: Record<string, Acc> = { same: new Map(), other: new Map() };
function push(a: Acc, k: string, v: number) { let l = a.get(k); if (!l) a.set(k, l = []); l.push(v); }

function sample(world: World) {
    for (const s of world.allClans) {
        for (const o of world.allClans) {
            if (s === o) continue;
            const p = world.perceptions.get(s, o);
            if (!p) continue;
            const a = acc[s.settlement === o.settlement ? 'same' : 'other'];
            const A = p.alignment.value, R = p.respect.value;
            const P = getPrestige(s, o);
            push(a, 'P', P); push(a, 'A', A); push(a, 'R', R);
            push(a, 'info', p.information.value);
            const r = Math.max(0, R / 100);
            if (A !== 0 && r > 0) {
                push(a, 'dP/dA', 0.5 * Math.sqrt(r / Math.abs(A)));
                push(a, 'dP/dR(per pt)', Math.sign(A) * 0.5 * Math.sqrt(Math.abs(A) / r) / 100);
            }
            const sums: Record<string, number> = {};
            for (const it of p.alignment.items) sums['A:' + it.label] = (sums['A:' + it.label] ?? 0) + it.value;
            for (const it of p.respect.items) sums['R:' + it.label] = (sums['R:' + it.label] ?? 0) + it.value;
            for (const it of p.alignment.items) sums['Abase:' + it.label] = it.baseValue;
            for (const it of p.respect.items) sums['Rbase:' + it.label] = it.baseValue;
            for (const [k, v] of Object.entries(sums)) push(a, k, v);
            push(a, 'clamped', Math.abs(p.alignment.items.reduce((t, i) => t + i.value, 0)) > 1 ? 1 : 0); push(a, 'A:rawSum', p.alignment.items.reduce((t, i) => t + i.value, 0));
        }
    }
    // Per-clan stats
    for (const c of world.allClans) {
        push(acc.same, 'clan:pop', c.population);
    }
}

function q(l: number[], f: number) { const s = [...l].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; }
for (let r = 0; r < runs; ++r) {
    const world = new World({ headless: true });
    world.initialize();
    for (let y = 1; y <= years; ++y) {
        world.advanceHeadless(1);
        if (y % sampleEvery === 0 && y >= 50) sample(world);
    }
    console.error(`run ${r + 1} done: clans ${world.allClans.length}`);
}
for (const kind of ['same', 'other']) {
    console.log(`\n=== ${kind} settlement ===  n=${acc[kind].get('P')?.length}`);
    for (const [k, l] of [...acc[kind]].sort()) {
        const nz = l.filter(x => x !== 0).length;
        const m = l.reduce((a, b) => a + b, 0) / l.length; const sd = Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length);
        console.log(`sd ${sd.toFixed(4).padStart(8)} ${k.padEnd(28)} p10 ${q(l, .1).toFixed(4).padStart(9)} p50 ${q(l, .5).toFixed(4).padStart(9)} p90 ${q(l, .9).toFixed(4).padStart(9)} mean ${(l.reduce((a, b) => a + b, 0) / l.length).toFixed(4).padStart(9)}  nz ${(100 * nz / l.length).toFixed(0)}%`);
    }
}
