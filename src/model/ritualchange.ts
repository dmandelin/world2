import { chooseWeighted, shuffled, sumFun } from "./lib/basics";
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

// The three parties to a reopened question. The initiators are supporters
// too, of course -- the distinction is that the proposal is theirs, which
// both earns them more when it carries and costs them more when it does not.
export type RitualRole = 'initiator' | 'supporter' | 'opponent';

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

// Where one clan stands on one reopened question.
//
// Two things are kept, not one. `opinion` is what the clan wants and never
// changes; `vote` is what it will go along with, and moves as the settlement
// argues. A clan that ends up voting against what it wanted has assented, not
// been persuaded, and when this starts having consequences the difference
// will matter: the clan is owed something for having given way.
export class RitualChangeStance {
    // What the clan is currently willing to go along with. Starts as its own
    // opinion and is worked over in the rounds below.
    vote: RitualOpinion;

    constructor(
        readonly clan: Clan,
        // Raised the question, rather than being asked about it.
        readonly initiator: boolean,
        readonly opinion: RitualOpinion,
        // The clan's rigidity as it stood that year. Kept on the stance
        // because the trait drifts, and a record of an old argument should
        // show the disposition that produced it rather than today's.
        readonly rigidity: number,
        // How the clan weighed it: what it makes of the initiators, what it
        // makes of everyone else, and the chance those gave. All undefined
        // for the initiators, who did not have to be won over.
        readonly alignmentToInitiators?: number,
        readonly alignmentToOthers?: number,
        readonly supportChance?: number,
    ) {
        this.vote = opinion;
    }

    // Gave way to the other side rather than being talked round to it.
    get assented(): boolean {
        return this.vote !== this.opinion;
    }

    // Which of the three parties this clan belonged to, which is what the
    // consequences are handed out by. Opinions, not votes: a clan that gave
    // way to keep the peace is still counted with the side it wanted.
    get role(): RitualRole {
        if (this.initiator) return 'initiator';
        return this.opinion === 'for' ? 'supporter' : 'opponent';
    }

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
            return new RitualChangeStance(
                clan, true, 'for', clan.traits.rigidity);
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
            clan.traits.rigidity,
            toInitiators,
            toOthers,
            chance);
    });
}

// ---------------------------------------------------------------------------
// Calling the question.
// ---------------------------------------------------------------------------
//
// Nobody counts heads and declares a winner: the festival is held one way or
// it is not held, so what the settlement needs is for everyone to be doing
// the same thing. The clans go round, and each in turn decides whether it can
// still hold out. What decides that is Rigidity: a clan gives way once the
// share of clans voting the other way passes it. Giving way is not changing
// its mind -- its opinion stands, and only its vote moves.
//
// If they are all on the same side at the end of a round, that is assent,
// whichever side it is. If they are still split after the third round, the
// thing is deadlocked and the festival goes on as it always has.

export type RitualChangeOutcome = 'accepted' | 'rejected' | 'deadlock';

// How many times round before the thing is given up as deadlocked.
export const RITUAL_VOTE_ROUNDS = 3;

// The initiators hold out harder than anyone: it is their proposal, and
// giving way on it means giving it up. This is the only way a clan comes to
// hold out against a whole settlement.
export const INITIATOR_RIGIDITY_FACTOR = 1.25;
// And if they do give it up, the clans who were backing them lose heart --
// there is little sense in carrying a proposal its own author has dropped.
export const ABANDONED_SUPPORTER_RIGIDITY_FACTOR = 0.75;

function other(opinion: RitualOpinion): RitualOpinion {
    return opinion === 'for' ? 'against' : 'for';
}

// One clan's turn: what it was voting, what the room looked like when it
// looked, and what it did about that. Kept for every clan and not only for
// the ones that moved, because holding firm against four fifths of the
// settlement is the more interesting half of the story.
export class RitualVoteRecord {
    constructor(
        readonly clan: Clan,
        readonly from: RitualOpinion,
        readonly to: RitualOpinion,
        // Share of the clans that were voting the other way when it looked.
        readonly opposingShare: number,
        // Its rigidity as it counted here, bonuses included.
        readonly rigidity: number,
    ) { }

    get switched(): boolean {
        return this.from !== this.to;
    }
}

// One time round the settlement. The records are in the order the clans
// spoke, which is the order the votes moved in.
export class RitualVoteRound {
    constructor(
        readonly number: number,
        readonly records: readonly RitualVoteRecord[],
        // The tally once everyone had spoken.
        readonly votesFor: number,
        readonly votesAgainst: number,
    ) { }

    get switches(): RitualVoteRecord[] {
        return this.records.filter(r => r.switched);
    }

    recordFor(clan: Clan): RitualVoteRecord | undefined {
        return this.records.find(r => r.clan === clan);
    }

    // Where the clan stood once this round was through.
    voteFor(clan: Clan): RitualOpinion | undefined {
        return this.recordFor(clan)?.to;
    }

    get tallyLabel(): string {
        return `${this.votesFor}-${this.votesAgainst}`;
    }
}

export class RitualChangeDecision {
    constructor(
        readonly outcome: RitualChangeOutcome,
        readonly rounds: readonly RitualVoteRound[],
    ) { }

    get label(): string {
        switch (this.outcome) {
            case 'accepted': return 'Accepted';
            case 'rejected': return 'Rejected';
            case 'deadlock': return 'Deadlocked';
        }
    }

    get detail(): string {
        if (this.outcome === 'deadlock') {
            return `deadlocked after ${this.rounds.length} rounds`;
        }
        const verb = this.outcome === 'accepted' ? 'accepted' : 'rejected';
        if (this.rounds.length === 0) return `${verb} without argument`;
        if (this.rounds.length === 1) return `${verb} in one round`;
        return `${verb} in ${this.rounds.length} rounds`;
    }
}

// Take the settlement round until it is of one mind or out of patience.
export function callTheQuestion(
    stances: readonly RitualChangeStance[],
    initiators: readonly Clan[],
): RitualChangeDecision {
    const raisedIt = new Set(initiators);
    const rounds: RitualVoteRound[] = [];

    const tally = (side: RitualOpinion) =>
        stances.filter(s => s.vote === side).length;
    const decide = (): RitualChangeOutcome | undefined => {
        const votesFor = tally('for');
        const votesAgainst = tally('against');
        if (votesFor && votesAgainst) return undefined;
        if (votesFor) return 'accepted';
        if (votesAgainst) return 'rejected';
        // Nobody left to hold the festival at all.
        return 'deadlock';
    };

    // The clans who raised it have not necessarily stuck with it. Everyone
    // else takes their cue from whether any of them is still standing behind
    // the thing, not from who said it first.
    const stillStandsBehindIt = () =>
        initiators.some(c => stances.find(s => s.clan === c)?.vote === 'for');

    const rigidityFor = (stance: RitualChangeStance): number => {
        const base = stance.rigidity;
        if (raisedIt.has(stance.clan)) return base * INITIATOR_RIGIDITY_FACTOR;
        if (stance.opinion === 'for' && !stillStandsBehindIt()) {
            return base * ABANDONED_SUPPORTER_RIGIDITY_FACTOR;
        }
        return base;
    };

    // They may already be of one mind, in which case there is nothing to
    // argue about.
    let outcome = decide();
    if (outcome) return new RitualChangeDecision(outcome, rounds);

    for (let n = 1; n <= RITUAL_VOTE_ROUNDS; ++n) {
        const records: RitualVoteRecord[] = [];
        // There is no order of precedence in the settlement yet, so who
        // speaks first is a fresh draw each round rather than a standing
        // advantage. Votes move as they are cast: a clan late in the round
        // sees what the ones before it did.
        for (const stance of shuffled([...stances])) {
            const opposing = stances.filter(s => s.vote !== stance.vote).length;
            const share = opposing / stances.length;
            const rigidity = rigidityFor(stance);
            const from = stance.vote;
            if (share > rigidity) stance.vote = other(from);
            records.push(new RitualVoteRecord(
                stance.clan, from, stance.vote, share, rigidity));
        }
        rounds.push(new RitualVoteRound(
            n, records, tally('for'), tally('against')));
        outcome = decide();
        if (outcome) return new RitualChangeDecision(outcome, rounds);
    }

    return new RitualChangeDecision('deadlock', rounds);
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
        // What the settlement made of it, and how many times round it took.
        readonly decision: RitualChangeDecision,
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

    // How the settlement divided, in the fewest words. Opinions, not votes:
    // this is what the clans wanted, not what they settled for.
    get splitLabel(): string {
        return `${this.supporters.length} for, ${this.opponents.length} against`;
    }

    get outcome(): RitualChangeOutcome {
        return this.decision.outcome;
    }

    // The clans that voted against what they wanted, to keep the settlement
    // of one mind.
    get assenters(): RitualChangeStance[] {
        return this.stances.filter(s => s.assented);
    }

    stancesInRole(role: RitualRole): RitualChangeStance[] {
        return this.stances.filter(s => s.role === role);
    }

    stanceFor(clan: Clan): RitualChangeStance | undefined {
        return this.stances.find(s => s.clan === clan);
    }

    // One line on what happened, for the event feed and the alert row.
    get detail(): string {
        const raised = this.initiators.length
            ? `raised by ${this.initiatorNames}` : '';
        return [raised, this.causeDetail, this.decision.detail]
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
    const stances = takeStances(settlement, initiators);
    const event = new RitualChangeEvent(
        settlement, world.year.value, cause, settlement.population,
        initiators, stances, callTheQuestion(stances, initiators), joined, left);
    settlement.ritualChanges.push(event);
    world.lastRitualChanges.push(event);
    world.addNote(
        RITUAL_CHANGE_NOTE_LABEL,
        `The festival at {0} is in question`,
        event.detail,
        [{ uuid: settlement.uuid, name: settlement.name }],
    );
}

// ---------------------------------------------------------------------------
// What comes of it.
// ---------------------------------------------------------------------------
//
// The question is settled during planning, because it is a thing the clans
// decide. What it does to them lands in the year itself, once the page of
// news has been turned -- so this runs early in the advance, before the
// economy works out anyone's quality of life and before the year's
// perceptions are taken.
//
// Three ledgers are written. Quality of life is read back off the
// settlement's own record of its changes, each of which says what part every
// clan took, so a clan carries the mood of a decision for as long as the
// decision is still fresh. Respect and holiness toward the clans who raised
// it are booked as standing credit, the way a rite's outcome is. Alignment
// between the parties goes into the event ledger as an occasion, the way a
// gift or a quarrel does, and is read back off it.

// Quality of life, in points, for a clan of the middling party. The
// initiators feel it more.
export const RITUAL_CHANGE_QOL_WON = 3;
export const RITUAL_CHANGE_QOL_LOST = 2;
export const RITUAL_CHANGE_QOL_DISRUPTION = 1.5;
export const RITUAL_CHANGE_QOL_INITIATOR_FACTOR = 1.25;
export const RITUAL_CHANGE_QOL_SUPPORTER_FACTOR = 1;

// How the three kinds of mark fade, and how long before they are gone
// altogether. Getting your way is a pleasure that wears off; being overruled
// is a grievance that keeps; a settlement that could not decide has something
// wrong with it that keeps longest of all.
export const RITUAL_CHANGE_QOL_WON_DECAY = 0.2;
export const RITUAL_CHANGE_QOL_WON_YEARS = 20;
export const RITUAL_CHANGE_QOL_LOST_DECAY = 0.1;
export const RITUAL_CHANGE_QOL_LOST_YEARS = 40;
export const RITUAL_CHANGE_QOL_DISRUPTION_DECAY = 0.05;
export const RITUAL_CHANGE_QOL_DISRUPTION_YEARS = 80;

// Points of respect and holiness the clans who raised it gain by carrying the
// settlement, or lose by failing to. On the same 0-100 scale as the rest.
export const RITUAL_CHANGE_RESPECT = 5;
export const RITUAL_CHANGE_HOLINESS = 5;
// A deadlock is not a defeat, but the clans who would not have it think less
// of whoever put them through it.
export const RITUAL_CHANGE_DEADLOCK_RESPECT = 4;
export const RITUAL_CHANGE_DEADLOCK_HOLINESS = 4;

// Marks left on alignment between the parties, on the -1 to 1 scale. A
// settlement that decided leaves a clearer mark than one that could not.
export const RITUAL_CHANGE_ALIGNMENT = 0.04;
export const RITUAL_CHANGE_DEADLOCK_ALIGNMENT = 0.03;

// The longest any mark on quality of life lasts, so the scan back through a
// settlement's record knows when to stop.
const QOL_LOOKBACK_YEARS = Math.max(
    RITUAL_CHANGE_QOL_WON_YEARS,
    RITUAL_CHANGE_QOL_LOST_YEARS,
    RITUAL_CHANGE_QOL_DISRUPTION_YEARS);

// What one settled change still does to one clan's quality of life, this many
// years on. Zero once it is out of its span.
export function ritualChangeQolFor(
    event: RitualChangeEvent,
    role: RitualRole,
    age: number,
): number {
    if (age < 0) return 0;
    const faded = (base: number, decay: number, years: number) =>
        age >= years ? 0 : base * Math.pow(1 - decay, age);

    if (event.outcome === 'deadlock') {
        // Nobody's way, and the festival unsettled: everyone bears it.
        return -faded(
            RITUAL_CHANGE_QOL_DISRUPTION,
            RITUAL_CHANGE_QOL_DISRUPTION_DECAY,
            RITUAL_CHANGE_QOL_DISRUPTION_YEARS);
    }
    // A proposal thrown out changes nothing and leaves nobody feeling much
    // about it either way.
    if (event.outcome !== 'accepted') return 0;
    if (role === 'opponent') {
        return -faded(
            RITUAL_CHANGE_QOL_LOST,
            RITUAL_CHANGE_QOL_LOST_DECAY,
            RITUAL_CHANGE_QOL_LOST_YEARS);
    }
    const factor = role === 'initiator'
        ? RITUAL_CHANGE_QOL_INITIATOR_FACTOR
        : RITUAL_CHANGE_QOL_SUPPORTER_FACTOR;
    return factor * faded(
        RITUAL_CHANGE_QOL_WON,
        RITUAL_CHANGE_QOL_WON_DECAY,
        RITUAL_CHANGE_QOL_WON_YEARS);
}

// One line of the settlement's record, as it bears on one clan now.
export class RitualChangeQolEntry {
    constructor(
        readonly event: RitualChangeEvent,
        readonly role: RitualRole,
        readonly age: number,
        readonly value: number,
    ) { }
}

// Everything still telling on this clan from its settlement's record of
// changes to the festival. A clan that has moved is read against the record
// of where it lives now, which is the settlement whose festival it keeps.
export function ritualChangeQolEntries(clan: Clan): RitualChangeQolEntry[] {
    const settlement = clan.settlement;
    if (!settlement) return [];
    const year = clan.world.year.value;
    const entries: RitualChangeQolEntry[] = [];
    const changes = settlement.ritualChanges;
    // Chronological, so walking back from the end and stopping at the first
    // one out of range visits only what can still count.
    for (let i = changes.length - 1; i >= 0; --i) {
        const event = changes[i];
        const age = year - event.year;
        if (age > QOL_LOOKBACK_YEARS) break;
        const stance = event.stanceFor(clan);
        if (!stance) continue;
        const value = ritualChangeQolFor(event, stance.role, age);
        if (value === 0) continue;
        entries.push(new RitualChangeQolEntry(event, stance.role, age, value));
    }
    return entries;
}

export function ritualChangeQolEffect(clan: Clan): number {
    return sumFun(ritualChangeQolEntries(clan), e => e.value);
}

// Hand out what the year's settled questions did to standing and to how the
// clans regard each other. Called once, early in the advance.
export function settleRitualChanges(world: World): void {
    for (const event of world.lastRitualChanges) {
        applyRitualChange(world, event);
    }
}

function applyRitualChange(world: World, event: RitualChangeEvent): void {
    const year = world.year.value;
    const initiators = event.stancesInRole('initiator').map(s => s.clan);
    // Everyone who wanted it, the clans who raised it included: what the
    // spec calls Initiator+Supporters.
    const backers = event.supporters.map(s => s.clan);
    const supporters = event.stancesInRole('supporter').map(s => s.clan);
    const opponents = event.stancesInRole('opponent').map(s => s.clan);
    const everyone = event.stances.map(s => s.clan);

    // Respect and holiness are directed at whoever put the question.
    const towardInitiators = (
        judges: readonly Clan[], respect: number, holiness: number,
    ) => {
        for (const initiator of initiators) {
            for (const judge of judges) {
                if (judge === initiator) continue;
                const perceptions =
                    world.perceptions.getOrCreate(judge, initiator);
                perceptions.respect.creditRitualChange(respect, year);
                perceptions.holiness.creditRitualChange(holiness, year);
            }
        }
    };

    // Alignment is booked one directed pair at a time, as standing credit
    // that fades -- the same way what a rite said for us is worth.
    const stance = (
        subjects: readonly Clan[],
        objects: readonly Clan[],
        good: boolean,
        magnitude: number,
    ) => {
        for (const subject of subjects) {
            for (const object of objects) {
                if (subject === object) continue;
                world.perceptions.getOrCreate(subject, object)
                    .alignment.creditRitualChange(
                        good ? magnitude : -magnitude, year);
            }
        }
    };

    switch (event.outcome) {
        case 'accepted':
            towardInitiators(
                everyone, RITUAL_CHANGE_RESPECT, RITUAL_CHANGE_HOLINESS);
            stance(supporters, backers, true, RITUAL_CHANGE_ALIGNMENT);
            stance(opponents, backers, false, RITUAL_CHANGE_ALIGNMENT);
            break;

        case 'rejected':
            towardInitiators(
                everyone, -RITUAL_CHANGE_RESPECT, -RITUAL_CHANGE_HOLINESS);
            stance(backers, opponents, false, RITUAL_CHANGE_ALIGNMENT);
            stance(opponents, opponents, true, RITUAL_CHANGE_ALIGNMENT);
            break;

        case 'deadlock':
            towardInitiators(
                opponents,
                -RITUAL_CHANGE_DEADLOCK_RESPECT,
                -RITUAL_CHANGE_DEADLOCK_HOLINESS);
            stance(backers, opponents, false,
                RITUAL_CHANGE_DEADLOCK_ALIGNMENT);
            stance(opponents, backers, false,
                RITUAL_CHANGE_DEADLOCK_ALIGNMENT);
            break;
    }
}
