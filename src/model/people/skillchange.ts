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
// Loss factors are generally scaled by initial skill value, but
// gain factors are unscaled. At least one should be scaled so
// that skill moves toward an equilibrium value rather than increasing
// without limit. Tuning is easier when we scale only one. It also
// seems to be theoretically justified, as some sources disagree
// whether learning and innovation move toward as asymptote, or if
// the more skilled advance as fast or faster. Conversely, the more
// skill you have, the more resources on some level it must take to
// maintain.
//
// People who are working together tend to learn and notice the
// same kinds of things, so N times as many people on task doesn't
// mean N times the skill learning. However, there is some increase
// for having more.
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
    readonly imitationTargetItems: readonly ImitationTargetItem[];

    constructor(
        readonly clan: Clan,
        readonly skillDef: SkillDef,
        readonly skill: ClanSkill,
    ) {
        this.effort = skillDef.getEffort(clan);
        this.relativeEffort = this.effort / skillDef.referenceEffort;
        this.effortFactor = Math.pow(this.relativeEffort, 0.15);

        this.initialValue = skill.value;
        
        // Maintain tradition with some error.
        this.baseFromTradition = this.initialValue;
        const relativeDeltaFromError = -0.1 + 0.15 * (Math.random() - Math.random());
        const deltaFromError = this.baseFromTradition * relativeDeltaFromError;
        this.items.push(new ClanSkillChangeItem('Error', deltaFromError));

        // Lose local knowledge on a move.
        // TODO - Have this work somewhat differently for hunting and gathering
        // vs farming knowledge, as one is more locally bound than the other.
        if (clan.settlement !== clan.previousSettlement) {
            // TODO - Have a smaller reset for some other skills
            if (skillDef.resetsOnMove) {
                const relativeDeltaFromMove = -0.5 + 0.3 * (Math.random() - Math.random());
                const deltaFromMove = this.baseFromTradition * relativeDeltaFromMove;
                this.items.push(new ClanSkillChangeItem('Move', deltaFromMove));
            }
        }

        // Learn by imitation. Imitation target might be self, meaning
        // the clan prefers its own traditions.
        const maxImitationDelta = 5 * this.effortFactor;
        this.imitationTargetItems = [...clan.settlement!.clans].map(
            c => new ImitationTargetItem(
                c.name,
                c.skills.v(skillDef),
                100 * clan.respectFor(c)
            ));
        const totalWeight = sumFun(this.imitationTargetItems, o => o.weight);
        for (const item of this.imitationTargetItems) {
            item.weight /= totalWeight;
        }
        const imitationTarget = chooseWeighted(this.imitationTargetItems, i => i.weight);
        if (this.initialValue !== imitationTarget.trait) {
            this.items.push(new ClanSkillChangeItem(
                imitationTarget.label, 
                (moveToward(this.initialValue, imitationTarget.trait, maxImitationDelta)
                 - this.initialValue)
            ));
        }

        // Learn by observation. This should roughly balance error at skill 50.
        const deltaFromObservation = this.effortFactor * 
            (5 + 10 * (Math.random() - Math.random()));
        this.items.push(new ClanSkillChangeItem('Observation', deltaFromObservation));
    }

    get delta(): number {
        return sumFun(this.items, o => o.delta);
    }

    get changeSourcesTooltip(): string[][] {
        const header = ['Source', 'Δ'];
        const data = this.items.map(o => [
            o.label, 
            o.delta.toFixed(),
        ]);
        const footer = [ 
            'Total',
            sumFun(this.items, o => o.delta).toFixed(),
        ]
        return [header, ...data, footer];
    }
}

export class ClanSkillChangeItem {
    constructor(
        readonly label: string,
        readonly delta: number,
    ) {}
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
