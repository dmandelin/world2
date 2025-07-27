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
