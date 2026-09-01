import { clamp, sumFun } from "../lib/basics";
import { weightedAverage } from "../lib/modelbasics";
import { pct, signed } from "../lib/format";
import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import { SkillDefs } from "../econ/econdefs";
import { ObservationDefs, observedEstimate } from "./information";
import type { Opinion, OpinionItem } from "./opinion";
import { ALL_RITUAL_TYPES, type RitualEvent, type RitualTypeDef } from "../rituals";
import { DecayingCredit } from "./credit";
import { RITUAL_CHANGE_STANDING_HALF_LIFE } from "./standing";
import { explain, type Explainer } from "../lib/explain";

// Holiness measures how close to the gods and ancestors one clan
// thinks another stands: whom you would ask to say the words when
// something important is at stake. Like Respect it's an absolute
// assessment, not relative to the subject, and it runs on the same
// scale.
//
// It draws on the same evidence as Respect and Alignment, but only the
// part of it that reads as favor from above: a clan that gives freely,
// keeps up its devotions, and prospers looks blessed. Perceived piety
// weighs much more heavily here than it does for general respect or
// alignment, and ritual skill, which barely registers in the average of
// skills Respect uses, is a major component on its own.

// What one clan's rites, of one kind, have earned the officiant in the eyes
// of the clan they were said for. A result is booked once, when it comes in,
// and then stands and fades: a life granted is still spoken of a generation
// later, a dream read rightly for a season or two.
export class RitualCredit {
    private value_ = 0;
    // Year the decay has already been charged through, so that decaying more
    // than once in a year costs nothing.
    private throughYear_: number | undefined;
    private lastResultYear_: number | undefined;

    constructor(readonly def: RitualTypeDef) { }

    get value(): number { return this.value_; }
    get lastResultYear(): number | undefined { return this.lastResultYear_; }

    yearsSince(year: number): number | undefined {
        return this.lastResultYear_ === undefined
            ? undefined : year - this.lastResultYear_;
    }

    decayTo(year: number): void {
        if (this.throughYear_ === undefined) {
            this.throughYear_ = year;
            return;
        }
        const age = year - this.throughYear_;
        if (age <= 0) return;
        this.value_ *= Math.pow(0.5, age / this.def.holinessHalfLife);
        this.throughYear_ = year;
    }

    add(amount: number, year: number): void {
        this.decayTo(year);
        this.value_ += amount;
        this.lastResultYear_ = year;
    }

    clone(): RitualCredit {
        const c = new RitualCredit(this.def);
        c.value_ = this.value_;
        c.throughYear_ = this.throughYear_;
        c.lastResultYear_ = this.lastResultYear_;
        return c;
    }
}

export class Holiness implements Opinion {
    private items_: HolinessItem[] = [];
    private informationValue_: number = 0;
    private previousValue_: number = 0;
    private value_: number = 0;
    // Standing credit from past rites, one running total per kind of rite,
    // since they fade at very different rates.
    private ritualCredits_ = new Map<string, RitualCredit>();
    // And from having put a change to the settlement's festival, which is a
    // claim to know how it ought to be done.
    private ritualChangeCredit_ =
        new DecayingCredit(RITUAL_CHANGE_STANDING_HALF_LIFE);

    static readonly ALPHA = 0.1;

    get items(): readonly HolinessItem[] { return this.items_; }
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

    ritualCredit(def: RitualTypeDef): RitualCredit {
        let credit = this.ritualCredits_.get(def.key);
        if (!credit) {
            credit = new RitualCredit(def);
            this.ritualCredits_.set(def.key, credit);
        }
        return credit;
    }

    // Book a result. Called once, where the ritual is settled.
    creditRitual(event: RitualEvent): void {
        this.ritualCredit(event.def).add(event.holinessEffect, event.year);
    }

    // Book what putting a change to the settlement's festival, and how it
    // went, did for this clan's standing with the powers.
    creditRitualChange(amount: number, year: number): void {
        this.ritualChangeCredit_.add(amount, year);
    }

    get ritualChangeCredit(): DecayingCredit {
        return this.ritualChangeCredit_;
    }

    updateFor(subject: Clan, object: Clan, informationValue: number = 1): void {
        this.informationValue_ = informationValue;

        // Piety and Generosity come from tracked observations, which already
        // account for how much the subject has seen; the rest are read off the
        // object's true values and discounted the way Respect does it, linearly
        // for trait-like stats and by the square root for QoL.
        const infoScale = clamp(informationValue, 0, 1);
        const qolInfoScale = Math.sqrt(infoScale);

        // Let what past rites earned fade before it is read off.
        const year = subject.world.year.value;
        for (const credit of this.ritualCredits_.values()) credit.decayTo(year);
        this.ritualChangeCredit_.decayTo(year);

        this.items_ = [
            HolinessItem.forPiety(subject, object),
            HolinessItem.forRitualSkill(subject, object, infoScale),
            HolinessItem.forGenerosity(subject, object),
            HolinessItem.forMaterialQoL(subject, object, qolInfoScale),
            // One item per kind of rite, always present so that breakdowns
            // line up across clans even when a clan has had no rites.
            ...ALL_RITUAL_TYPES.map(def => HolinessItem.forRitualOutcomes(
                this.ritualCredit(def), subject.world.year.value)),
            HolinessItem.forRitualChange(this.ritualChangeCredit_, year),

            // TODO - Symbols, items, and buildings.
        ];
        this.previousValue_ = this.value_;
        const currentTotal = this.currentItemsTotal;
        this.value_ = Holiness.ALPHA * currentTotal + (1 - Holiness.ALPHA) * this.previousValue_;
    }

    clone(): Holiness {
        const h = new Holiness();
        h.items_ = [...this.items_];
        h.informationValue_ = this.informationValue_;
        h.previousValue_ = this.previousValue_;
        h.value_ = this.value_;
        for (const [key, credit] of this.ritualCredits_) {
            h.ritualCredits_.set(key, credit.clone());
        }
        h.ritualChangeCredit_ = this.ritualChangeCredit_.clone();
        return h;
    }
}

// The type parameter is the explainer's argument. It appears in no member, so
// every instantiation is the same type to anyone holding one; it exists only
// to check, at the point of construction, that the explainer and the thing it
// will be handed agree.
export class HolinessItem<P = unknown> implements OpinionItem {
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

    // Ritual skill below this baseline is unremarkable and grants no holiness.
    static readonly RITUAL_SKILL_BASELINE = 30;
    // Matches Respect: QoL below this baseline is "minimal" and grants nothing.
    static readonly QOL_BASELINE = -10;

    // The largest component by far. Alignment weighs piety only as a deviation
    // from the middling 50, and Respect not at all; here it's the whole point,
    // so the estimate counts in full.
    static forPiety(subject: Clan, object: Clan): HolinessItem {
        const estimate = observedEstimate(subject, object, ObservationDefs.Piety);
        return new HolinessItem(
            'Piety',
            estimate,
            0.4,
            pietyText
        );
    }

    // Knowing how the rites are properly done. Respect averages this in with
    // every other skill, which all but erases it; a clan asked to intercede
    // is asked on this above all else.
    static forRitualSkill(subject: Clan, object: Clan, infoScale: number): HolinessItem {
        const skill = object.skills.v(SkillDefs.Ritual);
        return new HolinessItem(
            'Ritual Skill',
            Math.max(0, skill - HolinessItem.RITUAL_SKILL_BASELINE),
            0.5 * infoScale,
            scoredText,
            { label: 'Ritual skill', value: skill,
              baseline: HolinessItem.RITUAL_SKILL_BASELINE, infoScale }
        );
    }

    // Open-handedness reads as piety made visible.
    static forGenerosity(subject: Clan, object: Clan): HolinessItem {
        const estimate = observedEstimate(subject, object, ObservationDefs.Generosity);
        return new HolinessItem(
            'Generosity',
            estimate,
            1,
            generosityText
        );
    }

    // What rites of one kind, said for us, have earned the officiant. Nothing
    // shows where a clan stands with the ancestors like asking them for
    // something and being answered -- or not. Firsthand only: a rite said for
    // someone else is not evidence to us. The credit stands and fades rather
    // than counting only in the year it happened, so a run of answered prayers
    // makes a lasting reputation.
    static forRitualOutcomes(credit: RitualCredit, year: number): HolinessItem {
        const since = credit.yearsSince(year);
        const value = credit.value;
        const halfLife = credit.def.holinessHalfLife;
        return new HolinessItem(
            `Rites: ${credit.def.label}`,
            value,
            1,
            since === undefined ? 'no rites of this kind for us' : ritesText,
            { value, since, halfLife },
        );
    }

    // Knowing how the festival ought to be held, and being heeded on it. A
    // clan that proposes a change and carries the settlement has been taken
    // as knowing something about how the powers want to be approached; one
    // whose proposal is thrown out has been told it does not.
    static forRitualChange(credit: DecayingCredit, year: number): HolinessItem {
        const since = credit.yearsSince(year);
        return new HolinessItem(
            'Ritual Change',
            credit.value,
            1,
            since === undefined ? 'never put anything to the settlement'
                : ritualChangeText,
            { value: credit.value, since,
              halfLife: RITUAL_CHANGE_STANDING_HALF_LIFE },
        );
    }

    // Prospering is taken as a sign of favor from above.
    static forMaterialQoL(subject: Clan, object: Clan, infoScale: number): HolinessItem {
        const objectValue = object.qol.valueFrom("material");
        return new HolinessItem(
            'Material QoL',
            Math.max(0, objectValue - HolinessItem.QOL_BASELINE),
            0.1 * infoScale,
            scoredText,
            { label: 'Material QoL', value: objectValue,
              baseline: HolinessItem.QOL_BASELINE, infoScale }
        );
    }
}

// Written once at load; each takes what it needs as an argument.
const pietyText = (i: HolinessItem) =>
    `Piety estimate ${i.baseValue.toFixed(0)}`;
const generosityText = (i: HolinessItem) =>
    `Generosity estimate ${i.baseValue.toFixed(1)}`;
const scoredText = (
    d: { label: string, value: number, baseline: number, infoScale: number }) =>
    `${d.label} ${d.value.toFixed(0)} (base ${d.baseline}, info ${pct(d.infoScale)})`;
const ritualChangeText = (
    d: { value: number, since: number | undefined, halfLife: number }) =>
    `${signed(d.value, 1)} standing from changes put to the settlement, last `
        + `${d.since === 0 ? 'this year' : `${d.since} y ago`}`
        + `, half-life ${d.halfLife} y`;
const ritesText = (
    d: { value: number, since: number | undefined, halfLife: number }) =>
    `${signed(d.value, 1)} standing from rites, last `
        + `${d.since === 0 ? 'this year' : `${d.since} y ago`}`
        + `, half-life ${d.halfLife} y`;

export function getHoliness(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
    return subject.world.perceptions.get(subject.uuid, object.uuid)?.holiness.value ?? 0;
}

// Average holiness weighted by population.
export function getHolinessInScope(object: Clan | ClanDTO, scope: (Clan | ClanDTO)[]): number {
    return weightedAverage(
        scope,
        subject => getHoliness(subject, object),
        subject => subject.population);
}

export function getLocalHoliness(clan: Clan | ClanDTO): number {
    const settlement = clan.settlement;
    if (!settlement) return 0;
    // What the neighbors think, not what the clan thinks of itself.
    return getHolinessInScope(
        clan, settlement.clans.filter(c => c.uuid !== clan.uuid));
}
