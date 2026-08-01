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

Rough order to build:

*   "Status"
    *   Base on generosity/holiness
    *   +Marriage appeal
    *   +Save first in crisis
        *   Implies we have some way of detecting a crisis
            *   ~general food shortfall in settlement
            *   display in UI
            *   also have mechanics for alignment/rituals
*   Marriage appeal - mostly should be there
    *   Verify uses the right piece from "status"
*   Food security and help
    *   Standard food redistribution
        *   Prevent starvation
        *   Alter status and affiliation
    *   Crop failure model (though we might be able to get
        by with dependency ratios as source of difference
        for now)

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

### Reciprocity: General Dynamics

Let's consider different structures of social life and how
they may evolve in a system like this.

Within clans, we imagine:

*   Generalized reciprocity: People are closely related, and also
    depend on each other; they share fairly freely, but not
    absolutely
*   Low cost: Everything goes into a bin, and people take what
    they need

Between local clans, in theory they could use the same system, but it
appears it usually doesn't work quite like that. The precise causes
are unclear, but there is less relatedness and less interaction,
so lower levels of `r` and trust. Instead, there appears to be a
mix of generalized and balanced reciprocity:

*   Generalized reciprocity in keeping people alive: Everyone needs 
    major insurance, and each other. At small scale, this seems to
    be dyadic -- larger stores came later
*   Balanced reciprocity in other things such as land and luxuries

The dyadic interactions have implications:

*   N^2/2 links (where N is the number of clans) to maintain. Trust
    isn't free, so that does cost something.
    *   Note that these links also help keep the peace, so there's
        demand for them beyond the actual trade benefits

In terms of alignment, it seems that at this point people are scored
highly based on what they give away. Norms DO NOT allow that to be
converted in dominance, but it does make the giver more of a target
for gifts and help when needed, and probably as a marriage partner
too. This also already allows for a little asymmetry, where some are
giving somehow better or more high-status benefits away than others.

Keep in mind that at this particular point, there isn't necessarily
that much to acquire, so it's natural to give away extra food for
social credit. Even artifacts might be of limited use to one person,
so more value is ultimately gained by sharing it around rather than
keeping it at home. This would apply to objects not used that often,
but may not apply to daily-use tools.

The next conceptual step would be the "big man", alluded to above as
the person giving away stuff. In general, this starts to become more
significant like this:

*   The big man attracts "followers", families and individuals from
    other clans who owe the big man favors and/or depend on him for
    favors
    *   The notion here seems to be dependency: there are somehow
        people who are not doing that great under the mutual reciprocity
        system.
        *   One hypothetical way to not do as well would be to not
            have enough special or luxury goods, but we posit that
            in the early days that was *mostly* not yet much of a
            factor. But later it could be very much, and perhaps now
            for stone tools or fine pottery.
        *   If the village is growing, maybe relationships are breaking
            down somewhat and someone doesn't have enough partners
        *   Could also be relevant for creating more cross-village
            exchange
        *   If the big man is just generating a lot more surplus than
            usual, he may top up followers to a higher level than 
            "not starving".
    *   Followers then offer deference, labor help, and gifts (e.g.,
        of specialized items they randomly acquired)
    *   This interation boosts alignment on both sides.
*   The big man hosts big community events. This then creates an
    interaction not just dyadically between big man and followers,
    but between big man and the community as a whole
    *   The prototype is big feasts.
    *   There can be varying levels of competition over how big and
        impressive the feasts are.
    *   This would have an especially large influence on fame: how many
        people know of the big man, which presumably starts mattering
        more once communities are big enough that not everyone knows
        everyone.
    *   This should also influence mutual alignment and identity of
        attendees
*   The big man changes how disputes work
    *   Followers should generally respond dovishly to conflicts with
        their big man
    *   The big man can arbitrate between followers (or two big men
        on a conflict between their followers)
    *   The big man would generally have more power to win disputes,
        but this depends on norms and the type of dispute

"Economic" factors:

*   Relationship costs
    *   N followers and a big man need only N+1 links; at 4 clans this
        is about equal to the equal matching system, but beyond that
        the big-man relationship becomes cheaper
*   Demand for big men
    *   As provider of public goods
        *   Can do projects (stores, canals) with economies of scale
            solving coordination problems more cheaply than equal-matching
            communities
        *   Can solve certain disputes more directly
    *   As individual (or clan) patron
        *   Similar services and benefits to equal neighbor relationships,
            but:
            *   Big man might be available when neighbors are not
            *   Big man more likely to have actual resources when needed
            *   Big man might provide more/better help/gifts
*   Supply of big men
    *   The literature seems to attribute this to personality.
    *   In general, we expect that having a few big men could be functional,
        but if everyone is trying to be a big man, there is probably way too
        much conflict and way too little actual work. There needs to be some
        dynamic ratio control. In more formal systems, that could be via
        elections, royal status, or something. But here we basically have
        self-appointed leaders, so it makes sense to posit that it is indeed
        a personality trait (set) representing a game-theoretic strategy.
    *   We still need an explanation for what the big men get out of this,
        which we can probably learn more about in the literature, but I
        doubt it's that wrong to assume:
        *   More marriages
        *   Better marriages
        *   Higher appeal for other positive relationships and interactions
            *   In particular, for being saved in case of disaster. In more
                fixed chiefly systems, it seems the chiefs are seen as holier
                and thus needing to be protected most, but that doesn't apply
                yet. Perhaps the idea is that not everyone is qualified to
                be a big man, and they're the rare factor in "production",
                so as long as society is big enough to need them, it's more
                important to keep them around on an individual level
*   Demand for big-man clients
    *   Somewhat obvious, the whole point is to win fame and cooperation
    *   Clients would provide many benefits, as usual a combined package
        per culture, but typically involving deference, labor, gifts, help
        in disputes, and any sort of positive scaling
*   Supply of big-man clients
    *   Most people like autonomy enough not to be followers if they don't
        think they need to, so followers would start as people in need
    *   Big-man feasts and gifts are trickier: clans adhering to egalitarian
        norms might reject them; the notion is perhaps that if there is a
        core of followers picking up benefits, then others may start joining
        in to keep up. Also, the followers' positive opinion of the big men
        would rub off.

But now we have the question of, does this "big man" concept developed for
other places and times have any applicability for our setting? That can be
researched further, but meanwhile, a few ideas. The south seems to have had
a more collective (as opposed to individual) elite, so we might have less
of a "big man" and more of a council, performing somewhat similar functions.
It seems first "temples" may have been sponsored by multiple families, in
similar fashion. The last vague point is that emerging elites seemed to deal
mostly in cereals. What might have been going on?

One role of emerging village elites could be managing storage infrastructure
and pooling, with benefits such as:

*   Management of conflict over sharing
*   More reliable storage
*   Storage more accessible to dole out on demand or for special projects

If so, that could be part of an explanation for why a more collective
structure. But what's the "personality" here? Even with individual self-
aggrandizement perhaps not the main thing, clan pride still could be.
In our setting, this does also seem to be linked to religion, so perhaps
religious motivation is a key differentiator. We can also link the two
by positing that clans that grow more food are seen as holier.

Overall, it seems reasonable to have individual clans be "big clans".
This can be a personality trait, but with clans that happen to have
more markers of divine favor (whatever they may be), they will be more
likely to try to be a "big clan". Big clans then provide a set of services:

*   Help for those not having access to help otherwise
*   Better help
*   Public goods and services such as cereal banks, rituals, religious
    structures, and infrastructure
*   Dispute mediation

Qs:

*   Evolutionary benefits to headmen/big men
*   Staple finance background


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