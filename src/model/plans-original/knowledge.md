# Knowledge

## Questions

x   How much do people know about (their|others) (traits|skill|effectiveness)?
x   How do people decide which innovations to keep?
x   How do things change with scale?
    *   More on how this affects communal production
    *   More on disputes and alignment
x   What's the real deal with each of our prestige inputs?

## Skill and practices

### Discrete practices

Discrete practices are major steps such as "live in a tripartite house" or 
"use ophidian figurines in key rituals". These practices will have various
effects, but clans won't always know all the effects.

The most basic effect is on QoL, e.g., comfort and health vs maintenance
costs for a house, or nutrition from focusing more on farming. Clans may
know some of the QoL effects but not all, so if they're to sync up on good
practices in the long term, they'll need to be able to learn.

The model will abstract this away, but conceptually there's an internal
structure to clans and how they interact with social change:

*   (1%) An occasional innovator who can make radically different choices 
    from the past. 
    *   They could be analytical (within the scope of tools at the time) or
        in thrall to a vision.
    *   They can't change much on their own unless they are the leader of a
        high-control clan.
*   (15%) A few adult advocates who are open to different choices.
    *   They could be highly analytical, but more often they are more open
        to the ideas of innovators than most.
    *   They can't really change things on their own either, but they may
        have a pretty good chance of ultimately persuading the group by
        getting a few people on board and snowballing.
*   (70%) Regular clanspeople. They vary quite a bit, some being almost
    like the neighboring categories.
    *   They mostly copy others, but will notice gross differences between
        promises and reality, and sometimes do things differently.
    *   When they change, the clan has adopted the practice.
*   (14%) Stubborn clanspeople who resist change even when most have flipped.
    *   Apparently they stick with what they're doing, on certain issues,
        at least. They may pick up something new once it's been really proved.
    *   They provide a seed helping change back if needed.

The model will look like this:

*   Triggering: For a clan to consider a change, either the situation has to
    call for it (e.g., not enough food prompting farming change) or they have
    to have an innovator (small random chance).
*   Appeal: The appeal of a choice is an Elo rating for whether to take the
    choice. Appeal comes from multiple sources:
    *   10-50% estimation: Advocates in the clan as well as others to some
        extent, **and neighboring clans considering the same choice** will use 
        their knowledge to estimate QoL and other effects, which convert 
        directly to appeal. We can assume this indicates small numbers of 
        people trying out the change a bit, discussion among clans, etc. They 
        won't have measurements yet.
        *   A bigger community (in and out of the clan) may make better estimates.
        *   Clans may gain more knowledge about how well something works by
            trying, but note they may also lose knowledge about previous
            practices.
    *   50-90% imitation: Most clanspeople, including advocates and innovators 
        to some extent, base the appeal on how much appeal others seem to assign.
        If people talk a lot, they may have a pretty good idea what appeal others
        assign. In other cases, they might have to go on behavior, in which
        case we convert the % of influence taking the choice to an Elo rating to
        get appeal.
        *   Imitation vs estimation % depends on the personality of the clan,
            the culture of the clan, the clan's confidence in its estimation,
            and the influence of estimators in the clan.
    *   Base: There's also a base appeal (which could depend on culture) and
        other such factors that's mainly about honey vs vinegar. It would apply
        to both estimation and imitation, but could be different for the two.
    *   Prestige effects: Both estimated appeal and imitated appeal will take
        into account prestige effect of the choice, as that's a social factor
        that imitation processes better.
    *   Matching effects: Both kinds will also generally be able to account 
        for matching effects, though they might not always be fully aware.
        When matching effects are significant, clans may be able to make a
        choice atomically.
    *   Idiosyncratic: Appeal can vary due to per-clan reasons. The clan that
        originated an idea may assign it a higher appeal.
*   Choice: Appeal incorporates all factors and is used to determine the
    probability of making the choice.

Numeric skill changes are assumed to represent several micro-changes. The
existing code mostly works for that, except:

*   Imitation should be weighted by both prestige and skill, to account for
    partial QoL observability.
*   Consider specifically tuning to have skill leaders mostly not imitate
    others.
*   Consider having clans try more experiments when underfed.

## Prestige model

### Review of the prestige model

The existing prestige model uses these factors, with rough importance
indicated:

*   [H] Seniority
*   [M] Housing QoL
*   [H] Population
*   [L] Ability traits (need?)
*   [L] Agricultural skill (s/b M?)
*   [H] Ritual skill
*   [L] Random

We might also want:

*   [H] Gifts/feasts
*   [M] Good reputation
*   [M] Trade goods
*   [M] Other wealth

This is really not bad, but it's not fully designed around what people
actually know about each other. For example, it would seem that much of
traits and skills were opaque to each other and people had to go mostly
by results.

### Revised prestige concepts

We'll say that prestige comes mainly from these categories:

*   [C] Visible contributions
*   [M] Markers correlated with success or contribution

Thus, it's all about things that clans can definitely see. The key
items will be:

*   [C+M] Ritual: roles, skill, and knowledge
*   [C+M] Giving: feasts, gifts, sponsorship
*   [C]   Applied expertise: successfully managing irrigation, producing
          craft goods, resolve disputes or public issues.
*   [M]   Seniority
*   [M]   Population
*   [M]   Visible wealth and connections: storehouses, trade goods,
          housing
*   [C+M] Reputation

Q: what exactly to do with skills/traits?

## Population effects

The limit for a completely connected community is 150 adults, or about
300 people with our prehistoric population pyramids. Below this limit,
clans have full knowledge and assessments of each other, and the gossip
network is able to keep the peace.

Beyond that limit, clans have to choose whom to focus their attention
on:
*   The clan they assign the most prestige to, but they may look at 1-3
    if the prestige ratings are close.
    *   We can assume they're mainly monitoring leading members of those
        clans, so we might give them a reduced or free population charge
        on these.
*   Clans in their neighborhood
    *   We can do this various ways, but a simple version is to arrange
        the clans in a ring and choose their 2-4 closest neighbors
*   Optionally a random clan
    *   Represents the fact that other relationships can exist
    *   Also helps mix up the network a bit so that basic geographic
        connection models don't completely force results

*   Alternatively, we could assign weights based on prestige and proximity,
    then do a softmax selection, but that mostly seems to make things more
    complicated.
*   We might want the random-clan relationships to be mutual.
*   Clans might want to learn from each other whom to watch (although
    the prestige part will already work that way).

Effects:

*   Clans have full visibility on clans they're watching
    *   We could dial that down a bit on the assumption they're spending
        a bit less attention locally to see the rest of the village, but
        this is probably not that important until we get to larger towns.
*   Clans can still learn reputation information from their neighbors
    about clans they're not watching
    *   But transmission might be less, because they don't have as much
        reason to pay attention
    *   With idiosyncratic bias, this could lead to major splits
    *   We could give clans options to say nice or mean things about each
        other
*   Tune so that mostly completely connected neighborhoods form
*   Alignment decreases when monitoring decreases
    *   Out-of-neighborhood clans have a lower alignment
    *   We should probably also have alignment decrease a bit for within-
        neighborhood clans because they could have other relationships
        that compete
    *   Monitored prestigious clans still have a good alignment rating
        from clans, but again they know they have other relationships
        *   Alignment does not automatically hold up in the opposite
            direction, but it will if the clans are giving them something

Communal production:

*   People can switch to neighborhood production as neighborhoods form
*   We could let them just do it, or make it a trackable change
    *   If it's trackable, we need cooperate/defect actions that can
        turn to more defection

Disputes:

*   We can give clans different conflicting and cooperating relationships,
    or random disputes
*   Those will start to affect alignment
    *   If alignment goes negative, people will really want to defect
*   We can also have a model where two clans can have a dispute, and
    then potentially the whole community can mediate that, or be split up
    into sides
