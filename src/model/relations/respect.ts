import { clamp, sumFun } from "../lib/basics";
import { weightedAverage } from "../lib/modelbasics";
import { pct, signed } from "../lib/format";
import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import { SkillDefs } from "../econ/econdefs";
import type { Opinion, OpinionItem } from "./opinion";
import { festivalPower, riteRespectEffect } from "../festivals";
import { DecayingCredit } from "./credit";
import { RITUAL_CHANGE_STANDING_HALF_LIFE } from "./standing";
import { explain, type Explainer } from "../lib/explain";

// Respect measures how powerful and capable one clan thinks
// another is. It's an absolute assessment, not relative to
// the subject.

export class Respect implements Opinion {
    private items_: RespectItem[] = [];
    private informationValue_: number = 0;
    private previousValue_: number = 0;
    private value_: number = 0;
    // What proposing a change to the settlement's festival, and how it went,
    // has earned this clan in the subject's eyes. Stands and fades.
    private ritualChangeCredit_ =
        new DecayingCredit(RITUAL_CHANGE_STANDING_HALF_LIFE);

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

    // Book what carrying a question, or failing to, did for this clan's
    // standing. Called once, where the change is settled.
    creditRitualChange(amount: number, year: number): void {
        this.ritualChangeCredit_.add(amount, year);
    }

    get ritualChangeCredit(): DecayingCredit {
        return this.ritualChangeCredit_;
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
            RespectItem.forFestivals(subject, object),
            RespectItem.forRitualChange(
                this.ritualChangeCredit_, subject.world.year.value),
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
        a.ritualChangeCredit_ = this.ritualChangeCredit_.clone();
        return a;
    }
}

// The type parameter is the explainer's argument. It appears in no member, so
// every instantiation is the same type to anyone holding one; it exists only
// to check, at the point of construction, that the explainer and the thing it
// will be handed agree.
export class RespectItem<P = unknown> implements OpinionItem {
    private readonly explainer_: Explainer<any>;
    private readonly explainerArg_: unknown;

    get explanation(): string {
        return explain(this.explainer_, this.explainerArg_ ?? this);
    }

    constructor(
        readonly label: string,
        readonly baseValue: number,
        readonly modifier: number,
        explainer: Explainer<P>,
        explainerArg?: P,
    ) {
        this.explainer_ = explainer as Explainer<any>;
        this.explainerArg_ = explainerArg;
    }

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
            qolText,
            { label: 'Material QoL', value: objectValue,
              baseline: RespectItem.QOL_BASELINE, infoScale }
        );
    }

    static forConversationQoL(subject: Clan, object: Clan, infoScale: number): RespectItem {
        const objectValue = object.qol.m.get("Conversation")?.value ?? 0;
        return new RespectItem(
            'Conversation QoL',
            Math.max(0, objectValue - RespectItem.QOL_BASELINE),
            0.05 * infoScale,
            qolText,
            { label: 'Conversation QoL', value: objectValue,
              baseline: RespectItem.QOL_BASELINE, infoScale }
        );
    }

    static forConflictQoL(subject: Clan, object: Clan, infoScale: number): RespectItem {
        const objectValue = object.qol.m.get("Conflict")?.value ?? 0;
        return new RespectItem(
            'Conflict QoL',
            Math.max(0, objectValue - RespectItem.QOL_BASELINE),
            0.05 * infoScale,
            qolText,
            { label: 'Conflict QoL', value: objectValue,
              baseline: RespectItem.QOL_BASELINE, infoScale }
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
            qolText,
            { label: 'Population', value: pop,
              baseline: RespectItem.POP_BASELINE, infoScale }
        );
    }

    // Skill at the work, which is what a clan is respected for. Care is left
    // out on purpose: looking after your own people well is a thing neighbors
    // like you for rather than one that makes them reckon you capable, so it
    // weighs on alignment instead.
    static forSkills(subject: Clan, object: Clan, infoScale: number): RespectItem {
        const skillDefs = Object.values(SkillDefs)
            .filter(def => def !== SkillDefs.Care);
        const totalObjectSkill = sumFun(skillDefs, s => object.skills.v(s));
        const avgObjectSkill = totalObjectSkill / (skillDefs.length || 1);
        return new RespectItem(
            'Skills',
            Math.max(0, avgObjectSkill - RespectItem.SKILL_BASELINE),
            0.05 * infoScale,
            qolText,
            { label: 'Skills', value: avgObjectSkill,
              baseline: RespectItem.SKILL_BASELINE, infoScale }
        );
    }

    // Having taken its part in a rite that carried. Not scaled by how well
    // the subject knows the object: everyone was there and everyone saw it
    // done. Only within a settlement -- a clan elsewhere kept its own feasts,
    // which these people were not at.
    static forFestivals(subject: Clan, object: Clan): RespectItem {
        if (subject.settlement !== object.settlement) {
            return new RespectItem('Festivals', 0, 0, 'not our festivals');
        }
        const power = festivalPower(object);
        return new RespectItem(
            'Festivals',
            riteRespectEffect(subject, object),
            1,
            ritePowerText,
            { power },
        );
    }

    static forGenerosity(subject: Clan, object: Clan, infoScale: number): RespectItem {
        const foodAidGiven = (object.distribution ? object.distribution.totalFoodAidGiven : 0) + (object.stockOutflow ? object.stockOutflow.totalFoodAidGiven : 0);
        return new RespectItem(
            'Generosity',
            foodAidGiven,
            2 * infoScale,
            infoOnlyText,
            { infoScale }
        );
    }

    // What a clan adds to the plain facts when the clan being appraised is
    // itself. Mostly positive: few hold themselves cheap.
    // Standing from having put something to the settlement. A clan that
    // proposes a change and carries it is a clan that can move the others; one
    // whose proposal is thrown out has been shown not to be.
    static forRitualChange(credit: DecayingCredit, year: number): RespectItem {
        credit.decayTo(year);
        const since = credit.yearsSince(year);
        return new RespectItem(
            'Ritual Change',
            credit.value,
            1,
            since === undefined ? 'never put anything to the settlement'
                : ritualChangeText,
            { value: credit.value, since,
              halfLife: RITUAL_CHANGE_STANDING_HALF_LIFE },
        );
    }

    static forPride(clan: Clan): RespectItem {
        const pride = clan.traits.pride;
        return new RespectItem(
            'Pride',
            pride,
            1,
            prideText
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

// Written once at load. Each takes what it needs, so none closes over
// anything; the figures are settled when the item is built.
type ScoredAgainst = {
    label: string, value: number, baseline: number, infoScale: number,
};
const ritualChangeText = (
    d: { value: number, since: number | undefined, halfLife: number }) =>
    `${signed(d.value, 1)} standing from changes put to the settlement, last `
        + `${d.since === 0 ? 'this year' : `${d.since} y ago`}`
        + `, half-life ${d.halfLife} y`;
const qolText = (d: ScoredAgainst) =>
    `${d.label} ${d.value.toFixed(0)} (base ${d.baseline}, info ${pct(d.infoScale)})`;
const infoOnlyText = (d: { infoScale: number }) =>
    `Generosity (info ${pct(d.infoScale)})`;
const prideText = (i: RespectItem) => `Pride ${signed(i.baseValue, 1)}`;
const ritePowerText = (d: { power: number }) =>
    `Rite power ${d.power.toFixed(2)}`;

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
