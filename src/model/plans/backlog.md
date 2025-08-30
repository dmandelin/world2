# Next steps

## Next items in latest plans

-   Latest observations:
    -   Clans can now randomly reallocate labor if hungry, which is in fact
        enough to get them doing more agriculture.
    -   Population now grows to about 300, but at that point it slows down
        for reasons that are somewhat unclear. So we need to figure that out.
        But running low on local farmland is probably part of the issue, so
        we should restore the ability to found new villages.

-   Themes
    -   Give people ways to raise their appeal
        x   Simple model for switching farming/gathering labor allocation
        -   Ability to found new villages when crowded or low on farmland
            x   Basic ability to found new villages
            x   Have fishing in villages in a cluster use the same land
            -   Make people a little more reluctant to move so they're not
                all departing at once for a small benefit
            -   Prune empty villages
            -   Give a bit more preference for leading village of cluster
    -   More detail on population change factors
        x   Did a bunch of this
        -   Disease load detail
    -   More aggregate data displays and general display improvements
        x   Did a demographics panel for this
        x   Show percentage of farming allocation in main view
        x   Move averages/totals to start so they're easier to see
        x   Show per capita subsistence in convenient places
        -   More as needed
    -   Consider working in some absolute effects for survival goods in 
        happiness model
        -   In general, index to what's possible, so that the benchmark for
            status is the area average, not the clan's history only.
        -   Maybe a similar principle can be used for survival goods, make
            the downward adjustment relatively slow and keep "subsisting
            reasonably well" as a floor that's hard to go below

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
    x   Show happiness separate from welfare
    x   Show subsistence separate from welfare
    x   Actually show welfare instead of qol
    x   Tooltip for subsistence
    x   Tooltip for welfare
    x   Retire qol code (need to implement any missing pieces first)
    x   Show birth and death rate modifier details
    -   Colorization for happiness table
    x   Show disease load and graph
    -   Show disease load calculations

-   Happiness updates
    x   Learn expectations for rituals
    x   Food quality
        x   Also food quality for population/health effects
    x   Learn expectations for subsistence
    x   Learn expectations for flooding
    -   Show values happiness factors are derived from in the table
    -   Normalize status or learn expectations
    -   Consider idiosyncratic factor

-   Consider getting a settlement display: reviewing the different
    clan displays ends up being a lot of data
    -   Or break out population into its own tab
    -   Can start simple, with just a few items
        x   Display welfare and happiness for settlement

-   Move effects
    -   For shifts
        x   Birth rate decrease, smaller death rate increase
        x   Productivity decrease
        x   Appeal/happiness effects
    -   Add back intentional moves, with effects
        -   Get clear sequencing in the model

-   Farming options: population doesn't grow much because they don't
    start farming more
    -   Thinking this through:
        -   We could just say clans randomly shift food strategies if
            unhappy about their food: they'd eventually get to the
            right place.
        -   It's not clear clans would have a bias either way, though
            they might, so we might want an idiosyncratic factor
        -   However, since turns are 20 years, there's a decent chance
            clans would iterate to the right place in less than one
            turn. So they can get some information. Without close
            coordination, they wouldn't necessarily experiment all
            together, though, so we can give them a fairly moderate
            chance of success.
        -   Another point is religion: if they're investing a lot in
            farming-related rituals, then it should be a more appealing
            choice.
        -   At some point we might want to let clans coordinate on these
            choices with various effects, but we can leave that a
            something to add to help them solve problems for now
    -   Calculate appeal for labor allocation shifts
        -   Start with appeal of output, but scaled down 50% to account
            for limited knowledge.
            -   Limit knowledge even more for anonymity
        -   Ritual bonus for appeal: can start as a constant, because
            there isn't any particular reason to assume differences
            there.
            -   It would make sense to make this proportional to ritual
                appeal. The idea is that ritual and farming are linked,
                so that doing less farming equals less ritual effect
                (and vice versa?) and thus ritual appeal should count in
                the decision. Could be greatly scaled down, though, tune
                as needed.
    -   Trigger change if food happiness is negative
        -   Don't need to bother with prospective changes yet, because
            the effects will be pretty diluted anyway.


-   Settlement permanance
    -   Options for usage level
    -   Display usage levels on map and panels
    -   More prominent notifications for key firsts
-   Further sub-items

-   Dynamically scale happiness graphs so they're easier to read

## Bug fixes

-   Clean up production table code, especially for construction items

## Recent issues

-   Growing settlements max out foraging and then don't reallocate labor.
    -   It may not be completely obvious to them that there's overforaging,
        but they might be aware, especially if massively overforaged.
    -   We need to think about what people could see and understand in
        this case and how they'll learn to change.

-   It's slowly seeming more important to have a real happiness metric.
    Will need to think about how to get started on that.

## Bringing it to life

Updating for the new models is going reasonably well, but the updated
version isn't coming to life yet. We need to think about what that
means, but starting points could be:

-   More clearly showing new things arriving and trends building
-   Narrative components, possibly AI-based
-   More graphics and visuals

## Housing

-   Show birth and death rate modifiers more clearly in the UI
-   Visualize move history and settlement permanence in the UI
-   Settlement shifting effects
    -   Better farming production and birth rate for staying still

Remaining items can go along with food production shifts, because
people won't want bigger houses until they're better fed, for the
most part.

x   Update ditching labor model
-   Update housing effects
    x   Prestige and internal solidarity
    x   Shelter and comfort: +appeal, +births, -deaths
    -   Storage: can reserve family storage
    -   Workshops: can expand craft production
-   Update housing decisions
    x   Switch to appeal model
    -   Give people a way to learn which is better
    -   Make people more likely to upgrade if they have enough food
-   Introduce a way to change the skill basis for different types
        of housing
x   Show construction labor allocations more clearly in the UI
-   Idiosyncratic appeal

## Food production shifts

Key stuff to think about:

-   Variable yield per production type, so doing a bit of both helps
-   Lean times: with baseline foraging, there will sometimes be lean times
    that are particularly hard, or lean times will impact weaker clan members.
    The chance to save lives will create an appeal for stored food
-   Also think about shifts to clan-based production and storage

Backlog items:

x   Consumption limit for fishing
x   Max production for fishing: start with fixed
x   Make sure learning is proportional to labor experience
x   Make sure disease load is proportional to farming amounts
    x   UI for disease load
    x   Include farming activity in disease load
    x   Disease load from clans boosts each other
*   Behavior shifts:
    *   Assume a strong motivation to get consumption up from 0.9 to 1.0.
    *   In communal production, producing the cereals to make that happen
        is awarded prestige by the other clans, if they can see.
    *   For now, that might be enough, as eventually population growth
        will induce them to scale up. But things will become different
        with different distribution models, specialization opportunities,
        and trade opportunities.

## New base models

-   Demographics
    x   Establish new basic demographic model
    x   Do splits and merges at the start of the turn so that we can mainly
        use the normal turn update logic rather than error-prone special
        processing.
    x   Fix bug with wacky consumption amounts
    x   Definitively fix bug with hazards
    -   Add in more terms from old QoL to have an effect
    -   Display more background on disease calculations
    -   Tune disease load
-   Appeal
-   Happiness

-   Applying the new base models to the initial three shifts
    
# On deck

-   Permanent settlements
    -   Track a shift frequency and declare when the settlement is permanent
    -   Refine the model, how quality works, etc
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

-   Add back temporary qol effect of migration
-   Production
    -   Different variance for fishing and farming
    -   Effects of variance and sharing
    -   Production penalty for shifting farming
-   More icons for clan card, looks a lot better that way.
-   Refinements to the new migration model:
    -   Make abandoned daughter villages go away eventually
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

*   Norms and expectations
*   Some kind of being able to disagree over rites
*   Clans having views of each other with signals instead of
    blowing up relationships over a size limit
*   Cultural traits and similarity
*   Trend reporting on social changes

# Discussion

We have a set of interacting models, and clans can make a few cultural
changes. This seems close to some meaningful atom, but it's not quite
there yet: it's too rough around the edges and there are a few missing
pieces.

The cultural shifts and what we need to fill them out:

*   Housing: Main thing missing here was expectation effects, but this
    would also be better with floating prestige.
*   Farming vs fishing: Need to give them some choices over how much to
    do of each. Here we need to think really carefully about what they
    do and don't know about what works better. Also floating prestige.
*   Clay figurines: Need to actually add them, including figuring out
    what usage choices to offer. Also expectations and floating prestige.

The key themes that we need to flesh out are then:

*   Expectations, norms, and floating prestige
*   What clans really know about each other and their output
*   Trend reporting and visualizations to make cultural change understandable

We can then think, what's the simplest set of models that would bring
out all those themes. Let's start with the UI, as that's where any of 
this acquires any meaning. 

*   We already show some sort of indicator within detailed UIs, but that's
    hard to track for anything other than looking at a specific list. 
*   We can show map icons, but that might be busy with multiple changes
    in play, and doesn't show history. Perhaps we can think about showing
    major and current changes and not every last thing:
    *   "Settlement type" as a broader category
    *   Settlement economy as broad category
    *   Possible shift indicator for recent changes
    *   Could add clay figurines or ritual information as a lens
*   Trend reports: We could show an icon for each trend, with a summary
    of where it's at, notifications and visuals. Click or hover to get
    map lenses or graphs.
    *   This is the place to focus on at first.

Now, how do our clan informational aspects plug into trend reports?

*   Expectations: not immediately necessary
*   Norms: These will tend to influence trends, and norms are themselves
    trends. It seems we can start trend reports without this but will
    need soon.
*   Floating prestige: This seems not to be essential to trend reports,
    but I keep thinking about it lately, I think because it relates to
    the question of "how do people know what works" that seems all-important.
    We don't immediately need floating prestige but should at least validate
    the whole prestige model.
*   What clans know about each other: All-important to how trends work.
    It would seem we can do trend reports without this but there's little
    that will make sense without this.
*   Quality of life vs standard of living: I think the point here was
    that dissatisfaction could be a major source of behavior change, and
    to really get a handle on that, we need expectation indexing. This
    doesn't seem to be completely essential, so we could do later.

The main conclusion from that is that we need a reworked knowledge and
prestige model about as much as trend reports. Norms are the next priority,
then floating prestige and satisfaction.

The next bit of planning is to map out a minimal kernel that will generate
meaningful trend reports:

*   Basic trend reports

    x   Show UI element per trend near map
    x   Show basic data such as % adoption on the element
    *   Tooltip with origin and other details
    x   Infra: trend list 

*   Improved map trend reporting
*   New appeal-based model applied to early trends
    *   Improve early trends as needed
    *   Improve base models as needed
        *   Rites quality may depend on alignment
*   Floating prestige

More will probably come up as we go.

Problems: QoL is too low at the start and I don't understand farming vs
          fishing productivity

*   QoL is low for several reasons:
    *   Uncontrolled flooding (OK, want to see improvement)
    *   Low village ritual quality: the idea was that people are not too
        versed on the full panoply of ritual yet, but they should still
        be reasonably satisfied with their new rituals
        *   Obvious move is to make QoL effects relative to expectations
            *   Reviewing rites2.md, ritual elaboration will add specific
                elements to add appeal. Before we have that, we can basically
                assume the appeal is set. So we can assume clans' skill
                is about average, or just a bit below. 
    *   Low farming productivity: the idea was that people are not expert
        farmers yet, but if so, why are they doing any farming, or a lot
        of farming?
        *   It would make sense to start with relatively low farming ratios.
        *   We still need to come up with a reason they'd be farming at all.
            The idea could be, doing it on a small scale is worth it for
            the dietary variety.
        *   It's also possible they're looking forward to better results
            like in the north, but I think our people will want to see
            relatively short-term gains so this won't be enough by itself.
        *   We could also have relatively high farming productivity:
            *   Maybe it's extra high on the first, richest plots
            *   Or maybe it's just good, but it takes time for clans to
                be confident in farming
        * We don't have to figure out everything up front, can try and tune.