Issues with the latest noted on top:

## Current vs Next Productivity

Some parts of the UI show next-turn-predicted productivity
values, while other parts show previous-turn productivity.
It's often hard to tell which is which, and this makes it
very hard to understand changes in population and productivity.

Let's fix this up:

*   In the overview, show clear "last turn" and "predicted" panels.
    Demographics and productivity are the keys to show.
*   For production history report, show details of K, L, and LP.

Let's think through what happens in a turn and what we would want
to show:

*   Start state
    *   Population
    *   Health
    *   Skills and traits
    *   Perceptions
    *   Plans
    *   Productivity
*   Processes
    *   Nature (flooding)
    *   Movement
        *   Migrations
        *   Marriages
        *   Splits and merges
    *   Production
        *   Produce
        *   Exchange
        *   Consume
    *   Updates
        *   Skills
        *   Traits
        *   Population
*   End state
    *   Population
    *   Skills and traits
*   Planning phase
    *   Plans
    *   Productivity

We can show 7-15 items or so. Let's try to understand what the
most important topics are and expand:

*   Population
    x   [cur] Population
    x   Pop change
    *   Birth rate modifier
    *   Death rate modifier
*   Perceptions
    *   [cur?] [Belonging - for now, productivity bonus]
    *   [cur?] Respect
    x   [cur?] Food happiness
    *   [cur?] Society happiness
    *   [cur?] Happiness
*   Plans
    *   [cur] Residence %
    *   [cur] Farming %
    *   [cur] Special - migrations
*   Economics
    *   [cur] Capital
    *   [cur] Labor
    *   [cur?] Total factor productivity
    *   [cur] Dependency ratio
    x   Consumption
*   [Culture -- later]

Concept:
    x   Show clans in columns again, data categories in rows
    *   Optionally key predictions on the very top
    *   Key states on the top; can show changes inline
        x   Population
            *   Maybe modifiers next to this or the change
        *   Respect
        *   Social success
        *   Material success
    *   Flows next
        *   Capital
        *   Labor
        *   Consumption
    *   Flow-determining values next
        *   Productivity

## Villages in a cluster: how do they relate?

The latest issues here are around scale and what connections are
needed. First, we need to understand scale: Eridu and Ur are about
11 miles apart, close enough for ordinary contact, but both are
40 miles from Uruk and would not necessarily be in contact. However,
there would likely be some other sites in between.

Now we need to start making clans "do stuff" to maintain any
connections outside their settlement that they need, which so far
have been largely assumed.

We also need to make relationships critical, one way or another: we
know that no family can really survive all alone for a long time,
but rather families are absolutely interdependent for their needs.
In our case:

*   Clans should need some sort of attention or presence in order
    to marry.
*   Flint is a critical import.
*   Clans will tend to fall behind on news and technology without
    enough connections.
*   Clans will need insurance or help in case of disaster, which
    perhaps on average happens once a generation.
*   Already, clans have a variable dependency ratio and other
    factors that sometimes notably depress consumption, and they
    would benefit from being able to insure each other.
*   There can be rituals that take more than one clan to perform.
*   Eventually, conflict may motivate banding together for defense.

We also seem to have issues with villages splitting too soon, which
partly is a function of conflict levels.

*   Visualize eligibility for moves -- show relationships
*   Decide exactly what relationship level is required to move in
*   Have moving cost something in that-turn happiness
*   Have moving cost something in that-turn agricultural productivity
*   Have moving cost something in birth and death rates

Finish firming up "productivity bonus relationships":

*   Have a smaller productivity bonus over longer distance
    *   1/2 or 1/4 bonus for other villages in the cluster might work

### First take

Right now, this is quite unclear. This ends up being strange because
a big ring of villages grows, but with no apparent relationship to or
effect on each other.

Apparently village life is mostly centered on the village, but with
substantial interactions across a 1-travel-day distance (10-15 miles
on land, double by water):

*   Marriage and kinship
*   Local trade/help (our relationship productivity bonuses)
*   Down-the-line trade (flint?)
*   Rituals, seasonal visits, and feasts
*   Gossip -- travels with the above

We can start by extending our clan interaction model across villages,
and then try to layer in the other elements, which are related to
existing plans anyway.

We also need to consider the possibility that instead of having
predefined village clusters, we should simply have networks of 
villages, and let them cluster as they may. In fact, that's probably
how it should work for the long run. For now, to avoid too much UI
overhaul, we can think about modeling the villages in a cluster on
a more equal footing.

We'll also need some visualizations to make sense out of all this.

TODOs:

*   Visualizations for existing models
    *   Further upgrade relationships graph
        *   Two-sided arrow for clearly visualizing each direction
        *   Option to show respect
x   Marriage
*   Productivity bonus
    *   Make sure it can happen across clusters, but with some difference
    *   Consider promoting this to be a tagged favor exchange relationship
*   Down-the-line trade
    *   Might be time to actually add soon but conflicts with the cluster
        model somewhat
*   Rituals and feasts
    *   Could be an opportunity to fix this up
    *   Natural item allowing for more significant interactions without
        that much infrastructure
    *   Have clans naturally do this between villages with their kin
    *   Then maybe add options for more intentionally doing this in a
        bigger way