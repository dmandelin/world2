import { clamp, sumFun } from "../lib/basics";
import { weightedAverage } from "../lib/modelbasics";
import { pct } from "../lib/format";
import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import { SkillDefs } from "../econ/econdefs";
import { ObservationDefs, observedEstimate } from "./information";
import type { Opinion, OpinionItem } from "./opinion";

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

export class Holiness implements Opinion {
    private items_: HolinessItem[] = [];
    private informationValue_: number = 0;
    private previousValue_: number = 0;
    private value_: number = 0;

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

    updateFor(subject: Clan, object: Clan, informationValue: number = 1): void {
        this.informationValue_ = informationValue;

        // Piety and Generosity come from tracked observations, which already
        // account for how much the subject has seen; the rest are read off the
        // object's true values and discounted the way Respect does it, linearly
        // for trait-like stats and by the square root for QoL.
        const infoScale = clamp(informationValue, 0, 1);
        const qolInfoScale = Math.sqrt(infoScale);

        this.items_ = [
            HolinessItem.forPiety(subject, object),
            HolinessItem.forRitualSkill(subject, object, infoScale),
            HolinessItem.forGenerosity(subject, object),
            HolinessItem.forMaterialQoL(subject, object, qolInfoScale),

            // TODO - Ritual outcomes: holiness should rise and fall with how
            // rituals this clan led turned out for the people affected.
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
        return h;
    }
}

export class HolinessItem implements OpinionItem {
    constructor(
        readonly label: string,
        readonly baseValue: number,
        readonly modifier: number,
        readonly explanation: string,
    ) { }

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
            `Piety estimate ${estimate.toFixed(0)}`
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
            `Ritual skill ${skill.toFixed(0)} (base ${HolinessItem.RITUAL_SKILL_BASELINE}, info ${pct(infoScale)})`
        );
    }

    // Open-handedness reads as piety made visible.
    static forGenerosity(subject: Clan, object: Clan): HolinessItem {
        const estimate = observedEstimate(subject, object, ObservationDefs.Generosity);
        return new HolinessItem(
            'Generosity',
            estimate,
            1,
            `Generosity estimate ${estimate.toFixed(1)}`
        );
    }

    // Prospering is taken as a sign of favor from above.
    static forMaterialQoL(subject: Clan, object: Clan, infoScale: number): HolinessItem {
        const objectValue = object.qol.valueFrom("material");
        return new HolinessItem(
            'Material QoL',
            Math.max(0, objectValue - HolinessItem.QOL_BASELINE),
            0.1 * infoScale,
            `Material QoL ${objectValue.toFixed(0)} (base ${HolinessItem.QOL_BASELINE}, info ${pct(infoScale)})`
        );
    }
}

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
    return getHolinessInScope(clan, settlement.clans);
}
