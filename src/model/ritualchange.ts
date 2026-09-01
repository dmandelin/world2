import { chooseWeighted, sumFun } from "./lib/basics";
import { populationAverage } from "./lib/modelbasics";
import { getAlignment } from "./relations/alignment";
import type { Clan } from "./people/people";
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

// ---------------------------------------------------------------------------
// Whose initiative.
// ---------------------------------------------------------------------------
//
// Custom does not wear through by itself: some clan is always the one that
// says the thing out loud. So the settlement's chance of reopening the
// question is not a figure of its own but the sum of its clans' -- which is
// what makes a settlement full of clever clans an unsettled one, rather than
// merely one where the same amount of unsettlement is raised by cleverer
// people.
//
// A clan's own rate runs on three counts:
//   * its size, because a bigger clan has more people to be the one;
//   * its wits, because a clever clan is likelier to think of it and likelier
//     to be listened to when it does;
//   * mildly, the size of the whole festival, because a bigger crowd is
//     harder to hold to one way of doing things.
// The last is what makes the settlement's total scale as size^(7/6) rather
// than plainly with size, when the clans are of ordinary wits.

// What a clan's wits are worth to its chances of being the one, as a factor:
// 1 at the baseline, ten times that at the far end.
export const INITIATIVE_INTELLECT_BASELINE = 50;
export const INITIATIVE_INTELLECT_TENFOLD = 80;

export function initiativeIntellectFactor(intellect: number): number {
    return Math.pow(10,
        (intellect - INITIATIVE_INTELLECT_BASELINE)
        / (INITIATIVE_INTELLECT_TENFOLD - INITIATIVE_INTELLECT_BASELINE));
}

// How often custom wears through on its own, calibrated at one settlement:
// 300 people, all of them in clans of ordinary wits, reopen the question
// about once in twenty-five years between them.
export const RITUAL_DRIFT_REFERENCE_SIZE = 300;
export const RITUAL_DRIFT_REFERENCE_CHANCE = 0.04;
// Slightly more than in proportion to size: a bigger crowd has more people to
// disagree and more pairs of them to disagree with each other, but the
// festival is one occasion however many attend, so the excess is mild.
export const RITUAL_DRIFT_SIZE_EXPONENT = 7 / 6;
// Fixed by the calibration above. At the reference size and ordinary wits the
// clans' rates sum to the reference chance, since their populations sum to
// the settlement's.
export const RITUAL_DRIFT_COEFFICIENT = RITUAL_DRIFT_REFERENCE_CHANCE
    / Math.pow(RITUAL_DRIFT_REFERENCE_SIZE, RITUAL_DRIFT_SIZE_EXPONENT);

// One clan's chance per year of being the one to reopen the question with
// nothing in particular having prompted it. Size is the whole festival:
// everyone in the participating clans, not just the workers.
export function clanDriftRate(clan: Clan, size: number): number {
    return RITUAL_DRIFT_COEFFICIENT
        * initiativeIntellectFactor(clan.traits.intellect)
        * clan.population
        * Math.pow(size, RITUAL_DRIFT_SIZE_EXPONENT - 1);
}

// The settlement's chance per year, which is just its clans' between them.
export function ritualDriftChance(settlement: Settlement): number {
    const size = settlement.population;
    if (size <= 0) return 0;
    return Math.min(1, sumFun(settlement.clans, c => clanDriftRate(c, size)));
}

// A clan that has just arrived weighs this much more heavily. Newcomers are
// the ones who do not know how it goes here, and the ones with least invested
// in how it went before.
export const INITIATIVE_NEWCOMER_FACTOR = 10;

// How likely this clan is to be the one, against its neighbors. For a drift
// event this is each clan's own rate, up to the factors they all share; for a
// change in the roster the newcomers weigh in on top of it.
export function clanInitiativeWeight(clan: Clan, newcomer: boolean): number {
    return initiativeIntellectFactor(clan.traits.intellect)
        * clan.population
        * (newcomer ? INITIATIVE_NEWCOMER_FACTOR : 1);
}

// Who opens the question. One clan for now; the machinery is written for
// several, because a thing raised by two clans together is a different thing
// from a thing raised by one.
function chooseInitiators(
    settlement: Settlement,
    joined: readonly Clan[],
): Clan[] {
    const candidates = settlement.clans.filter(c => c.population > 0);
    if (candidates.length === 0) return [];
    const newcomers = new Set(joined);
    return [chooseWeighted(
        candidates, c => clanInitiativeWeight(c, newcomers.has(c)))];
}

// ---------------------------------------------------------------------------
// Where everyone else stands.
// ---------------------------------------------------------------------------

// Once the question is open, every other clan falls in behind the initiators
// or does not. What settles it is not how warmly a clan regards them in the
// abstract but how much more warmly it regards them than the rest of the
// people it keeps the festival with. A clan on good terms with everybody has
// no particular reason to prefer this one's way of doing things; a clan that
// gets on with the initiators and with nobody else has every reason.

export type RitualOpinion = 'for' | 'against';

// How far above its feeling for the rest of the settlement a clan has to hold
// the initiators before it is three times as likely to back them as not.
// Alignment runs -1 to 1 and is shown as Favor x100, so this is a fifth of
// the scale, and about one standard deviation of the differences that
// actually come up between the clans of a settlement.
export const SUPPORT_ALIGNMENT_SWING = 0.2;
export const SUPPORT_CHANCE_AT_SWING = 0.75;
const SUPPORT_LOGIT_SLOPE =
    Math.log(SUPPORT_CHANCE_AT_SWING / (1 - SUPPORT_CHANCE_AT_SWING))
    / SUPPORT_ALIGNMENT_SWING;

// Chance a clan comes down for the change, given how much more it thinks of
// the initiators than of everyone else. No difference at all is a coin flip.
export function supportChance(difference: number): number {
    return 1 / (1 + Math.exp(-SUPPORT_LOGIT_SLOPE * difference));
}

// Where one clan stands on one reopened question. Kept per clan rather than
// as two lists of names because there is more to come here: the assent that
// carries a clan to the side it did not start on will be tracked alongside
// the opinion it started with, and neither should overwrite the other.
export class RitualChangeStance {
    constructor(
        readonly clan: Clan,
        // Raised the question, rather than being asked about it.
        readonly initiator: boolean,
        readonly opinion: RitualOpinion,
        // How the clan weighed it: what it makes of the initiators, what it
        // makes of everyone else, and the chance those gave. All undefined
        // for the initiators, who did not have to be won over.
        readonly alignmentToInitiators?: number,
        readonly alignmentToOthers?: number,
        readonly supportChance?: number,
    ) { }

    get difference(): number | undefined {
        return this.alignmentToInitiators === undefined
            || this.alignmentToOthers === undefined
            ? undefined
            : this.alignmentToInitiators - this.alignmentToOthers;
    }
}

// Sort the festival's clans into those for the change and those against it.
// The initiators are for it by construction; everyone else is rolled.
function takeStances(
    settlement: Settlement,
    initiators: readonly Clan[],
): RitualChangeStance[] {
    const raisedIt = new Set(initiators);
    const participants = settlement.clans.filter(c => c.population > 0);
    return participants.map(clan => {
        if (raisedIt.has(clan)) {
            return new RitualChangeStance(clan, true, 'for');
        }
        const toInitiators = populationAverage(
            initiators, i => getAlignment(clan, i));
        // Everyone else it keeps the festival with, itself and the initiators
        // aside. With nobody else to measure them against there is nothing to
        // go on, so the clan is as likely to fall one way as the other.
        const rest = participants.filter(
            c => c !== clan && !raisedIt.has(c));
        const toOthers = rest.length
            ? populationAverage(rest, c => getAlignment(clan, c))
            : toInitiators;
        const chance = supportChance(toInitiators - toOthers);
        return new RitualChangeStance(
            clan,
            false,
            Math.random() < chance ? 'for' : 'against',
            toInitiators,
            toOthers,
            chance);
    });
}

export class RitualChangeEvent {
    constructor(
        readonly settlement: Settlement,
        readonly year: number,
        readonly cause: RitualChangeCause,
        // The festival's size when the question came open.
        readonly size: number,
        // The clans who raised it. One for now; a list because a thing two
        // clans raise together is a different thing from a thing one raises.
        readonly initiators: readonly Clan[],
        // Where every clan that keeps this festival stands, initiators
        // included.
        readonly stances: readonly RitualChangeStance[],
        // Who came and who went, when the roster is what did it. Those who
        // left are kept by name only: they are not here to be pointed at.
        readonly joined: readonly Clan[],
        readonly left: readonly string[],
    ) { }

    get label(): string {
        return this.cause === 'membership'
            ? 'A different set of hands'
            : 'The old way in question';
    }

    get initiatorNames(): string {
        return this.initiators.map(c => c.name).join(', ');
    }

    get supporters(): RitualChangeStance[] {
        return this.stances.filter(s => s.opinion === 'for');
    }

    get opponents(): RitualChangeStance[] {
        return this.stances.filter(s => s.opinion === 'against');
    }

    // How the settlement divided, in the fewest words.
    get splitLabel(): string {
        return `${this.supporters.length} for, ${this.opponents.length} against`;
    }

    // One line on what happened, for the event feed and the alert row.
    get detail(): string {
        const raised = this.initiators.length
            ? `raised by ${this.initiatorNames}` : '';
        return [raised, this.causeDetail, this.splitLabel]
            .filter(s => s).join('; ');
    }

    // What put the question, without who put it.
    get causeDetail(): string {
        if (this.cause === 'drift') {
            return 'no one can say why this year and not last';
        }
        const parts: string[] = [];
        if (this.joined.length) {
            parts.push(`joined by ${this.joined.map(c => c.name).join(', ')}`);
        }
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
        const joined = settlement.clans.filter(c => !previous.has(c.uuid));
        const left: string[] = [];
        for (const [uuid, name] of previous) {
            if (!roster.has(uuid)) left.push(name);
        }

        if (joined.length || left.length) {
            raiseRitualChange(world, settlement, 'membership', joined, left);
        } else if (Math.random() < ritualDriftChance(settlement)) {
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
    joined: readonly Clan[],
    left: readonly string[],
): void {
    const initiators = chooseInitiators(settlement, joined);
    const event = new RitualChangeEvent(
        settlement, world.year.value, cause, settlement.population,
        initiators, takeStances(settlement, initiators), joined, left);
    settlement.ritualChanges.push(event);
    world.lastRitualChanges.push(event);
    world.addNote(
        RITUAL_CHANGE_NOTE_LABEL,
        `The festival at {0} is in question`,
        event.detail,
        [{ uuid: settlement.uuid, name: settlement.name }],
    );
}
