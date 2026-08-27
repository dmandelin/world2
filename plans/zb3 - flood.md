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

# Basic flood control infrastructure

Clans in a settlement have the option of building and maintaining
a ditch around their fields to better regulate water flow.

x   Who works on the ditches
    x   Clans can choose the amount they work on the ditches in
        % of effort
    x   Clans have these variable behaviors and judgments:
        x   Clans can have a expectation for the % of effort
            performed by each clan
        x   Clans can admire other clans that contribute more than
            expected by (actual effort - expected effort) * coeff,
            with the coefficient being variable per clan. This is
            specifically an affect on *alignment*.
    x   Variable behavior traits are initialized randomly.
        Show them in the UI.
x   Ditching organization methods
    x   Ditching will always proceed under a named *organizational method*
        which structures the work and determines its coordination
        and characteristics.
    x   The initial organization will be "At Will", meaning anyone who
        wants to work on the ditches works on them when they want to.
x   At Will ditching maintenance
    x   Let's scale things so that building a normal, fully effective
        ditch for a settlement of 150 takes 10% of overall effort,
        and the per capita cost is inverse square with the population.
    x   The amount effort done compared to effort required determines
        the depth of the ditch: square it to get the "effective relative
        depth", and multiply by 100 for normal display.
    x   Different skill levels (REPLACED during implementation: the flaw
        and monitoring model below was dropped in favor of a flat penalty
        of 1 rating point per worker-turn of effort past what the
        organizational method can hold together -- 5 for At Will. Skill
        now enters only through the productivity factor further down.)
        x   For now we're folding this into effective depth, since in
            some sense flaws and depth are just things that create a
            failure chance.
        x   At small enough scale, more skilled workers can fix most
            of the mistakes of others.
        x   Modeling this for now:
            x   Each point of effort introduces potential flaws that
                lower the effective depth of the ditch. This penalty
                by itself lowers the ditch effective depth (maybe
                we should just call it "rating") by 5 at skill 50,
                10 at skill 0, 0 at skill 100.
            x   Each clan can catch flaws introduced by another clan,
                helping reduce errors. Up to 5 units of effort can
                be monitored in this way, using a skill level that's
                the average of skill levels weighted by clan pop *
                a skill level factor that's 1.0 at skill 50, 2.0 at
                skill 75. The monitoring reduces the flaw penalty by
                (monitoring skill level)%, but with a maximum of 90%.
                This monitoring happens automatically. If there are
                more than 5 units of effort, scale down the flaw
                penalty reduction proportionally.
x   Effects of basic ditching
    x   Normal floods
        x   Take the flood rating to be a value based on the flood
            level: 20 * (normal flood level + 1) - 10 + d10 - d10
        x   AMENDED during implementation: no minimum depth. The ditch
            gets min(1, ditch rating / flood rating) of the effect, so a
            ditch built for half the water does half the good. (Was: full
            effect at or above the flood rating, exponential falloff below.)
        x   Baseline effect of ditching at skill level 50 is to change
            crop yields for the 5 levels to be: 80%, 90%, 100%, 110%, 120%
            (change the unditched yields to 60%, 75%, 90%, 75%, 60%)
        x   AMENDED during implementation: skill factor is
            2^((skill - 50)/15), clamped to a maximum of 2. So 1x at
            skill 50, 2x at 65 and above, 0.5x at 35, and never quite
            zero. (Was: half the bonus at skill 25, 1.5x at skill 100,
            which hit zero at skill 12.5 and left a long dead zone.)
        x   Clans start with irrigation skill uniform on 10-30 plus the
            lowest of 3 d20: mean near 25, with the occasional clan
            that has a real hand for it.
    x   Extreme floods
        x   These small ditches won't do too much about extreme
            floods, but we'll give them a chance of helping a bit
            in the defense
        x   Big-flood ratings: 125 + d25 - d25, 150 + d25 - d25,
            200 + d50 - d50. If the ditch rating is above half the
            big-flood rating, the QoL loss is reduced by 50%.

x   UI
    x   Show ditch rating and flood rating near the flood icon
    x   Add Infrastructure panel with button below productivity showing
        clans in columns with their related behavioral traits, skills,
        effort level, contribution to ditch, and the resulting overall
        rating and expected effect vs flood levels
    x   Tooltip for flood icon should show whether ditch held and resulting
        effects
        x   Ideally also show this upfront in simple form or maybe pictorially

x   Make sure irrigation skill can increase over time
    x   Necessary for related productivity increase

# Deferred: Don't implement now

*   Leadership for infra work
    *   Introduces another leadership category
        (Add ritual leaders first though)

*   Make sure we have something with river avulsions   
    *   Important to our residence/permanence model

*   More on skill differentials
    *   Does low skill increase the chance of flaws?
    *   Can inspections or leadership help?
    *   Bring back imitation learning
    *   (Looking ahead) tech step for canal irrigation

*   Add some kind of coordination requirement to get
    the ditch actually finished
    *   Logically there would be a coordination
        problem here

*   Piety impact on labor levels and norm enforcement
*   Intelligence impact on decisions and norms

*   Infrastructure carry-over between years
    *   Logically some could take longer to build
    
*   Disease impact of flood levels

*   Get a better sense of how ditch depth and quality
    intersect with flood level
