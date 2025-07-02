import { Clan } from '../people/people';

export class ProductivityCalc {
    readonly baseSkill: number;
    readonly intelligenceSkillModifier: number = 1.0;
    readonly effectiveSkill: number;

    readonly skillFactor: number;
    readonly strengthFactor: number;

    readonly value: number;

    constructor(readonly clan: Clan) {
        this.baseSkill = clan.skill;

        const baseIntelligenceModifier = (clan.intelligence - 50) / 2;
        const intelligenceModifierFactor = baseIntelligenceModifier >= 0 
            ? (100 - clan.skill) / 100
            : (clan.skill) / 100;
        this.intelligenceSkillModifier = baseIntelligenceModifier * intelligenceModifierFactor;
        this.effectiveSkill = this.baseSkill + this.intelligenceSkillModifier;
        this.skillFactor = Math.pow(1.01, this.effectiveSkill - 50);

        this.strengthFactor = Math.pow(1.01, (clan.strength - 50) / 4);

        this.value = this.skillFactor * this.strengthFactor;
    }

    get tooltip(): string[][] {
        return [
            ['Base skill', this.baseSkill.toFixed(1)],
            ['Intelligence', this.clan.intelligence.toFixed(1)],
            ['Intelligence modifier', this.intelligenceSkillModifier.toFixed(1)],
            ['Effective skill', this.effectiveSkill.toFixed(1)],
            ['Skill factor', this.skillFactor.toFixed(2)],
            ['Strength factor', this.strengthFactor.toFixed(2)],
            ['Productivity', this.value.toFixed(2)],
        ];
    }
}

export class RitualEffectivenessCalc {
    readonly baseSkill: number;
    readonly intelligenceSkillModifier: number = 1.0;
    readonly effectiveSkill: number;

    readonly skillFactor: number;

    readonly value: number;

    constructor(readonly clan: Clan) {
        this.baseSkill = clan.ritualSkill;

        const baseIntelligenceModifier = (clan.intelligence - 50);
        const intelligenceModifierFactor = (100 - clan.ritualSkill) / 100;
        this.intelligenceSkillModifier = baseIntelligenceModifier * intelligenceModifierFactor;
        this.effectiveSkill = this.baseSkill + this.intelligenceSkillModifier;
        this.skillFactor = Math.pow(1.01, this.effectiveSkill - 50);

        this.value = this.skillFactor;
    }

    get tooltip(): string[][] {
        return [
            ['Base skill', this.baseSkill.toFixed(1)],
            ['Intelligence', this.clan.intelligence.toFixed(1)],
            ['Intelligence modifier', this.intelligenceSkillModifier.toFixed(1)],
            ['Effective skill', this.effectiveSkill.toFixed(1)],
            ['Effectiveness', this.value.toFixed(2)],
        ];
    }
}
