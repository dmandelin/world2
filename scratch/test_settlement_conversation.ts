import { World } from '../src/model/world';
import { GROUP_SOURCES, GroupSources, appealOf } from '../src/model/relations/conversation';

const world = new World();
world.initialize();

const uruk = world.allSettlements.find(s => s.name === 'Uruk')!;
console.log(`=== Reallocation Trace for Uruk Settlement Group Source ===\n`);

const participants = uruk.clans.filter(c => c.population > 0);
const source = GroupSources.Settlement;

// Initial weights and supply
console.log('Initial Supply & Weights:');
for (const c1 of participants) {
    const share = c1.residenceFraction;
    const popMod = Math.sqrt(c1.population / 20);
    const supply = share * source.intensity * popMod;
    console.log(`\nClan ${c1.name}: resFrac=${share.toFixed(3)}, pop=${c1.population}, popMod=${popMod.toFixed(2)} => Total Supply = ${supply.toFixed(2)}`);
    for (const c2 of participants) {
        if (c1 === c2) continue;
        const w = appealOf(c1, c2);
        console.log(`  Target ${c2.name}: pop=${c2.population}, appeal=${appealOf(c1, c2).toFixed(3)} => Weight = ${w.toFixed(2)}`);
    }
}

// Initial Spread (Pass 0)
console.log('\n--- Pass 0 (Initial Proportional Spread) ---');
const offers = new Map<string, Map<string, number>>();
for (const c1 of participants) {
    const share = c1.residenceFraction;
    const popMod = Math.sqrt(c1.population / 20);
    const supply = share * source.intensity * popMod;
    const weights = participants.filter(c2 => c2 !== c1).map(c2 => ({ c2, w: appealOf(c1, c2) }));
    const totalW = weights.reduce((sum, item) => sum + item.w, 0);
    const m = new Map<string, number>();
    for (const { c2, w } of weights) {
        const off = (w / totalW) * supply;
        const offStr = off;
        m.set(c2.name, off);
        console.log(`  ${c1.name} -> ${c2.name}: offeredStrength=${offStr.toFixed(3)}`);
    }
    offers.set(c1.name, m);
}

// Pass 0 Matched Strengths
console.log('\nPass 0 Matched Strengths:');
for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
        const c1 = participants[i];
        const c2 = participants[j];
        const off1str = offers.get(c1.name)!.get(c2.name)!;
        const off2str = offers.get(c2.name)!.get(c1.name)!;
        const matched = Math.min(off1str, off2str, 1.0);
        console.log(`  (${c1.name} <-> ${c2.name}): str1=${off1str.toFixed(3)}, str2=${off2str.toFixed(3)} => Matched=${matched.toFixed(3)}`);
    }
}
