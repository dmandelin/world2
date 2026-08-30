import type { Settlement } from "./people/settlement";
import type { World } from "./world";
import type { UUID } from "./records/basicdata";

// When the old way stops settling things.
//
// A settlement's festivals run on custom: the same days, the same dishes, the
// same order of precedence, year after year, and nobody has to decide
// anything. That is what custom is for. But now and then the custom stops
// answering and the thing has to be settled again -- and settling it is a
// coordination problem, because every clan does better agreeing on something
// than on nothing, and no two of them want quite the same something.
//
// This is the occasion for that problem, and so far nothing more: the event
// is raised, reported, and remembered, and the festival goes on exactly as it
// did. What the clans actually do about it is the next thing this is for.

// Why the question came open.
export type RitualChangeCause =
    // Clans joined the festival or dropped out of it. Whatever was agreed was
    // agreed by a different set of people than the one now standing there.
    | 'membership'
    // Nothing in particular. Custom wears through on its own, and a bigger
    // crowd wears it through faster.
    | 'drift';

// How often custom wears through on its own. Read as: a settlement of 300
// reopens the question about once in twenty-five years.
export const RITUAL_DRIFT_REFERENCE_SIZE = 300;
export const RITUAL_DRIFT_REFERENCE_CHANCE = 0.04;
// Slightly more than in proportion to size: a bigger crowd has more people to
// disagree and more pairs of them to disagree with each other, but the
// festival is one occasion however many attend, so the excess is mild.
export const RITUAL_DRIFT_SIZE_EXPONENT = 7 / 6;

// Chance per year that a settlement of this size reopens the question with
// nothing in particular having prompted it. Size is everyone in the
// participating clans, not just the workers.
export function ritualDriftChance(size: number): number {
    if (size <= 0) return 0;
    return Math.min(1, RITUAL_DRIFT_REFERENCE_CHANCE
        * Math.pow(size / RITUAL_DRIFT_REFERENCE_SIZE, RITUAL_DRIFT_SIZE_EXPONENT));
}

export class RitualChangeEvent {
    constructor(
        readonly settlement: Settlement,
        readonly year: number,
        readonly cause: RitualChangeCause,
        // The festival's size when the question came open.
        readonly size: number,
        // Who came and who went, when the roster is what did it.
        readonly joined: readonly string[],
        readonly left: readonly string[],
    ) { }

    get label(): string {
        return this.cause === 'membership'
            ? 'A different set of hands'
            : 'The old way in question';
    }

    // One line on what happened, for the event feed and the alert row.
    get detail(): string {
        if (this.cause === 'drift') {
            return 'no one can say why this year and not last';
        }
        const parts: string[] = [];
        if (this.joined.length) parts.push(`joined by ${this.joined.join(', ')}`);
        if (this.left.length) parts.push(`without ${this.left.join(', ')}`);
        return parts.join('; ');
    }
}

// The event feed's marker for these; see NotificationBar.
export const RITUAL_CHANGE_NOTE_LABEL = '🎉';

// Look over each settlement and see whether the question of how to hold the
// festival is open this year. Run in the planning phase, because it is
// something the clans have to settle rather than something that happens to
// them, and early enough that the year's plans could turn on it.
export function planRitualChanges(world: World, priming: boolean = false): void {
    world.lastRitualChanges = [];

    for (const settlement of world.allSettlements) {
        const roster = new Map<UUID, string>(
            settlement.clans.map(c => [c.uuid, c.name]));
        const previous = settlement.ritualRoster;
        settlement.ritualRoster = roster;

        // A settlement seen here for the first time -- at world creation, or
        // newly founded -- has no old way for anything to have changed.
        // Priming turns likewise settle nothing.
        if (previous === undefined || priming) continue;

        // One comparison of rosters covers every way the set can change: a
        // clan splitting with the junior half staying, a clan dying out or
        // merging away, a clan moving in or out. None of them needs to know
        // about this, and none of them can forget to tell it.
        const joined: string[] = [];
        for (const [uuid, name] of roster) {
            if (!previous.has(uuid)) joined.push(name);
        }
        const left: string[] = [];
        for (const [uuid, name] of previous) {
            if (!roster.has(uuid)) left.push(name);
        }

        if (joined.length || left.length) {
            raiseRitualChange(world, settlement, 'membership', joined, left);
        } else if (Math.random() < ritualDriftChance(settlement.population)) {
            // One reopening a year is plenty, so this is only reached when
            // the roster held steady.
            raiseRitualChange(world, settlement, 'drift', [], []);
        }
    }
}

function raiseRitualChange(
    world: World,
    settlement: Settlement,
    cause: RitualChangeCause,
    joined: string[],
    left: string[],
): void {
    const event = new RitualChangeEvent(
        settlement, world.year.value, cause, settlement.population, joined, left);
    settlement.ritualChanges.push(event);
    world.lastRitualChanges.push(event);
    world.addNote(
        RITUAL_CHANGE_NOTE_LABEL,
        `The festival at {0} is in question`,
        event.detail,
        [{ uuid: settlement.uuid, name: settlement.name }],
    );
}
