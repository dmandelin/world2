There are plenty of rough spots, but recently improved 
systems are working tolerably well, all the way to the point
of reasonable village fission behavior. Time to take a step
back to think about what needs filling in on what's there
now and what to do next.

Existing systems that need further brushing up:

*   "Status"
*   Marriage appeal
*   Food security
*   Infrastructure (ditching)

And coming up soon:

*   Ritual and risk
*   Trade

Overall themes are:

*   clan decision-making, especially based on perceptions 
    of each other
*   risk

# Activity Distribution and Production Variations

Check that the activity distributions have enough leisure
compared to historical values.

*   Total time on farming + crafts is probably not more than
    30-50%.
    *   This might even include a lot of care, with babies
        hanging out during craft and home work.
*   Leisure time is probably 30-40%. This can include rest,
    socializing, and certain kinds of crafting.
*   Festivals, rituals, and the like might be 20-30%.

Values vary greatly by society, so the above values are very
mushy, but we should at least make sure that (a) things aren't
too far off and (b) there is plenty of leisure at the start.

Also check that farming productivity coefficient of variation
comes out somewhere around 0.3.

# Status and Marriage Appeal

There seems not to be much of an "overall" status value in
our original setting, but there are some key dimensions:

*   Marriage appeal
*   "Help appeal" - how much other clans will be willing to
    help out in time of need
*   "Headman" status as a voluntary consensual leader

Help appeal seems to be mostly about alignment plus ability
to help, a broad version involving consensus via gossip. This
can look similar to marriage appeal, but applied to other types
of relationships and interactions. If applied to ordinary
interaction, those might there effectively combined to a
"displayed in-person status" value.

Items:

x   Make sure new marriage appeal is being applied in matching
x   Visualize level of marriage success for a clan
x   Fertility bonus for higher marriage appeal due to earlier
    marriages
*   BasicInteraction: track appeal/respect, and use that to
    apply differential stress effects and roll up a ranking
    *   TODO - work up how this will work
*   MutualAid: track appeal, that will then influence who gets
    more and better matches
*   Disaster aid: track appeal, use to decide how much aid to
    send

*   Alignment: have clans influence each others' perceptions
*   Information: make sure information level is accounted for
    in other perceptions
    *   have clans transmit information to each other

# Food Security

## Hunter-Gatherers vs Early Farmers

It appears that hunter-gatherers often face hunger, but seldom
famine. They use diverse food sources and move around as needed,
so they can usually find something. But there is often a "hungry
season" of the year with less food (but enough to live on) and
there can sometimes be local scarcity. Given their immediate-
return economy, the usual response is to call on friends, neighbors,
and kin and ask to live in their territory for a while. The group
may disperse somewhat, with different families going to different
other groups. Note also that hunter-gatherer can and do store
food, although especially at higher latitudes where seasons are
more variable. Note also also that hunter-gatherers often have a
positive policy of keeping few possessions, since mobility is so
crucial.

Early farmers could perhaps achieve better food security if
they worked at it, but to start, they had more problems. First,
the harvest happens only one or two times of they year. Also,
they can have a bad harvest, and they probably won't know they're
going to have a bad harvest in advance. Therefore, their normal
practice should be to cultivate fields enough to feed them even
in bad years and/or store food from good years. As a result,
they'll typically try to grow rather more food than they need
(assuming median yields), typically producing 110-250% of their
needs, perhaps on average around 140%. Thus, when there isn't a
bad year, they'll have some left over, which can be used for
other purposes such as a large celebration (which might even be
delayed until a good year) or for work feasts for some project
such as a new building. Note that early storage was probably not
that reliable, which would also have to be accounted for.

## Social vs Physical Distance

People certainly looked for local help, but also wanted to cultivate
longer-distance relationships in case their entire local area had a
bad year -- there's a tradeoff between trust/transport risks and
area risks. In particular, insurance relationships must be "kept
warm" to be reliable, which will be more costly with distance.

## Levels of Reciprocity

There is a classic model with generalized, balanced, and negative
reciprocity, which I think we can model with `r`.

### Background

Typical scales of reciprocity based on physical and social distance
are something like:

*   Clan/Household: Generalized
*   Kin: More generalized than balanced
*   Village neighbors: More balanced than generalized
*   Related villages: Balanced
*   Unrelated villages: Negative

We should slice things so they come out something like this, but
we don't have to exactly match.

### Affinity

Let's codify the concept of "relatedness" by "similarity" as
r_0 := "affinity". This is not necessarily genetic or any other
kind of relatedness: it's how similar clan A considers clan B
to itself, based on whatever parameters are most culturally
relevant.

Scale is an issue yet to be worked out. If this is supposed to
work as an `r` value in inclusive fitness theory, it could be
scaled so that r_0 = 0 for an average other clan. But it might
be better to start unscaled, and do that at a later step.

### Utility Functions

Applying `r` values is convenient if we have utility functions.
Some general ideas on what we can do there:

*   log(demographics) as starting point
    *   People aren't necessarily psychologically indexing on 
        this, but their actual decisions may roughly match it.
    *   This could be modeled by using log(demographic effect)
        for various individual features.
*   Add in other psychological factors
*   Add in `r` times partner utilities
*   Add penalty for conflict/losses from other clans

### Initial Inter-Clan Helping I: Survival Aid

At the village level, reciprocity is more balanced, but for
keeping neighbors alive, it's more generalized. In general,
we can expect:

*   Clans with more will share out to clans with less, enough
    to get them to a local "good enough" level, perhaps the
    -1SD local recent historical consumption level
    *   Clans that don't even have good enough usually won't
        share: sharing breaks down under extreme scarcity
    *   However, a certain amount of theft would also be 
        tolerated
*   Clans receiving aid reciprocate in *some* way, but not
    necessarily to the same amount. This could be some sort
    of favors, deference, or labor help.
*   Sharing is "haphazard", with various families calling on
    each other at various times.
*   With kin, sharing is more (but not completely) generalized.
    A simple way to model this might be to consider a somewhat
    higher "good enough" level.
*   We can probably also use utility functions to have givers
    give until marginal utility is 0
*   Sharing can be reduced or cut off in case of conflict

### Initial Inter-Clan Helping II: Favors and Gifts

For less critical things than food (and usually for land and
crafted goods), local relationships look more like balanced
reciprocity. We can still expect some free gift exchange, and
not expecting values to match up exactly.

The current model might have most of the features needed here.
This kind of helping should also increase alignment, and in
fact, that might be the primary benefit of this exchange.

## Reciprocity or Gift? (TODO - Update per above)

Apparently stored food is generally considered family property,
but cooked food is expected to be shared. Related to this, in
some places, early on kitchens were outside among dwellings, but
later on inside, perhaps reflecting a change to cooked food also
being mostly cooked for and consumed by the family.

It also seems that in cases of bad harvest due to weather and the
like, people didn't necessarily expect direct reciprocity, but
instead gave minimal survival help. They'd hope for return favors
later, but they'd probably also tolerate some long-term resource
flow outward, especially to help keep alive people they're going
to depend on for certain things.

However, those points wouldn't necessarily apply at long distance
or in times of general local scarcity. In those situations, people
might trade tokens for food, such as fine pottery. Exactly what
that meant is unclear: it appears to be somewhat money-like, but
it also seems that these were somewhat symbols of prestige, along
the lines of, if my family has hard times today but some fine
pottery we can still give as "gifts", so it's perhaps a costly
signal of the fact we're basically successful and useful and could
be good partners tomorrow when we recover. Exactly how these
exchanges are structured varies by society, so that in some cases
it looks much like sales, other times gifts, possibly other more
complicated arrangements.

Payback is less expected or demanded from kin, as predicted by
evolutionary theory.

Demand sharing and theft both rise when there are lots of changes
of people, so that reciprocity can't be tracked.

Emergent chiefs might be seen somewhat as fathers to the whole
group, expected to be generous to all.

## Norms vs Motivations

It appears that in these types of societies, people were more or less
out for their own families (and other relatives, to lesser extents),
but were constrained by highly prosocial norms, resulting in a lot
of covert struggle. For example, it might be expected that if a
cousin shows up, you give them food or beer; but someone might hide
their beer and fail to cook and food and then claim they have none.
People could also act apparently "generously" for "selfish" reasons,
such as supporting a neer-do-well family because maybe they or their
children will be good allies someday: you never know. These forces
are typically strong enough to keep people acting cooperatively, but
exceptions do occur.

## Previous Notes

Let's start with a model something like this:

*   Distribution of annual crises of varying severity,
    with perhaps about 3 minor and 1 major crisis per
    clan per turn, with some correlation
    *   Minor means something like 30-50% of harvest lost
        one year
    *   Major means something like 80%+ of harvest lost
        for 1-3 years
    *   Note that these values assume all agriculture,
        have to scale them
*   Umitigated, a minor crisis results in ~8% deaths by
    malnutrition, major ~24%
*   Food storage can mitigate crisis by direct replacement
*   Other clans can mitigate by giving from their storage
    or consumption

Basic assistance model is credit-debit:

*   If a clan decides to give help, they track a debt.
    Initially this will be just memory.
*   Clans will help out only if they think they'll
    actually be able to get something someday
*   Make sure alignment and trust influence results
    and are influenced by them

# Infrastructure

The idea with ditching is that clans can ditch their own
fields, but it's much more efficient to ditch together.
Set it so that clans would struggle to build level 2 ditches
alone but can do level 1.

We could also skip the above and subsume individual ditches
into base productivity.

The more important part is how people end up doing the work.
We'll assume that at the start they have the idea of taking
turns, in a system that scales up to around Dunbar's number
and would have them largely complying. But there will be a
certain amount of mistakes and disagreements, leading to
increased conflict with scale. We can also give clans the
option for how hard to work, or to lead others.

# Ritual and Risk

Let's give clans a perception for how much they see each
other (and themselves) as a ritual authority (= someone
particularly worth going to on ritual matters). The bases
of ritual authority are signals and results:

*   Costly signals. At this point, that might be just extra
    big sacrifice feasts, but later will include special
    dress, buildings, complex rituals, and so on.
*   Results. When someone does a ritual, later events will
    show whether it was effective or not, and their authority
    will rise or fall.

Things a clan might do regarding a clan they see as a ritual
authority:

*   Bring them gifts in gratitude for successful rituals
    conducted
*   Bring things to sacrifice
*   Ask them for ritual services, offering marriages, gifts,
    favors, and positive perceptions in exchange

Items:

*   Give clans the option to conduct special rituals, which
    will cause their authority to rise OR fall
*   If clans conduct their own rituals, their authority will
    stay, but if they don't, it will fall
*   Give clans options for how much to invest in their rituals
*   Have clans give gifts for successful rituals, also
    positive perceptions (and maybe something around stress
    for favors)

Looking ahead, clans that are widespread religious authorities
will have to start getting new problems or opportunities of
scale.

# Trade

Need to get access to flint in there soon. It's been hard
to decide how to handle, but for now, let's assume only
small quantities are needed, and can usually be satisfied
by down-the-line trade. Then we can give extra options to
send out trade missions if local options aren't enough.