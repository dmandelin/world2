import { clamp, sumFun } from "../lib/basics";
import { pct, signed } from "../lib/format";
import type { Clan } from "../people/people";
import { GenericItem } from "../records/basicdata";
import type { ClanDTO } from "../records/dtos";
import type { Connection } from "./connection";
import type { Interaction } from "./interaction";
import { BasicInteraction, getRelativeAttention } from "./basicinteraction";
import { DILIGENCE_SCALE, ObservationDefs, observedEstimate } from "./information";
import { DecayingCredit } from "./credit";
import type { RitualEvent } from "../rituals";
import { feastAlignmentEffect, festivalAppeal, festivalGivingSeen } from "../festivals";
import { explain, type Explainer } from "../lib/explain";

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
        interactions: Interaction[],
        // How much of the object the subject actually sees, 0 to 1. Some
        // items are judgments about conduct the subject may simply not have
        // been in a position to notice.
        informationValue: number = 1): void {

        this.items_ = [
            ...connections.map(connection =>
                AlignmentItem.from(connection.alignmentItem(subject, object))),
            // Basic-interaction attention is folded into the Sociability item
            // below, so only keep other interaction types (e.g. mutual aid).
            ...interactions
                .filter(interaction => !(interaction instanceof BasicInteraction))
                .map(interaction => AlignmentItem.from(interaction.alignmentItem(subject, object))),
            AlignmentItem.forDitching(subject, object),
            AlignmentItem.forFestivals(subject, object),
            AlignmentItem.forFestivalGiving(subject, object, informationValue),
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

// The type parameter is the explainer's argument. It appears in no member, so
// every instantiation is the same type to anyone holding one; it exists only
// to check, at the point of construction, that the explainer and the thing it
// will be handed agree.
export class AlignmentItem<P = unknown> {
    private readonly explainer_: Explainer<any>;
    private readonly explainerArg_: unknown;

    get explanation(): string {
        return explain(this.explainer_, this.explainerArg_ ?? this);
    }

    constructor(
        readonly label: string,
        readonly baseValue: number,
        readonly modifier: number,
        explainer: Explainer<P>,
        // What to call the explainer with. Left out when the item's own
        // fields are all the text needs.
        explainerArg?: P,
    ) {
        this.explainer_ = explainer as Explainer<any>;
        this.explainerArg_ = explainerArg;
    }

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
    // others barely notice.
    //
    // What it thinks the neighbor dug is its Diligence estimate rather than
    // the truth, so a clan it barely deals with is judged on a hazy idea
    // pulled toward what one assumes of clans in general -- and a clan that
    // quietly slacks gets away with it for a while. Only within a settlement:
    // clans elsewhere dig ditches this one neither uses nor sees.
    static forDitching(subject: Clan, object: Clan): AlignmentItem {
        if (subject.settlement !== object.settlement) {
            return new AlignmentItem('Ditching', 0, 0, 'not our ditches');
        }
        // Both in points of effort, so the disposition reads per point.
        const expected = DILIGENCE_SCALE * subject.traits.ditchingExpectation;
        const seen = observedEstimate(subject, object, ObservationDefs.Diligence);
        return new AlignmentItem(
            'Ditching',
            seen - expected,
            subject.traits.ditchingAdmiration,
            ditchingText,
            { seen, expected },
        );
    }

    // A year of feasting together. Everyone in the settlement was at the
    // same fires, ate the same food, and danced the same dances, and thinks
    // rather better of everyone else for it. The same for every neighbor,
    // since a feast is not aimed at anyone in particular; what varies is how
    // good a feast the settlement managed.
    static forFestivals(subject: Clan, object: Clan): AlignmentItem {
        if (subject.settlement !== object.settlement) {
            return new AlignmentItem('Festivals', 0, 0, 'not our festivals');
        }
        const appeal = festivalAppeal(subject);
        return new AlignmentItem(
            'Festivals',
            feastAlignmentEffect(subject, object),
            1,
            feastText,
            { appeal },
        );
    }

    // What a neighbor brought to the settlement's festivals, against what
    // this clan thought it owed them. Nobody counts out the baskets
    // beforehand, so this is a judgment rather than a reckoning -- and a
    // judgment a clan can only make about neighbors it has some dealings
    // with. What it has not seen, it does not hold against anyone: the
    // shortfall it notices is scaled by how well it knows the clan at all.
    static forFestivalGiving(
        subject: Clan, object: Clan, informationValue: number): AlignmentItem {
        if (subject.settlement !== object.settlement) {
            return new AlignmentItem('Festival Giving', 0, 0, 'not our festivals');
        }
        const seen = festivalGivingSeen(object);
        if (seen === undefined) {
            return new AlignmentItem(
                'Festival Giving', 0, 0, 'no festivals held yet');
        }
        const expected = subject.traits.festivalExpectation;
        const information = clamp(informationValue, 0, 1);
        return new AlignmentItem(
            'Festival Giving',
            information * (seen - expected),
            subject.traits.festivalAdmiration,
            festivalGivingText,
            { seen, expected, information },
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
            generosityText
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
            generosityText
        );
    }

    static forPiety(subject: Clan, object: Clan): AlignmentItem {
        const estimate = observedEstimate(subject, object, ObservationDefs.Piety);
        return new AlignmentItem(
            'Piety',
            estimate - 50,
            1 / 200,
            pietyText
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
            sociabilityText
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
            since === undefined ? 'no rites between us' : ritualHelpText,
            { value, since },
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
            bellicosityText
        );
    }
}

// The explanations, written once at load rather than rebuilt per item. Each
// takes what it needs as an argument, so none of them closes over anything.
const generosityText = (i: AlignmentItem) =>
    `Generosity estimate ${i.baseValue.toFixed(1)}`;
const pietyText = (i: AlignmentItem) =>
    `Piety estimate ${(i.baseValue + 50).toFixed(0)} vs 50`;
const sociabilityText = (i: AlignmentItem) =>
    `Attention ${pct(i.baseValue)}`;
const bellicosityText = (i: AlignmentItem) =>
    `Bellicosity estimate ${i.baseValue.toFixed(1)}`;
const ditchingText = (d: { seen: number, expected: number }) =>
    `Diligence estimate ${d.seen.toFixed(1)} vs ${d.expected.toFixed(1)} expected`;
const feastText = (d: { appeal: number }) =>
    `Feast appeal ${d.appeal.toFixed(2)}`;
const festivalGivingText = (
    d: { seen: number, expected: number, information: number }) =>
    `brought ${pct(d.seen)} of the standard vs ${pct(d.expected)} expected`
        + `, seen at ${pct(d.information)}`;
const ritualHelpText = (d: { value: number, since: number | undefined }) =>
    `${signed(100 * d.value, 1)} Favor standing, last rite `
        + `${d.since === 0 ? 'this year' : `${d.since} y ago`}`;

export function getAlignment(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
    return subject.world.perceptions.get(subject.uuid, object.uuid)?.alignment.value ?? 0;
}
