import { clamp } from "../lib/basics";
import { type Clan } from "./people";

export class Assessment {
    rFamily: number;
    rSharedCommons: number = 0;
    rScale: number = 0;

    constructor(
        readonly subject: Clan, 
        readonly target: Clan,
        public rResidence = 0,
        readonly rBlowup = 0,
    ) {
        this.rFamily = this.subject.kinshipTo(this.target);
    }

    get r(): number {
        let r = 0;
        for (const ri of [this.rFamily, this.rResidence, this.rSharedCommons, this.rScale, this.rBlowup]) {
            r += ri * (1 - r);
        }
        return r;
    }

    get asTable() {
        const data: [string, number][] = [
            ['Kinship', this.rFamily],
            ['Neighborliness', this.rResidence],
            ['Shared Commons', this.rSharedCommons],
            ['Growth Interest', this.rScale],
            ['Overall', this.r],
        ];
        return data.map(([k, v]) => [k, (v * 100).toFixed()]);
    }

    updateResidenceToward(rTarget: number) {
        this.rResidence = this.rResidence * 0.5 + rTarget * 0.5;
    }

    updateSharedCommonsToward(rTarget: number) {
        this.rSharedCommons = this.rSharedCommons * 0.5 + rTarget * 0.5;
    }

    // Update the assessement for non-contact for a turn.
    fade() {
        this.rSharedCommons = 0.0;
        this.rResidence *= 0.25;
        if (this.rResidence < 0.01) {
            this.rResidence = 0.0;
        }
        return this.rResidence == 0.0;
    }

    clone() {
        const clone = new Assessment(this.subject, this.target, this.rResidence, this.rBlowup);
        clone.rFamily = this.rFamily;
        clone.rSharedCommons = this.rSharedCommons;
        clone.rScale = this.rScale;
        return clone;
    }
}

export class Assessments implements Iterable<Assessment> {
    constructor(readonly clan: Clan) {}

    private readonly map_ = new Map<Clan, Assessment>();

    update() {
        // Blow up relationships if there are too many clans, because we
        // haven't properly modeled that scale yet.
        if (this.clan.settlement!.clans.length >= 10) {
            this.map_.clear();
            for (const clan of this.clan.settlement!.clans) {
                const a = clan === this.clan ? 1 : -1;
                this.map_.set(clan, new Assessment(this.clan, clan, 0, -1));
            }
        }

        // Fade and prune relationships with clans no longer interacting.
        for (const a of Array.from(this.map_.values())) {
            if (a.target.settlement !== this.clan.settlement) {
                if (a.fade()) {
                    this.map_.delete(a.target);
                }
            }
        }

        // Update everyone we're interacting with.
        const one_over_n = 1 / this.clan.settlement!.clans.length;
        for (const clan of this.clan.settlement!.clans) {
            if (clan === this.clan) continue;
            let a = this.map_.get(clan);
            if (!a) this.map_.set(clan, a = new Assessment(this.clan, clan));

            a.updateResidenceToward(one_over_n);
            this.updateAlignmentForSharedCommons(a, clan);
            this.updateAlignmentForScaleEffects(a);
            this.updateEffect(a);
        }
    }

    private updateAlignmentForSharedCommons(a: Assessment, target: Clan) {
        a.updateSharedCommonsToward(this.getTargetAlignmentForSharedCommons(a, target));
    }
        
    private getTargetAlignmentForSharedCommons(a: Assessment, target: Clan) {
        // The idea is, what happens if we help the target clan produce
        // something instead of ourselves? Their commmon fraction of
        // production will go back into the pot, and we'll get our share.
        const commonBack = target.agriculturalProductivity;
        const ourShare = this.clan.population / this.clan.settlement!.population;
        return commonBack * ourShare;
    }

    private updateAlignmentForScaleEffects(a: Assessment) {
        // If the settlement is approximately full, large penalty as we
        // are resource-constrained.
        const s = this.clan.settlement!;
        const fullness = clamp((s.population / 300 - 0.9) * 10, 0, 1);
        if (fullness > 0) {
            for (const clan of s.clans) {
                if (clan === this.clan) continue;
                a.rScale = -fullness;
            }
            return;
        }

        // Otherwise small bonus for positive returns to scale.
        const gf = Math.pow(s.population / (s.population - this.clan.population), 1/3) - 1;
        for (const clan of s.clans) {
            if (clan === this.clan) continue;
            a.rScale = gf;
        }
    }

    updateEffect(a: Assessment) {
        // Effect is related to size and disposable income
        // of partner. 
        // TODO - fill this out
    }

    get(clan: Clan): Assessment | undefined {
        return this.map_.get(clan);
    }

    alignment(clan: Clan): number {
        const a = this.map_.get(clan);
        if (a) return a.r;
        return 0;
    }

    clone(): Assessments {
        const clone = new Assessments(this.clan);
        for (const [clan, a] of this.map_) {
            clone.map_.set(clan, a.clone());
        }
        return clone;
    }

    [Symbol.iterator](): Iterator<Assessment> {
        return this.map_.values();
    }
}
