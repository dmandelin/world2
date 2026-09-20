Discussion based on Mathematical Models of Social Evolution:
A Guide for the Perplexed, by McElreath and Boyd. This has a
lot of relevant game-theory concepts worth carefully thinking
about for integration with the models.

## Notes

### "Altruism"

"Altruism" is here defined specifically as "absolute altruism",
where one organism voluntarily does something that decreases its
expected reproduction ("fitness") and increases the expeceted
reproduction of another. Discussion centers around the famous
Hamilton's rule, deriving it and explaining the assumptions it's
built on. The rule is that altruism can evolve if

    rb > c

    where
        r will be explained below
        b is the benefit to the recipient
        c is the cost to the altruistic actor

r is often said to be the "coefficient of relatedness", and used
for sayings like "I'd sacrifice myself to save eight cousins",
but the derivation shows that here it is something different.

The coefficient of relatedness *is* also usually denoted by `r`.
It's a function of two organisms and is the probability that any
allele is the same between them by common descent. (This is *not*
the the probability the allele is the same, which for example
might be very high simply because most of the population has the
same allele). This is the familiar relatedness value with 0.5
between full siblings and so on.

The `r` in Hamilton's rule is a statistic, not a property of a
pair of organisms. (I think we *can* define an `r` for a particular
organism's expected interactions.) With some extra assumptions,
this `r` is the slope of the regressor predicting recipient genotype
from actor/donor genotype. (With fewer assumptions, it can be
other formulas, such as a ratio of covariances, but that might
not be important here). Thus, carriers of altruism alleles must
when giving be highly correlated with other carriers for altruism
to expand. Note that it's not that altruists have to usually be
giving to other altruists; rather, it's that they have to be 
signficantly more likely to be giving to an altruist than a random
person would be. This is called "positive assortment". 

Note also that `r` in Hamilton's rule can be negative (since
covariances and regression slopes can be), which is course not
true for the coefficient of relatedness.

A final point in this chapter is that if competition is entirely
local, it's much more difficult for altruism to evolve. The
intuitive logic that "if there's not enough to go around, people
are less likely to share" doesn't actually seem to amount to a
mechanism; it might actually be a summary of typical behavior
caused by multiple mechanisms. The robust direct logic here is
that assuming some level of local relatedness, there's less potential
for positive assortment in a local area: think of the limit case
of a local area of clones. If we let `l` be a coefficient of local
competition and `r̄` the local average relatedness, then local
competition looks like an adjustment to `r`:

    r* = (r - lr̄) / (1 - lr̄)

Note that this can make r* go negative if l > r/r̄.

Postscript: One of the problems says that some scientists believe
there's been too much emphasis on "altruism" models in prisoners'
dilemmas, and that mutual benefit activities such as the stag hunt
game could use more exploration.

### "Reciprocity"

We start with a discussion of iterated prisoners' dilemma and 
tit-for-tat (TFT). Interestingly, TFT can resist invasion by ALLD
(always defect) if wb > c, where `w` is the probability the dyadic
interaction will go on another round. This has the same form as
Hamilton's rule, but with interaction continuation probability
instead of positive assortment. However, TFT can't invade ALLD,
so apparently something else must be going on to get reciprocity
off the ground.

    Note that in prisoner's dilemma, choosing "cooperate" has
    exactly the same mathematics as altruism discussed above.

Apparently kinship makes reciprocity much more likely, which is
especially interesting as that may have been a major path by which
larger-scale human cooperation did appear. With relatedness, TFT
can invade if

    r > (1 - w) / (b/c - w)

When w = 0 (one-shot interactions), this reduces to the standard
altruism result. When w is close to 1, a small r is enough.

There's a discussion of mistakes, which can be of two kinds:

*   Implementation error: an agent mistakenly defects and realizes
    that they have done so.
    *   Full TFT quickly devolves into conflict
    *   Various strategies of forgiveness and atonement can do
        better here
*   Perception error: an agent cooperates in their mind but defected
    according to the counterparty
    *   Contrition can't help here, though forgiveness could
    *   This one might be harder to solve with strategy, and perhaps
        needs more information transfer

Being able to find new partners increases defection, but this
depends on search time: how quickly new defection targets can be
found.

#### "Indirect Reciprocity"

This is the version based on reputation. Apparently the most basic
model of a cooperative strategy is to cooperate on the first round, 
and with anyone who cooperated as their last move. This yields the
same payoffs and conditions as in iterated prisoners' dilemma:
heuristically, the important thing is to iterate behavioral response,
not interact with precisely the same party.

That model is too simple, because reciprocators will actually be
punishing each other for punishing defectors, which makes sense
neither psychologically or strategically. Typically reciprocators
can be invaded by ALLC (always cooperate).

Thus we need reciprocators to judge whether someone's defection is
justified or not, and then punish them or not accordingly. The book
points out that the informational needs to do that are far greater
than for direct reciprocity.

#### Collective Action

This is the n-player version. The basic reciprocating strategies are
for to cooperate if at least i others cooperated on the previous
round. Simplifying ridiculously, apparently reciprocating can be
stable if the long-run benefits of cooperation are greater than the
cost. But getting started is extra-hard, especially with large groups,
as you may have to get everyone to commit to get anyone to commit.
Kinship apparently doesn't make much difference.

Punishment can. A simple model here apparently involves altruistic
punishers and reluctant cooperators (defect until punished). This
has a similar success condition to the above, except that in that
condition it can even invade.

One problem is that ALLC can invade altruistic punishers, and that
enough of them will allow reluctant cooperators to invade again.
There are various ways to try to block this, though it's not clear
anything reliably works. One idea is to punish anyone who fails to
punish, but tracking requirements here will tend to get very difficult
outside of authoritarian systems that don't mind punishing the innocent.
Group selection has been offered, which seems somewhat plausible,
but probably not required, since it's not necessarily always in force.
Apparently imitation can also stabilize this. Another particularly
interesting idea is that agents can use each others' reputation for
their own benefit in dyadic interactions, which then naturally
punishes (collective) defectors.

## Connections to Fiske's models

In Communal Sharing, people both contribute to collective projects
and give directly to other individuals or subgroups in the group.
Thus, it would seem there is both dyadic altruism and collective
action.

*   Dyadic altruism
    *   Can be sustained by kinship, iteration, and reputation
    *   All three would naturally be strong mechanisms in family
        groups that interact frequently
    *   Could also have this in a village, neighborhood, or other
        such community, but with weaker effects as things scale
        up, because all three factors get lower
*   Collective action
    *   Harder to sustain, mostly based on reputation and imitation
    *   In small enough groups, the reputational factors could be
        very strong
    *   The reputational factors are pretty complicated so they
        probably have a harder time scaling up

Equality Matching can also be dyadic or collective.

*   Dyadic equality matching
    *   Here we don't need altruism: we're exchanging like for like
        at the same time
    *   Monitoring is easy enough; just have to have the trust and
        protocols to perform the interaction
*   Collective equality matching
    *   Here also, each contributes, and only those who do share in
        the gains
    *   Similiarly, monitoring is less of a problem, although limited
        in scale.
    *   The new need is coordination: relatively simple, but still
        need to get everyone there at the same time. Trust and protocols
        are still required.

Authority Ranking can probably also be split up in that way, but the
splitting isn't that illuminating anyway.

*   An early version would be one clan voluntarily taking a
    subordinate position because it's better than going alone
*   Although the relationship is not symmetrical, it's still
    true that either party can cooperate or defect (in
    asymmetrical ways)
*   Authority ranking is often performed in person, in which
    case the monitoring typically more effective for superiors
    than inferiors, but this is not necessarily the case
*   Main idea seems to be tree structure to more efficiently structure
    the monitoring and punishing required to sustain cooperation
*   Revolt is a collective action game, perhaps most easily
    accomplished by a strong Communal Sharing group

Market Pricing is basically economics and is based on mutual gain,
but as always requires trust and protocols, and apparently public
goods would have to be produced by other means. (Interestingly,
in certain societies, there could be enough reputational effects
to achieve this.)

## Connections to existing cooperative models in the simulation

*   Socializing
    *   This perhaps looks like altruism, giving fairly freely of
        news, jokes, comfort, and prepared foods in any particular
        moment without expecting immediate return.
    *   It's reasonable to say that some of this will happen
        automatically across kinship relationships, though in case
        of conflict that's not a given.
    *   Otherwise, this sort of thing seems to be mainly based on
        iteration, and to a lesser extent reputation.
    *   The current model may have a lot of the right features,
        but we can go over it again at some point.
*   Food aid
    *   This also looks like altruism, based on kinship, iteration,
        and reputation.
    *   Strict iteration would seem to mainly apply if aid requirements
        are more or less symmetrical, which seems unlikely in general.
    *   However, expectation of various future benefits, or wanting to
        continue relationships, makes for an iteration effect here.
*   Food gifts - similar to socializing
*   Economic favor trading - similar to socializing
*   Ditching
    *   Collective action
    *   In a small enough group, I think we can all agree on what we're
        going to do, and all monitor each other and each other's reactions
        to hold it together. But that's probably at clan level or smaller.
    *   Mechanisms given that might make these stick:
        *   Reputational effects interacting with other systems
        *   Altruistic punishment - although this may be difficult to hold
            together on a general sense, if we have a limited number of
            "laws" or "taboos" a set of people might agree to extra-punish
            transgressors
        *   Imitation - goes along with the "laws" idea
*   Village rituals - similar to ditching but extra visible, and certain
    failures probably extra punished
*   Care help - similar to socializing
*   Conflict help/mediation
    *   Helping another clan in a conflict would be altruism/inexact exchange
    *   Mediating a conflict could be general altruism

More on inexact exchanges (socializing, care, food aid, food gifts, favors):

*   Reputations for all these can cross over
*   Giving more than getting is tolerated if it's better than the
    alternatives!
    *   Generosity may improve reputation
    *   Partner may find other ways to pay back
    *   Failure to be generous may seriously reduce reputation,
        depending on norms

## Key points

We've identified a few key kinds of interactions:

*   Direct exchange: gifts/goods exchanged at the same time
*   Indirect exchange: gifts/goods given a different times, not in any particular
    order or carefully matched up

*   Dyadic: between two clans
*   Collective: n clans acting together

For any kind of positive interaction, clans need to be able to communicate
and to trust each other enough to perform the interaction (e.g., be at peace).
At that point, direct exchanges can simply be done if both parties find them
useful, but other things are more complicated.

Let's also consider the case of an interaction that's actually a lot of
micro-interactions, such as favor-trading help. We can't model all that
in detail, but we can add factors to it as desired. What that looks like
probably depends on the structure of the micro-interactions. In this case,
we think there is some schedulable help (where someone might come through
or not) and some random needs where people would ask for help at that time.
How might people approach this differently:

*   When it's their turn to help
    *   Give more/better than is needed/customary
        *   Note that reputational effects would depend on norms
        *   Egalitarian societies might punish this behavior, but some
            people might defect from that punishment!
    *   Give excuses and less/no help
        *   Might be believed, might not
    *   Refuse help
        *   E.g., due to previous norm violation
*   When it's their turn to ask for help
    *   Ask for more than they really need or when not in need

Since this is a lot of micro-interactions, clans effectively can change
their strategy in real time in response to a counterparty's.

For potentially bigger dyadic interactions, we have these factors to
promote indirect exchange:

*   Kinship
*   Expectation of future interaction benefits based on past behavior
    and reputation
    *   Can include:
        *   Reciprocation of this favor
        *   Reciprocation of other types of favors
        *   Beneficial interactions on other streams (marriage, trade)
*   Expectation of reputational benefits

For bigger collective actions, the key promoters are:

*   Punishment (by someone willing to do it)
*   Expectation of reputational benefits
*   Imitation - to reinforce the above

What might collective micro-interactions look like? Let's take a
couple of examples:

*   Regular maintenance of ditches
    *   There can be various systems for doing this.
    *   A Communal Sharing version might be, if you see a leak, fix
        it or get someone else to.
        *   We could give clans different levels of diligence and
            some means of observing each other.
        *   This probably never works that well unless punishments
            are harsh, which probably doesn't apply at start.
    *   Equality matching might assign different areas to different
        clans at different times.
        *   This could work pretty well, but we might wonder how it
            gets started
        *   Possibility 1: People discuss ways to coordinate this
            collectively and eventually decide on it. This could
            be modeled by having a "ready if we can agree" state
            that clans can get into
        *   Possibility 2: Someone starts doing it on their own,
            either because it's worth it to them at that level, or
            they hope others will join in; and they eventually do
    *   This might also be a place to apply individual vs collective
        action. Maybe it's not that effective, but a farmer really
        could just ditch their own fields
*   Regular rituals
    *   There are probably lots of smaller rituals happening all
        the time.
    *   Perhaps we can imagine weekly+ meetings, as in many traditions
    *   There could be gathering, music, dance, sacrifice, special
        clothing, recitations, food, etc
    *   Actually, these things are probably much more common than
        weekly, with people making small observances with many actions
        they take, such as starting any meal.
    *   What's emerging is that there are two main ways for actions
        to differ: level of participation and choice of how
        *   Level
            *   Presumably some people observe more stuff and more
                strictly than others
            *   For daily micro-interactions, people could set different
                levels without necessarily coming into conflict (though
                they could)
            *   For weekly rituals, this is participatory and people
                could participate to various levels or not. To the
                extent they have a special role this will impact reputation.
        *   Choices
            *   There's much scope for variation in the performance
            *   A clan could also choose to try to take a bigger role
                or monopolize some aspect of the ritual
            *   A clan could also choose to try to influence the ritual
                in some direction they want that's not necessarily desired
                by all (e.g., militarists introducing war themes)

## Next steps

The general idea is to integrate these ideas into the existing models
as we go over them to integrate the new valence concepts as well. Key
principles are:

*   Try to give clans some sort of choice for practically everything
    they do
*   Figure out how each of the three main cooperation drivers for the
    interaction type influence that exact interaction. () indicates
    less impact there

    Dyadic               Collective
    -------------------  ------------------
    Kinship              
    Future               (Future)
    Reputation           Reputation
                         Imitation
                         Punishment

We'll start with food aid and care, because they're toward the top of
our general list, and they should be somewhat different, which will
help elucidate the space of variation. "General offenses" can always
happen so perhaps should also be treated early.

*   Food aid
    *   The basic idea would seem to be that if someone in good
        standing is hungry, and you have enough, you will share.
        *   What is "good standing"?
            *   It seems to have been typical to feed travelers and
                strangers, so apparently unknowns are generally in
                good standing (for this purpose).
                *   There's probably some sort of time limit.
            *   People might be taken out of good standing by:
                *   Refusing to give food aid when they should have
                    *   Subject to mistakes: maybe they didn't have
                        food to spare but others thought they did
                *   Previous norm violations
                *   Previous conflict
        *   If people don't have enough, sharing will be more limited,
            but still could exist
    *   Choices
        *   Any clan can declare need and ask for aid, whether they
            actually need any.
            *   => When a clan asks for aid, other clans may decide
                whether the request was justified or not.
            *   This might not be too big a deal at start.
        *   A clan asked for food aid can:
            *   Grant the request
            *   Refuse part or all, citing need
                *   Other clans will have to decide whether that was
                    justified.
            *   Refuse part or all, citing offenses
                *   Other clans will have to decide whether that was
                    justified.
            *   Demand services in exchange for the request
            *   Refuse, claiming no obligation
*   Care
    *   The prototypical interaction might be, "Can you take care of
        these children while I...?" This implies a stream of micro-
        interactions.
    *   The cost of defection can be very high!
    *   Choices:
        *   Reciprocate: Offer a certain amount of care help. Dial
            up or down to match counterparty.
        *   Generous: Offer somewhat more than counterparty.
        *   Mean: Offer somewhat less than counterparty.
        *   Careful: Put more work into care but this isn't necessarily
            that visible.
        *   Neglectful: Put less work into care but this isn't necessarily
            that visible.
    *   For this, it could be interesting to have somewhat separate clan
        relationships for men and women, or for different of these dyadic
        helping relationships.
*   "General offenses"
    *   It's always possible for someone to do something else others
        don't like, such as commit an act of violence, sorcery, or betrayal.
    *   Many of these are probably in some category of "mistake", where it
        doesn't meaningfully help the offender. (These can be quite intentional,
        the real point is it doesn't benefit the actor. This also includes
        cases where the "actor" didn't actually do anything wrong but was
        misperceived.)
    *   Conflicts over marriages, land, obligations, and trade goods could
        also lead to a party to the conflict taking an "illegal" action.
    *   Let's say clan A did something to clan B "by mistake", e.g., one
        young man seriously injuring another in a fight, with both claiming
        the other started it.
        *   Both clans might agree to forgive and move on, possibly with some
            gift exchange or ritual to mark
        *   Either clan could simply concede, offer some sort of terms, and
            then have various reputational effects (honesty but also weakness)
        *   The clans might agree to a "trial" of some sort, looking into
            details at some cost, with one or the other winning.
            *   A clan could resist judgment after trial.
        *   Either clan might engage in a campaign of gossip and bullying
            against the other.
    *   There obviously can be a zillion other conflict types with a zillion
        other details, but perhaps we can imagine that "anything that could
        end up as a court case (or HR meeting, *People's Court* episode, etc.)"
        might share certain features and thus can be modeled in the same way!
    *   Then this looks like Hawk-Dove but with levels and sublevels of what
        each side is willing to invest in the conflict:
        *   Fight
            *   Not literal war, but pursuing the conflict by whatever means
                they can get away with, including sorcery, gossip, sabotage,
                intimidation
            *   There could be a variable numerical level of investment
        *   Trial
            *   Norm-guided resolution looking into the details of what
                happened, impact on the community, ritual considerations, etc
            *   Less expensive than fight
            *   There could be a variable numerical level of investment, but
                given standardized community procedures that might not be
                highly relevant
        *   Bluff
            *   Demand what you want but concede if taken to trial
            *   There can be "Litigate" and "Negotiate" options between here
                and Trial
        *   Default
            *   Accept a default judgment per the situation if the other side
                agrees to. E.g., "let's drop it", weregild
        *   Concede
    *   What would streams of micro-interactions on this look like?
        *   Broken fences, mildly injured cows, insults
        *   Choices would be more like habits and customs and could be changed
            in real time.
            *   Mean - tending toward Fight
            *   Proud - demanding more for reasons ("Trial")
                *   we're more deserving
                *   you'd better
                *   what we're asking for is good for everyone
            *   Bold - demanding more but with low effort
            *   Normal - behaving in default fashion
            *   Diffident - tending to concede or avoid conflict
        *   Looks like a similar set of items applies as to a single
            conflict, with somewhat different texture and the ability
            to adjust in real time.
