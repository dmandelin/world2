import { Clan } from '../people/people';
import { pct, spct } from '../lib/format';
import { product } from '../lib/basics';
import { FloodLevel, FloodLevels } from '../environment/flood';
import { Processes, SkillDefs } from './econdefs';
import type { Process } from './process';
import type { SkillDef } from '../people/skills';
import { getHelpReceivedValueFromMutualAid, getHelpProductivityModifier, clanHelpDemand } from '../relations/mutualaid';

// Map of process to skills that affect productivity and the
// weight of that skill.
const processSkills: Map<Process, [SkillDef, number][]> = new Map([
    [Processes.Agriculture, [
        [SkillDefs.Agriculture, 2],
        [SkillDefs.LocalEcology, 2]]],
    [Processes.Fishing, [
        [SkillDefs.Fishing, 2],
        [SkillDefs.LocalEcology, 2]]],
]);

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
        for (const [skill, skillFactor] of processSkills.get(process) ?? []) {
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

        const ditchQuality = clan.settlement.ditchQuality;
        const baseProductivity = floodLevel.baseAgriculturalProductivity;
        const maxProductivity = floodLevel.maxAgriculturalProductivity;
        const productivity = (1 - ditchQuality) * baseProductivity + ditchQuality * maxProductivity;
        const differentialProductivity = productivity / baseProductivity;

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
            pct(ditchQuality));
    }
}
