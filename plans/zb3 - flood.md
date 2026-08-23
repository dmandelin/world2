Rework floods as follows:

# General Instructions

*   Keep flood-related code collected in flood.ts
*   Replace any and all existing flood code when creating the new

# New Flooding Levels

*   There are "normal" flooding levels and exceptional flooding levels
*   Effects of flooding can in general vary by things like type of
    housing, type of land being used, etc. so the design should allow
    for that later.
*   5 normal flooding levels: scant, low, moderate, high, abundant
    *   Effects:
        *   For farming alluvium without ditching, output is highest
            at moderate, maybe around 2/3 at scant or abundant
    *   To generate per-settlement flood levels:
        *   Start with base mapwide flow: 
            *   scant and abundant: 10% probability each
            *   low and high: 20% each
            *   moderate: 40% probability
        *   For each settlement cluster, give a 15% each chance of
            one step higher or lower
        *   For each settlement in a cluster, give a 5% chance of
            another step higher or lower
*   Extreme flooding levels
    *   20-year flood
        *   0.05 probability per year for each settlement cluster,
            independently
        *   generate a random impact level between 0.2 and 0.5
            (add two uniform random numbers to get a bit of a hump
            in the middle)
        *   each clan in the cluster has that probability of being
            affected
        *   if affected:
            *    lose the lower of 2 d60% of crops
            *    -lower of 2 d10 flood damage QoL
    *   100-year flood
        *   0.01 probability per year for each half of the map,
            separated by a line between lower left corner and
            upper right
        *   generate a random impact level between 0.3 and 0.6
        *   each clan in the affected half has that probability of
            being affected
        *   if affected:
            *   lose 30+d100% (max 100%) of crops
            *   -d10 flood damage QoL
            *   1% risk of death due to flood (apply in population
                model as a cause of death like the others)
    *   500-year flood
        *   0.002 probability per year for the entire map
        *   generate a random impact level between 0.4 and 0.8
        *   each clan in the map has that chance of being affected
        *   if affected:
            *   lose 20+2d60% (max 100%) of crops
            *   -higher of 2 d10s flood damage QoL
            *   2d5% risk of death due to flood (apply in population
                model as a cause of death like the others)     

Implementing damages:

*   Crop losses should be a new Distribution item (also in UI)
*   Flood damage QoL should be its own QoL item, as now

# New UI

*   Show a pictogram of "normal" flood level below the settlement
    icon in the settlement view
*   In the cluster UI that shows a table of settlements, and the
    Land UI panels that show settlement or cluster tables, add a
    "Flood" row at the top. 

*   Use special pictorial icons for extreme floods. The tooltip
    should show total damage and impacts, including how many
    clans were affected.
*   Map lens for extreme floods

# Deferred: Don't implement now

*   Map lens for flood levels
*   Flood control systems
*   Disease impact of flood levels