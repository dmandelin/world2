Following the rework of the flood, flood control, and settlement
permanence models, it's becoming necessary to fix up some issues
around happiness and population growth, which have gotten detuned.

The immediate problems:

*   QoL is weirdly high, partly from a high value from both clan
    and rituals, and an arbitrary bonus I added earlier to work
    around downward retunings.
*   At first settlements are well nourished and grow, but they
    quickly reach carrying capacity because of limited fishing
    capacity and no labor reallocation. The backlog earlier noted
    this issue and the need to understand how clans would decide
    whether to farm more or not.

## Discussion: the labor allocation issue

*   Clans are used to a lean season, but recently discovered they
    could store cereals to get through it.
*   If their consumption is going below 1.0 again, that implies
    they weren't able to save up enough cereals to get through it,
    so it would be natural to try to get more cereals.
*   Some clans might actually try to fish more, reasoning that
    the cereals are not working out as expected, so they should
    return to the old ways.
*   If they're producing communally, they might not notice the
    differences very clearly! However, there is some chance that
    through observation and discussion they'll be able to tell.
*   If they aren't able to tell, they should still be able to get
    to the right place by randomly changing as long as they are
    underfed.

*   Simplest model would be to randomly change if underfed.
*   It would be reasonable to bias the change toward "correct" when:
    *   (moderate) There are multiple friendly interacting clans
    *   (major effect) There are examples of different choices

## Discussion: happiness

The worst immediate issue is that clans end up almost immediately
under capacity pressure, yet show as very happy! It's time to take
a pass over this, with two goals:

*   Clarify and refine the different factors that influence happiness
*   Distinguish health, quality of life, and life satisfaction in the UI

A tall order, as I've already done 2-3 writeups on this, but let's
try again.

*   A point out of my head:
    *   Ancient societies are said to have had a more "objective"
        notion of happiness. That goes with the idea that they 
        changed more slowly and were more conformist.
    *   However, they did have diversity and change! So it makes
        sense for people to have appeal factors that they see as
        stable, but that can vary and change.
    *   Thus, as a simplification it would be OK to have one fixed
        scale, but someday we'll want variation.

*   The biggest factors in general are:
    *   Health
    *   Communal well-being
    *   Relationship to the universe/gods/ancestors

    *   Community
    *   Relationships with others
    *   Fairness/rightness

    *   Generosity
    *   Innate

Free discussion: At the very beginning, wealth is practically synonymous
with health, although that will change at some point.

One way of looking at this is that it's based on current and future
goodness:

    *   Current goods (e.g., enough to eat, people to marry) are
        necessary and important.
    *   But if you think the goods are going away tomorrow, major
        anxiety! Not at all a time to be happy, relax, freely create.

What are the current goods? There are obviously some material necessities
such as food and shelter. Relationships are also vital, but we can break
this down into various needs: spouses, child care, learning, mutual
protection, trade, and so on. Thinking of some terms we've seen before,
a big one is the "is there someone who can help"? That gets into 
incredibly complicated aspects of different kinds of relationships, but
at a base level, let's say that this means someone who can help you when
you truly direly need it, or with the things that matter the most. So,
for whatever your serious challenges and dangers are, you specifically
need people who can help with that, and will, even if it's expensive.
Examples: a family you can marry into; a related clan that will take your
clan in if they lose their land; a ruler or priest who will donate to you, 
a widow or orphan.

In a clan society, individuals get a lot of that from their clans, so
it would be indexed on the health of the clan, and then the clan's
relationship to wider society, on the things the clan really needs.
At this point, that would include:

*   Peace and safety. At the beginning, we're assuming this is
    largely there and constant, but it will vary at some point.

*   Insurance against bad luck for the whole clan getting food.
    Requires good relations and sharing practices with neighbors.

*   Relationship with powerful beings/gods. The clan may not feel
    as equipped to do this without assistance from the community.
    This is actually a matter of current happiness, as our people
    will not expect anything to go well if this is not taken care
    of. This is feeling the rituals are done properly.

*   Status. This has various benefits and is typically a strong
    concern. It can play out in different ways: for example, in
    an egalitarian status people might be mostly only concerned
    about having lower status. In some societies freedom would
    be an important component. The sense is really "my relation
    to the community".

*   Social order. This is the sense of "how things work around
    here" vs "how they should work". In small societies where
    everyone knows everyone, this doesn't show up much, because
    the direct relationships are the entire experience of society.
    This starts to matter when relationships become more impersonal.
    At first, in a village that could show up as a detriment here
    for "people don't all know each other, as they should". That
    could then be compounded with various other overlays such as
    "now there are so many raucous youths" or "the clans with the
    big houses sure are generous". More formal units of social
    order can then arrive to help solve problems, or exploit people.

*   Learning, news, and entertainment from outside the clan: not
    necessarily a dominant concern at all times, but people would
    start to get bored and possibly sick of each other without
    enough outside input and interaction. This doesn't require
    good relations as much as certain other things, and can have
    a greater effect with more difference.

Now, to try to pull this together, it seems we are going to want
to be able to rate everything with an "appeal" or "quality of life"
score. But we also need some things to be relative to an index.
So let's go in on that topic a bit.

Material consumption can obviously be relative to an index. However,
it seems it isn't experienced quite this way, as no one is happy to
starve, even if they expect it. But we can also see that a clan used
to experiencing a harsh lean time every year might become less happy
about it after seeing another clan that always has plenty to eat.
Unhappiness = motivation to take specific action seems key. This is
getting confusing so let's look at other items a bit.

For relationship with powerful beings, people may have some sense
of what's generally required to keep things going, so they'd be
significantly worried and unhappy if they fail to provide it. They
probably are extra happy if they can give better gifts. Here, it
seems we can have an appeal level for the rituals, and rate happiness
relative to an expected appeal, thus creating an upward ratchet.

Status seems it can clearly be a relative item, especially in our
initial restricted domain. The expected status would be the average
local prestige, so prestige from average distinctly matters. Later
on, if there are classes, it would make more sense to index their
happiness relative to the expectations for their class and its
position in society. But at the beginning we don't have classes.

In our beginning state, people share, and as long as the model
enforces that, they're covered. But if there is cheating or private
property then happiness on this factor will decline unless there
are further adaptations.

For social order, the main initial dynamic will be that as people
start to not know each other, that will violate expectations and
reduce happiness. That could be taken off of alignment factors if
we're modeling that in detail, but could also be done directly as
a simplification. We'll then think about how people offset that
with new practices.

Learning, news, and entertainment: We don't have too much on this
yet, but we can think of #neighbors, trade connections, and rituals
as providing these things, which can then influence learning and
appeal.

The relationship between appeal and happiness seems reasonably
clear for the above social items. For a few, we can rate appeal
well, and then happiness is relative to expected appeal. For
others there is more of a direct appeal and happiness detriment,
presumably meaning there's a more fixed expectation. (Since those
tend to be more detriments, we should also allow more positives
to balance, either elsewhere, or there, like extra happiness
when there was some positive innovation).

Back to income and health, there it seems that health works
relative to a more fixed baseline of "pretty healthy", so
significant effects there can be counted directly. But consumption
of non-necessities seems to go logarithmic, and relative to an
expectation baseline. People do somewhat seem to process their
income relative to a "sufficient to get along well in this 
society" scale.

## Modeling

Now let's try to specify some model changes to make all that work:

*   Health
    +   Calculate and show a health score
    +   Health affects population growth, productivity, and happiness
    +   Flooding casualties and moving costs go in this general category;
        moves themselves would have to use relative happiness, but
        hardship due to moving can use a fixed baseline.
    *   Fixed happiness baseline OK
*   Relationships
    *   Material insurance
        *   Could assume fixed for now and ignore, could also rate based
            on village size
        *   Matters less with plenty or great scarcity (to the point
            where people won't help each other)
    *   Powerful beings/ancestors
        +   Calculate an appeal for rituals: how good they are for the
            powerful beings/ancestors
        +   Calculate expected appeal based on history
        +   Happiness is relative
    *   Position in community
        +   Prestige relative to average
        *   Fixed happiness baseline OK
        ~   Seems like we should include an alignment/benevolence factor
            here, but we don't have many ways to vary it yet. When
            we get there we can think about how this would vary and
            how to handle.
    *   Workings of community
        *   Initial expectation is "everyone knows everyone, we get
            along OK, we farm together, we perform rituals together"
        *   There aren't other communities to compare to, etc., so
            that baseline can stay the same for a while.
        +   If village gets too big, this becomes a penalty
        *   However, if a settlement does grow despite the penalty,
            expectations should shift over time. But actual conflict
            and crime would still lower things.
    *   Learning, news, and entertainment
        *   Not super critical immediately, but probably is important
            and should be added soon.
        +   Calculate one or more scores for incoming information
        +   Calculate expectations
        ~   Learning and other effects
        ~   We may also want happiness to boost "free learning" and
            possibly other things that are typically superior goods.
            The idea is that unhappy people are more willing to try
            random stuff to get out of their predicament. Happy people
            are in a position where it seems safe for them to do nothing,
            but also where it seems safe to try new things, so depending
            on culture and personality that can play out in various ways.
        *   Happiness is relative
*   Idiosyncratic factors
    *   We can have clans vary on what they like, but that may not
        be immediately required.
    *   We may also want to give clans a fixed happiness bias. It 
        would tend to cause certain clans to change their behavior
        in response to stress more readily than others.
~   Consider making certain happiness producers influence alignment:
    happy together => more aligned. And then that can flow into more
    benefits and being happier. But eventually the resulting population
    growth leads to new strains, and alignment starts to break up.
    ~   Implies we should also cut alignment with too much scarcity,
        but responses there can be quite variable. Perhaps we need
        to give people good alignment bonuses, and then in scarcity
        they'll need some alignment, but only so much.