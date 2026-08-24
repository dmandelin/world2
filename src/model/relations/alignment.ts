import { clamp, sumFun } from "../lib/basics";
import { pct, signed } from "../lib/format";
import type { Clan } from "../people/people";
import { GenericItem } from "../records/basicdata";
import type { ClanDTO } from "../records/dtos";
import type { Connection } from "./connection";
import type { Interaction } from "./interaction";
import { BasicInteraction, getRelativeAttention } from "./basicinteraction";
import { ObservationDefs, observedEstimate } from "./information";
import { DecayingCredit } from "./credit";
import type { RitualEvent } from "../rituals";

// The alignment of clan A toward clan B is how much A cares
// about B's welfare, including all considerations such as
// affinity, mutual benefit, liking, and so on.

export class Alignment {
    private items_: AlignmentItem[] = [];
    private previousValue_: number = 0;
    private value_: number = 0;
    // Standing goodwill from rites one clan said for the other, one running
    // total per kind of rite since they fade at different rates. Booked once,
    // where the rite is settled, and only decays after.
    private ritualBonds_ = new Map<string, DecayingCredit>();

    static readonly ALPHA = 0.1;

    get items(): readonly AlignmentItem[] { return this.items_; }
    get previousValue(): number { return this.previousValue_; }

    // Sum of the current items, clamped to the alignment range.
    get currentItemsTotal(): number {
        return clamp(sumFun(this.items_, item => item.value), -1, 1);
    }

    get value(): number {
        return this.value_;
    }

    private ritualBond(key: string, halfLife: number): DecayingCredit {
        let bond = this.ritualBonds_.get(key);
        if (!bond) {
            bond = new DecayingCredit(halfLife);
            this.ritualBonds_.set(key, bond);
        }
        return bond;
    }

    // Book what a rite did for the standing between these two. Called once,
    // where the ritual is settled.
    creditRitual(event: RitualEvent, amount: number): void {
        this.ritualBond(event.def.key, event.def.holinessHalfLife)
            .add(amount, event.year);
    }

    // Total goodwill still standing from past rites, after fading.
    ritualBondValue(year: number): number {
        let total = 0;
        for (const bond of this.ritualBonds_.values()) {
            bond.decayTo(year);
            total += bond.value;
        }
        return total;
    }

    // Years since the most recent rite between these two, if any.
    yearsSinceRitual(year: number): number | undefined {
        let best: number | undefined;
        for (const bond of this.ritualBonds_.values()) {
            const since = bond.yearsSince(year);
            if (since !== undefined && (best === undefined || since < best)) {
                best = since;
            }
        }
        return best;
    }

    updateFor(
        subject: Clan,
        object: Clan,
        connections: Connection[],
        interactions: Interaction[]): void {

        this.items_ = [
            ...connections.map(connection =>
                AlignmentItem.from(connection.alignmentItem(subject, object))),
            // Basic-interaction attention is folded into the Sociability item
            // below, so only keep other interaction types (e.g. mutual aid).
            ...interactions
                .filter(interaction => !(interaction instanceof BasicInteraction))
                .map(interaction => AlignmentItem.from(interaction.alignmentItem(subject, object))),
            AlignmentItem.forDitching(subject, object),
            AlignmentItem.forGifts(subject, object),
            AlignmentItem.forGenerosity(subject, object),
            AlignmentItem.forPiety(subject, object),
            AlignmentItem.forSociability(subject, object),
            AlignmentItem.forConflict(subject, object),
            AlignmentItem.forRitualHelp(this, subject.world.year.value),
        ];
        this.previousValue_ = this.value_;
        const currentTotal = this.currentItemsTotal;
        this.value_ = Alignment.ALPHA * currentTotal + (1 - Alignment.ALPHA) * this.previousValue_;
    }

    // A clan is entirely on its own side. Held at the top of the range
    // outright rather than smoothed toward it: this is not an opinion that
    // has to be arrived at.
    updateForSelf(subject: Clan): void {
        this.items_ = [new AlignmentItem('Self', 1, 1, 'A clan is its own')];
        this.previousValue_ = this.value_;
        this.value_ = 1;
    }

    clone(): Alignment {
        const a = new Alignment();
        a.items_ = [...this.items_];
        a.previousValue_ = this.previousValue_;
        a.value_ = this.value_;
        for (const [key, bond] of this.ritualBonds_) {
            a.ritualBonds_.set(key, bond.clone());
        }
        return a;
    }
}

export class AlignmentItem {
    constructor(
        readonly label: string,
        readonly baseValue: number,
        readonly modifier: number,
        readonly explanation: string,
    ) { }

    get value(): number {
        return this.baseValue * this.modifier;
    }

    // Wrap an item produced by a connection or interaction, whose value is
    // already fully baked (modifier 1).
    static from(item: GenericItem): AlignmentItem {
        return new AlignmentItem(item.label, item.value, 1, item.explanation);
    }

    // Work on the common ditches. Every clan holds its own idea of what a
    // neighbor owes the ditches, and thinks the better of one that digs past
    // it -- and the worse of one that leaves the work to everybody else. How
    // much it matters is a disposition, so some clans keep close count and
    // others barely notice. Only within a settlement: clans elsewhere dig
    // ditches this one neither uses nor sees.
    static forDitching(subject: Clan, object: Clan): AlignmentItem {
        if (subject.settlement !== object.settlement) {
            return new AlignmentItem('Ditching', 0, 0, 'not our ditches');
        }
        const expected = subject.traits.ditchingExpectation;
        const actual = object.ditchingEffortShare;
        // In points of effort, so the disposition reads per point.
        const surplus = 100 * (actual - expected);
        return new AlignmentItem(
            'Ditching',
            surplus,
            subject.traits.ditchingAdmiration,
            `${pct(actual)} of effort on the ditches vs ${pct(expected)} expected`,
        );
    }

    // The personal side of generosity: gifts and aid felt as aimed at us
    // weigh in again here, on top of the general reputation below.
    static forGifts(subject: Clan, object: Clan): AlignmentItem {
        const estimate = observedEstimate(subject, object, ObservationDefs.Generosity);
        return new AlignmentItem(
            'Gifts',
            estimate,
            0.02,
            `Generosity estimate ${estimate.toFixed(1)}`
        );
    }

    // How generous we believe the object is overall, from what we've seen
    // (or heard) it give away. The biggest positive component of alignment.
    static forGenerosity(subject: Clan, object: Clan): AlignmentItem {
        const estimate = observedEstimate(subject, object, ObservationDefs.Generosity);
        return new AlignmentItem(
            'Generosity',
            estimate,
            0.035,
            `Generosity estimate ${estimate.toFixed(1)}`
        );
    }

    static forPiety(subject: Clan, object: Clan): AlignmentItem {
        const estimate = observedEstimate(subject, object, ObservationDefs.Piety);
        return new AlignmentItem(
            'Piety',
            estimate - 50,
            1 / 200,
            `Piety estimate ${estimate.toFixed(0)} vs 50`
        );
    }

    // Attention devoted to the relationship via basic interactions. A direct
    // assessment: how much we deal with them is not something we could be
    // mistaken about.
    static forSociability(subject: Clan, object: Clan): AlignmentItem {
        const relativeAttention = getRelativeAttention(subject, object);
        return new AlignmentItem(
            'Sociability',
            relativeAttention,
            0.1,
            `Attention ${pct(relativeAttention)}`
        );
    }

    // Rites the two clans have said for one another. Standing rather than
    // momentary: a neighbor who saw a clan's member through a mortal illness
    // is thought well of for a long time after, and the debt fades slowly.
    static forRitualHelp(alignment: Alignment, year: number): AlignmentItem {
        const value = alignment.ritualBondValue(year);
        const since = alignment.yearsSinceRitual(year);
        return new AlignmentItem(
            'Ritual Help',
            value,
            1,
            since === undefined
                ? 'no rites between us'
                : `${signed(100 * value, 1)} Favor standing, last rite `
                    + `${since === 0 ? 'this year' : `${since} y ago`}`
        );
    }

    // How aggressive we believe the object has been toward us, from what
    // we've seen (or heard) of its quarrels. The biggest negative component.
    static forConflict(subject: Clan, object: Clan): AlignmentItem {
        const estimate = observedEstimate(subject, object, ObservationDefs.Bellicosity);
        return new AlignmentItem(
            'Conflict',
            estimate,
            -0.04,
            `Bellicosity estimate ${estimate.toFixed(1)}`
        );
    }
}

export function getAlignment(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
    return subject.world.perceptions.get(subject.uuid, object.uuid)?.alignment.value ?? 0;
}
