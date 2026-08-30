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

// Care gets a bigger share of a clan's year than either festival skill --
// how much bigger depends on how many children it has -- so it needs a
// higher difficulty to sit at the same equilibrium of 50. Measured, not
// guessed: see the note above for the formula.
const CARE_SKILL_DIFFICULTY = 0.8;

// Ordered as a clan would rank them: the skills of keeping a household and a
// people first, then the skills of getting a living, then the ones that build
// something. Nothing sorts on sortKey for skills -- the lists are built by
// walking this object -- but the two are kept in step so that anything which
// starts sorting gets the same order.
export const SkillDefs = {
    // Looking after people: feeding the small, nursing the sick, keeping the
    // old warm and the young out of the river. Practised in the Care activity
    // and nowhere else, which is a larger share of the year than the festival
    // skills get, so it holds its level at an easier difficulty than they do.
    // Like them it is the traditional life of the people, and a clan doing
    // its accustomed share should stay ordinary at it rather than drift.
    Care: new SkillDef(0, 'Care', 'skill-care-256.png', '#f472b6',
        (clan: Clan): number => clan.careLabor,
        false, false, CARE_SKILL_DIFFICULTY),
    // The words said in the order they have to be said in. Practiced at the
    // rite.
    Ritual: new SkillDef(1, 'Ritual', 'skill-ritual-256.png', '#ec4899',
        (clan: Clan): number => clan.riteLabor,
        false, false, RITUAL_SKILL_DIFFICULTY),
    // Making and performing: the dancing, the music, the costumes, the
    // vessels the food comes out of. Practiced at the feast, which is the
    // only place this model yet gives it to do.
    Craft: new SkillDef(2, 'Craft', 'skill-craft-256.png', '#a855f7',
        (clan: Clan): number => clan.feastLabor,
        false, false, RITUAL_SKILL_DIFFICULTY),
    LocalEcology: new SkillDef(
        3,
        'Local Ecology',
        'skill-local-ecology-256.png',
        '#22c55e',
        (clan: Clan): number => clan.production.effortForProcesses(Processes.Agriculture, Processes.Fishing),
        true,
        true,
    ),
    Fishing: new SkillDef(4, 'Fishing', 'skill-fishing-256.png', '#14b8a6',
        (clan: Clan): number => clan.production.effortForProcesses(Processes.Fishing),
    ),
    Agriculture: new SkillDef(5, 'Agriculture', 'skill-farming-256.png', '#f59e0b',
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
    Irrigation: new SkillDef(6, 'Irrigation', 'skill-irrigation-256.png', '#3b82f6',
        (clan: Clan): number => clan.ditchingLabor,
        false, false, 0.5,
    ),
    Construction: new SkillDef(7, 'Construction', 'skill-construction-256.png', '#8b5cf6',
        (clan: Clan): number => 0),
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
