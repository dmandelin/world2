import { clamp, sumFun } from "../lib/basics";
import { pct } from "../lib/format";
import type { Clan } from "../people/people";
import { GenericItem } from "../records/basicdata";
import type { ClanDTO } from "../records/dtos";
import type { Connection } from "./connection";
import type { Interaction } from "./interaction";
import { BasicInteraction, getRelativeAttention } from "./basicinteraction";
import { ObservationDefs, type ObservationDef } from "./information";

// The alignment of clan A toward clan B is how much A cares
// about B's welfare, including all considerations such as
// affinity, mutual benefit, liking, and so on.

export class Alignment {
    private items_: AlignmentItem[] = [];
    private previousValue_: number = 0;
    private value_: number = 0;

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
            AlignmentItem.forGifts(subject, object),
            AlignmentItem.forGenerosity(subject, object),
            AlignmentItem.forPiety(subject, object),
            AlignmentItem.forSociability(subject, object),
            AlignmentItem.forConflict(subject, object),
        ];
        this.previousValue_ = this.value_;
        const currentTotal = this.currentItemsTotal;
        this.value_ = Alignment.ALPHA * currentTotal + (1 - Alignment.ALPHA) * this.previousValue_;
    }

    clone(): Alignment {
        const a = new Alignment();
        a.items_ = [...this.items_];
        a.previousValue_ = this.previousValue_;
        a.value_ = this.value_;
        return a;
    }
}

// Subject's own directed belief about object on some tracked quality,
// falling back to the quality's prior if nothing has been observed yet.
function observedEstimate(subject: Clan, object: Clan, def: ObservationDef): number {
    const observations = subject.world.perceptions.get(subject.uuid, object.uuid)?.information.observations;
    return observations?.estimate(def) ?? def.prior;
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
