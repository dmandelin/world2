import { clamp } from "./basics";
import { GiftStrategy } from "./interactions";
import { EconomicPolicies, type Clan } from "./people";

export class ClanAgent {
    readonly lastGiftStrategy = new Map<Clan, GiftStrategy>();

    constructor(readonly clan: Clan, public defaultGiftStrategy = GiftStrategy.Cooperate) {}

    selectGiftStrategy(other: Clan): GiftStrategy {
        const s = this.defaultGiftStrategy;
        this.lastGiftStrategy.set(other, s);
        return s;
    }

    getLastGiftStrategy(other: Clan): GiftStrategy {
        return this.lastGiftStrategy.get(other) ?? this.defaultGiftStrategy;
    }

    clone() {
        const clone = new ClanAgent(this.clan, this.defaultGiftStrategy);
        for (const [other, strategy] of this.lastGiftStrategy) {
            clone.lastGiftStrategy.set(other, strategy);
        }
        return clone;
    }
}

export class Assessments {
    constructor(readonly clan: Clan) {}

    // How much helping the other clan is worth relative to
    // helping ourselves.
    private readonly alignment_ = new Map<Clan, number>();
    // How much payback we expect for our actions. 1 means
    // proportionate.
    private readonly effect_ = new Map<Clan, number>();

    // Alignment of other clans based on living together.
    private readonly residenceAlignment_ = new Map<Clan, number>();

    private aincr(clan: Clan, amount: number) {
        const a = this.alignment_.get(clan) || 0;
        this.alignment_.set(clan, a + amount);
    }
    
    private ratarget(clan: Clan, target: number, epsilon = 0.03) {
        const a = this.residenceAlignment_.get(clan) || 0;
        const na = (a + target) / 2;
        if (Math.abs(na - target) < epsilon) {
            if (target == 0) {
                this.residenceAlignment_.delete(clan);
            } else {
                this.residenceAlignment_.set(clan, target);
            }
        } else {
            this.residenceAlignment_.set(clan, na);
        }
    }

    update() {
        this.alignment_.clear();
        this.effect_.clear();

        this.updateAlignment();
        this.updateEffect();
    }

    private updateAlignment() {
        if (this.clan.settlement!.clans.length >= 10) {
            for (const clan of this.clan.settlement!.clans) {
                const a = clan === this.clan ? 1 : -1;
                this.alignment_.set(clan, a);
            }
        }

        this.updateAlignmentForFamilyRelationships();
        this.updateAlignmentForLocalInteractions();
        this.updateAlignmentForScaleEffects();
    }

    private updateAlignmentForFamilyRelationships(
        clan: Clan = this.clan, 
        seen: Set<Clan> = new Set(),
        hops = 0,
    ) 
    {
        if (seen.has(clan)) return;
        seen.add(clan);
        this.alignment_.set(clan, Math.pow(0.25, hops));

        for (const other of clan.cadets) {
            this.alignment_.set(other, 1);
            this.updateAlignmentForFamilyRelationships(other, seen);
        }

        if (clan.parent) {
            this.alignment_.set(clan.parent, 1);
            this.updateAlignmentForFamilyRelationships(clan.parent, seen);
        }
    }

    private updateAlignmentForLocalInteractions() {
        // Update for time living together. Target relatedness from
        // this source is 1/N.
        const clans = this.clan.settlement!.clans;
        for (const clan of clans) {
            if (clan === this.clan) continue;
            const ta = 1 / clans.length;
            this.ratarget(clan, ta);
        }
        for (const clan of this.residenceAlignment_.keys()) {
            if (clan === this.clan) continue;
            if (clan.settlement !== this.clan.settlement) {
                this.ratarget(clan, 0);
            }
        }
        for (const [clan, ra] of this.residenceAlignment_) {
            if (clan === this.clan) continue;
            this.aincr(clan, ra);
        }

        // Update for usage of shared resources.
        for (const clan of clans) {
            if (clan === this.clan) continue;
            const baseta = this.clan.shareOfCommons * (this.clan.consumptionFromCommons / this.clan.consumption);
            let ta;
            switch (clan.economicPolicy) {
                case EconomicPolicies.Share:
                    ta = baseta;
                    break;
                case EconomicPolicies.Cheat:
                    ta = baseta * (1 - clan.settlement!.clans.slippage);
                    break;
                default:
                    ta = 0;
                    break;
            }
            this.aincr(clan, ta);
        }
    }

    private updateAlignmentForScaleEffects() {
        // If the settlement is approximately full, large penalty as we
        // are resource-constrained.
        const s = this.clan.settlement!;
        const fullness = clamp((s.size / s.popLimit - 0.9) * 10, 0, 1);
        if (fullness > 0) {
            for (const clan of s.clans) {
                if (clan === this.clan) continue;
                this.aincr(clan, -fullness);
            }
        }

        // Otherwise small bonus for positive returns to scale.
        const gf = Math.pow(s.size / (s.size - this.clan.size), 1/3) - 1;
        for (const clan of s.clans) {
            if (clan === this.clan) continue;
            this.aincr(clan, gf)
        }
    }

    updateEffect() {
        // Effect is related to size and disposable income
        // of partner. 
        // TODO - fill this out
    }

    alignment(clan: Clan): number {
        return this.alignment_.get(clan) || 0;
    }

    clone(): Assessments {
        const clone = new Assessments(this.clan);
        for (const [clan, a] of this.alignment_) {
            clone.alignment_.set(clan, a);
        }
        for (const [clan, e] of this.effect_) {
            clone.effect_.set(clan, e);
        }
        for (const [clan, ra] of this.residenceAlignment_) {
            clone.residenceAlignment_.set(clan, ra);
        }
        return clone;
    }
}
