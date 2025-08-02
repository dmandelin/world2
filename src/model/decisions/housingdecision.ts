import { sumFun, chooseWeighted, mapNormalized, maxby } from '../lib/basics';
import { traitFactor } from '../lib/modelbasics';
import { Clan } from '../people/people';
import { Housing, HousingTypes } from '../people/../econ/housing';

export class HousingImitationItem {
    constructor(
        readonly label: string,
        readonly housing: Housing,
        readonly prestige: number,
        readonly weight: number,
    ) {}
}

export class HousingGuessItem {
    constructor(
        readonly housing: Housing,
        readonly housingQoL: number,
        readonly floodingQoL: number,
    ) {}

    get qol(): number {
        return this.housingQoL + this.floodingQoL;
    }
}

export class HousingChoiceItem {
    constructor(
        readonly label: string,
        readonly housing: Housing,
        readonly qol: number,
        public weight: number,
    ) {}
}

export class HousingDecision {
    readonly imitated: Housing;
    readonly model: HousingImitationItem;
    readonly imitationItems: HousingImitationItem[];

    readonly guessed: Housing;
    readonly guessItems = new Map<Housing, HousingGuessItem>();

    readonly choice: Housing;
    readonly choiceItems: HousingChoiceItem[] = [];

    constructor(readonly clan: Clan) {
        // Choosing a model by prestige weight combines:
        // - legacy: keeping doing the same thing
        // - imitation: becoming more like prestigious clans
        this.imitationItems = mapNormalized(
            clan.selfAndNeighbors,
            other => traitFactor(clan.prestigeViewOf(other)!.value),
            (other, weight) => new HousingImitationItem(
                other.name,
                other.housing,
                clan.prestigeViewOf(other)!.value,
                weight));
        this.model = chooseWeighted(
            this.imitationItems,
            item => item.weight);
        this.imitated = this.model.housing;

        // Guess which choice is better.
        for (const housing of Object.values(HousingTypes)) {
            this.guessItems.set(housing, new HousingGuessItem(
                housing, housing.qol, 0));
        }
        this.guessed = maxby(
            Array.from(this.guessItems.values()), item => item.qol).housing;

        if (this.guessed === this.imitated) {
            this.choice = this.guessed;
        } else {
            // Clans don't really have an accurate way to tell what new ideas might
            // work better. We'll assume:
            // - If there's no reason to prefer the new (equal expected QoL), clans
            //   have a low probability of switching (single digits) corresponding
            //   to some clan in a village trying something new every several generations.
            // - If the new is substantially better (+10 QoL), clans will have a high
            //   interest in switching, but are still cautious, maybe a 25% chance.
            const choiceWeightFun = (qol: number): number => 1.25 ** qol;
            this.choiceItems = [
                new HousingChoiceItem(
                    this.imitated.name,
                    this.imitated,
                    this.imitatedQoL,
                    choiceWeightFun(this.imitatedQoL),
                ),
                new HousingChoiceItem(
                    this.guessed.name,
                    this.guessed,
                    this.guessedQoL,
                    choiceWeightFun(this.guessedQoL),
                ),
            ];
            const totalChoiceWeight = sumFun(this.choiceItems, item => item.weight);
            for (const item of this.choiceItems) {
                item.weight /= totalChoiceWeight;
            }
            this.choice = chooseWeighted(
                this.choiceItems,
                item => item.weight).housing;
        }
    }

    get imitatedQoL(): number {
        return this.guessItems.get(this.imitated)!.qol;
    }

    get guessedQoL(): number {
        return this.guessed.qol;
    }
}