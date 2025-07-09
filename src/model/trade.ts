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

class OffMapTradePartner {
    constructor(
        readonly name: string,
        readonly tradeGoods: TradeGood[],
    ) {}   
}