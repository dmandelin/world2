# Next steps

## Next items in latest plans

-   Latest observations:
    -   Village productivity seems very low compared to clan base
        productivity. Need to sort that out.
    -   Clans are somewhat better about learning to rely more on farming,
        but they still stick too long with fishing, or move when that
        won't really help.
        -   There are various reasons we can give clans a bias toward
            farming more when hungry
        -   An easy one is cultural/ritual, where there doesn't have to
            be any direct cost, they just have a culture in that direction.
            Magnitude of the effect could depend on ritual appeal though.
        -   We could also assume they experiment a bit and then pick
            what works. 20 years is probably enough to make the correct
            move, but we can charge them an experimentation cost.
        -   It also may be good to reduce the magnitude of the shifts a
            bit -- they bounce around a bunch
        -   Also maybe only sometimes do a shift instead of always
    -   Otherwise, populations are growing reasonably well for the first
        millennium. We can go back to modeling the shifts more:
        -   Give clans an option to visit the farms, giving a bonus to
            learning and knowledge.
            -   Probably need to implement more effects of residence
        -   Give clans an option to raise children at the farms, giving
            a bonus to childhood learning, further residence bonus, and
            birth rate bonus.
    -   We also need to consider tying together daughter and mother
        villages more: they're close by and could have some interaction
        -   Maybe model ideas similar to disease, so that the area
            population matters
        -   There's also a more locally bound small-scale-trade/socialization
            sphere. We should make sure we have scale bonuses within
            settlements and then apply some interaction bonuses.
        -   Finally, we should give villages the option to attend the
            big rituals from the main town. This will start to create a
            notion of urban amenities.

-   Improved labor reallocation
    x   Update happiness model for what-ifs
    x   Basic appeal-based reallocation allowing increase only and only logging
    x   Expose calculation in UI
    x   Also allow decreasing farming
    -   Better knowledge if more connected
    -   Reallocation more likely if consumption is low
    -   Ag rituals boost ag appeal
    -   Consider idiosyncratic factor
    -   Consider intelligence bonus
    -   Consider doing the skill they're good at

-   Key bugs
    x   UI annoyance where selected settlement resets on next turn
    -   Make productivity less confusing
        -   Show last turn flooding instead of next
            -   Will probably have to redo sequencing somewhat to make it work
        -   Check if village productivity is lower than it should be
        x   Show flooding on the overview page
    -   Smaller UI annoyance where settlement button panel doesn't correctly bold

-   Temp stuff to undo
    -   Make sure trade costs something when we add a benefit

-   Themes
    -   Give people ways to raise their appeal
    -   More detail on population change factors
        -   Disease load detail
    -   Consider working in some absolute effects for survival goods in 
        happiness model
        -   In general, index to what's possible, so that the benchmark for
            status is the area average, not the clan's history only.
        -   Maybe a similar principle can be used for survival goods, make
            the downward adjustment relatively slow and keep "subsisting
            reasonably well" as a floor that's hard to go below
        -   Would also make sense to have expectations ratchet upward faster
            than downward

-   Residence
    x   Calculate an effective residence level
    -   Effects of effective residence
        x   Tell height scaled down if not full-time
        -   Technology learning boost
        -   Social learning boost
            -   Might want to tie smarter labor allocation to this -- make it
                easier for people to reallocate if interacting more
        -   Mutual knowledge boost
        -   Benefits of local cooperation
        -   Disease load boost
        -   Fertility boost
    -   Update seniority logic for residence logic

-   Primary stat displays
    -   Colorization for happiness table
    -   Show disease load calculations

-   Move effects
    -   Add back intentional moves, with effects
        -   Get clear sequencing in the model

-   Settlement permanance
    -   Options for usage level
    -   Display usage levels on map and panels
    -   More prominent notifications for key firsts
-   Further sub-items

-   Dynamically scale happiness graphs so they're easier to read

## Bug fixes

-   Clean up production table code, especially for construction items

-   Update housing effects
    -   Storage: can reserve family storage
    -   Workshops: can expand craft production
-   Update housing decisions
    -   Give people a way to learn which is better
    -   Make people more likely to upgrade if they have enough food
-   Introduce a way to change the skill basis for different types
        of housing
-   Idiosyncratic appeal

## Food production shifts

Key stuff to think about:

-   Variable yield per production type, so doing a bit of both helps
-   Also think about shifts to clan-based production and storage

Backlog items:

*   Behavior shifts:
    *   Assume a strong motivation to get consumption up from 0.9 to 1.0.
    *   In communal production, producing the cereals to make that happen
        is awarded prestige by the other clans, if they can see.
    *   For now, that might be enough, as eventually population growth
        will induce them to scale up. But things will become different
        with different distribution models, specialization opportunities,
        and trade opportunities.

-   Applying the new base models to the initial three shifts
    
# On deck

- Introduce new ritual model
  x different rituals at same granularity as production pot
    - later allow option for subsets of clans or multiple clans
  - fix scale factors going up too high
  - distribute attention per appeal
  - rename relatedness to solidarity
  - solidarity effects of ritual
  - prestige effects of ritual
  - learning effects of ritual
  - feasting add-on to ritual
  - dance style add-on to ritual
  - add multi-settlement ritual


## Documentation

-   instructions for prereqs
-   bibliography

## Small things

-   Production
    -   Different variance for fishing and farming
    -   Effects of variance and sharing
    -   Production penalty for shifting farming
-   More icons for clan card, looks a lot better that way.
-   Refinements to the new migration model:
    -   Make clans that just split off more likely to move
        -   Also move splitting to plan/review model
    -   Have one clan moving out of a settlement potentially trigger others
- Small but important
  - scale bonuses for learning in settlements
  - connectivity bonuses for related settlements
  - merge annals and notetaker
  - trade good effects
  - ritual side effects: +health, +relatedness, +monitoring, +learning
- Fix up learning model
  - have it depend on population pyramid
  - add breakthroughs
  - give a bigger self weight bonus for education vs imitation

- Give people preferences for different settlement types, which can change
- Make coordination costs and scale effects more dynamic, 
  e.g., dependent on settlement relations

Understanding results:
- Visualization of leading clans over time

Model refinements:
- Better skill growth after migrants arrive
  Probably want to pair this with making specific breakthroughs
- Maybe also do something will skill tending a bit more to pull upward,
  maybe a bigger prestige factor when using skill.
- Some small benefit for being leading clan/clans depending on political system
- Maybe something about clan elders

## Trade

- QoL for traded goods
- Off-map flint
- Map overlay view

# Changes

# Themes

*   Some kind of being able to disagree over rites
*   Clans having views of each other with signals instead of
    blowing up relationships over a size limit
*   Cultural traits and similarity
