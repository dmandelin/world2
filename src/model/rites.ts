import { clamp, maxby, maxbyWithValue, sum } from "./lib/basics";
import { pct, xm } from "./lib/format";
import { ces } from "./lib/modelbasics";
import type { NoteTaker } from "./notifications";
import type { Clan } from "./people/people";
import { OwnPrestigeCalc } from "./people/prestige";
import { QolCalc } from "./people/qol";

interface RitualLeaderSelection {
    name: string;
    weight(clan: Clan): number;
}

class EqualSelection implements RitualLeaderSelection {
    readonly name = 'Equal by clans';

    weight(clan: Clan): number {
        return 1;
    }
}

class PrestigeWeightedSelection implements RitualLeaderSelection {
    constructor(readonly name: string, private readonly quotient: number) {}

    weight(clan: Clan): number {
        return Math.pow(2, (clan.averagePrestige - 50) / this.quotient);
    }
}

export const RitualLeaderSelectionOptions = {
    Equal: new EqualSelection(),
    PrestigeWeightedSoft: new PrestigeWeightedSelection('By prestige (soft)', 20),
    PrestigeWeightedMedium: new PrestigeWeightedSelection('By prestige (medium)', 10),
    PrestigeWeightedHard: new PrestigeWeightedSelection('By prestige (hard)', 5),
};

export const RitualLeaderSelectionOptionsList: RitualLeaderSelection[] = [
    RitualLeaderSelectionOptions.Equal,
    RitualLeaderSelectionOptions.PrestigeWeightedSoft,
    RitualLeaderSelectionOptions.PrestigeWeightedMedium,
    RitualLeaderSelectionOptions.PrestigeWeightedHard,
];

export class Rites {
    // Planning properties.
    discord = false;
    leaderSelectionOption: RitualLeaderSelection = 
        RitualLeaderSelectionOptions.PrestigeWeightedSoft;
    weights: Map<Clan, number> = new Map();

    // Performance properties.

    // Whether the rites were held.
    held = false;

    // Quality represents the quality of the ritual performance,
    // independent of scale, including such factors as skill and
    // special materials.
    qualityItems: [string, string, string][] = [];
    quality: number = 0;

    // Output represents the amount of ritual services produced.
    // Ritual services include sacrifices, other ceremonies,
    // medicine, entertainment, and many other things.
    outputItems: [string, string][] = [];
    output: number = 0;

    // Appeal represents the draw of the ritual cycle as held,
    // including all factors such as quality, scale, discord,
    // and so on.
    appealItems: [string, string][] = [];
    appeal: number = 1;

    constructor(
        readonly name: string, 
        readonly participants: Clan[],
        readonly leaders: Clan[],
        readonly viewers: Clan[],
        readonly noteTaker: NoteTaker) {
    }

    get producers() { return [...this.participants, ...this.leaders]; }
    get consumers() { return [...this.participants, ...this.viewers]; }

    advance(plan: boolean = true) {
        if (plan) {
            this.plan();
        }
        this.perform();
    }

    plan(updateOptions: boolean = true) {
        if (this.producers.length === 0 || this.participants.length === 0) {
            this.discord = false;
            return;
        }

        if (updateOptions) this.chooseLeaderSelectionOption();
        this.updateWeights();
    }

    private chooseLeaderSelectionOption() {
        this.discord = true;

        let votes = new Map<RitualLeaderSelection, Clan[]>();
        const sim = this.simulateLeaderSelectionOptions();
        for (const clan of this.producers) {
            const [sr, delta] = maxbyWithValue(sim, r => r.clanImpacts.get(clan)?.delta ?? 0);
            votes.set(sr.option, [...(votes.get(sr.option) ?? []), clan]);
        }

        // If there's a unanimous choice different from the current, switch.
        if (votes.size === 1) {
            const [option] = votes.keys();
            if (option !== this.leaderSelectionOption) {
                this.noteTaker.addNote(
                    'R',
                    `Ritual leader selection changed from ${this.leaderSelectionOption.name} to ${option.name} by unanimous approval!`);
                this.leaderSelectionOption = option;
            }
            this.discord = false;
            return;
        }

        // No clear choice: note it for the record.
        const votesString = [...votes.entries()]
            .map(([option, clans]) => `${option.name} (${clans.length}): ${clans.map(c => c.name).join(', ')}`)
            .join('; ');
        this.noteTaker.addNote(
            '!',
            `Disagreement over ritual leader selection options: ${votesString}`);
    }

    private updateWeights() {
        let totalWeight = 0;
        this.weights.clear();
        for (const clan of this.producers) {
            const weight = this.leaderSelectionOption.weight(clan);
            this.weights.set(clan, weight);
            totalWeight += weight;
        }
        for (const clan of this.producers) {
            const weight = this.weights.get(clan)! / totalWeight;
            this.weights.set(clan, weight);
        }
    }

    perform() {
        if (!this.updateHeld()) return;
        this.updateQuality();
        this.updateOutput();
        this.updateAppeal();
    }

    private updateHeld(): boolean {
        if (this.producers.length === 0 || this.consumers.length === 0) {
            this.held = false;
            this.qualityItems = [];
            this.quality = 0;
            this.outputItems = [];
            this.output = 0;
            this.appealItems = [];
            this.appeal = 1;
            return false;
        }

        this.held = true;
        return true;
    }

    private updateQuality() {
        // CES function.
        const nu = 1.16;  // Increasing returns to scale of producers
        const rho = -5;   // Close to Liontief (min)

        let sum = 0;
        const qualityItemsNumeric: [string, number, number][] = [];
        for (const clan of this.producers) {
            const effectiveness = clan.ritualEffectiveness;
            const weight = this.weights.get(clan) || .11;
            sum += weight * Math.pow(clan.ritualEffectiveness, rho)
            qualityItemsNumeric.push(
                [clan.name, effectiveness, weight]);
        }
        this.qualityItems = qualityItemsNumeric.map(
            ([name, quality, weight]) => [
                name,
                pct(quality),
                weight.toFixed(2),
            ]);
        this.quality = Math.pow(sum, nu / rho);
    }

    private updateOutput() {
        // CES function on (producer labor, infrastructure). Infrastructure
        // includes both physical (e.g., a space at the center of the village)
        // and social (e.g., customs for orderly assembly). A CES function
        // with superlinear scaling factor gives positive returns to scale
        // at the low end ("the more the merrier") but diminishing returns at
        // the high end ("too many cooks spoil the broth").

        const producerLabor = sum(this.producers.map(c => c.population));
        if (this.participants.length) {
            const infrastructure = 300;
            this.outputItems = [
                ['Participants', producerLabor.toFixed()],
                ['Infrastructure', infrastructure.toFixed()],
            ];
            // TFP set to give max per capita output of 1 at around 300 participants.
            this.output = ces([producerLabor, infrastructure], { rho: -5, nu: 1.333, tfp: 1/6 });
        } else {
            const attendees = sum(this.viewers.map(c => c.population));
            const infrastructure = 50;
            this.outputItems = [
                ['Producers', producerLabor.toFixed()],
                ['Attendees', attendees.toFixed()],
                ['Infrastructure', infrastructure.toFixed()],
            ];
            this.output = ces([producerLabor, attendees, infrastructure], { rho: -5, nu: 1.167 });
        }
    }   

    get perCapitaOutput(): number {
        return this.output / sum(this.consumers.map(c => c.population));
    }

    private updateAppeal() {
        const base = 10;
        const fromQuality = 10 * Math.log2(this.quality);
        const fromQuantity = 10 * Math.log2(this.output / sum(this.consumers.map(c => c.population)));

        // We don't need this component to be too big because other parts of
        // the calculation also account for scale.
        const clanScale = clamp(this.producers.length, 1, 9);
        const diversity = Math.abs(clanScale - 5);
        
        const discord = this.discord ? -5 : 0;

        this.appealItems = [
            ['Base', base.toFixed(1)],
            ['Quality', fromQuality.toFixed(1)],
            ['Quantity', fromQuantity.toFixed(1)],
            ['Clan diversity', diversity.toFixed(1)],
            [this.discord ? 'Discord' : 'Concord', discord.toFixed(1)],
        ];

        this.appeal = base + fromQuality + fromQuantity + discord + diversity;
    }

    get appealAsTFP(): number {
        return Math.pow(2, (this.appeal - 10) / 10);
    }

    simulateLeaderSelectionOptions(): SimulationResult[] {
        if (this.producers.length === 0) {
            return [];
        }

        // Get available options: the current choice and nearby ones.
        const availableOptions = [];
        const curOptionIndex = RitualLeaderSelectionOptionsList.indexOf(this.leaderSelectionOption);
        if (curOptionIndex > 0) {
            availableOptions.push(RitualLeaderSelectionOptionsList[curOptionIndex - 1]);
        }
        availableOptions.push(this.leaderSelectionOption);
        if (curOptionIndex < RitualLeaderSelectionOptionsList.length - 1) {
            availableOptions.push(RitualLeaderSelectionOptionsList[curOptionIndex + 1]);
        }

        return availableOptions.map(option => {
            const rites = new Rites(
                this.name, this.participants, this.leaders, this.viewers, 
                this.noteTaker);
            rites.leaderSelectionOption = option;
            rites.perform();
            return new SimulationResult(option, this, rites);
        });
    }
}

export class SimulationResult {
    constructor(
        readonly option: RitualLeaderSelection,
        readonly originalRites: Rites,
        readonly rites: Rites,
    ) {}

    get name(): string {
        return this.option.name;
    }

    get clanImpacts(): Map<Clan, ClanImpact> {
        const impacts = new Map<Clan, ClanImpact>();
        for (const clan of this.originalRites.participants) {
            impacts.set(clan, new ClanImpact(clan, this.originalRites, this.rites));
        }
        return impacts;
    }
}

export class ClanImpact {
    readonly originalWeight: number;
    readonly newWeight: number;

    readonly originalQoL: number;
    readonly newQoL: number;

    readonly originalPrestige: number;
    readonly newPrestige: number;

    constructor(readonly clan: Clan, originalRites: Rites, rites: Rites) {
        this.originalWeight = originalRites.weights.get(clan) ?? 0;
        this.newWeight = rites.weights.get(clan) ?? 0;

        this.originalQoL = new QolCalc(clan, originalRites.appealAsTFP).value;
        this.newQoL = new QolCalc(clan, rites.appealAsTFP).value;

        const averageEffectiveSkill = originalRites.producers.reduce(
            (acc, c) => acc + c.ritualEffectiveness, 0) / originalRites.producers.length;
        const newAverageEffectiveSkill = rites.producers.reduce(
            (acc, c) => acc + c.ritualEffectiveness, 0) / rites.producers.length;
        this.originalPrestige =  OwnPrestigeCalc.prestigeFromRitual(averageEffectiveSkill, clan, originalRites).value;
        this.newPrestige = OwnPrestigeCalc.prestigeFromRitual(newAverageEffectiveSkill, clan, rites).value;
    }

    get weightDelta(): number {
        return this.newWeight - this.originalWeight;
    }   

    get qolDelta(): number {
        return this.newQoL - this.originalQoL;
    }

    get prestigeDelta(): number {
        return this.newPrestige - this.originalPrestige;
    }

    get delta(): number {
        return this.qolDelta + this.prestigeDelta;
    }
}