import { weightedRandInt } from "../lib/distributions";
import type { NoteTaker } from "../records/notifications";
import { Clan } from "./people";
import { Rites } from "../rites";
import { averageFun } from "../lib/basics";

const communalGoodsSource = 'communal';

export class CondorcetCalc {
    constructor(readonly clans: Clans, readonly leader: Clan|undefined, readonly wins: number[][]) {}
}

export class Clans extends Array<Clan> {
    // Community rites.
    rites: Rites;

    constructor(readonly noteTaker: NoteTaker, ...clans: Clan[]) {
      super(...clans);
      this.rites = new Rites('Village rites', 150, 50, 0.5, this, [], [], noteTaker);
    }
  
    get population(): number {
      return this.reduce((total, clan) => total + clan.population, 0);
    }

    // Population-weighted average of views of this one.
    averagePrestige(clan: Clan): number {
        let totalPrestige = 0;
        let totalWeight = 0;
        for (const other of this) {
            const prestige = other.prestigeViewOf(clan);
            if (prestige) {
                totalPrestige += prestige.value * other.population;
                totalWeight += other.population;
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

    remove(clan: Clan) {
        this.splice(this.indexOf(clan), 1);
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
            // Note that women from prosperous clans are less likely
            // to marry in this model. However, they still can
            // give birth, and we assume in part they may form a
            // matrilocal marriage.
            const husbandClan = this[husbandIndex];
            ++husbandClan.slices[1][0];
            if (husbandClan.slices[1][0] >= husbandClan.slices[1][1]) {
                husbandWeights[husbandIndex] = 0;
            }
        }

        // Fix up populations.
        for (const clan of this) {
            clan.population = clan.slicesTotal;
        }
    }

    split() {
        const newClans = [];
        for (const clan of this) {
            newClans.push(clan);
            if (clan.population > Clan.maxDesiredSize) {
                newClans.push(clan.splitOff(this));
            }
        }
        this.splice(0, this.length, ...newClans);
    }

    merge() {
        while (true) {
            if (this.length < 2) return;
            const sortedClans = this.toSorted((a, b) => a.population - b.population);
            if (sortedClans[0].population >= Clan.minDesiredSize) return;
            sortedClans[1].absorb(sortedClans[0]);
            this.splice(this.indexOf(sortedClans[0]), 1);
        }
    }

    prune() {
        this.splice(0, this.length, ...this.filter(clan => clan.population > 0));
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

    updateAlignmentViews() {
        for (const clan of this) {
            clan.startUpdatingAlignment();
        }
        for (const clan of this) {
            clan.finishUpdatingAlignment();
        }
    }
}
