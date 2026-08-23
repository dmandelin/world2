Rework floods as follows:

# General Instructions

x   Keep flood-related code collected in flood.ts
x   Replace any and all existing flood code when creating the new

# New Flooding Levels

x   There are "normal" flooding levels and exceptional flooding levels
x   Effects of flooding can in general vary by things like type of
    housing, type of land being used, etc. so the design should allow
    for that later.
x   5 normal flooding levels: scant, low, moderate, high, abundant
    x   Effects:
        x   For farming alluvium without ditching, output is highest
            at moderate, maybe around 2/3 at scant or abundant
    x   To generate per-settlement flood levels:
        x   Start with base mapwide flow: 
            x   scant and abundant: 10% probability each
            x   low and high: 20% each
            x   moderate: 40% probability
        x   For each settlement cluster, give a 15% each chance of
            one step higher or lower
        x   For each settlement in a cluster, give a 5% chance of
            another step higher or lower
x   Extreme flooding levels
    x   20-year flood
        x   0.05 probability per year for each settlement cluster,
            independently
        x   generate a random impact level between 0.2 and 0.5
            (add two uniform random numbers to get a bit of a hump
            in the middle)
        x   each clan in the cluster has that probability of being
            affected
        x   if affected:
            x    lose the lower of 2 d60% of crops
            x    -lower of 2 d10 flood damage QoL
    x   100-year flood
        x   0.01 probability per year for each half of the map,
            separated by a line between lower left corner and
            upper right
        x   generate a random impact level between 0.3 and 0.6
        x   each clan in the affected half has that probability of
            being affected
        x   if affected:
            x   lose 30+d100% (max 100%) of crops
            x   -d10 flood damage QoL
            x   1% risk of death due to flood (apply in population
                model as a cause of death like the others)
    x   500-year flood
        x   0.002 probability per year for the entire map
        x   generate a random impact level between 0.4 and 0.8
        x   each clan in the map has that chance of being affected
        x   if affected:
            x   lose 20+2d60% (max 100%) of crops
            x   -higher of 2 d10s flood damage QoL
            x   2d5% risk of death due to flood (apply in population
                model as a cause of death like the others)     

Implementing damages:

x   Crop losses should be a new Distribution item (also in UI)
x   Flood damage QoL should be its own QoL item, as now

# New UI

x   Show a pictogram of "normal" flood level below the settlement
    icon in the settlement view
x   In the cluster UI that shows a table of settlements, and the
    Land UI panels that show settlement or cluster tables, add a
    "Flood" row at the top. 

x   Use special pictorial icons for extreme floods. The tooltip
    should show total damage and impacts, including how many
    clans were affected.
x   Map lens for extreme floods
x   Map lens for flood levels (moved out of Deferred): one button
    cycling extreme-only (default), all, and off; normal levels
    draw as a per-settlement heat map that merges within a cluster

# Deferred: Don't implement now

*   Flood control systems
*   Disease impact of flood levels