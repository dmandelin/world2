import { clamp, sumFun } from "../lib/basics";
import { weightedAverage } from "../lib/modelbasics";
import { pct, signed } from "../lib/format";
import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import { SkillDefs } from "../econ/econdefs";
import type { Opinion, OpinionItem } from "./opinion";

// Respect measures how powerful and capable one clan thinks
// another is. It's an absolute assessment, not relative to
// the subject.

export class Respect implements Opinion {
    private items_: RespectItem[] = [];
    private informationValue_: number = 0;
    private previousValue_: number = 0;
    private value_: number = 0;

    static readonly ALPHA = 0.1;

    get items(): readonly RespectItem[] { return this.items_; }
    get informationValue(): number { return this.informationValue_; }
    get previousValue(): number { return this.previousValue_; }

    // Items already carry information-scaling in their own modifiers (see
    // updateFor), so this is a plain sum.
    get currentItemsTotal(): number {
        return sumFun(this.items_, i => i.value);
    }

    get value(): number {
        return this.value_;
    }

    updateFor(subject: Clan, object: Clan, informationValue: number = 1): void {
        this.informationValue_ = informationValue;

        // None of these stats are read off tracked observations yet (only
        // Piety, Generosity, and Bellicosity have made that move so far), so
        // for now we read the object's true values and simply discount them
        // by how well the subject actually knows the object: linearly for
        // trait-like stats, and by the square root for QoL, which degrades
        // more gently since a rough sense of someone's circumstances doesn't
        // need as much acquaintance as a fair read of their character.
        const infoScale = clamp(informationValue, 0, 1);
        const qolInfoScale = Math.sqrt(infoScale);

        this.items_ = [
            RespectItem.forGenerosity(subject, object, infoScale),
            RespectItem.forSkills(subject, object, infoScale),
            RespectItem.forMaterialQoL(subject, object, qolInfoScale),
            RespectItem.forConversationQoL(subject, object, qolInfoScale),
            RespectItem.forConflictQoL(subject, object, qolInfoScale),
            RespectItem.forPopulation(subject, object, infoScale),
            // A clan appraising itself doesn't take a snap judgment of a
            // stranger; it takes its own standing opinion of itself.
            subject === object
                ? RespectItem.forPride(object)
                : RespectItem.forRandom(subject, object),

            // TODO - Add seniority component, depending on culture?
            // TODO - Add "beauty" component?
        ];
        this.previousValue_ = this.value_;
        const currentTotal = this.currentItemsTotal;
        this.value_ = Respect.ALPHA * currentTotal + (1 - Respect.ALPHA) * this.previousValue_;
    }

    clone(): Respect {
        const a = new Respect();
        a.items_ = [...this.items_];
        a.informationValue_ = this.informationValue_;
        a.previousValue_ = this.previousValue_;
        a.value_ = this.value_;
        return a;
    }
}

export class RespectItem implements OpinionItem {
    constructor(
        readonly label: string,
        readonly baseValue: number,
        readonly modifier: number,
        readonly explanation: string,
    ) { }

    get value(): number {
        return this.baseValue * this.modifier;
    }

    // QoL below this baseline is "minimal" and grants no respect (never a penalty).
    static readonly QOL_BASELINE = -10;
    // Skill below this baseline is "minimal" and grants no respect.
    static readonly SKILL_BASELINE = 30;
    // Population below this baseline grants no respect.
    static readonly POP_BASELINE = 10;

    static forMaterialQoL(subject: Clan, object: Clan, infoScale: number): RespectItem {
        const objectValue = object.qol.valueFrom("material");
        return new RespectItem(
            'Material QoL',
            Math.max(0, objectValue - RespectItem.QOL_BASELINE),
            0.1 * infoScale,
            `Material QoL ${objectValue.toFixed(0)} (base ${RespectItem.QOL_BASELINE}, info ${pct(infoScale)})`
        );
    }

    static forConversationQoL(subject: Clan, object: Clan, infoScale: number): RespectItem {
        const objectValue = object.qol.m.get("Conversation")?.value ?? 0;
        return new RespectItem(
            'Conversation QoL',
            Math.max(0, objectValue - RespectItem.QOL_BASELINE),
            0.05 * infoScale,
            `Conversation QoL ${objectValue.toFixed(0)} (base ${RespectItem.QOL_BASELINE}, info ${pct(infoScale)})`
        );
    }

    static forConflictQoL(subject: Clan, object: Clan, infoScale: number): RespectItem {
        const objectValue = object.qol.m.get("Conflict")?.value ?? 0;
        return new RespectItem(
            'Conflict QoL',
            Math.max(0, objectValue - RespectItem.QOL_BASELINE),
            0.05 * infoScale,
            `Conflict QoL ${objectValue.toFixed(0)} (base ${RespectItem.QOL_BASELINE}, info ${pct(infoScale)})`
        );
    }

    // Respect for clan size: 0 at or below population 10, +10 per doubling above.
    static forPopulation(subject: Clan, object: Clan, infoScale: number): RespectItem {
        const pop = object.population;
        const doublings = pop > 0 ? Math.log2(pop / RespectItem.POP_BASELINE) : 0;
        return new RespectItem(
            'Population',
            Math.max(0, doublings),
            10 * infoScale,
            `Population ${pop} (base ${RespectItem.POP_BASELINE}, info ${pct(infoScale)})`
        );
    }

    static forSkills(subject: Clan, object: Clan, infoScale: number): RespectItem {
        const skillDefs = Object.values(SkillDefs);
        const totalObjectSkill = sumFun(skillDefs, s => object.skills.v(s));
        const avgObjectSkill = totalObjectSkill / (skillDefs.length || 1);
        return new RespectItem(
            'Skills',
            Math.max(0, avgObjectSkill - RespectItem.SKILL_BASELINE),
            0.05 * infoScale,
            `Skills ${avgObjectSkill.toFixed(0)} (base ${RespectItem.SKILL_BASELINE}, info ${pct(infoScale)})`
        );
    }

    static forGenerosity(subject: Clan, object: Clan, infoScale: number): RespectItem {
        const foodAidGiven = (object.distribution ? object.distribution.totalFoodAidGiven : 0) + (object.stockOutflow ? object.stockOutflow.totalFoodAidGiven : 0);
        return new RespectItem(
            'Generosity',
            foodAidGiven,
            2 * infoScale,
            `Generosity (info ${pct(infoScale)})`
        );
    }

    // What a clan adds to the plain facts when the clan being appraised is
    // itself. Mostly positive: few hold themselves cheap.
    static forPride(clan: Clan): RespectItem {
        const pride = clan.traits.pride;
        return new RespectItem(
            'Pride',
            pride,
            1,
            `Pride ${signed(pride, 1)}`
        );
    }

    static forRandom(subject: Clan, object: Clan): RespectItem {
        // Small random value in range [0, 2]. Not information-scaled: even a
        // stranger makes some snap judgment.
        const randVal = Math.random() * 2;
        return new RespectItem(
            'Random',
            randVal,
            1,
            `random factor`
        );
    }
}

export function getRespect(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
    return subject.world.perceptions.get(subject.uuid, object.uuid)?.respect.value ?? 0;
}

// Average respect weighted by population.
export function getRespectInScope(object: Clan | ClanDTO, scope: (Clan | ClanDTO)[]): number {
    return weightedAverage(
        scope,
        subject => getRespect(subject, object),
        subject => subject.population);
}

export function getLocalRespect(clan: Clan | ClanDTO): number {
    const settlement = clan.settlement;
    if (!settlement) return 0;
    // What the neighbors think, not what the clan thinks of itself.
    return getRespectInScope(
        clan, settlement.clans.filter(c => c.uuid !== clan.uuid));
}
