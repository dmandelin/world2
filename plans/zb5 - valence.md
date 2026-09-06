The existing QoL concept is insufficient:

*   It's purely additive, but I'm fairly sure starvation would
    overwhelm the positive impact of more luxuries. There's no
    concept of inferior or superior goods.
*   How it should relate to motivation is unclear.
*   What the numbers mean other than relatively is unclear.

# Initial Discussion I: Rating Concepts

What are we even trying to rate any why? The immediate problem
is that we have a ton of data on the lives of clans but rather
little notion in the UI of who is doing well or what factors
help them do well.

Here are some candidate primary concepts:

*   Evolutionary success
    *   In terms of displayable data, this would seem to be the
        recent population trajectory of the group. We probably
        also should count the success of groups they married
        with, although we might not have the records to figure
        all of that out.
    *   In general this seems tricky to deal with.
        *   Clan splits and merges are another basic issue that
            make it hard to deal with
        *   Beyond that, I'm not convinced this is a real value.
            At clan scale, there are probably all kinds of
            fluctuations; it might become more interesting to
            track long-terms trends of the populations of
            language or culture groups, but that's different.
*   Subjective well-being
    *   We would be interested in relatively long-term versions
        of this:
        *   Current (as in current turn) satisfaction, mood,
            happiness, etc
        *   Satisfaction considering everything in their life
            so far, which in our case also includes tales of
            ancestors.
            *   Note: This should also include current conditions
                and current trajectory. Globalness is the idea,
                not past-facingness.
*   Quality of life -- doesn't seem to be clearly distinguished
    from SWB
*   Standard of living
    *   Basically materially available goods and services
        *   Therefore this doesn't make sense as a top-line metric
        *   But it could still have a role, e.g., food consumption
            now is basically that
*   Eudaimonia
    *   It's not that clear exactly how this differs from SWB. To
        some extent, it seems to represent a correction of SWB
        toward what's "actually good". That also seems similar to
        the idea of total-life satisfaction.
    *   This might actually be the best concept that we're most
        interested in.

At this point, I should also mention that generally speaking, in
the brain motivation (wanting) and evaluation (liking) are separate,
and our models should reflect any facts there.

On the other hand, for the kinds of long-term satisfaction we are
focusing on, it appears that narrative and memory are crucial.
Therefore, there's plenty of scope for people to make decisions
based on how they think it will affect their narrative evaluation
of their life.

And on the third hand, one of the major dimensions of cultural
variation is individualist (focused on self-esteem and achievement)
or collectivist (focused on role fulfillment, harmony, and shared
well-being). Looking forward, it seems the north will be more
individualist and the south more collectivist. But that difference
was not necessarily present at the start; perhaps they were in
between the two.

# Initial Discussion II: Eudaimonia vs SWB

Let's consider some different scenarios regarding SWB and eudaimonia
(Eu):

*   Suffering to succeed on a crucial mission: Eu could be considered
    high although SWB is low
*   The lotus-eaters: SWB high, but by all accounts eu low.
*   Predatory raiders: SWB might be high, but civilized moralists
    might claim their eu is low. But they'd say their own eu is high.

I think we can fairly reject any pure focus on SWB in a purely
subjective sense. The lotus-eaters aren't interesting, enviable, or
anything like that. All this means is that in human life, the long
term and the story matter.

The predatory raiders are the hard case. From Arrow's impossibility
we know not to rule out high eu too quickly. Going off the last point,
if they're successful with their raiding today but are making so many
enemies they will soon be doomed, we wouldn't to consider them as
thriving. Of course, it's kind of hard to tell what's going to
happen next. I think we have to judge them by their own standards and
success for the most part, but there can be some skepticism.

These issues will probably become somewhat clearer when we actually
have narrative models and components.

# Initial Discussion III: Components of Eudaimonia

Point: There appears to be somewhat of a split between things that are
about relief from lack (enough food) vs open-ended (learning).

Let's look at research ideas for what goes into SWB (since it's more
studied):

*   Income
    *   Material security also matters
    *   Much of this probably derives from actual consumption
*   Social support - seems to refer most of all to having someone in
    case of need, but also broader notions
*   Healthy life expectancy
    *   Population-wide: might convert more into health individually
*   Freedom to make life choices
    *   Refers to structural restrictions
    *   Somewhat unclear if SWB is direct or via effects on how well
        you can live your life
*   Generosity
*   Absence of corruption
    *   Seems to also extend to social trust generally
*   Employment
*   Autonomy
*   Competence
*   Relatedness
*   Purpose
*   Personality

We should also look at some lists of primary motivations. They may
be separate from evaluation in the short term, but long term connection
may be more likely, and they could shed light in any case.

*   Primary
    *   Food and water
    *   Physical safety
    *   Sex and mating
    *   Pair bonding and love
    *   Kin care and parenting
    *   Affiliation and belonging
    *   Status and prestige
    *   Curiosity and understanding
    *   Acquisition and storing
*   Less fully supported
    *   Disease avoidance
    *   Competence and mastery
    *   Autonomy and self-direction
    *   Fairness and justice
    *   Play and leisure
    *   Order, tradition, the sacred
    *   Meaning and self-actualization

And back to the list in the current code:

*   Leisure
*   Food quantity
*   Food quality
*   Flood
*   Conversation
*   Conflict
*   Prestige
*   Ritual help
*   Omens/events
*   Ritual conflict
*   Gatherings
*   Religious serenity
*   Quality of care

One of the reasons the list in the code is so indirect is that
there's been a lot of abstraction of floods or omens or help
as causing some generalized goodness or badness, but I wanted
to have some idea how much each was impacting.

# Initial Discussion IV: Attempting a Synthesis

In general, we should consider both narrative and mood:

*   A narrative effect would be a family having +eu from having
    an important job at the temple. This has all sorts of long-
    term significance for them and can be evaluated this way.
*   However, even aside from narrative impacts, if a family just
    has plenty to eat all the time vs often going hungry, that
    has an effect.
*   Narrative and mood presumably affect each other.
    *   Today's mood will depend somewhat on memories.
    *   Our recent mood is part of our memories and can be
        compared to expectations.

Factors extracted from the above:

*   Food - quantity, quality, and consistency
*   (Physical safety mostly shows up as hazards now)
*   Marriages, births, deaths, and health
*   Kin care and parenting
*   Affiliation and belonging
*   Status and prestige
*   Novelty, learning, and information
*   Stored resources (based on expectations)

*   Play and leisure 
*   Competence and mastery (based on values)

*   Hygiene (from standard of living, based on values)
*   (Freedom to make life choices - might become more
    relevant with development of authority)
*   Purpose (based on values?)
*   Fairness and justice (values-based)
*   Order, tradition, and the sacred (values-based)
*   Meaning and self-actualization (values-based)

*   Personality

*   Generosity - might be filed under affiliation and
    prestige, but probably does have some independent
    value
*   Employment - probably under affiliation and status

*   Flood - impacts food and deaths, but should also have
    "extra work and disruption" factor
*   Conversation - affiliation, status, information, play
*   Conflict - "extra work and disruption" but also
    psychosocial stress
*   Omens and ritual help - the idea is that some sort of omen
    occurs, and ritual can at least de-stress and sometimes
    more. Partly through effect factors, partly psychosocial
    stress
*   Gatherings and ritual conflict: should help with marriages,
    help, belonging, psychosocial stress, information

In general for the model, we probably will want to have separate
"current" and "lifetime" values. The latter is more significant
generally, but we'll probably want some view of how well clans
are doing in real time.

Psychosocial stress can perhaps be placed under the umbrella of
belonging. It seems to relate to that in various ways.

Now let's try to group these:

*   Influences mood directly and also explicitly valued
    in ways that are fairly universal
    *   Mostly about freedom from want
        *   Food - quantity, quality, and consistency
        *   (Physical safety mostly shows up as hazards now)
        *   Kin care and parenting
        *   Fairness and justice
        *   Rest -- having to work too hard is a problem and
            not truly covered elsewhere
        *   Stress from omens and its relief
    *   Somewhat open-ended
        *   Marriages, births, deaths, and health
        *   Affiliation and belonging
            *   Includes role/employment, conversation, gatherings
            *   Psychosocial stress might be considered as
                cutting into this, but it is a lack factor
        *   Status and prestige
            *   Includes role/employment, conversation?, gatherings?
        *   Could these two be connected:
            *   Novelty, learning, and information
            *   Play and leisure 
            *   Includes conversation, gatherings
        *   Competence and mastery

*   Influences mood directly and also valued differentially
    *   Hygiene (from standard of living, based on values)
    *   (Freedom to make life choices - might become more
        relevant with development of authority)
    *   Purpose-type stuff
        *   Purpose (based on values?)
        *   Meaning and self-actualization (values-based)
        *   Includes role/employment, gatherings
    *   Order, tradition, and the sacred (values-based)
    *   Generosity - might be filed under affiliation and
        prestige, but probably does have some independent
        value

*   Valued differentially
    *   Stored resources (based on expectations)

*   Personality

# Initial Discussion V: Grouping and simplifying

Items in {} might be relevant to other settings, but we won't
need them initially.

*   Influences mood directly and also explicitly valued
    in ways that are fairly universal
    *   Mostly about freedom from want
        *   Food - quantity, quality, and consistency
        *   Needed support and care
            *   Kin care and parenting - quality of care and carer
                workload/support
        *   Affiliation and belonging
            *   Includes role/employment, conversation, gatherings
            *   Psychosocial stress might be considered as
                cutting into this, but it is a lack factor
            *   This isn't truly only a lack factor, but I'm modeling
                there as being a needed factor, with other components
                that are more open-ended coming in through the effects
        *   Fairness and justice
        *   Rest -- having to work too hard is a problem and
            not truly covered elsewhere
        *   Psychosocial stress
        *   Spiritual safety
        *   {Physical safety}
    *   Somewhat open-ended but can also be perceived as lack
        *   Marriages, births, deaths, and health
        *   Status and prestige
            *   Includes role/employment, conversation?, gatherings?
        *   Opportunities to learn and grow:
            *   Novelty, learning, and information
            *   Play and leisure 
            *   Includes conversation, gatherings
        *   {Competence and mastery
            *   Partly via impacts on lacks, including in micro ways
            *   Partly via flow and achievement}

*   Influences mood directly and also valued differentially
    *   {Hygiene (from standard of living, based on values)
        we'll subsume under other ritual factors for now}
    *   Freedom to make life choices
        *   might become more relevant with development of authority
            but let's also carefully consider how various local changes
            could impinge on freedom
    *   Purpose - visions, community goals
        *   Includes role/employment, gatherings
        *   Maybe Order, tradition, and the sacred can fit under this
    *   Generosity - might be filed under affiliation and
        prestige, but probably does have some independent
        value

*   Valued differentially
    *   Stored resources (based on expectations)

*   Personality

# Modeling Discussion I: Basic Concepts

In homeostatic theory, estimated utility is a function of signals
and it has an optimum. State is therefore based on lack. This can
work for some things, but doesn't seem to cover open-ended things
like the number of relationships or stored resources.

The more positive, open-ended factors identified are:

*   Marriages and births
*   Status and prestige
*   Opportunities to learn and grow
*   Purpose

We'll need to somehow combine the different positive and negative
factors. It vaguely makes sense to imagine that there's a zero
point and negative factors take down from there. But maybe that
makes more sense for moment-to-moment behavior. For life satisfaction,
"standard success per culture" presumably is also a baseline, but
not zero, rather 1. (If we're using a 0-10 scale it would be a 7.)
In that case, we're perhaps comparing to some script.

Different values we might want to compute:

*   Evaluation of current year's state
    *   Includes direct-effect factors such as food and rest
    *   Should also include future expectations
    *   Also includes progress on positive, open-ended factors
*   Mood - slightly different from the latter in being the overall
    feeling as of now
    *   Main change would be that it could include:
        *   Carryover from previous years (note, could be subsumed
            under expectations)
        *   Life satisfaction - presumably that colors the current
            feeling
*   Life satisfaction
    *   Incorporates events from the past as long as the clan is
        alive plus memories and stories

As stated, mood and life satisfaction could be mutually recursive,
but we need an ordering. I'll defer that decision, but I note that
counterintuitively, it makes sense to have life satisfaction independent
of current mood, but current mood probably generally depends on life
satisfaction.

# Modeling Discussion II: Calculations

Let's take one item at a time.

*   Births and deaths
    *   This would amount to some sort of long-term average growth
        rate as well as matching emotions

*   Food
    *   Seems like a lack factor but there have probably been
        especially preferred foods throughout the hominins!
    *   Quantity is a lack factor.
        *   We could consider having some lack at food 100%,
            if due to friction they don't absolutely always
            have enough to eat.
    *   Quality is a lack factor if resulting in insufficient
        nutrition to the point someone would go hungry. Otherwise
        it can be a plus factor.
    *   Combining quantity and quality
        *   

*   Kin care and parenting
    *   What does a lack mean?
        *   The obvious example would be not enough caretakers in
            the group (or among helpers), so that infirm elders
            couldn't be cared for all the time, small children
            having to do harder jobs, caretakers overworked and
            stressed.
        *   Right now we automatically scale caretakers to cover,
            so we wouldn't have that, but could consider changing
            that.
        *   There will also always be some help needed, so not
            having that would produce a lack.
    *   What about pluses?
        *   Care skill effect makes sense here

*   Affiliation and belonging
