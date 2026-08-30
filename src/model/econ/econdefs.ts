import { Process, ProcessLocation } from './process';
import { TradeGoods } from '../trade';
import { SkillDef } from '../people/skills';
import { FESTIVAL_TIME_COMPENSATION } from '../festivals';
import type { Clan } from '../people/people';

// The two festival skills. Each is practiced at one half of the year's
// festivals and nowhere else, which comes to about an eighth of the time a
// clan spends producing -- a focus factor of 0.60. At ordinary difficulty
// that would settle them near 31, which would mean the festivals getting
// steadily worse forever and a clan that had kept them all its life being
// bad at them.
//
// These are the traditional life of the people, so a clan doing its
// accustomed part should stay ordinary at them: neither drifting away from
// the skill nor piling it up. The difficulty is therefore set to put the
// equilibrium at the middle of the scale. From skillchange.ts,
//     equilibrium = 50 * focusFactor * intellectFactor / difficulty
// and with focusFactor 0.60 and intellectFactor about 1.01, 0.6 lands it on
// 50. Clans that give more than the standard practice more and settle above
// it; tight-fisted ones settle below.
const RITUAL_SKILL_DIFFICULTY = 0.6;

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
    // The words said in the order they have to be said in. Practiced at the
    // rite.
    Ritual: new SkillDef(5, 'Ritual', 'skill-ritual-256.png', '#ec4899',
        (clan: Clan): number => clan.riteLabor,
        false, false, RITUAL_SKILL_DIFFICULTY),
    // Making and performing: the dancing, the music, the costumes, the
    // vessels the food comes out of. Practiced at the feast, which is the
    // only place this model yet gives it to do.
    Craft: new SkillDef(6, 'Craft', 'skill-craft-256.png', '#a855f7',
        (clan: Clan): number => clan.feastLabor,
        false, false, RITUAL_SKILL_DIFFICULTY),
};

// What a worker-year brought in before the festival-time adjustment.
const UNCOMPENSATED_OUTPUT_PER_WORKER = 3.5;
export const BASE_OUTPUT_PER_WORKER =
    UNCOMPENSATED_OUTPUT_PER_WORKER * FESTIVAL_TIME_COMPENSATION;

export const Processes = {
    Fishing:
        new Process('Fishing', 1, 'F', '#3b82f6', TradeGoods.Fish,
            BASE_OUTPUT_PER_WORKER),
    Agriculture:
        new Process('Agriculture', 2, 'A', '#10b981', TradeGoods.Cereals,
            BASE_OUTPUT_PER_WORKER),
};
