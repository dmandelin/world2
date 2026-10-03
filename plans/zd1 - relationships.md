The improved conversation model is giving some more notion
of relationships and information flow, but the question comes
up, what kinds of asymmetry should there be, and how do we
model them?

In particular, it seems that empirically, there is often a
lot of inequality in how much different people are listened
to, perhaps often being something like a Pareto distribution.
In this way we would have actual differentiation, even before
having any differential economic production - purely on
relationships.

For this to make any sense, relationships have to have
significant benefits, otherwise there would be no reason
to bother differentiating. These can include:

*   Help during conflicts
    *   This implies we need to understand conflicts well
    *   This also implies a rank ordering by each clan, so
        it knows whom to support when two allies conflict
    *   A clan having really good fortune may attract envy.
        Other clans may accuse them of sorcery or take other
        hostile actions.
    *   Daily life example: Disagreements in a community
        organization or workplace can always happen, even with
        good intentions by all. More friends means a better
        chance of getting your way.
*   Help during hard times
    *   When times are hard enough, normal reciprocal aid
        will dry up, but aid might still flow on closer
        connections
    *   So there should be a motivation to have closer
        relationships for this reason too
    *   Scapegoating: During hard times, clans may seek
        someone to blame - want friends so as not to end up
        on the list
    *   Daily life example: It's one thing to have people
        who will babysit on schedule from time to time, but
        what about knowing there's coverage even if you're
        seriously injured? Only a close friend will do.
*   Attention
    *   Attention boosts influence: more/better people
        paying attention to you
        *   Daily life example: At work, if you get more of
            a chance to get heard, you can get more of your
            ideas out and more chances to elicit help.
    *   Attention boosts prestige: There's a difference
        between being respected and everyone knowing everyone
        respects you.
    *   Attention brings opportunities: for marriage partners,
        business partners, aid requests, and more.
*   Information
    *   Relationships transfer many kinds of information, as
        previously discussed.

Clans will also need ways to try influence their standing with
each other:

*   Unique value
    *   Makes for a more secure relationship
    *   Can include factors such as special knowledge, skills,
        or resources, but also a deeply textured relationship
        (in-jokes, special rituals)
*   Gifts
    *   Non-unique value that makes the relationship more
        worthwhile
*   Brokering
    *   A type of service, can also provide unique value
*   Costly signaling
    *   To show they have qualities making them a worthy partner
*   Micro-signaling
    *   Deference, imitating dress, etc.

We'll also want some standings we can call out in the UI:

*   "The Leader"
    *   Is there one clan or elder who all would agree is the
        most influential?
*   "The Elite"
    *   Is there a subgroup seen to be the most prestigious and
        well-known?
*   "The Rejects"
    *   Are there any clans that have few enough relationships
        that they're really suffering, like losing out in too
        many conflicts or not getting many marriage partners?

## Conflicts

Conflicts could be over things such as:

*   Upstream/downstream water issues
*   Infrastructure maintenance and free-riding
*   Damage by livestock
*   Livestock ownership and inheritance
*   Shifting land boundaries
*   Accusations of sorcery (may be prompted by good fortune)
*   Marriage and family conflicts
*   Insults, arguments, and fights

## Special Issues

### Food Aid Tiers

Currently, food aid is fairly undifferentiated, mainly based on
need, with 0.8 per capita being the average breakpoint. However,
it seems it would be important for people to have some extra-
close allies so that in hard times, when maybe people are more
reluctant than usual to share, there's still someone to go to.
Also, in general we don't have real choices for clans here, which
is not the recent spirit.

Let's first think of it as an abstract game. In the simple version,
each turn each clan is paired up with another and can ask for aid.
The other clan can then grant all, some, or none of the request.

*   Non-Iterated Version: Clans don't have any memory of whom
    they're paired up with.
    *   In the limit, clans have no knowledge at all, nothing on
        which to base any decision, and defection would be Nash.
        So that generally won't be the situation.
    *   One step back, we could imagine clans able to recognize
        (long-lost?) relatives without knowing anything else about
        them. But for the most part identity would be via the
        social graph so this wouldn't apply much.
    *   Not exactly a revelation, but it would seem that mainly
        only the iterated version is relevant.

*   Iterated Version: Clans have memory and gossip on each other.
    *   Let's make the game a bit more specific. Does it look like
        a prisoners' dilemma or what?
        *   Basics
            *   The asker has a possible hidden variable "need",
                which can be 0 or 1.
            *   The asker can ask for 0 or 1.
            *   If the asker asks for 1, the giver can give 0 or 1.
        *   Situation
            *   Let's consider the situation with the hidden variable
                but before any moves to be the baseline, and then
                characterize payoffs of moves relative to that
            *   Getting aid is less valuable if need is zero; value
                of aid is B1 if in need, B0 otherwise
            *   Giving aid is a little more costly than getting it
                is helpful; cost of aid -C where B1 > C > B0
            *   Or something like that; we can rearrange the math
                a bit as convenient
        *   Payoffs (need, asker, giver; asker, giver)
            *   0CC: 0, 0
            *   0CD: 0, 0
            *   0DC: B0, -C
            *   0DD: 0, 0
            *   1CC: B1, -C
            *   1CD: 0, 0
            *   1DC: B1, -C
            *   1DD: 0, 0
        *   Comments
            *   Apparently, if B1 vs -C "trades" generally go through,
                clans benefit, though this would depend somewhat on
                distribution of the need parameter.
            *   B0 vs -C "trades" tend to make clans on average worse
                off.
            *   If clans can perfectly observe each others' need, then
                they could play a strategy of giving only if the partner
                is in need...but is that enough?
                *   No! They'd be invaded by defectors. Defectors would
                    always ask, they'd get aid as often as anyone else,
                    and they'd never give help!
                *   They need some way of detecting defectors. They can
                    on the need side in this scenario, but not for
                    defectors who don't give those in good standing. In
                    theory, we might also want to withhold from those
                    who cooperate with defectors, but the tracking gets
                    complicated.
            *   What if clans have no knowledge of each others' need,
                before or after events?
                *   Defectors who always ask for aid could invade, but
                    realistically clans might infer they're asking too
                    much simply from the pattern of requests
                *   Instead it would be defectors who ask for as much
                    aid as is plausible. (Compare to behavior of clients
                    of hands-off bureaucracies.)
                *   It seems there's a version of TFT that could maybe
                    invade that, where we track equal payoffs to each
                    other.
            *   Intermediate case: clans have some idea of each others'
                need level
                *   Givers can guess if the askers are actually in need,
                    but sometimes get it wrong
                    *   They may give when not in need, giving rise to
                        more defection up to the plausible limit
                    *   They may refuse valid requests, which the askers
                        and possibly others might not like
                *   Still have to watch out for defectors who don't give

*   Extending to N players I: multiple givers
    *   In general, a clan can ask any or all other clans for help
    *   Figuring out how clans respond to all those requests would be
        extremely complicated, but we can say:
        *   In our initial setting, families are asking for help from
            specific other families, so we could have a notion of reach
        *   In general, it seems people may basically be willing to
            help someone else (excluding "hard times") if they're in
            good standing in an identifiable system of reciprocity
        *   So here, clans might be expected to distribute their aid
            requests in more or less a certain way and be denied if
            asking some source for more than that (in a way that they
            can notice, which might not apply at first)

*   "Hard times"
    *   What happens when everyone is short? First, let's think about
        the general logic here.
        *   Let's assume some sort of log utility function, so that
            the marginal utility of food F is 1/F, or a similar function.
        *   Let's say the clan that's richer this year has R, the clan
            that's poorer has P < R.
        *   Then the utility of a small transfer r to clan_R is
               r/P - 1/R = (rR - P) / RP
        *   The transfer is wanted if r > P/R
            *   Example value of r: 0.8/1.2 = 0.67
            *   Example 2: 0.5/2.0 = 0.25
            *   In a reciprocity system, r is the probability the
                relationship will continue, so both of these could
                be well supported
            *   Kinship will also influence this, though exactly how
                relatedness should be computed is unclear.
    *   Maybe now everybody is hard up: what does that look like?
        *   Maybe we're in a 0.8 vs 0.6 situation for getting help,
            or 0.7 vs 0.3. Note that those would seem to still readily
            support transfers.
        *   Would cooperation break down in hard times generally? It's
            not clear it would, because people could very well want to
            keep an insurance system running in that case
            *   What might happen:
                *   More temptation to defect this year since the
                    immediate reward is larger
                *   Might have higher expectation of partners dying out
                *   There's also the situation where there really isn't
                    enough, e.g., all starve if sharing equally but not
                    otherwise
                    *   And this brings up the possibility that some
                        clan has extra food, but not enough to meangingfully
                        help everyone. We're starting to see features we
                        need.
                    *   This also implies that at the low end the utility
                        function doesn't necessarily look like a log.

In some ways all that was just a reiteration of basic concepts of
trust and iterated reciprocity, but it can help go over concepts
from different directions. Key points we have now:

*   There are various "relations of reciprocity" with requirements
    to remain in good standing
    *   Clans MAY grant good standing to new partners, but that
        will depend on how much risk that presents and their options
        for verifying
        *   Similar for clans very little is known about
    *   If clan A knows clan B violated the requirements, then clan
        A takes B out of good standing (but may restore later)
*   We can then have different relations for different tiers, or
    different levels within a relation type.
*   Kinship could be used to create tiers or bonus effects
*   We'll need to give clans options to defect, e.g. by accident
*   We'll need to have ways for more defection-oriented clans to
    invade
*   Need ways to navigate how successful clans are in navigating
    aid situations

TODOs:

*   Define the relations of reciprocity: neighbors, friends, family,
    "goodness"
*   Define key changes from current model

## Items

Ensure meaningful effects of relationships for:

*   Help
    *   (P1) Survival
        *   TODO - work out different tiers of support level
        *   TODO - experiment to verify effects
    *   (P1) Conflicts
        *   TODO - work out micro-interactions/psychosocial stress
        *   TODO - work out marriage default conflict
        *   TODO - experiment to verify effects
    *   Recruiting people for projects (work feasts etc)
        (Probably also prestige - want to know others are coming)
*   Information
    *   Both
        *   (P1) Marriages
            *   TODO - fix marriage model overall to work with
                single-year turns
            *   TODO - work out model where more connection means
                information about prospective partners flows faster
                and trust is higher
            *   TODO - experiment to verify effects
    *   Incoming
        *   Information on other clans, including possible threats
        *   Trade opportunities
        *   Choice information
        *   Skill learning
    *   Outgoing
        *   Prestige
        *   Influence on dispute resolution, land/water allocation,
            collective labor supply organization, migrations

Show standings:

*   Leader
*   Elite
*   Rejects

Allow influencing of relationships

*   Unique value
    *   Named skills/knowledge/relationships
    *   Micro-interactional
*   Gifts
    *   Food, objects, labor
    *   Bridewealth
*   Costly signaling
    *   Gifts
    *   Dress
    *   Edifices
*   Affiliational micro-signaling

Key conflicts

*   Marriage default (including bridewealth)
*   Land and water
*   Livestock damage