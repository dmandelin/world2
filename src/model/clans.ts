import { weightedRandInt } from "./distributions";
import { Clan, ConsumptionCalc, EconomicPolicies } from "./people";
import { Pot } from "./production";
import { Rites } from "./spirit";

const communalGoodsSource = 'communal';

export class CondorcetCalc {
    constructor(readonly clans: Clans, readonly leader: Clan|undefined, readonly wins: number[][]) {}
}

export class Clans extends Array<Clan> {
    // Communal sharing economy.
    pot = new Pot(communalGoodsSource, this);

    // Community rites.
    rites = new Rites(this);

    constructor(...clans: Clan[]) {
      super(...clans);
    }
  
    get population(): number {
      return this.reduce((total, clan) => total + clan.size, 0);
    }

    // Population-weighted average of other clans' views of this one.
    averagePrestige(clan: Clan): number {
        let totalPrestige = 0;
        let totalWeight = 0;
        for (const other of this) {
            if (other === clan) continue;
            const prestige = other.prestigeViewOf(clan);
            if (prestige) {
                totalPrestige += prestige.value * other.size;
                totalWeight += other.size;
            }
        }
        return totalWeight ? totalPrestige / totalWeight : 0;
    }

    // Condorcet leading clan by prestige.
    get condorcetLeader(): CondorcetCalc {
        if (this.length && this[0].prestigeViews.size == 0) {
            return new CondorcetCalc(this, undefined, []);
        }

        // Get an array of the prestige values for each clan
        const prestigeCalcs = this.map(clan => this.map(other => clan.prestigeViewOf(other)!.value));

        // Fill out a 2D array with the number of times i wins against j.
        const wins = new Array(this.length).fill(0).map(() => new Array(this.length).fill(0));
        for (let i = 0; i < this.length; ++i) {
            for (let j = i + 1; j < this.length; ++j) {
                const a = this[i];
                const b = this[j];

                for (let k = 0; k < this.length; ++k) {
                    if (k === i || k === j) continue;
                    const ballot = prestigeCalcs[k];
                    if (ballot[i] > ballot[j]) {
                        ++wins[i][j];
                    } else if (ballot[i] < ballot[j]) {
                        ++wins[j][i];
                    } else {
                        wins[i][j] += 0.5;
                        wins[j][i] += 0.5;
                    }
                }
            }
        }

        // Look for a row that's greater than all the others.
        for (let i = 0; i < this.length; ++i) {
            let isAbove = true, isLeader = true;
            for (let j = 0; j < this.length; ++j) {
                if (i === j) continue;
                if (wins[i][j] < wins[j][i]) {
                    isLeader = false;
                    break;
                } else if (wins[i][j] == wins[j][i]) {
                    isAbove = false;
                }
            }
            if (isLeader && isAbove) return new CondorcetCalc(this, this[i], wins);
        }

        // For now, say there is no leader.
        return new CondorcetCalc(this, undefined, wins);
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

        this.performRites();

        this.marry();
        for (const clan of this) clan.advancePopulation();
        this.split();
        this.merge();
        this.prune();

        for (const clan of this) clan.prepareTraitChanges();
        for (const clan of this) clan.commitTraitChanges();
        for (const clan of this) ++clan.tenure;

        if (this.rites.quality < 0.20) {
            console.log('Terrible rites, dispersing!');
            this.splice(0, this.length);
        }
    }

    produce() {
        this.pot = new Pot(communalGoodsSource, this);
        for (const clan of this) {
            clan.pot.clear();
        }

        for (const clan of this) {
            let commonFraction = 0.0;   
            let cheatFraction = 0.0;
            switch (clan.economicPolicy) {
                case EconomicPolicies.Share:
                    commonFraction = 1.0;
                    break;
                case EconomicPolicies.Cheat:
                    commonFraction = 1.0 - this.slippage;
                    // The clan can do something else with their time, but it will be
                    // hard to garner full benefit.
                    cheatFraction = 0.5 * this.slippage;
                    break;
            }

            const baseProduce = clan.size * clan.productivity;
            const commonProduce = baseProduce * commonFraction;
            const cheatProduce = cheatFraction * baseProduce;
            const clanProduce = baseProduce - commonProduce - cheatProduce;

            if (commonProduce > 0) {
                this.pot.accept(clan.size, commonProduce);
            }
            if (clanProduce > 0) {
                clan.pot.accept(clan.size, clanProduce);
            }

            clan.economicReport = {
                baseProduce,
                commonFraction,
                commonProduce,
                clanProduce: clanProduce + cheatProduce,
            }
        }
    }

    distribute() {
        this.forEach(clan => clan.consumption = new ConsumptionCalc(clan.size));
        this.pot.distribute();
        this.forEach(clan => clan.pot.distribute());
    }

    performRites() {
        this.rites = new Rites(this);
        this.rites.plan();
        this.rites.perform();

    }

    *pairs() {
        for (let i = 0; i < this.length; ++i) {
            for (let j = i + 1; j < this.length; ++j) {
                yield [this[i], this[j]];
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
            Math.pow(10, clan.averagePrestige / 100));
        
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

    updateSeniority() {
        const newClans = [];
        let maxExistingSeniority = -1;
        for (const clan of this) {
            if (clan.seniority == -1) {
                newClans.push(clan);
            } else {
                maxExistingSeniority = Math.max(maxExistingSeniority, clan.seniority);
            }
        }
        for (const clan of newClans) {
            clan.seniority = maxExistingSeniority + 1;
        }
    }

    updatePrestigeViews() {
        this.forEach(clan => clan.startUpdatingPrestige());
        this.forEach(clan => clan.finishUpdatingPrestige());

        const totalExpPrestige = this.reduce((acc, clan) =>
             acc + Math.pow(1.05, clan.averagePrestige - 50), 0);
        for (const clan of this) {
            const expPrestige = Math.pow(1.05, clan.averagePrestige - 50);
            clan.influence = expPrestige / totalExpPrestige;
        }
    }
}
