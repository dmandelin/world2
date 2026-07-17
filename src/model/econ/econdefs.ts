import { Process, ProcessLocation } from './process';
import { TradeGoods } from '../trade';
import { SkillDef } from '../people/skills';
import type { Clan } from '../people/people';

const BASE_REFERENCE_EFFORT = 8;

export const SkillDefs = {
    LocalEcology: new SkillDef(
        0,
        'Local Ecology',
        'skill-local-ecology-256.png',
        '#22c55e',
        BASE_REFERENCE_EFFORT,
        (clan: Clan): number => clan.production.effortForProcesses(Processes.Agriculture, Processes.Fishing),
        true,
        true,
    ),
    Fishing: new SkillDef(1, 'Fishing', 'skill-fishing-256.png', '#14b8a6',
        BASE_REFERENCE_EFFORT,
        (clan: Clan): number => clan.production.effortForProcesses(Processes.Fishing),
    ),
    Agriculture: new SkillDef(2, 'Agriculture', 'skill-farming-256.png', '#f59e0b',
        BASE_REFERENCE_EFFORT,
        (clan: Clan): number => clan.production.effortForProcesses(Processes.Agriculture),
    ),
    Irrigation: new SkillDef(3, 'Irrigation', 'skill-irrigation-256.png', '#3b82f6',
        BASE_REFERENCE_EFFORT,
        (clan: Clan): number => clan.isDitching ? 0.1 * clan.production.effortForProcesses(Processes.Agriculture) : 0,
    ),
    Construction: new SkillDef(4, 'Construction', 'skill-construction-256.png', '#8b5cf6',
        BASE_REFERENCE_EFFORT,
        (clan: Clan): number => 0),
    Ritual: new SkillDef(5, 'Ritual', 'skill-ritual-256.png', '#ec4899',
        BASE_REFERENCE_EFFORT,
        (clan: Clan): number => 0),
};

export const Processes = {
    Fishing:
        new Process('Fishing', 1, 'F', '#3b82f6', TradeGoods.Fish, 3),
    Agriculture:
        new Process('Agriculture', 2, 'A', '#10b981', TradeGoods.Cereals, 3),
};
