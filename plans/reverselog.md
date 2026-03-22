Issues with the latest noted on top:

## Villages in a cluster: how do they relate?

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
        x   Get nonlocal clans not to display on top of each other
        x   Option to show kinship relations
        x   Option to show multiple relationships
        *   Options to show productivity exchange relationship
        *   Option to show interaction volume
        *   Option to show relatedness
        *   Option to show respect
        *   Option to show attention
*   Marriage
    *   Make sure it can happen across clusters
    *   Make sure clans with 0-1 neighbors need this to find partners
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