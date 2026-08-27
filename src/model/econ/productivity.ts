import { Clan } from '../people/people';
import { pct, spct } from '../lib/format';
import { product } from '../lib/basics';
import { FloodLevel, FloodLevels } from '../environment/flood';
import { Processes, SkillDefs } from './econdefs';
import type { Process } from './process';
import type { SkillDef } from '../people/skills';
import { getHelpReceivedValueFromMutualAid, getHelpProductivityModifier, clanHelpDemand } from '../relations/mutualaid';

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

export class ProductivityItem {
    constructor(
        readonly label: string,
        readonly value: number,
        readonly explanation: string,
    ) { }

    static forStat(label: string, statValue: number, statFactor: number): ProductivityItem {
        const f = 1 + statFactor / 300;
        const fp = Math.pow(f, statValue - 50);
        return new ProductivityItem(
            label,
            fp,
            `${label} of ${statValue.toFixed(1)} with factor ${statFactor}`,
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
            `${pct(relativeHelp)} of help demand`,
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
            settlement.ditch?.building
                ? `ditch ${settlement.ditchRating.toFixed(0)} vs flood ${settlement.floodRating.toFixed(0)}`
                : 'no ditch');

        // Random component: agricultural yields are somewhat random.
        const v = 1 + 0.3 * (Math.random() + Math.random());
        const m = Math.random() < 0.5 ? v : 1 / v;

        yield new ProductivityItem(
            'Random',
            m,
            `${pct(m)} of average`,
        );
    }
}
