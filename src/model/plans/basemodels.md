The base models (demographics, decisions, and satisfaction) need 
some adjustments. Some of the more important problems are:

*   The relationship between QoL and decision making is unclear.
*   It would make sense to have satisfaction ratings emerge from
    appeal rather than the other way around.
*   Once satisfaction is emergent, it doesn't make sense for it
    to determine birth and death rates.

I'll start with demographics, which is "mostly objective", then
do appeal, which is more subjective, then satisfaction and 
happiness.

## Demographics

We need to make birth and death rates functions of basic facts rather
than QoL (BD indicates which rates are affected):

*   (BD) Nutrition
    *   Birth rate is replacement at an index value (1 food per capita)
    *   +1 child per mother per generation for each additional 1/3-1/2
        food per capita (-1 at same rate)
    *   Later this can be made more complex as part of a shift in child-
        raising practices (TODO)
    *   Some influence on death rate, but mild within normal range
    *   Main idea here is that much more food and more secure food
        enables shorter birth spacing and much higher fertility
*   (D) Disease
    *   Baseline level for hunter-gatherers covering mostly parasites
        and zoonotic infections
    *   Significantly boosted for agricultural animal exposure, both
        domesticated animals and pests
    *   Significantly boosted based on regional population, which
        determines endemic reservoir sizes
    *   Mildly boosted based on settlement size
    *   This will actually be the main check on population with agriculture.
        Depending on how the above parameters turn out, we may also need
        disease prevalence and virulence to evolve
*   (D) Hazards
    *   Additional catch-all to fill out the historical death rate
    *   Will include conflict for now
    *   Can include old age for now
    *   Can be modified for migration, flooding, etc
*   (B) Mood
    *   This may or may not be necessary early on
    *   Two ideas to consider (either or both):
        *   Happiness relative to recent past
        *   Sense of sustainability (resource expectations, ritual
            stability)
*   (BD) Culture
    *   There can be various cultural pratices that affect birth or
        death rates in various ways

### Tuning

Net gain should be about 220 per 1000 in good conditions, corresponding
to natural population growth of 1% per year.

#### Birth rates

The base data are complicated, with fertility rates varying widely
across different cultures. Some sources assert that there is little
difference between foragers and farmers, while others say there is,
but mediated by mobility and food supply rather than economy per se.

TFR for hunter-gatherers now is 5-6. It's possibly somewhat lower
for our people that would have had simpler technology, so it's not
entirely unreasonable to call it 4. High-side fertility would then
be around 8, but 5-6 maybe more typical for farmers.

To convert that to a birth rate, we have that about 1/6 of our
population pyramids are child-bearing, and bear a base of 4 children
per turn, therefore around 667 per 1000.

#### Death rates

First we have the very unfortunate childhood disease rate, which
will reduce the net gain from 600-1000 to around 500.

Life expectancy at age 45 was around 20 more years for many groups,
so we could use a 50% per turn death rate for that bracket, and
something lower for younger brackets. 

## Appeal

Appeal is a primary concept, and represents the attractiveness of a
choice to a clan (or other primary entity), such as where to live, what
rites to practice, and what to eat. Appeal is an Elo/softmax rating of 
the choice based on the clan's psychology, including:

*   beliefs about the choice
*   short-term experiences relating to the choice
*   social learning about the choice
*   social rewards or penalties expected for the choice
*   idiosyncracies

It is then possible to aggregate clan appeal ratings to form a standard-
of-living rating, which is how appealing the average clan would find a
given situation.

### Triggering appeal decisions

Clans don't reconsider every decision all the time. There needs to be
some cause, such as:

*   innovator in the clan (low-probability random)
*   learning about a new option for the first time
*   problems such as:
    *   material problem: low nutrition, natural disaster
    *   social problem: conflict, matching issues
*   supernormal benefits such as:
    *   prestigious choice
    *   ritual, art, drugs

## Happiness

A rating for happiness (or satisfaction, eudaimonia, flourishing)
doesn't seem to be strictly needed for the model, but without it,
we don't have a replacement for QoL and it's hard to tell how well
clans think they're doing.

Happiness is generally relative to expectations, but major problems
will cause low happiness. For example, starving people are unhappy
even if they expect it.

For items considered needs, if they're low, it'll be hard for
overall happiness to be much higher.

This will be partly based on values, so the formula could vary for
different clans. Values particularly influence the weighting of:

*   Happiness as in survival, comfort, and company - health
    *   Initial focus for most
    *   Items (could all be considered needs but some harder than others)
        *   Food
        *   Clothing
        *   Shelter
        *   Good relations
        *   Political stability
        *   Celebrations (part of rituals at present)
        *   Entertainment (part of rituals at present)
        *   Belief in sustainability
*   Success as in prestige and wealth - power
    *   Rises as population and interactions rise
    *   Items (can be considered needs for elites or ambitious)
        *   Prestige, influence
        *   Wealth - stores, buildings
        *   Achievements - ranks, offices, titles, reknown (ritual, commercial,
            military)
*   Experience as in creativity and novelty - knowledge
    *   Appears with freedom from high or low wealth
    *   Items (can be considered needs for the divergent)
        *   Freedom
        *   Creativity - art, ritual, myth
        *   Invention - technology, political structures

## Applications

Notes on applying the new base models to the initial shifts.

### Housing

Effects and appeal:

*   Prestige: may have some +prestige as the known preference in the north
    and/or as a desirable or expensive item
*   Comfort: +appeal, maybe minor increase in birth rate. 
    **Note that moving less often should have a more substantial effect
    on birth rate** +shelter (for happiness)
*   Maintenance labor: requires additional labor allocation which can't
    be used for other things. -appeal if not used to it
*   Health and safety plus small storage: minor reduction in hazard death 
    rate. No appeal effect: relatively unobvious to the people. Possible
    increase to disease death rate from more close contact

This warrants some further research. Permanent settlements are definitely
important but the difference in housing types is unclear.

### More farming

Effects and appeal:

*   Prestige: may have some +prestige as the known way from the north
*   Storage: cereals can be stored to get through lean times more easily,
    which could work via lifting a nutrition limit from foraging
*   Scale: can scale up production, which foraging can't (it's at capacity
    at start)
*   Learning: skill and technology improve faster if spending more time
    farming
*   Disease: substantial increase in disease load
*   Preference: consider a preference for clans that affects appeal and
    happiness

### Imported art

Effects and appeal:

*   Prestige: may have some +prestige as a known prestige item from the north
*   Ritual/magic for the clan: +self prestige, +happiness (morale)
*   Shared use in common village ritual: +prestige, +happiness (morale)
    for all clans. (Could be -prestige -happiness if some clans don't
    like the change but that's not important at first.)
*   Leading use in common village ritual: +/-prestige depending on clan
    ideologies and relationships, also +/-happiness. It's OK to assume
    preference for the figures but clans may oppose inequality generated
    by them.
*   Beauty: +happiness
*   Inspiration: may inspire someone in a clan to begin producing similar
    art, may inspire new myths and ritual components, may stimulate demand
    for complementary religious goods and services, or inspire other new
    thoughts and inventions related to the art and its use