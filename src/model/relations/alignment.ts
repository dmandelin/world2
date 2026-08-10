import { clamp, sumFun } from "../lib/basics";
import { pct } from "../lib/format";
import type { Clan } from "../people/people";
import { GenericItem } from "../records/basicdata";
import type { ClanDTO } from "../records/dtos";
import type { Connection } from "./connection";
import type { Interaction } from "./interaction";
import type { Conflict } from "./conflict";
import { BasicInteraction, getRelativeAttention } from "./basicinteraction";

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
        interactions: Interaction[],
        conflict?: Conflict): void {

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
            AlignmentItem.forConflict(subject, object, conflict),
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

// Total food (gifts + aid) that `subject` received from `object` this turn.
function foodReceivedFrom(subject: Clan, object: Clan): number {
    const consumption = subject.consumption;
    if (!consumption) return 0;
    let sum = 0;
    for (const r of consumption.fromGifts) {
        if (r.good.isSubsistence && r.clan?.uuid === object.uuid) sum += r.amount;
    }
    for (const r of consumption.fromDonations) {
        if (r.good.isSubsistence && r.clan?.uuid === object.uuid) sum += r.amount;
    }
    return sum;
}

// A clan's food income this turn, used to normalize gift/aid amounts.
function foodIncome(clan: Clan): number {
    return clan.production?.totalFood() ?? 0;
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

    // Gifts and aid the object gave to us this turn, relative to our income.
    static forGifts(subject: Clan, object: Clan): AlignmentItem {
        const received = foodReceivedFrom(subject, object);
        const income = foodIncome(subject);
        const ratio = income > 0 ? received / income : 0;
        return new AlignmentItem(
            'Gifts',
            ratio,
            1,
            `Received ${received.toFixed(1)} / income ${income.toFixed(1)}`
        );
    }

    // How generous the object is overall: aid it donated relative to its income.
    static forGenerosity(subject: Clan, object: Clan): AlignmentItem {
        const aidGiven = (object.distribution ? object.distribution.totalFoodAidGiven : 0)
            + (object.stockOutflow ? object.stockOutflow.totalFoodAidGiven : 0);
        const income = foodIncome(object);
        const ratio = income > 0 ? aidGiven / income : 0;
        return new AlignmentItem(
            'Generosity',
            ratio,
            0.1,
            `Aid given ${aidGiven.toFixed(1)} / income ${income.toFixed(1)}`
        );
    }

    static forPiety(subject: Clan, object: Clan): AlignmentItem {
        const objectPiety = object.traits ? object.traits.piety : 50;
        return new AlignmentItem(
            'Piety',
            objectPiety - 50,
            1 / 200,
            `Piety ${objectPiety.toFixed(0)} vs 50`
        );
    }

    // Attention devoted to the relationship via basic interactions.
    static forSociability(subject: Clan, object: Clan): AlignmentItem {
        const relativeAttention = getRelativeAttention(subject, object);
        return new AlignmentItem(
            'Sociability',
            relativeAttention,
            0.1,
            `Attention ${pct(relativeAttention)}`
        );
    }

    // How aggressive the object was toward us: penalty per hawk play.
    static forConflict(subject: Clan, object: Clan, conflict?: Conflict): AlignmentItem {
        const hawkCount = conflict ? conflict.hawkCountBy(object) : 0;
        return new AlignmentItem(
            'Conflict',
            hawkCount,
            -0.2,
            `Hawk plays against us: ${hawkCount}`
        );
    }
}

export function getAlignment(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
    return subject.world.perceptions.get(subject.uuid, object.uuid)?.alignment.value ?? 0;
}
