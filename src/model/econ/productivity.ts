import { Clan } from '../people/people';
import { pct, spct } from '../lib/format';
import { product } from '../lib/basics';
import { FloodLevel, FloodLevels } from '../environment/flood';
import { Processes, SkillDefs } from './econdefs';
import type { Process } from './process';
import type { SkillDef } from '../people/skills';
import { getHelpReceivedValueFromMutualAid, getHelpProductivityModifier, clanHelpDemand } from '../relations/mutualaid';
import { explain, type Explainer } from '../lib/explain';

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

export class Productivity {
    // TODO - Make land quality matter
    // TODO - Make culture/personality matter

    constructor(readonly items: ProductivityItem[]) { }

    get tfp(): number {
        return product(this.items.map(item => item.value));
    }

    static forClanProcess(clan: Clan, process: Process, labor: number, land: number): Productivity {
        const items = [
            ...ProductivityItem.fromSkills(clan, process),
            ...ProductivityItem.fromHelp(clan, process),
            ...ProductivityItem.fromEnvironment(clan, process),
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

    static *fromEnvironment(clan: Clan, process: Process, floodLevel?: FloodLevel) {
        if (process !== Processes.Agriculture) return;
        floodLevel = floodLevel ?? clan.settlement.floodLevel;

        const settlement = clan.settlement;
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

        // Random component: agricultural yields are somewhat random.
        const v = 1 + 0.3 * (Math.random() + Math.random());
        const m = Math.random() < 0.5 ? v : 1 / v;

        yield new ProductivityItem(
            'Random',
            m,
            averageText,
        );
    }
}
