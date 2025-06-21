import { clamp } from "./basics";
import type { Clans } from "./clans";
import type { Rites } from "./rites";
import { Technai } from "./tech";
import type { TradeGood } from "./trade";
import type { World } from "./world";

export class Settlement {
    readonly technai = new Technai(this);
    readonly localTradeGoods = new Set<TradeGood>();

    parent: Settlement|undefined;
    daughters: Settlement[] = [];

    constructor(
        readonly world: World,
        readonly name: string, 
        readonly x: number,
        readonly y: number,
        readonly clans: Clans) {
        
        for (const clan of clans) {
            clan.settlement = this;
        }
    }

    get abandoned() {
        return this.clans.length === 0;
    }

    get size() {
        return this.clans.reduce((acc, clan) => acc + clan.size, 0);
    }

    get popLimit() {
        // Initially we assume people are taking advantage of small natural
        // fields of barley, lentils, and such, for a population limit of 300.
        //
        // Once there is irrigation, we'll assume people can irrigate a wide
        // area and are willing to commute up to 1.5 km to work in the fields.
        // This gives a population limit of 1000.
        return this.technai.hasIrrigation ? 1000 : 300;
    }

    get agricultureDescription() {
        if (this.size < 300 || !this.technai.hasIrrigation) {
            return 'We\'re farming small fields of barley and lentils we found by the river.';
        } else {
            return 'We\'re farming fields we irrigated using canals.';
        }
    }

    get rites(): Rites[] {
        return [this.clans.rites, ...this.clans.map(clan => clan.rites)];
    }

    private lastSizeChange_ = 0;

    get lastSizeChange() {
        return this.lastSizeChange_;
    }

    advance() {
        const sizeBefore = this.size;
        this.technai.advance(this.size);
        this.clans.advance();

        this.clans.rites.advance();
        for (const clan of this.clans) {
            // Planning isn't important yet and introduces a lot of notification noise.
            clan.rites.advance(false);
        }

        this.lastSizeChange_ = this.size - sizeBefore;
    }
}