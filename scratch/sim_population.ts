// Headless runs of the whole world, reporting population and its age
// structure every 20 years, with the period's births and deaths by cause. For
// comparing population dynamics before and after a model change. Bundle and
// run it with node, as in test_demography.ts:
//   npx esbuild scratch/sim_population.ts --bundle --platform=node --outfile=<tmp>/s.cjs && node <tmp>/s.cjs [runs] [years] [baseBirthRate]
import { World } from '../src/model/world';
import { tuning } from '../src/model/tuning';
import { DEATH_CAUSES } from '../src/model/people/population';
import { FEMALE, MALE, MaritalStatus } from '../src/model/people/demography';

const runs = Number(process.argv[2] ?? 3);
const years = Number(process.argv[3] ?? 200);
if (process.argv[4]) tuning.baseBirthRate = Number(process.argv[4]);

const PERIOD = 20;

// Births and deaths by cause since the last report.
let births = 0;
let deaths = new Array(DEATH_CAUSES.length).fill(0);

function tally(world: World) {
    for (const clan of world.allClans) {
        for (const item of clan.lastPopulationChange.items) {
            if (item.name === 'Births') births += item.actual;
            const c = DEATH_CAUSES.indexOf(item.name as typeof DEATH_CAUSES[number]);
            if (c >= 0) deaths[c] -= item.actual;
        }
    }
}

function report(world: World, year: number) {
    const slices = [[0, 0], [0, 0], [0, 0], [0, 0]];
    for (const clan of world.allClans) {
        clan.slices.forEach((s, i) => { slices[i][0] += s[0]; slices[i][1] += s[1]; });
    }
    const total = slices.reduce((a, s) => a + s[0] + s[1], 0);
    const shares = slices.map(s => (100 * (s[0] + s[1]) / total).toFixed(1).padStart(5));
    // Marriage: share of women 20-39 married, share of 40-year-olds never
    // married, people betrothed, and men on bride service.
    let women2040 = 0, married2040 = 0, at40 = 0, never40 = 0, betrothed = 0, service = 0;
    for (const clan of world.allClans) {
        const d = clan.demography;
        women2040 += d.count({ sex: FEMALE, ages: [20, 40] });
        married2040 += d.count({ sex: FEMALE, ages: [20, 40], status: MaritalStatus.Married });
        at40 += d.count({ ages: [40, 45] });
        never40 += d.count({ ages: [40, 45], status: MaritalStatus.Unmarried });
        betrothed += d.count({ status: MaritalStatus.Betrothed });
        service += clan.brideServiceGiven;
    }
    const marriage = `married ${(100 * married2040 / women2040).toFixed(0)}%`
        + ` never@40 ${(100 * never40 / Math.max(1, at40)).toFixed(0)}%`
        + ` betrothed ${betrothed} service ${service}`;
    const causes = DEATH_CAUSES.map((name, c) => `${name.slice(0, 4)} ${String(deaths[c]).padStart(4)}`);
    console.log(`  year ${String(year).padStart(4)}  pop ${String(total).padStart(6)}`
        + `  clans ${String(world.allClans.length).padStart(3)}`
        + `  villages ${String(world.allSettlements.filter(s => s.population > 0).length).padStart(3)}`
        + `  slice % ${shares.join(' ')}`
        + `  | ${marriage}`
        + `  | births ${String(births).padStart(5)}  ${causes.join('  ')}`);
    births = 0;
    deaths = deaths.map(() => 0);
}

for (let r = 0; r < runs; ++r) {
    console.log(`run ${r + 1}`);
    const world = new World({ headless: true });
    world.initialize();
    births = 0;
    deaths = deaths.map(() => 0);
    report(world, 0);
    for (let y = 1; y <= years; ++y) {
        world.advanceHeadless(1);
        tally(world);
        if (y % PERIOD === 0) report(world, y);
    }
}
