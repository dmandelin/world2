# Next steps

## Bug fixes

-   Fix bug with super-high or infinity consumption amounts
-   Re-fix consumption distribution bug

## New base models

-   Demographics
-   Appeal
-   Happiness

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