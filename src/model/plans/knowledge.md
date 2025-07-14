# Knowledge

## Questions

*   How much do people know about (their|others) (traits|skill|effectiveness)?
*   How do people decide which innovations to keep?
*   How do things change with scale?
x   What's the real deal with each of our prestige inputs?

## Skill and practices

### Discrete practices

Consider a discrete practice such as "live in a tripartite house" or "use
clay bird figurines in key rituals". The effects of adopting such a practice
can include (take benefits to also include detriments):

*   Obvious benefits - but there can be error about the magnitude
*   Discoverable benefits - not obvious, but practitioners can gain some
    estimate with some level of confidence (and error)
*   Hidden benefits - not directly usable by clans when deciding
*   Appeal benefits - some stuff tends to have outsized appeal to people
    relative to its effects, e.g., things to do with laziness, comfort,
    fear
*   Matching benefits - benefits from matching others' behavior
    *   Can be obvious to hidden

A key issue is that the two ways clans make decisions have different metrics
and thus can't be compared directly:

*   Inference results in a quality of life delta estimate
*   Imitation results in a choice ratio

We'll need to find a way to convert one to the other, or otherwise decide
which way to go.

Now let's examine our three changes:

*   Housing
    *   Effects
        *   Obvious: comfort, aesthetics, maintenance costs (over 20-year periods),
            local prestige
        *   Discoverable/hidden: health, benefits of storge and sheltered activities,
            some maintenance costs
        *   "Standard" maintenance costs are observable, but effects of events that
            happen less often than lifetimes are not
        *   Maintenance costs go down with flood control infrastructure
    *   We can give housing an appeal rating that is balanced against cost.
        Most cost and QoL effects can be fully incorporated, but:
        *   Have some random difference in preferences
            *   Therefore, even when based just on inference, not everyone
                is automatically at the optimal choice!
        *   OK to use comfort or help to make appeal a bit different from QoL
        *   Have prestige reflect the value pretty well (northern influence)
    *   For learning we can imagine averaging out behavior, or averaging out
        preferences. Either or both seem applicable
        *   Behavior is probably more primary.

At our start point, people didn't have clear ways to track exactly how much they
were producing or whether a given practice helped or hurt. (This in fact helps
explain why imitation learning is so important.) But they can see some things:

*   Some improvements are obvious, such as using a copper axe instead of stone.
    This can be true of small improvements, because those could be a very large
    improvement to a tiny part of the process.
*   Through individual and collective experience, they can gain some better-than-
    noise inferences about whether a new practice is helping. This can take a
    long time, even multiple generations.

Applying to our models:

*   Discrete improvements such clay figurines or bigger house designs:
    *   Some will be obviously good, either overall or in the situation, and
        people could adopt directly on seeing them.
    *   Otherwise, through observation and communication, people can have
        some ability to discern the actual benefits. It would make the most
        sense to include that in the inference step.

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