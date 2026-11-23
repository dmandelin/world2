// One level below sample_appeal.ts: for each directed pair of clans in the
// same settlement, the inputs the alignment and respect items are built from,
// the chain-rule derivative of marriage appeal with respect to each, and
// empirical slopes for the links that are stochastic or run through memory.
//   npx esbuild scratch/sample_deep_inputs.ts --bundle --platform=node --outfile=<tmp>/d.cjs && node <tmp>/d.cjs [runs] [years]
import { World } from '../src/model/world';
import { getPrestige } from '../src/model/relations/prestige';
import { KinConnection, MarriageConnection } from '../src/model/relations/connection';
import { MutualAidInteraction } from '../src/model/relations/mutualaid';
import { getRelativeAttention } from '../src/model/relations/conversation';
import { hawkProbability } from '../src/model/relations/conflict';
import { getHoliness } from '../src/model/relations/holiness';
import { ObservationDefs, observedEstimate, giftsReceived, conflictsSuffered } from '../src/model/relations/information';
import { careSociabilityFactor } from '../src/model/people/care';
import { SkillDefs } from '../src/model/econ/econdefs';
import { festivalAppeal, festivalPower } from '../src/model/festivals';
import type { Clan } from '../src/model/people/people';

const runs = Number(process.argv[2] ?? 4);
const years = Number(process.argv[3] ?? 200);

type Row = Record<string, number>;
const rows: Row[] = [];
const clanRows: Row[] = [];

function avgSkill(c: Clan) {
    const defs = Object.values(SkillDefs).filter(d => d !== SkillDefs.Care);
    return defs.reduce((t, d) => t + c.skills.v(d), 0) / defs.length;
}

function sample(world: World) {
    const year = world.year.value;
    for (const s of world.allClans) {
        // Respect for each clan's own giving: aid given, absolute.
        clanRows.push({
            pop: s.population,
            aidGiven: s.distribution.totalFoodAidGiven + s.stockOutflow.totalFoodAidGiven,
            giving: s.traits.giving,
            giftsGiven: world.lastFoodGifts?.getClanSummary(s.uuid)?.totalGiftsGivenAbs ?? 0,
            production: s.production.totalFood(),
            residence: s.residenceFraction,
            farming: s.effortAllocation.farmingRatio(),
            ditchShare: 100 * s.ditchingEffortShare,
            careProvision: s.careProvision,
            avgSkill: avgSkill(s),
            materialQoL: s.qol.valueFrom('material'),
            feastAppeal: festivalAppeal(s),
            ritePower: festivalPower(s),
        });
        for (const o of s.settlement.clans) {
            if (o === s) continue;
            const p = world.perceptions.get(s, o);
            const back = world.perceptions.get(o, s);
            if (!p || !back) continue;
            const A = p.alignment.value, R = p.respect.value, r = Math.max(0, R / 100);
            const clamped = Math.abs(p.alignment.currentItemsTotal) >= 1 - 1e-9
                && Math.abs(p.alignment.items.reduce((t, i) => t + i.value, 0)) > 1;
            const dPdA = A !== 0 && r > 0 ? 0.5 * Math.sqrt(r / Math.abs(A)) : 0;
            const dPdAeff = clamped ? 0 : dPdA;
            const dPdR = A !== 0 && r > 0 ? Math.sign(A) * 0.5 * Math.sqrt(Math.abs(A) / r) / 100 : 0;
            const conn = world.connections;
            const kin = conn.getForType(s, o, KinConnection) ? 1 : 0;
            const married = conn.getForType(s, o, MarriageConnection)?.relatedness ?? 0;
            const aff = p.affinity;
            const ma = world.interactions.get(s.uuid, o.uuid)
                .find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined;
            const gift = world.lastFoodGifts?.getGift(o.uuid, s.uuid);
            const conflict = world.conflicts.get(s, o);
            const info = p.information;
            const item = (label: string) => p.alignment.items.find(i => i.label === label);
            rows.push({
                year, P: getPrestige(s, o), Pback: getPrestige(o, s), A, R, dPdA, dPdAeff, dPdR,
                clamped: clamped ? 1 : 0,
                // Affinity.
                kin, residenceSim: 1 - Math.min(1, Math.abs(s.residenceFraction - o.residenceFraction)),
                livelihoodSim: 1 - Math.min(1, Math.abs(s.effortAllocation.farmingRatio() - o.effortAllocation.farmingRatio())),
                temperament: aff.temperament, affAbs: aff.absolute, affMean: aff.mean,
                affRel: aff.relative, affForAlign: aff.forAlignment,
                // Social ties and attention.
                married, attention: getRelativeAttention(s, o),
                upbringing: careSociabilityFactor(s.careProvision, o.careProvision),
                sSoc: s.traits.sociability, oSoc: o.traits.sociability,
                historyMult: p.conversationHistory.multiplier,
                // Mutual aid.
                maAmount: ma?.amount ?? 0, maTrust: ma?.trust ?? 0, maTrustTarget: ma?.trustModel.target ?? 0,
                nNeighbors: s.settlement.clans.length - 1,
                // Gifts (what the object gave the subject this year) and memory.
                giftPerCap: gift?.giftPerCapita ?? 0, giftsStanding: giftsReceived(s, o, year),
                generosityBelief: observedEstimate(s, o, ObservationDefs.Generosity),
                oGiving: o.traits.giving,
                // Conflict.
                oHawk: hawkProbability(o.traits.peaceableness),
                oHawkPlays: conflict?.hawkCountBy(o) ?? 0,
                conflictStanding: conflictsSuffered(s, o, year),
                bellicosityBelief: observedEstimate(s, o, ObservationDefs.Bellicosity),
                // Reputation for conduct.
                righteousnessBelief: observedEstimate(s, o, ObservationDefs.Righteousness),
                oRighteousness: o.traits.righteousness,
                diligenceSeen: observedEstimate(s, o, ObservationDefs.Diligence),
                oDitchShare: 100 * o.ditchingEffortShare,
                sDitchExpect: 100 * s.traits.ditchingExpectation,
                sDitchAdmire: s.traits.ditchingAdmiration,
                sFestAdmire: s.traits.festivalAdmiration,
                // Ritual.
                holiness: getHoliness(s, o),
                ritualHelp: item('Ritual Help')?.value ?? 0,
                // Respect inputs.
                info: info.value, contact: info.contact, directTarget: info.directTarget,
                infoTarget: info.target,
                oPop: o.population,
                oAid: o.distribution.totalFoodAidGiven + o.stockOutflow.totalFoodAidGiven,
                oSkill: avgSkill(o), oMaterialQoL: o.qol.valueFrom('material'),
                oConvQoL: o.qol.m.get('Conversation')?.value ?? 0,
            });
        }
    }
}

for (let run = 0; run < runs; ++run) {
    const world = new World({ headless: true });
    world.initialize();
    for (let y = 1; y <= years; ++y) {
        world.advanceHeadless(1);
        if (y % 25 === 0 && y >= 50) sample(world);
    }
}

const q = (l: number[], f: number) => { const s = [...l].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
const mean = (l: number[]) => l.reduce((a, b) => a + b, 0) / l.length;
const sd = (l: number[]) => { const m = mean(l); return Math.sqrt(mean(l.map(x => (x - m) ** 2))); };
function summarize(title: string, rs: Row[]) {
    console.log(`\n=== ${title} (n=${rs.length})`);
    for (const k of Object.keys(rs[0])) {
        const l = rs.map(r => r[k]).filter(Number.isFinite);
        console.log(`${k.padEnd(20)} p10 ${q(l, .1).toFixed(4).padStart(9)} p50 ${q(l, .5).toFixed(4).padStart(9)} p90 ${q(l, .9).toFixed(4).padStart(9)} mean ${mean(l).toFixed(4).padStart(9)} sd ${sd(l).toFixed(4).padStart(9)}`);
    }
}
// Least-squares slope and correlation of y on x.
function slope(title: string, rs: Row[], x: string, y: string) {
    const xs = rs.map(r => r[x]), ys = rs.map(r => r[y]);
    const mx = mean(xs), my = mean(ys);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < xs.length; ++i) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
    console.log(`${title.padEnd(44)} d${y}/d${x} = ${(sxy / sxx).toPrecision(3).padStart(9)}   corr ${(sxy / Math.sqrt(sxx * syy)).toFixed(2)}`);
}
summarize('pairs, same settlement', rows);
summarize('clans', clanRows);
console.log('\n=== empirical links');
slope('conflict standing vs object hawk prob', rows, 'oHawk', 'conflictStanding');
slope('hawk plays/yr vs object hawk prob', rows, 'oHawk', 'oHawkPlays');
slope('bellicosity belief vs object hawk prob', rows, 'oHawk', 'bellicosityBelief');
slope('generosity belief vs object giving', rows, 'oGiving', 'generosityBelief');
slope('gifts standing vs gift/head this year', rows, 'giftPerCap', 'giftsStanding');
slope('gift/head this year vs back-appeal', rows, 'Pback', 'giftPerCap');
slope('gifts standing vs back-appeal', rows, 'Pback', 'giftsStanding');
slope('appeal vs back-appeal', rows, 'Pback', 'P');
slope('righteousness belief vs object trait', rows, 'oRighteousness', 'righteousnessBelief');
slope('diligence seen vs object ditch share', rows, 'oDitchShare', 'diligenceSeen');
slope('attention vs object sociability', rows, 'oSoc', 'attention');
slope('attention vs subject sociability', rows, 'sSoc', 'attention');
slope('info vs contact', rows, 'contact', 'info');
slope('mutual aid amount vs subject pop', rows.map(r => ({ ...r, sPop: 0 })), 'oPop', 'maAmount');
slope('trust vs alignment', rows, 'A', 'maTrust');
slope('aid given vs giving (clan)', clanRows, 'giving', 'aidGiven');
slope('aid given vs pop (clan)', clanRows, 'pop', 'aidGiven');
slope('gifts given vs production (clan)', clanRows, 'production', 'giftsGiven');
slope('ditch share vs ... (clan) care', clanRows, 'careProvision', 'ditchShare');
