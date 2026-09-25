import { Clan } from '../people/people';
import { pct, spct } from '../lib/format';
import { product } from '../lib/basics';
import { Processes, SkillDefs } from './econdefs';
import { FRESH_ALLUVIUM_QUALITY_FACTOR } from './landquality';
import type { Process } from './process';
import type { SkillDef } from '../people/skills';
import { getHelpReceivedValueFromMutualAid, getHelpProductivityModifier, clanHelpDemand } from '../relations/mutualaid';
import { explain, type Explainer } from '../lib/explain';
import { toilTalkFactor } from '../people/talkativeness';

// Map of process to skills that affect productivity and the weight of that
// skill. Built lazily on first use rather than at module-evaluation time: a
// top-level reference to the imported `Processes` can hit its temporal dead
// zone under circular-import (re)initialization order (notably Vite HMR).
let processSkills: Map<Process, [SkillDef, number][]> | undefined;

function getProcessSkills(): Map<Process, [SkillDef, number][]> {
    if (!processSkills) {
        processSkills = new Map([
            [Processes.Agriculture, [
                [SkillDefs.Agriculture, 2],
                [SkillDefs.LocalEcology, 2]]],
            [Processes.Fishing, [
                [SkillDefs.Fishing, 2],
                [SkillDefs.LocalEcology, 2]]],
        ]);
    }
    return processSkills;
}

// When output is being reckoned, and so what can be known about the year.
//
// - 'expected': a clan working out how to spend its effort. The flood has
//   not come and the harvest's luck has not fallen, and the clan has no
//   reckoning of either -- not even of what they come to on average -- so
//   they are left out of its sums altogether. This is what the effort
//   optimizer must use.
// - 'actual': the harvest itself, once the year has shown its hand.
export type Outlook = 'expected' | 'actual';

// The luck of a clan's harvest, on top of everything that can be reckoned:
// half the time better than average by up to 60%, half the time worse by the
// same factor. Drawn once a clan a year, when the crop comes in; see
// advanceEconomy in world.ts and Clan.harvestLuck.
const HARVEST_LUCK_SPREAD = 0.3;

export function rollHarvestLuck(): number {
    const v = 1 + HARVEST_LUCK_SPREAD * (Math.random() + Math.random());
    return Math.random() < 0.5 ? v : 1 / v;
}

// The luck of a clan's catch, drawn the same way as the harvest's but with
// half the spread: better or worse than average by up to 30%. Fishing a
// marsh and lagoon takes many kinds of fish, which do not all fail together,
// so a catch swings less from year to year than a crop does. Drawn once a
// clan a year; see advanceEconomy in world.ts and Clan.fishingLuck.
const FISHING_LUCK_SPREAD = 0.15;

export function rollFishingLuck(): number {
    const v = 1 + FISHING_LUCK_SPREAD * (Math.random() + Math.random());
    return Math.random() < 0.5 ? v : 1 / v;
}

export class Productivity {
    // TODO - Make culture/personality matter

    constructor(readonly items: ProductivityItem[]) { }

    get tfp(): number {
        return product(this.items.map(item => item.value));
    }

    static forClanProcess(
        clan: Clan, process: Process, labor: number, land: number,
        outlook: Outlook): Productivity {
        const items = [
            ...ProductivityItem.fromSkills(clan, process),
            ...ProductivityItem.fromLand(clan, process),
            ...ProductivityItem.fromHelp(clan, process),
            ProductivityItem.fromTalkativeness(clan),
            ...ProductivityItem.fromEnvironment(clan, process, outlook),
        ];

        return new Productivity(items);
    }
}

// The type parameter is the explainer's argument. It appears in no member, so
// every instantiation is the same type to anyone holding one; it exists only
// to check, at the point of construction, that the explainer and the thing it
// will be handed agree.
// Written once at load; each takes what it needs as an argument.
const statText = (
    d: { label: string, statValue: number, statFactor: number }) =>
    `${d.label} of ${d.statValue.toFixed(1)} with factor ${d.statFactor}`;
const helpText = (d: { relativeHelp: number }) =>
    `${pct(d.relativeHelp)} of help demand`;
const ditchText = (d: { rating: number, flood: number }) =>
    `ditch ${d.rating.toFixed(0)} vs flood ${d.flood.toFixed(0)}`;
const averageText = (i: ProductivityItem) => `${pct(i.value)} of average`;
const talkText = (d: { talkativeness: number }) =>
    `Talkativeness ${d.talkativeness.toFixed(0)}: talk gets in the way of toil`;
const stocksText = (d: { flood: string }) => `${d.flood} flood last year`;
const landText = (d: { description: string }) =>
    `${d.description}; the farming base is the yield on ordinary land`;

export class ProductivityItem<P = unknown> {
    private readonly explainer_: Explainer<any>;
    private readonly explainerArg_: unknown;

    get explanation(): string {
        return explain(this.explainer_, this.explainerArg_ ?? this);
    }

    constructor(
        readonly label: string,
        readonly value: number,
        explainer: Explainer<P>,
        explainerArg?: P,
    ) {
        this.explainer_ = explainer as Explainer<any>;
        this.explainerArg_ = explainerArg;
    }

    static forStat(label: string, statValue: number, statFactor: number): ProductivityItem {
        const f = 1 + statFactor / 300;
        const fp = Math.pow(f, statValue - 50);
        return new ProductivityItem(
            label,
            fp,
            statText,
            { label, statValue, statFactor },
        );
    }

    static *fromSkills(clan: Clan, process: Process) {
        for (const [skill, skillFactor] of getProcessSkills().get(process) ?? []) {
            const skillValue = clan.skills.v(skill);
            yield ProductivityItem.forStat(skill.name, skillValue, skillFactor);
        }
    }

    // What the fields a clan took up this spring are worth: the plain
    // average of its plots' productivities, so prime land reads 200% and
    // poor land 50%. This is why farming's base in econdefs.ts is the yield
    // on ordinary land and sits below fishing's -- the ground is scored
    // here, not there. See land.ts for how the plots were taken up.
    static *fromLand(clan: Clan, process: Process) {
        if (process !== Processes.Agriculture) return;

        // A clan with no holding -- one that arrived after the spring's
        // scramble, or a world still being set up -- is reckoned to be on an
        // average stretch of the river.
        const holding = clan.settlement.landAllocation?.forClan(clan);

        yield new ProductivityItem(
            'Land quality',
            holding ? holding.qualityFactor : FRESH_ALLUVIUM_QUALITY_FACTOR,
            landText,
            { description: holding ? holding.description : 'no land taken up this year' },
        );
    }

    // Toil -- the nets, the fields, the ditches -- goes slower for a clan
    // that would rather be talking. See talkativeness.ts.
    static fromTalkativeness(clan: Clan): ProductivityItem {
        const talkativeness = clan.traits.talkativeness;
        return new ProductivityItem(
            'Talkativeness',
            toilTalkFactor(talkativeness),
            talkText,
            { talkativeness },
        );
    }

    static *fromHelp(clan: Clan, process: Process) {

        const helpValue = getHelpReceivedValueFromMutualAid(clan.world, clan);
        const demand = clanHelpDemand(clan.population);
        const modifier = getHelpProductivityModifier(helpValue, demand);
        const relativeHelp = demand > 0 ? helpValue / demand : 1.0;

        yield new ProductivityItem(
            'Help',
            modifier,
            helpText,
            { relativeHelp },
        );
    }

    // The year's water, the ditches against it, and the harvest's luck.
    static *fromEnvironment(clan: Clan, process: Process, outlook: Outlook) {
        // A clan planning its year knows nothing of the flood to come or of
        // how its harvest or catch will fall, so none of this enters its
        // reckoning.
        if (outlook === 'expected') return;

        if (process === Processes.Fishing) {
            yield* ProductivityItem.fromWaters(clan);
            return;
        }
        if (process !== Processes.Agriculture) return;

        const settlement = clan.settlement;
        const floodLevel = settlement.floodLevel;
        const effect = floodLevel.agricultureOn('alluvium');
        const baseProductivity = effect.unditched;
        // What the ditches are worth against this year's water: their share
        // of it if they are too shallow, and at most a whole ditch's worth.
        const ditchEffect = settlement.ditchEffect;
        const productivity = effect.at(ditchEffect);
        const differentialProductivity = baseProductivity > 0 ? productivity / baseProductivity : 1;

        // For now we'll assume migrations are neutral, because although they
        // take work, in the early days people might have been migrating to
        // small patches of the best land. The real importance of permanence
        // will be in enabling durable infrastructure.

        yield new ProductivityItem(
            'Flooding',
            baseProductivity,
            floodLevel.name);
        yield new ProductivityItem(
            'Flood control',
            differentialProductivity,
            settlement.ditch?.building ? ditchText : 'no ditch',
            { rating: settlement.ditchRating, flood: settlement.floodRating });

        // Random component: agricultural yields are somewhat random. Drawn
        // once for the year, before this is called; see Clan.harvestLuck.
        yield new ProductivityItem(
            'Random',
            clan.harvestLuck,
            averageText,
        );
    }

    // What the waters give a clan's fishing this year. A floodplain fishery
    // answers to the flood twice over (see FloodFishingEffect in flood.ts):
    // last year's flood set how many fish there are, and this year's sets
    // how easy they are to get at.
    private static *fromWaters(clan: Clan) {
        const settlement = clan.settlement;
        const lastYear = settlement.previousFloodLevel;
        const thisYear = settlement.floodLevel;

        yield new ProductivityItem(
            'Fish stocks',
            lastYear.fishingOn().stock,
            stocksText,
            { flood: lastYear.name });
        yield new ProductivityItem(
            'Water level',
            thisYear.fishingOn().catchability,
            thisYear.name);

        // Random component: a catch is somewhat random too, though steadier
        // than a harvest. Drawn once for the year, before this is called; see
        // Clan.fishingLuck.
        yield new ProductivityItem(
            'Random',
            clan.fishingLuck,
            averageText,
        );
    }
}
