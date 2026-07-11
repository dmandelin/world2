Let's try to synthesize some the recent writeups to better
identify what's important right now.

# Introduction

The current goal is to better model village fission, which we
believe to have these features:

*   Conflict within a village increases with population
*   When the conflict gets high enough, some people decide to
    move out and found a new village (or go to an existing one
    if possible)
*   Societies can develop features allowing settlements to
    grow beyond village size

Conflict is thus crucial to the process. Typical grounds for
conflict include:

*   Marriage and other relationships
*   Access to capital (e.g., encroachment, reapportionment)
*   Access to resources (e.g., demand sharing)
*   Damages (e.g., animals trampling crops)
*   Reputation (e.g., slander, competition)
*   Interpersonal (e.g., arguments, sorcery accusations)

Reputation is a status-like construct. And this implies that
people and clans are somehow competing for reputation, or at
least guarding it. That raises the question, what is status,
and why do people and clans compete for it? That requires a
careful analysis.

It seems possible to model fission without having much about
status or reputation, so I'll try that. But there are many
questions about status, and it does relate, so I'll add that
on after.

## Basic Concepts of Conflict and Cooperation

Clans cooperate for either or both of two reasons:

*   The clans have goodwill toward each other, e.g., due to
    a kin relationship. 
    *   This is related to r from game theory, except that
        psychologically this may be as much or more about 
        affection than formal relatedness or similarity 
        properties.
        *   For example, giving gifts could increase this
    *   Note that with high goodwill, demand sharing works
        relatively smoothly, but with zero or negative
        goodwill, clans would always prefer to refuse a
        request if they can get away with it.
*   The clans derive mutual benefit from the cooperation.
    *   On any given day, for the relationship to continue,
        each side needs to believe the other will cooperate.
        Otherwise, they'll defect, and (for many strategies),
        so will the other, and the cooperation halts.
        *   Note that forgiveness is possible.
    *   What leads clans to trust each other?
        *   "The shadow of the future": future gains from
            cooperation that would be interrupted by defection.
            Clearly they need some reason to expect the
            relationship to continue for this to make sense,
            such as precedent.
        *   Observability: with gossip, defection has 
            reputational costs. It would seem this is about
            either or both of "norm violation" or "being a
            bad partner".
        *   Relatedness: in some cases, defection has no point,
            but this needs to be the zero-sumness-adjusted
            version
            *   Things that create psychological affection
                presumably also work
        *   Power: psychologically, people may tend to trust
            a more powerful counterparty more
        *   Supervision: third parties can impose costs for
            defection
    *   How might these decrease/increase at scale?
        *   Future: More about mobility than scale per se,
            but in general we might expect more one-shot
            interactions in a larger settlement
        *   Observability: Limited network connectivity and
            bandwidth
        *   Relatedness: Probably lower with scale
        *   Power: Not about scale per se but power differences
            tend to increase
        *   Supervision: Not about scale per se but mechanisms
            will have economies of scale

Clans conflict for either or both of two related reasons:

*   The clans have ill will toward each other
    *   This specifically means negative r from game theory, 
        so it means clans that are significantly more different
        from each other than average, except that it can also
        be about psychological ill will.
*   Either clan can derive benefit from the conflict
    *   Even if clans are highly related, zero-sum games are
        grounds for conflict.
    *   These could be considered hawk-dove games.
        *   Iterated hawk-dove (clans know each other):
            *   "Hawk on my property, dove on the rest" is a
                common stable strategy
            *   For ambiguous situations, this can be considered
                cooperate-defect, thus clans might typically
                want to cooperate
        *   One-shot hawk-dove (clans don't know each other):
            *   Typically see lots of doves, a few hawks,
                because with too many hawks they start encountering
                each other too often

Let's consider some basic conflict types:

*   Bad thing happens, disagree over who bears the costs
    *   Example: Animal tramples crops
    *   Ambiguous hawk-dove:
        *   +Dove if expect future conflict/cooperation situations
            with the same party
        *   +Norm if observable
        *   +Dove if related/goodwill
        *   +Dove if other party more powerful
        *   +Hawk if zero-sum/carrying capacity
*   Good thing happens, disagree over who benefits
    *   Example 1: demand sharing payouts
        *   This could be pretty cooperative if there was a stable
            sense of "what is owed", but apparently the accounting
            is really hard and there generally isn't.
        *   In some cases, there could be norms
*   Clan tries to take advantage of another
    *   Example: land encroachment
    *   We can model this as hawk-dove where there are two interactions,
        one "attack opportunity" by each side
*   Clan breaks a contract
    *   Example: break marriage engagement for preferred partner
    *   Seems "attack opportunity" model works here too

# Simple Fission Conflict Concept

There are many specific issues in the model that clans could
conflict over, but apparently no matter how simple the society,
community size is limited, so no advanced resources or special
grounds for conflict should be needed.

We assume that people can come into a conflict over a variety
of things, including marriage, property damage, and insults.
This can include mistakes, such as where an intended compliment
is heard as an insult. It can also include intentional actions
such as stealing.

In a simple model, we can roll up all the different things
people conflict over into one process. So that conflict is
never *only* over resources, we'll add psychosocial stress as
stakes.

We can model this as a hawk-dove game. The basic idea is that
every pair of interacting clans has a hawk-dove game or sequence
of hawk-dove games. Exact tuning will have to wait until we've
elaborated the model, but consider that we want "mostly cooperative"
in small villages at first, implying perhaps V/C = 0.1.

Clans will effectively use mixed strategies because different
factors will make them more or less likely to play hawk. We may
also use probability.

## Interactions and their conflicts

The types of conflicts possible depend on relationships or
interactions:

*   Kin/Friends
    *   Though there is typically goodwill, there can certainly
        still be conflict within these relationships.
    *   We might not need to worry too much about this at first
*   Neighbors
    *   There is potential for conflict over boundaries, shared
        resources, demand sharing, etc.
    *   Here, we assume there's an ongoing relationship, so
        that games are iterated
    *   What this really means will depend on the exact nature
        of the cooperative relationships
        *   To give an initial flavor, let's imagine that if
            farmers can get neighbors to chip in 25% of their
            labor in various ways, that will make them 50%
            more productive
            *   Conflict would be over who didn't help quite
                enough that one time, whether they did a good
                enough job, etc.
            *   Cost of conflict should include potential
                loss of relationship
*   Strangers
    *   There will be much less interaction than with neighbors
        in many settlements, so much less potential for conflict
        in that way
    *   However, games are not iterated
        *   In this case, defection is not guaranteed: it seems
            that in some societies, it is, but in others, people
            are socialized to internally cooperate!

## Factors affecting the choice to play hawk or dove

There are four main factors that affect the choice:

*   Future interactions
    *   If the clans expect to have future interactions with
        each other, they'll tend to want to play dove and expect
        the other clan to play dove
    *   If the clans don't expect to have future interactions,
        they'll be more likely to play hawk
*   Norms
    *   Norms may require clans to do one thing or another,
        making that more likely
    *   What we mean here is specifically that clans expect to
        be punished by other clans for their choice
    *   Do we have this initially? Not clear.
    *   This can also include specialized or divine supervision
*   Goodwill/relatedness
    *   Higher goodwill makes dove more likely
*   Power
    *   Counterparty higher power makes dove more likely

# Simple Fission Conflict Model

A key question not addressed yet is, what about the sliding
scale of repeatability: as settlements scale up, clans can
continue to interact repeatedly, but there may be somehow
less repetition between more pairs.

Even if clans don't interact very often, they are incentivized
to be cooperative, to keep the benefits flowing. Instead what
we seem to have are:

*   Things get harder to track: With more people involved, it's
    harder to keep track of any given person. Also, if interactions
    are infrequent, people may forget what happened.
*   Links are less complete: Less ability to synchronize, less
    goodwill.
*   More replacements: More ability to replace relationships
    if you defect and others exit

Let's make this mostly about "neighbors": people with known
disputes against each other (as opposed to harms from anonymous
parties). Each pair has a potential conflict with value V in
stress and food: doves split the cost, hawks attempt to foist
it on the other side. Some parts of the value of the conflict
comes from how they directly interact (attention), other parts
from incidental interaction (scales down with size). Total 
stakes of each conflict are maybe 10-20% of all produce.

*   Future interactions: In a very simple model, we have just
    one payoff matrix, so this either makes cooperate the
    dominant strategy or it doesn't. However, we also have:
    *   Mistakes: Various mistakes can impede cooperation
    *   Small stuff: Although major defection might cause
        loss of the relationship, various kinds of minor
        defection can still be done. So, the future might
        be better considered a filter that reduces the (total)
        stakes of conflict. Could also modify cost.
*   Norms: To the extent that they operate as constraints,
    norms can be folded in. We need more texture mostly if
    clans can defy the norms.
*   Relatedness/similarity/goodwill
    *   Tracking similarity and goodwill don't seem too hard
    *   Zero-sumness is the complicated issue. 
        *   Various resources must start to become bottlenecks
            with scale. They could be economic, but we believe
            that at village scale they're mainly social. This
            could be calendar slots for weddings, things like
            that. Stakes of conflict could thus rise with scale.
        *   Status is zero-sum, but inequality doesn't seem to
            be correlated with instability. Rather, it seems
            that unequal roles can be new grounds for zero-sum
            competition, but they can also make it more obvious
            who will win the conflict.
        *   Perhaps the key is incomplete connectivity. Let's
            imagine that each clan thinks "I want the best
            connections and relationships possible". Then,
            as long as clans can achieve complete connectivity,
            all are content. But if not, then they may conflict
            over relationships.
    *   Effects of goodwill:
        *   Like future interactions, this is a shift in the
            payoff matrix, and in context high goodwill seems
            to amount to a filter on stakes and cost
        *   Negative goodwill could increase stakes.
*   Power
    *   Not modeled yet
    *   May not need at first

# Changes to make for the simple model

x   Add basic conflict model with:
    x   Basic data structures for conflict graph
    x   Iterated hawk-dove game
    x   Stress stakes
*   Updated village splits
    *   Clans with stress worse than the baseline "life" value
        may be motivated to move
    *   Usually, more than one clan should move at once -
        check decision-making and tuning so that moving into
        isolation is unappealing
*   Add refinements
    *   Displays
        x   Settlement average stress
        *   Dramatizations (graphics/words) of social temperature
            and events
            x   Color-coded stress displays
        *   Trend indicators for social temperature
        *   Clan recent fortunes: average population change and others
    *   Stakes are proportional to interaction level:
        *   Larger factor * attention
        *   Smaller factor * 1 (incidental interactions)
    *   Goodwill
        *   Impact of conflict on alignment
        *   Reduce stress stakes
        *   Play hawk less often
    *   Other items
        *   Clan personalities - variable basic hawk probability
        *   Stress stakes rise with scale (social bottlenecks)
        *   Food stakes
        *   (P2) Add stress to productivity model
        *   (P2) Vary stress with other factors of interest
    *   Relative power
        *   Based on size and relationships
        *   Size can be an easy factor; could be quadratic on
            offense/defense logic, but also sublinear due to
            coordination costs, so could be linear for now
            *   At some point we should probably have various
                clan size modifiers
                *   Also use those to drive clan splits and
                    merges
        *   Relationships
            *   Easy version: count parnter power and willingness,
                use as strength values
                *   Given that we're representing a whole iterated
                    turn, might be better to do it this way
                *   But it should cost something to provide conflict
                    aid
            *   For larger issues, we could have clans lobby different
                clans and seek some sort of consensus
    *   Reputation
        *   Two possibilities:
            *   Strong reciprocity - this may apply to norm
                violations, including certain "attack" actions
                (that we don't have yet), but it seems less
                relevant here: the assumption would be that
                clans might pursue a conflict very hard in a
                way that *doesn't* get them generally ostracized
                *   Looking ahead: dispute resolution systems
                    help in part by limiting the maximum effort!
            *   Knowledge of behavior - clans could adjust their
                own strategies based on knowledge of others'
                *   They would tend to get some of this from
                    direct interaction, so this could be more
                    about making strategy selection a bit more
                    accurate
                *   Might be more relevant once there's enough
                    scale that clans don't all know each other
    *   Choice and conflict over relationships (marriage,
        cooperative)
    *   Mistakes:
        *   Random changes to goodwill?
        *   Increased mistakes with reduced attention?
        *   Strategic missteps
    *   Gifts: actions to gain goodwill
    *   Later: "attacks" and "crime" as prisoner's dilemma
    *   Later: dispute resolution mechanisms

# A bit more discussion on goodwill and bottlenecks

"Goodwill" is a bit unstable because it could mean any of these:

*   Relatedness in the basic similarity sense
*   Psychological goodwill, presumably being the mechanism via
    which relatedness matters
*   Behavorial good action, i.e., the goodwill that actually
    takes effect via action.

We probably want to focus on the most behaviorally salient meaning,
which would be good action. But if it's meaningfully separate from
the psychological version, we should understand why. And we can
track similarity if we want to.

Let's consider, then, two clans in a zero-sum situation, which
could range from:

*   They mostly get along but they disagree on one little thing
    today
    *   This would seem not to have too much effect on the broader
        relationship, but it could impact psychological good will
*   Both are rivals for a certain position they both care about
    a lot, but isn't critical to their survival
    *   This seems to depend on norms and tendencies. Might be
        OK psychologically or might cause rancor. Same with
        action in other domains
*   Ordinary dispute
    *   Also seems to depend on norms and tendencies, but with
        the negative stuff feelings seem to be harder. Probably
        related to zero-sumness.
*   The local area is at carrying capacity
    *   In theory, we could have people psychologically liking
        each other just fine but rationally competing hard. So
        again, norms matter and there does seem to be a possible
        split between psychology and action.
    *   But, the difference is perhaps not too big at this point
*   They're contending for a critical survival resource
    *   Same, norms could really vary!

It seems that we can as a baseline assume that psychology and
action are united, but norms (including socialization and personal
standards) or rational calculations can cause them to deviate.
So we can probably make simple assumptions to start, but may need
more complexity later.

# Looking ahead: status and reputation

The relational factors could shake out like this:

*   Goodwill: Psychological good will toward the other clan. Major
    factor in cooperation and conflict opportunities.
    *   Norm violations will reduce goodwill!
    *   Bad partner actions will reduce goodwill in context
    *   Clans might be able to observe each others' hawkishness
        and that might influence their goodwill
*   Relative Power: Ability to win conflict (get a bigger benefit 
    rather than just splitting). What creates power depends on the
    type of conflict, but for village life we can imagine that this
    is basically "political consensus".
    *   We could start with a simple influence model, "voting"
        by goodwill toward parties
    

# Looking ahead II: how will we allow growth?

One clear reason is amenities: any amenities will counter conflict
disamenities in migration decisions. However, it seems that once
societies break the village size barrier, settlements can scale up
fairly readily, so there's probably more going on.

The key may be a shift in how relationships work. At small scale,
everyone knows everyone, and "the system" requires this, and starts
to break down if they can't. So perhaps the key is a shift in
relationships to something stably scalable, e.g., a tree or a
market.

Keeping it simple and vague for now, imagine that people move their
economic cooperation and social connection relationships somewhat
to a local temple or big man. Then, they no longer have to conflict
so much over these things. Grounds for conflict with the local
neighbors shrink. New types of conflicts start to matter more:

*   Conflicts with business partners, etc. Similar in flavor to
    neighbor conflicts, but more scoped to one area of life,
    with more formal resolution, so less fallout.
*   Incidental and anonymous conflicts rise. These could start to
    become significant in larger settlements.

