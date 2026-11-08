import { DWINDLING_POPULATION } from "./alerts";
import type { NoteEntity } from "./notifications";
import type { World } from "../world";

// Stopping a long run when something happens.
//
// Advancing five, ten or twenty years at a stretch is how the interesting
// stretches of a run get covered, and it is also how the interesting moments
// in them go by unread. A breakpoint is a standing instruction to stop the
// run at the year an occasion of a given kind comes up, so the run goes fast
// until there is a reason for it not to.
//
// The check is made at the end of each year, once everything that was going
// to happen has happened. Some of these could be seen coming while the year
// was still being planned, and stopping there would be a year's notice
// earlier -- but the planning phase is not re-entrant (running it twice for
// one year would re-roll splits and re-plan migrations), and a stop is a
// place the run has to be resumed from. So the run stops at the end of the
// year the thing happened in, which is the earliest point it can stop and
// still be picked up cleanly.

export type BreakpointId =
    | 'foundation'
    | 'flood20'
    | 'flood100'
    | 'ritualchange'
    | 'dwindling'
    | 'merge'
    | 'decision';

export interface BreakpointDef {
    readonly id: BreakpointId;
    // Glyph for the toggle. Matches the alert badge where there is one.
    readonly icon: string;
    readonly label: string;
    readonly description: string;
    readonly defaultOn: boolean;
    // What happened, or undefined if it did not happen.
    readonly hit: (world: World) => BreakpointOccasion | undefined;
}

// What a breakpoint found: a few words on it, and where to go to see it --
// the entity it happened to, and the settlement panel it is written up in,
// where there is one.
export interface BreakpointOccasion {
    readonly what: string;
    readonly entity?: NoteEntity;
    readonly tab?: string;
}

const entityOf = (e: { uuid: string; name: string }): NoteEntity =>
    ({ uuid: e.uuid, name: e.name });

function names(items: readonly { name: string }[]): string {
    return items.map(i => i.name).join(', ');
}

export const BREAKPOINTS: readonly BreakpointDef[] = [
    {
        id: 'foundation',
        icon: '🏘️',
        label: 'Founding',
        description: 'A new village was founded.',
        defaultOn: false,
        hit: world => world.lastFoundations.length
            ? {
                what: `founded ${names(world.lastFoundations.map(f => f.settlement))}`,
                entity: entityOf(world.lastFoundations[0].settlement),
            }
            : undefined,
    },
    {
        id: 'flood20',
        icon: '🌊',
        label: '20-year flood',
        description: 'The rivers broke out over a region.',
        defaultOn: false,
        hit: world => {
            const floods = world.extremeFloods.filter(
                f => f.kind.key === 'flood20' && f.clansAffected > 0);
            return floods.length
                ? {
                    what: `20-year flood, ${floods[0].areaName}`,
                    entity: floods[0].impacts[0]
                        && entityOf(floods[0].impacts[0].clan.settlement),
                    tab: 'The Waters',
                }
                : undefined;
        },
    },
    {
        id: 'flood100',
        icon: '🏚️',
        label: '100-year flood or worse',
        description: 'The rivers broke out over half the land or more.',
        defaultOn: false,
        hit: world => {
            const floods = world.extremeFloods.filter(
                f => f.kind.key !== 'flood20' && f.clansAffected > 0);
            return floods.length
                ? {
                    what: `${floods[0].kind.name}, ${floods[0].areaName}`,
                    entity: floods[0].impacts[0]
                        && entityOf(floods[0].impacts[0].clan.settlement),
                    tab: 'The Waters',
                }
                : undefined;
        },
    },
    {
        id: 'ritualchange',
        icon: '🎉',
        label: 'Festival in question',
        description: 'A settlement must settle again how its festival is held.',
        defaultOn: false,
        hit: world => world.lastRitualChanges.length
            ? {
                what: `festival in question at `
                    + names(world.lastRitualChanges.map(c => c.settlement)),
                entity: entityOf(world.lastRitualChanges[0].settlement),
                tab: 'Festivals',
            }
            : undefined,
    },
    {
        id: 'dwindling',
        icon: '📉',
        label: 'Clan dwindling',
        description:
            `A clan's population fell below ${DWINDLING_POPULATION}.`,
        defaultOn: false,
        // Only the year it crosses over, not every year it stays small: a
        // clan that lingers at ten people would otherwise stop every run.
        hit: world => {
            const fallen = world.allClans.filter(c =>
                c.population < DWINDLING_POPULATION
                && c.population - c.lastPopulationChange.change
                    >= DWINDLING_POPULATION);
            return fallen.length
                ? {
                    what: `${names(fallen)} down to ${fallen[0].population}`,
                    entity: entityOf(fallen[0]),
                }
                : undefined;
        },
    },
    {
        id: 'merge',
        icon: '🤝',
        label: 'Clans joined',
        description: 'A clan too small to carry on alone was taken in by another.',
        defaultOn: false,
        hit: world => {
            const joined = world.lastMerges.filter(m => m.host);
            return joined.length
                ? {
                    what: joined.map(m => `${m.clanName} into ${m.host!.name}`)
                        .join(', '),
                    entity: entityOf(joined[0].host!),
                }
                : undefined;
        },
    },
    {
        id: 'decision',
        icon: '✋',
        label: 'Village decision',
        description: 'The clans of a village had something to decide together.',
        defaultOn: true,
        // Decisions are taken in the year's planning and kept on the world
        // until the next year's planning, so stopping here leaves the year's
        // decisions on screen: in the alert, the event feed and the
        // settlement's Decisions panel.
        hit: world => world.lastDecisions.length
            ? {
                what: `decision at `
                    + names(world.lastDecisions.map(d => d.settlement)),
                entity: entityOf(world.lastDecisions[0].settlement),
                tab: 'Decisions',
            }
            : undefined,
    },
];

export const BREAKPOINT_IDS: readonly BreakpointId[] = BREAKPOINTS.map(b => b.id);

export function defaultBreakpoints(): Record<BreakpointId, boolean> {
    return Object.fromEntries(
        BREAKPOINTS.map(b => [b.id, b.defaultOn])) as Record<BreakpointId, boolean>;
}

// Where a run stopped, and what stopped it.
export interface BreakpointHit {
    readonly id: BreakpointId;
    readonly icon: string;
    readonly year: string;
    readonly what: string;
    // Where to go to see it, if anywhere. Where several places had one, the
    // first.
    readonly entity?: NoteEntity;
    readonly tab?: string;
}

// The first armed breakpoint that fired this year, if any. First in the order
// above, which runs from the rarest occasion to the most ordinary.
//
// `year` is the year that just ran, which by the time this is called is no
// longer the world's year: the clock is advanced at the close of the turn.
// Passing it in keeps the readout agreeing with the event feed, where the
// same occasion is filed under the year it happened in.
export function checkBreakpoints(
    world: World,
    armed: ReadonlySet<BreakpointId>,
    year: string,
): BreakpointHit | undefined {
    for (const def of BREAKPOINTS) {
        if (!armed.has(def.id)) continue;
        const occasion = def.hit(world);
        if (occasion === undefined) continue;
        return { id: def.id, icon: def.icon, year, ...occasion };
    }
    return undefined;
}
