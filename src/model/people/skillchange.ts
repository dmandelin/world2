import { type Clan } from './people';
import { type ClanSkill, type SkillDef } from './skills';
import { moveToward } from '../lib/modelbasics';
import { chooseWeighted, sumFun } from '../lib/basics';

// About skill changes
//
// Sources of skill change, or more properly, causes of why the
// next turn's value is what it is:
//
// - Tradition: Previous practice is continued and handed down,
//       with error. This depends on the skill being practiced
//       enough.
// - Environmental change: Changes in the environment may reset
//       the skill value. For example, local ecology knowledge
//       resets on a move.
// - Learning by imitation: If the clan practiced the skill with
//       another clan, they may pick up some things from them
//       and become more similar. They'll tend to copy mostly
//       things they expect to help them, but it's possible to
//       copy worse practice.
// - Learning by observation: If the clan practiced the skill,
//       they will tend to learn what works better over time.
//       In some cases, clans may mistakenly learn something
//       that makes them worse.
//
// The skill rating can be thought of in three different ways:
// - log(productivity from skill)
// - Elo rating for contests
// - The number of "tricks" or "lessons" learned
//
// The latter view suggests that loss from error is proportional
// to skill, while gains are fixed. That means the skill update
// function looks something like
//
//   S1 = r * S0 + g
//
// where r is the retention factor (r = 1 - e, the error factor).
// At equilibrium (good to know for tuning), S0 and S1 are equal:
//
//   S = r * S + g
//   (1 - r) * S = g
//   S = g / (1 - r) = g / e
//
// Factors affecting skill change rates in the current model:
// - Clan size
//   - This is a very complicated consideration, and we don't
//     try to understand in detail, but here are a few points
//   - More people means more total error (variance) as they learn
//     separately, but they can also "error-correct" each other,
//     so they could have less change, but beyond some point,
//     they won't completely sync. We can assume they roughly
//     balance and ignore this effect, but later, if we want
//     more size tradeoffs, a slight reduction in both loss due
//     to error and learning seems warranted.
//   - More people means more chance to run into new situations
//     to learn from, and more people to try to solve new problems,
//     but also more coordination problems with that, and since
//     they do a lot of work together, they'll somewhat tend to
//     encounter the same problems.
//   - We could go a lot of ways with this, but my intuition is
//     that large clans may have more resources to innovate with,
//     but small clans will find it easier to change. Exactly
//     how that shakes out depends on internal group structure
//     (e.g., tradition-based clan vs science lab). In our
//     setting, it makes sense to give a larger clan less change
//     in both directions, but we could ignore this.
// - Effort allocation
//   - Also complicated but some points.
//   - If a clan is 70% farming and 30% fishing, we assume most
//     families in the clan are doing about that same split: we
//     assume they have a common way of life together, but with
//     some scope for mild specialization.
//   - Clans contain different age groups, which will be at
//     different skill levels, making things very complicated.
//     But I did an analysis of equilibrium clan productivity,
//     and found that it depends on skill ramp-up time: if it's
//     very fast, clans doing it only a little bit can be fully
//     productive. Conversely, if it takes a lifetime to learn,
//     skill, and thus productivity, will always be low if doing
//     the activity 5% of the time.
//     - We'll assume our initial farming and fishing processes are
//       not too hard, and people can become productive relatively
//       quickly, but with some meaningful time taken.
//       - Really, we could assume our farmers' skills are initially
//         very basic, but with low capital costs (alluvium) and
//         high returns (farming the richest soils). That suggests
//         we let skills be kind of low but boost farm productivity
//         overall (until we get differential land quality)
//     - Skill requirements should probably go up as technology
//       goes up (depending on the technology)
//
// For now, clans with higher intelligence *don't* learn faster,
// because there is no tradeoff. It doesn't make sense to have
// a trait that's pure advantage unless we want it continuously
// increasing during the simulation.

export class ClanSkillChange {
    // Effort as a percentage of overall effort.
    readonly focus: number;
    // Amount of learning relative to baseline due to effort.
    readonly focusFactor: number;

    // Value before the change.
    readonly initialValue: number;

    readonly items: ClanSkillChangeItem[] = [];
    readonly imitationTargetItems: readonly ImitationTargetItem[] = [];

    constructor(
        readonly clan: Clan,
        readonly skillDef: SkillDef,
        readonly skill: ClanSkill,
    ) {
        const lossFactor = 0.1;
        const lossSwing = 0.05;

        // Maintaining traditions
        this.initialValue = skill.value;

        // Error in preserving traditions, proportional to the amount to preserve.
        let adjustedLossFactor = lossFactor;
        // Lose local knowledge on a move.
        // TODO - Have this work somewhat differently for hunting and gathering
        // vs farming knowledge, as one is more locally bound than the other.
        if (clan.settlement !== clan.previousSettlement) {
            // TODO - Have a smaller reset for some other skills
            if (skillDef.resetsOnMove) {
                adjustedLossFactor *= 2;
            }
        }
        const expectedDeltaFromError = -adjustedLossFactor * this.initialValue;
        const deltaFromError = expectedDeltaFromError
            + this.initialValue * lossSwing * (Math.random() - Math.random());
        this.items.push(new ClanSkillChangeItem('Error', deltaFromError, expectedDeltaFromError));

        // Focus influences learning rate.
        this.focus = skillDef.getEffort(clan) / Math.max(1, clan.production.effort());
        this.focusFactor = Math.pow(this.focus, 0.25);

        // Learn by imitation. Imitation target might be self, meaning
        // the clan prefers its own traditions. Imitation is generally
        // faster than observation.
        //
        // "Clan skills" are developed internally and not via imitation.
        if (!skillDef.clanSkill) {
            const maxImitationDelta = 15 * this.focusFactor;
            this.imitationTargetItems = [...clan.settlement!.clans].map(
                c => new ImitationTargetItem(
                    c.uuid,
                    c.name,
                    clan.informationOn(c),
                    c.skills.v(skillDef),
                ));

            // Calculate the average skill observed by the clan
            let sumInfoTimesSkill = 0;
            let sumInfo = 0;
            for (const item of this.imitationTargetItems) {
                sumInfoTimesSkill += item.information * item.trait;
                sumInfo += item.information;
            }
            const averageSkillObserved = sumInfo > 0
                ? sumInfoTimesSkill / sumInfo
                : sumFun(this.imitationTargetItems, item => item.trait) / Math.max(1, this.imitationTargetItems.length);

            // Compute weights based on perceived skills (Elo-like formula)
            for (const item of this.imitationTargetItems) {
                item.perceivedSkill = item.information * item.trait + (1.0 - item.information) * averageSkillObserved;
                // If two clans have a 30-point skill difference, they are 75% likely to imitate the higher-skill clan (3:1 ratio)
                item.weight = Math.pow(3, item.perceivedSkill / 30);
            }

            const totalWeight = sumFun(this.imitationTargetItems, o => o.weight);
            if (totalWeight > 0) {
                for (const item of this.imitationTargetItems) {
                    item.weight /= totalWeight;
                }
            } else {
                for (const item of this.imitationTargetItems) {
                    item.weight = 1.0 / this.imitationTargetItems.length;
                }
            }

            const imitationTarget = chooseWeighted(this.imitationTargetItems, i => i.weight);
            imitationTarget.chosen = true;
            if (this.initialValue !== imitationTarget.trait) {
                const imitationDelta = moveToward(this.initialValue, imitationTarget.trait, maxImitationDelta) - this.initialValue;
                const expectedImitationDelta = imitationTarget.weight * imitationDelta;
                this.items.push(new ClanSkillChangeItem(
                    imitationTarget.label,
                    imitationDelta,
                    expectedImitationDelta
                ));
            }
        }

        // Learn by observation. This should roughly balance error at skill 50
        // with focus 1.
        // TODO - might want less observation learning if they're imitating,
        //        but still allow some. However, this has a big impact on
        //        tuning so must be done carefully.
        const clanSkillFactor = skillDef.clanSkill ? 1.5 : 1;
        const observationLearningFactor = this.focusFactor * clanSkillFactor;
        const expectedDeltaFromObservation = 6 * observationLearningFactor;
        const deltaFromObservation = expectedDeltaFromObservation +
            observationLearningFactor * (4 * (Math.random() - Math.random()));
        this.items.push(new ClanSkillChangeItem('Observation', deltaFromObservation, expectedDeltaFromObservation));
    }

    get delta(): number {
        return sumFun(this.items, o => o.delta);
    }
}

export class ClanSkillChangeItem {
    constructor(
        readonly label: string,
        readonly delta: number,
        readonly expectedDelta: number,
    ) { }
}

export class ImitationTargetItem {
    weight: number;
    perceivedSkill: number;
    chosen: boolean;

    constructor(
        readonly uuid: string,
        readonly label: string,
        readonly information: number,
        readonly trait: number,
    ) {
        this.weight = 0;
        this.perceivedSkill = 0;
        this.chosen = false;
    }
}
