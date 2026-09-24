import { World } from '../src/model/world';
import { Conversation } from '../src/model/relations/conversation';
const world = new World();
world.initialize();
for (const s of world.allSettlements) {
  console.log(`== ${s.name}`);
  for (const c of s.clans) {
    const b = c.conversationBudget.items.map(i => `${i.source.name}:sh=${i.share.toFixed(3)} sup=${i.supply.toFixed(2)} used=${i.used.toFixed(3)}`).join(' | ');
    console.log(`  ${c.name} pop=${c.population} res=${c.residenceFraction.toFixed(2)} ${b}`);
  }
  const cl = s.clans;
  for (let i = 0; i < cl.length; i++) for (let j = i+1; j < cl.length; j++) {
    const conv = world.interactions.getOfType(cl[i], cl[j], Conversation);
    console.log(`    ${cl[i].name}-${cl[j].name}: ${conv ? conv.items.map(x => `${x.source.name}(${x.offered1to2.toFixed(3)},${x.offered2to1.toFixed(3)}->${x.strength.toFixed(3)})`).join(' ') : 'NONE'}`);
  }
}
