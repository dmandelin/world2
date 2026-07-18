import { type Clan } from './people';
import { type ClanSkill, type SkillDef } from './skills';
import { moveToward } from '../lib/modelbasics';
import { chooseWeighted, sumFun } from '../lib/basics';
import { getRespect } from '../relations/respect';

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
    // Effort (in person-turns) during which skill learning occurred.
    readonly effort: number;
    // Effort relative to baseline for skill learning.
    readonly relativeEffort: number;
    // Amount of learning relative to baseline due to effort.
    readonly effortFactor: number;

    // Value before the change.
    readonly initialValue: number;

    // Value if traditions are passed on without error.
    readonly baseFromTradition: number;

    readonly items: ClanSkillChangeItem[] = [];
    readonly imitationTargetItems: readonly ImitationTargetItem[] = [];

    constructor(
        readonly clan: Clan,
        readonly skillDef: SkillDef,
        readonly skill: ClanSkill,
    ) {
        this.effort = skillDef.getEffort(clan);
        this.relativeEffort = this.effort / skillDef.referenceEffort;
        this.effortFactor = Math.pow(this.relativeEffort, 1.15);

        this.initialValue = skill.value;

        // Maintain tradition with some error.
        this.baseFromTradition = this.initialValue;
        const relativeDeltaFromError = -0.1 + 0.15 * (Math.random() - Math.random());
        const deltaFromError = this.baseFromTradition * relativeDeltaFromError;
        const expectedDeltaFromError = this.baseFromTradition * -0.1;
        this.items.push(new ClanSkillChangeItem('Error', deltaFromError, expectedDeltaFromError));

        // Lose local knowledge on a move.
        // TODO - Have this work somewhat differently for hunting and gathering
        // vs farming knowledge, as one is more locally bound than the other.
        if (clan.settlement !== clan.previousSettlement) {
            // TODO - Have a smaller reset for some other skills
            if (skillDef.resetsOnMove) {
                const relativeDeltaFromMove = -0.5 + 0.2 * (Math.random() - Math.random());
                const deltaFromMove = this.baseFromTradition * relativeDeltaFromMove;
                const expectedDeltaFromMove = this.baseFromTradition * -0.5;
                this.items.push(new ClanSkillChangeItem('Move', deltaFromMove, expectedDeltaFromMove));
            }
        }

        // Learn by imitation. Imitation target might be self, meaning
        // the clan prefers its own traditions.
        //
        // "Clan skills" are developed internally and not via imitation.
        if (!skillDef.clanSkill) {
            const maxImitationDelta = 5 * this.effortFactor;
            this.imitationTargetItems = [...clan.settlement!.clans].map(
                c => new ImitationTargetItem(
                    c.name,
                    c.skills.v(skillDef),
                    100 * getRespect(clan, c)
                ));
            const totalWeight = sumFun(this.imitationTargetItems, o => o.weight);
            for (const item of this.imitationTargetItems) {
                item.weight /= totalWeight;
            }
            const imitationTarget = chooseWeighted(this.imitationTargetItems, i => i.weight);
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

        // Learn by observation. This should roughly balance error at skill 50.
        // TODO - might want less observation learning if they're imitating,
        //        but still allow some
        const clanSkillFactor = skillDef.clanSkill ? 1.5 : 1;
        const deltaFromObservation = clanSkillFactor * this.effortFactor *
            (5 + 5 * (Math.random() - Math.random()));
        const expectedDeltaFromObservation = clanSkillFactor * this.effortFactor * 5;
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

    constructor(
        readonly label: string,
        readonly trait: number,
        readonly respect: number,
    ) {
        if (isNaN(respect)) debugger;
        this.weight = (4 ** trait) * (1.3 ** respect);
    }
}
