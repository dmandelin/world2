Issues with the latest noted on top:

## Villages in a cluster: how do they relate?

The latest issues here are around scale and what connections are
needed. First, we need to understand scale: Eridu and Ur are about
11 miles apart, close enough for ordinary contact, but both are
40 miles from Uruk and would not necessarily be in contact. However,
there would likely be some other sites in between.

Now we need to start making clans "do stuff" to maintain any
connections outside their settlement that they need, which so far
have been largely assumed.

The next point is to firm up "productivity bonus relationships".

*   Have a smaller productivity bonus over longer distance
    *   1/2 or 1/4 bonus for other villages in the cluster might work

We also seem to have issues with villages splitting too soon, which
partly is a function of conflict levels. First steps could be:

*   Visualize conflict calculations so we can see what the thresholds
    are
*   Increase inertia and/or decrease expected society appeal in new
    village

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