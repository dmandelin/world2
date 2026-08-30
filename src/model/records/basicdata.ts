export type UUID = string;
import { explain, type Explainer } from "../lib/explain";
export type PairID = string;

export type HasOrIsUUID = { uuid: UUID } | UUID;

export function splitPairID(pairID: PairID): [UUID, UUID] {
    const [c1, c2] = pairID.split('|');
    return [c1, c2];
}

export function uuidOf(c: HasOrIsUUID): UUID {
    return typeof c === 'string' ? c : c.uuid;
}

export function pairIDOf(c1: HasOrIsUUID, c2: HasOrIsUUID): PairID {
    const uuid1 = typeof c1 === 'string' ? c1 : c1.uuid;
    const uuid2 = typeof c2 === 'string' ? c2 : c2.uuid;
    return uuid1 < uuid2 ? `${uuid1}|${uuid2}` : `${uuid2}|${uuid1}`;
}

// The type parameter is the explainer's argument. It appears in no member, so
// every instantiation is the same type to anyone holding one; it exists only
// to check, at the point of construction, that the explainer and the thing it
// will be handed agree.
export class GenericItem<P = unknown> {
    private readonly explainer_: Explainer<any>;
    private readonly explainerArg_: unknown;

    get explanation(): string {
        return explain(this.explainer_, this.explainerArg_ ?? this);
    }

    constructor(
        readonly label: string,
        readonly value: number,
        explainer: Explainer<P>,
        explainerArg?: P,
    ) {
        this.explainer_ = explainer as Explainer<any>;
        this.explainerArg_ = explainerArg;
    }
}