export type UUID = string;
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

export class GenericItem {
    constructor(
        readonly label: string,
        readonly value: number,
        readonly explanation: string
    ) {}
}