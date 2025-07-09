export class TradeGood {
    constructor(readonly name: string, readonly bulk: number) {}
}

export const TradeGoods = {
    Subsistence: new TradeGood('Subsistence', 1000),

    Cereals: new TradeGood('Cereals', 50),
    Livestock: new TradeGood('Livestock', 10),
    Fish: new TradeGood('Fish', 30),

    Bitumen: new TradeGood('Bitumen', 10),
    Flint: new TradeGood('Flint', 20),
    Obsidian: new TradeGood('Obsidian', 10),

    ReedProducts: new TradeGood('Reed Products', 30),
    ShellBeads: new TradeGood('Shell Beads', 10),

    ClayFigurines: new TradeGood('Clay Figurines', 1),
}

export interface TradePartner {
    readonly moniker: string;
    readonly tradeGoods: TradeGood[]; // availble for export
    readonly tradeRelationships: Set<TradeRelationship>;
}

export class OffMapTradePartner implements TradePartner {
    readonly tradeRelationships = new Set<TradeRelationship>();

    constructor(
        readonly moniker: string,
        readonly tradeGoods: TradeGood[],
    ) {}   
}

export class Exchange {
    constructor(
        readonly p1Sends: TradeGood,
        readonly p2Sends: TradeGood,
    ) {}
}

export class TradeRelationship {
    readonly exchanges: Exchange[] = [];

    constructor(
        readonly p1: TradePartner,
        readonly p2: TradePartner,
    ) {}

    partner(p: TradePartner): TradePartner {
        return this.p1 === p ? this.p2 : this.p1;
    }

    sending(p: TradePartner): TradeGood[] {
        if (p === this.p1) {
            return this.exchanges.map(e => e.p1Sends);
        } else if (p === this.p2) {
            return this.exchanges.map(e => e.p2Sends);
        } else {
            return [];
        }
    }

    receiving(p: TradePartner): TradeGood[] {
        if (p === this.p1) {
            return this.exchanges.map(e => e.p2Sends);
        } else if (p === this.p2) {
            return this.exchanges.map(e => e.p1Sends);
        } else {
            return [];
        }
    }

    addExchange(p: TradePartner, sends: TradeGood, receives: TradeGood): Exchange {
        if (p === this.p2) {
            [sends, receives] = [receives, sends];
        }
        const exchange = new Exchange(sends, receives);
        this.exchanges.push(exchange);
        return exchange;
    }
}