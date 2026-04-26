# Relationships 3: Cooperation and Defection

At the moment we have a food insecurity model that allows connected 
clans to reduce each other's food insecurity. The main issue is that
nothing is happening yet: clans just have relationships with their
neighbors and get some bonuses.

One of the key reasons for that is that I induced that at the small
scale, it's generally important and favorable for clans to participate
in normal sharing relationships, so they just do. That may be mostly
true, but the problem is that it creates an entirely static world by
design. Instead, we should have some constant ferment where people
aren't entirely cooperative. Various forces can manage that, keeping
arrangements stable, but perhaps sometimes circumstances or secular
changes are enough to push them off track. Thus, some noncooperation
may help us model change down the line.

Note that this will be mainly about relationships that involve food
sharing and insurance for now.

Note also that our units are extended families, so that all these
interactions and relationships are across them, not within. The
relationships within of course have great texture of their own, but
we will assume they effectively operate by Communal Sharing.

## Structures of cooperation

Let's first look at the idea of cooperating for food security
game theoretically.

A small collection of groups could play tit-for-tat strategies with
each other, corresponding to Equality Matching. In addition, if
a partner defects, a group can tell everyone else. The others will
probably be more wary toward the defector for self-protection, but
they can also have several layers of motivation to punish:

*   They may be related to the complainant or otherwise motivated
    to help them (relatedness)
*   They may be internally motivated to be strong reciprocators -
    this can operate only if there is some identity factor to
    define whom is owed cooperation
*   Knowing that other groups are strong reciprocators, they'll
    punish to avoid being punished themselves
*   They may be motivated to maintain cooperative norms for their
    own future benefit - though as scale increases they expect their
    own behavior to matter less for the overall outcome

It seems that empirically, people have a hard time tracking another 
person/group and their activities in ledger-like detail (so as to
play a tit-for-tat strategy) for all that many entities. We may posit
that our groups can each track the proverbial 7 plus or minus 2,
with 10 likely being too many for accurate play.

Beyond that scale, and perhaps before it, since these relationships
are rather complex, individual tit for tat accounting gets inaccurate
and has missing data (from people not interacted with recently), so
people can shift to decide whether to cooperate based on the reputation
of their counterparty. That would presumably cause people to put more
effort into general reputation rather than just specific relationships.

## Structure of food sharing practices

### Mobile, dispersed people

Hunter-gatherers are often relatively dispersed. It seems that their
major instances of cross-extended family food sharing are:

*   Dyadic friendship relationships (that are more general than food
    sharing) between individuals and families. This would appear to
    be Equality Matching with some Communal Sharing characteristics.
*   Pay-it-forward gifts, where givers can acquire a reputation in
    the network and hope to receive aid later. This can be viewed as
    stochastic Communal Sharing.
*   Large-scale aggregations: mega-festivals and the like. These are
    probably not as relevant for food sharing for survival (though
    they still might matter -- c.f. modern holiday charity) but
    certainly were important, and involved food sharing.

In general, it's common to have a norm that you should give whatever
someone asks for. But people would try to find ways to get out of
giving sometimes, e.g., no, this coat is flea-infested, you don't 
want it. There's somewhat of an assumption that people ask for what
they need, but it's known the system isn't perfect and people will
sometimes over-ask. Note that people with a lot will be targeted with
more requests. 

Failure to perform as expected would typically be punished by shaming
and/or withdrawal of cooperation.

Another key point is that "production" often takes the form of a
big burst of hunting success, too much for one group to eat, so 
sharing and giving is all they really can do with it. They have an
inherent supply of free meat to give away.

### Small farming villages

Farming villages are more collected, but it seems there is
recognizable continuity from pre-settled patterns. People will
still call first on basically dyadic relationships with kin and
friends. With more proximity, they can also more easily call on
neighbors (perhaps in subtle ways of letting their suffering be
known), though this may be a weaker source of aid.

The bigger change may be from storable food. There is simply less
need for food insurance. Perhaps also less need for long-distance
relationships, creating somewhat more coherent local aggregates.

Also, stored food is less observable than hunting products brought
home today, and some amount of stored seed is needed for next year,
so there is much more ambiguity about how much actual "surplus"
people have.

Therefore, there can still be you-must-supply-when-asked norms,
but they won't have as much redistributive effect as in an
immediate-return economy. There can also be a somewhat subtle
shift from "if you have more than others, you must give" to
"if you have more than you need (to produce a comparable amount
to others), you must give", presumably brought about by groups
changing their behavior to that new norm. And there could be
a further shift to expecting groups to manage their own surplus
(perhaps when most are able to do so) most of the time. Those
changes could be enough to shift from something effectively like
local communal sharing to something effectively like equality
matching.

With farming, there is a new source of need, for extra labor around
harvest time, if people are sick, if there are too many children.
This can make people somewhat more interdependent again. Relationships
around that can be:

*   Barn-raising-type (CS)
*   Work feasts (EM?)
*   Matched labor events (EM)

## General implications for modeling

It appears that beyond the "clan" level, we have several types
of relationships in play:

*   Kin: Can be somewhat CS-like, but likely requires some EM-like
    reciprocation to really work
*   Friends: More EM-like
*   Neighbors: 
    *   These will be a lot more accessible when settled in villages
        (Neighbors are clan members in the model)
    *   Norms (strong reciprocity) will influence what is owed
    *   Typically less than kin and friends

Norms:

*   We could start with a strong "give when asked" norm, or perhaps
    "give when asked if you have more"
    *   This will automatically redistribute less with cereals,
        because (a) more can be stored (b) more can be hidden
*   Once they become at all dependent on agriculture, farmers
    will need seed corn. In theory they could ask others and
    get it when it's time, but maybe it won't be there. Once
    they expect this, they'll insist on keeping an adequate
    seed corn supply of their own, and expect others to do
    the same

## Specific implications for the models

### Relationships

*   Kin
    *   Allow good food security benefits for sharing between
        kin, similar to what we have for neighbors today
    *   We can probably assume neighbors who are kin are maintaining
        the relationship regularly
    *   For more distant kin, we probably have to have a
        "Regular Visits and Gifts" ongoing interaction for it
        to affect food security
*   Friends
    *   New relationship type, we don't have it yet
    *   Requires regular visits and gifts, similar to kin
    *   Here relatedness could be low, but:
        *   Part of the point of the relationship is to boost
            goodwill
        *   Tit for tat logic can hold it together
*   Neighbors
    *   wrt h-g products
        *   Strong sharing of produce and food security equalization
    *   wrt agricultural products
        *   No longer automatically give a large food security benefit
        *   Can give small benefit to represent spontaneous charity
        *   Can give somewhat larger benefit to represent recognition
            of need

### Alignment and structures:

*   If two clans had alignment 1.0, they would use Communal Sharing,
    and wouldn't even have any incentive to cheat (overask or withhold)
*   If they have high alignment, they can still use Communal Sharing,
    but there will be some cheating, detection of cheating, and arguing
    over cheating. One party or the other might consistently get the
    better deal, or not.
*   If base alignment is lower, Communal Sharing will only apply for
    things where the giving is cheap and the receiving dear.
    *   For friends and distant kin, tit for tat Equal Matching can
        sustain cooperation. However, there will be a relatively low
        limit for clans to track that. Remember that each clan has
        multiple families and understanding exactly how well the
        families of another clan have treated them all recently will
        be tricky.
    *   For neighbors, work parties and work feasts can provide some
        Equality Matching food sharing as well. In those cases, tracking
        is easier and/or there are immediate incentives.
    *   We'll expect neighbors will have a norm of at least not letting
        each other starve. This implies that when in need, clans can
        kind of just call on arbitrary neighbors, without having a
        defined relationship. But this requires an understanding that the 
        needy group is in the set of people who are owed help:
            *   Kin
            *   Friend/alliance partners who have been cooperating
            *   Neighbors personally known OR people with a recognizable
                identity in common with a good reputation as strong
                reciprocators

### Tuning

*   We should set it so that food sharing relationships are crucial
    for long-term success hunting and gathering
    *   Require some amount of friendships for them to have enough
*   With agriculture, technically, cooperative relationships become
    less important as protection against interruptions, but more
    important for enabling productivity (esp harvest help)
    *   At first we could just keep food sharing as important as
        before, but ultimately it'll be important to see productivity
        differentials affected by this stuff

## Model changes to make:

x   For the current primary food security benefit, count only defined
    relationships: kin and friends
*   Add friends relationship. With hunter-gatherers that can be quite
    fluid; for farming it will usually be with co-villagers
    x   Initially seed some random local relationships
    *   Show allies count in the summary UI
    *   Friends relationships requires gifts and visits
    *   Extend kin relationships to also take effect when distant with
        gifts and visits
    *   Extend friends relationships to take effect when distant
    *   Some sort of distance cost, but maybe low for mobile people
    x   Limit on the number of gifts-and-visits relationships that can
        be maintained, partially from time taken, partially from ability
        to correctly track and agree on whether they're keeping up their
        end
    *   Add option to make friends relationships more permanent, but
        this is predicated on clans being more stable
    *   Extend food security help to take place across settlements
*   Somehow add marriage ties and have those work sort of like friends
*   Make marriage and friends not add up too much in alignment as there
    would probably be some overlap in the relationship
*   Make goodwill have some impact on effectiveness and fairness of
    food sharing relationships
*   Implement neighbor sharing norm, with choices:
    *   A Who has more must give
    *   B Who has more than they need must give
*   Make norm A the starting point
    *   Make this equalize h-g goods consumption
    *   Make this have a great effect for food security
    *   Make this make it hard to get enough seed corn to plant a whole
        farm
        *   Early, perhaps allow some harvesting of wild barley without
            needing seed corn, but that should have a low total limit
        *   And technically, if no one else is in need that much, it
            wouldn't be much of an issue
*   Give clans the option to cheat more or less in following food sharing
    norms, but we have to think about what that means over 20-year turns.
    *   The key is that clan moves aren't just "be generous", they have
        to specify what they'll do based on the other clan's apparent move.
    *   Let's say the initial choice is between "generous" (give some baseline
        X amount) and "selfish" (give some lower amount Y)
    *   What can a clan do based on what the other clan does:
        *   Match behavior: switch to whatever the other clan is doing
            *   What happens if both clans match? Apparently we need sub-moves
                to lead with generosity or selfishness; if both lead the same
                we have our answer, otherwise there's a recursive choice! But
                we should probably either say then it's random, or they both
                end up selfish.
        *   Match defection only: switch to selfish if the other clan does,
            but otherwise stay generous
        *   Punish defection: greatly reduce or entirely withhold cooperation
        *   Alternatively or additionally, these behavior choices could go by
            reputation
*   Give clans the ability to switch their behavior to norm B
    *   Goodwill/reputation penalty for following different norms
    *   Lower food security benefit
    *   Still could have some impediment to having enough for yourself!
    *   We could in fact assume that hunting and gathering products are
        still typically shared as they're not storable
*   Switch the cooperation benefit for farmers back to favoring productivity
    *   Will still want some food security benefits
    *   But more about work parties/work feasts to enable big harvests
    *   Implies no point in getting farming ratio that high until have this
    *   If we assume it takes 5x the population to bring in the harvest,
        then farming ratio can go to 0.2 without practices like this
    *   For now, let's go with work feasts, with the idea that some clan
        that wants to increase its farming ratio may hit on that idea
        (not sure how obvious it is or isn't)

