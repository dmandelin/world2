import { DWINDLING_POPULATION } from "./alerts";
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
    | 'dwindling';

export interface BreakpointDef {
    readonly id: BreakpointId;
    // Glyph for the toggle. Matches the alert badge where there is one.
    readonly icon: string;
    readonly label: string;
    readonly description: string;
    readonly defaultOn: boolean;
    // What happened, in a few words, or undefined if it did not happen.
    readonly hit: (world: World) => string | undefined;
}

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
            ? `founded ${names(world.lastFoundations.map(f => f.settlement))}`
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
                ? `20-year flood, ${floods[0].areaName}` : undefined;
        },
    },
    {
        id: 'flood100',
        icon: '🏚️',
        label: '100-year flood or worse',
        description: 'The rivers broke out over half the land or more.',
        defaultOn: true,
        hit: world => {
            const floods = world.extremeFloods.filter(
                f => f.kind.key !== 'flood20' && f.clansAffected > 0);
            return floods.length
                ? `${floods[0].kind.name}, ${floods[0].areaName}` : undefined;
        },
    },
    {
        id: 'ritualchange',
        icon: '🎉',
        label: 'Festival in question',
        description: 'A settlement must settle again how its festival is held.',
        defaultOn: true,
        hit: world => world.lastRitualChanges.length
            ? `festival in question at `
                + names(world.lastRitualChanges.map(c => c.settlement))
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
                ? `${names(fallen)} down to ${fallen[0].population}`
                : undefined;
        },
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
        const what = def.hit(world);
        if (what === undefined) continue;
        return { id: def.id, icon: def.icon, year, what };
    }
    return undefined;
}
