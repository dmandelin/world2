# Knowledge

## Questions

*   How much do people know about (their|others) (traits|skill|effectiveness)?
*   How do people decide which innovations to keep?
*   How do things change with scale?
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

TODO - Update stuff below

*   Numeric skills:
    *   Some instances of drift will have immediately noticeable effects and
        the change can be kept or not. This doesn't imply any particular
        distribution of up or down because of all the factors that go in,
        but it means changes are either hard-to-notice detriments, hard-to-notice
        improvements, or easy-to-notice improvements. Non-noticeable stuff
        is probably more often detriments because we're talking about drift.
        Also note that easy-to-notice improvements can spread rapidly from
        a single person.
    *   Effect of skill is more noticeable for some skills than others.
        If effect is highly noticeable, then changes will be more skewed
        upward.

This doesn't seem to imply much change to our base models, but the key thing
is that we want it to be at least possible for the signal from inference to
take over long-term. Let's say a clan's farming skill goes up by 2, representing
some change of practice. By default, the next turn they'll move toward the
others, keeping only 1/N of their learning. There is a self bias, but I don't
know how much that helps because it would also apply to learned detriments.

Apparently instead of everyone converging toward the average practice, we
should imagine that they're (potentially) observing how well it works, and
more likely to keep it if it actually helps. We should perhaps imagine that
a skill improvement by 2 is from 10 changes, some of which might even be
detrimental. When that clan and others assess the changes, they'll (potentially)
tell a little or a lot better than noise. So instead they can preferentially
move closer to that group.

It seems this can be largely abstracted down to a skill bias in addition to
prestige for selecting imitation targets. However, there's a remaining issue
that when there is a large number of neighbors N, people will be less likely
to stick to their new thing. But perhaps that's exactly how it should work,
with different mechanics able to somewhat overcome that later. The skill bias
will depend on exactly how observable the results and the practice are.

So perhaps the discrete improvements are more where the action is. Let's
look at what we have:

*   Housing
    *   Happiness effects from living in the housing are probably
        pretty noticeable, especially on 20-year turns
    *   There might be effects on health and quality of life that aren't
        that obvious
    *   Costs of moving due to flood might be somewhat understood, but not
        necessarily completely
    *   We have some choice here. We could make everything pretty visible to
        people, but I suspect the total effects weren't super-obvious.
        We may need to let people learn a QoL expectation for housing to
        make this work.
*   Farming vs fishing
    *   It could be pretty unobvious to people which one pays off more in
        yield per effort, if they even had that concept quantitatively.
        Compare someone trying to understand yield of one form of advertising
        relative to another, or of value of going on vacation vs playing sports.
    *   But we do need to let people learn improvements in some way.
        *   One option is to let it all be by prestige-based learning, and
            the chips fall where they may. That could actually be OK here.
        *   Another option is to let people learn the relative value to some
            extent. But that's a little complicated, and it also seems
            people often forget all about any relative value differences
            by the time they're doing it!
        *   If we want to abstract that away, we could give people a noisy
            value estimate.
*   Clay figurines
    *   Here it would seem people either like them or don't.
    *   They don't exactly find out later that they don't work, except they
        kind of do, in special events or something.

A core issue here seems to be, how do people *really* make these choices?

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