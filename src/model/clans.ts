import { poisson, weightedRandInt } from "./distributions";
import { Festival } from "./festival";
import { exchangeGifts, resolveDisputes } from "./interactions";
import { Clan, EconomicPolicies, PersonalityTraits } from "./people";
import { Pot } from "./production";

export class Clans extends Array<Clan> {
    festival: Festival = new Festival(this);

    // Communal sharing economy.
    pot = new Pot(this);

    constructor(...clans: Clan[]) {
      super(...clans);
      this.sort((a, b) => b.prestige - a.prestige);
    }
  
    get population(): number {
      return this.reduce((total, clan) => total + clan.size, 0);
    }

    // How much defection people can get away with, 0-1.
    get slippage(): number {
        const cap = 120;
        const req = this.population;
        if (cap >= req) return 0.0;
        return 1 - cap / req;
    }

    remove(clan: Clan) {
        this.splice(this.indexOf(clan), 1);
    }

    advance() {
        const policySnapshot = new Map(this.map(clan => [clan, clan.economicPolicy]));
        const slippage = this.slippage;
        for (const clan of this) {
            clan.chooseEconomicPolicy(policySnapshot, slippage);
        }
        this.produce();
        this.distribute();

        this.runFestival();
        this.interact();
        this.marry();
        for (const clan of this) clan.advance();
        this.split();
        this.merge();
        this.prune()

        this.sort((a, b) => b.prestige - a.prestige);
    }

    produce() {
        for (const clan of this) {
            clan.pot.clear();
        }
        this.pot.clear();

        for (const clan of this) {
            const input = clan.size * clan.productivity;
            if (clan.economicPolicy === EconomicPolicies.Share) {
                this.pot.accept(clan.size, input);
            } else if (clan.economicPolicy === EconomicPolicies.Cheat) {
                this.pot.accept(clan.size * (1 - this.slippage), input * (1 - this.slippage));
                // The idea is that we work less by the slippage, but gain some
                // benefit in increased leisure.
                clan.pot.accept(clan.size * this.slippage, input * this.slippage * 0.5);
            } else {
                clan.pot.accept(clan.size, input);
            }
        }
    }

    distribute() {
        for (const clan of this) { clan.consumption = 0; }

        for (const clan of this) {
            clan.pot.distribute();
        }
        this.pot.distribute();

        for (const clan of this) {
            clan.perCapitaConsumption = clan.consumption / clan.size;
        }
    }

    runFestival() {
        const participants = [];
        for (const clan of this) {
            clan.festivalModifier = 0;
            if (!clan.traits.has(PersonalityTraits.GRINCH)) {
                participants.push(clan);
            }
        }
        this.festival = new Festival(participants);
        this.festival.process(); 
    }

    *pairs() {
        for (let i = 0; i < this.length; ++i) {
            for (let j = i + 1; j < this.length; ++j) {
                yield [this[i], this[j]];
            }
        }
    }

    interact() {
        for (const clan of this) {
            clan.interactionModifier = 0;
        }

        for (const [c, d] of this.pairs()) {
            exchangeGifts(c, d);
        }

        for (const [c, d] of this.pairs()) {
            resolveDisputes(c, d);
        }
    }

    interact2() {
        // Each pair of clans may have some zero-sum interactions,
        // typically embedded in a positive- or negative-sum context.
        // Those contexts are assumed to be part of the general model,
        // so we only need to consider the zero-sum interactions here.
        //
        // The interaction transfers happiness and 'temporary quality'
        // (representing resources, tangble or otherwise) between the
        // two.
        for (const c of this) {
            c.interactionModifier = 0;
        }

        for (let i = 0; i < this.length; ++i) {
            for (let j = i + 1; j < this.length; ++j) {
                const stakes = poisson(1);
                if (stakes == 0) continue;

                const a = this[i];
                const b = this[j];
                
                // Use the Elo formula but with 10 points instead of 400.
                const aWinProb = 1 / (1 + Math.pow(10, (b.prestige - a.prestige) / 10));
                if (Math.random() < aWinProb) {
                    a.interactionModifier += stakes;
                    b.interactionModifier -= stakes;
                } else {
                    a.interactionModifier -= stakes;
                    b.interactionModifier += stakes;
                }
            }
        }
    }

    marry() {
        // Young women marrying into their husbands' clans was the
        // most common pattern. We don't simulate every pairing.
        // The key point is that without this, once a clan gets down
        // to a small number of young women, it will rapidly die out.
        // But in reality they would of course try to marry.

        const husbandWeights = this.map(clan => 
            Math.pow(10, clan.qol / 100));
        
        let women = 0;
        for (const clan of this) {
            women += clan.slices[1][0];
            clan.slices[1][0] = 0;
        }

        for (let i = 0; i < women; ++i) {
            const husbandIndex = weightedRandInt(husbandWeights);
            // If same clan selected: don't marry, stay in the clan.
            // Note that women from properous clans are less likely
            // to marry in this model. However, they still can
            // give birth, and we assume in part they may form a
            // matrilocal marriage.
            const husbandClan = this[husbandIndex];
            ++husbandClan.slices[1][0];
            if (husbandClan.slices[1][0] >= husbandClan.slices[1][1]) {
                husbandWeights[husbandIndex] = 0;
            }
        }
    }

    split() {
        const newClans = [];
        for (const clan of this) {
            newClans.push(clan);
            if (clan.size > Clan.maxDesiredSize) {
                newClans.push(clan.splitOff(this));
            }
        }
        this.splice(0, this.length, ...newClans);
    }

    merge() {
        while (true) {
            if (this.length < 2) return;
            const sortedClans = this.toSorted((a, b) => a.size - b.size);
            if (sortedClans[0].size >= Clan.minDesiredSize) return;
            sortedClans[1].absorb(sortedClans[0]);
            this.splice(this.indexOf(sortedClans[0]), 1);
        }
    }

    prune() {
        this.splice(0, this.length, ...this.filter(clan => clan.size > 0));
    }
}
