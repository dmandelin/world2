import { Process, ProcessLocation } from './process';
import { TradeGoods } from '../trade';
import { SkillDef } from '../people/skills';
import type { Clan } from '../people/people';

export const SkillDefs = {
    LocalEcology: new SkillDef(
        0,
        'Local Ecology',
        'skill-local-ecology-256.png',
        '#22c55e',
        (clan: Clan): number => clan.production.effortForProcesses(Processes.Agriculture, Processes.Fishing),
        true,
        true,
    ),
    Fishing: new SkillDef(1, 'Fishing', 'skill-fishing-256.png', '#14b8a6',
        (clan: Clan): number => clan.production.effortForProcesses(Processes.Fishing),
    ),
    Agriculture: new SkillDef(2, 'Agriculture', 'skill-farming-256.png', '#f59e0b',
        (clan: Clan): number => clan.production.effortForProcesses(Processes.Agriculture),
    ),
    // Ditching is a small share of anyone's year, so its focus factor is low
    // and at ordinary difficulty the skill would settle around 28 -- right
    // about where clans start, leaving nothing to develop. It is not a hard
    // thing to learn, though: a ditch is dug by anyone who can carry a
    // basket, and what a village learns about where to cut stays learned.
    // At half the ordinary difficulty the ceiling doubles, to about 60, and
    // the climb stretches out: about 25 at the start, 42 by year 200, 50
    // somewhere around year 350.
    Irrigation: new SkillDef(3, 'Irrigation', 'skill-irrigation-256.png', '#3b82f6',
        (clan: Clan): number => clan.ditchingLabor,
        false, false, 0.5,
    ),
    Construction: new SkillDef(4, 'Construction', 'skill-construction-256.png', '#8b5cf6',
        (clan: Clan): number => 0),
    Ritual: new SkillDef(5, 'Ritual', 'skill-ritual-256.png', '#ec4899',
        (clan: Clan): number => 0),
};

export const Processes = {
    Fishing:
        new Process('Fishing', 1, 'F', '#3b82f6', TradeGoods.Fish, 3.5),
    Agriculture:
        new Process('Agriculture', 2, 'A', '#10b981', TradeGoods.Cereals, 3.5),
};
