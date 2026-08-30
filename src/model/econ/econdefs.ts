import { Process, ProcessLocation } from './process';
import { TradeGoods } from '../trade';
import { SkillDef } from '../people/skills';
import { STANDARD_FESTIVAL_EFFORT_SHARE } from '../festivals';
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
    // Practiced at the settlement's own festivals: the rite is where the
    // words are said in the order they have to be said in, so that is where
    // the skill is kept up and handed on.
    Ritual: new SkillDef(5, 'Ritual', 'skill-ritual-256.png', '#ec4899',
        (clan: Clan): number => clan.festivalLabor),
};

// Keeping the settlement's festivals used to be part of the Production
// activity -- not named, but there, inside the share of the year a clan spent
// working. Now that it is an activity of its own, that time has come out of
// production, and the hours left in the fields have to bring in what the
// larger share used to. So output per worker goes up by exactly what was
// taken out: splitting the activity out of production is meant to name what
// clans were already doing, not to make them poorer.
const PRODUCTION_SHARE_BEFORE_FESTIVALS = 0.5;
export const FESTIVAL_TIME_COMPENSATION =
    PRODUCTION_SHARE_BEFORE_FESTIVALS
    / (PRODUCTION_SHARE_BEFORE_FESTIVALS - STANDARD_FESTIVAL_EFFORT_SHARE);

// What a worker-year brought in before that adjustment.
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
