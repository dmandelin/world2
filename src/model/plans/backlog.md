## Key next themes

Get the current feature set working decently well:

*   Fix/flesh out the existing submodels. They more or less work, but
    have missing features and bugs. They don't have to be perfect, but
    they should be "good enough" before doing much else.

    *   Rituals
        
        *   Make it easier to tell where the ritual satisfaction
            actually comes from
        *   Disagreement dynamics for any disagreement over ritual
            leader selection

    *   Production

        *   Use the new disagreement and culture concepts to model
            choices about collective production methods. 

    *   Trade

        *   Inter-village trade
        *   Inter-cluster trade
        *   Off-map trade

*   Improve graphs and visualizations. These can be for the most part
    rough, because the data model is very complicated and it would be
    hard to make a great UI for all of it. But at least it should be
    possible to read actual population numbers off the graph.

Next, make social learning complex and dynamic:

*   Have the prestige model do something more interesting than blowing
    up when the population goes over 300. Exactly what is TBD, but it
    could include clans using more status markers (such as fine pottery
    or semiprecious gems), clans losing partial information about each
    other, and clans grouping into neighborhoods.
    *   This makes the social learning model dynamic: rather than simply
        learning from people in the same village, clans may change who
        they learn from, and it gives people reasons to signal to each
        other.
*   Add cultural traits (e.g., technologies, home life practices, ritual
    practices, mythos elements) that can be possessed or not by each
    clan and model their spread.
    *   This really gives the social learning model something to learn,
        and models culture change through society (aka archaeological
        horizons).

## Top top needs

-   We need to rework economic production somewhat. It's going to get
    annoying adding a new trade good
    -   Let's clearly separate out all the different notional concepts:
        - ProductionNode: labor and input materials go in, services and
          materials come out via some kind of output port.
        - DistributionNode: stuff goes in and then back out
        - ConsumptionNode: stuff goes in
    -   Initial model
        - Land held in common by the village, thus one production node
        - Clan could hold back a little stuff/eat on the spot, could
          model that but not high priority
        - Village store is a distribution node
        - Clans are consumption nodes

-   Epic sequence: add one social change at a time, fixing up systems as
    needed to make it work
    x   Permanent settlements
    -   Marshland economy
        x   Add fishing skill
        *   Fix bug in consumption distribution
        *   Make sure migration effects take place at the right point
        *   Add fish production
            x   Initially assume 50/50 effort split
            x   Add basic fish production
            *   Some environmental variation but different from agriculture
            *   Less production penalty for shifting settlements
        *   Add fish consumption
            x   Initially make it a perfect substitute for cereals
            *   Balanced diet better than either/or but don't have to fuss massively
                as they both represent broader spectra
        *   Add a farmer/fisher trait, allow learning and assimilation
            *   Economies of scale for concentration
            *   Better learning if specialized
            *   Production depends on effort ratio between activities
            *   Learning depends on effort ratio between activities
        *   Add new economic policy options as needed

-   D1 refinements to recent changes
    -   Permanent settlements
        -   Track a shift frequency and declare when the settlement is permanent
        -   Refine the model, how quality works, etc

-   D2 general refinements
    -   Rework baselines so that appeal is more often positive    

-   D2 refinements to recent changes
    -   Permanent settlements
        -   Labor costs for infrastructure projects
        -   Clans can decide to ditch or not and track biggest flood seen

-   More icons for clan card, looks a lot better that way.

-   Fix issues with ritual satisfaction having a very unobvious relationship
    with the values in the rites panel.

x   Epic: Blast out all the key components of the new migration model.
-   Epic: Get to at least 3 interesting and legible graphs. Ideas:
    x   Existing main page graph: show actual data values
    -   Scatter plot with correlation between prestige and QoL
    -   Clan timeline showing history of population, QoL, and residence
        x handle ID vs name issue
        x show basic timeline
        x add second Y axis support
        - add event markers

-   Refinements to the new migration model:
    -   Make abandoned daughter villages go away eventually
    -   Make clans that just split off more likely to move
        -   Also move splitting to plan/review model
    -   Have one clan moving out of a settlement potentially trigger others

## Top needs

- Docs
  - instructions for prereqs
  - bibliography
- Fix seniority
    present in the settlement, up to a max of 4
  - add relative rank for fully tenured clans (conditional on some cultural move?)
- More ritual options
  - give option to attend other clan rituals
  - distribute attendance according to appeal
  - collect total ritual consumption per clan and display
  - add settlement cluster ritual
    
- Small items
  - some migrations not showing as notifications
  - notifications for clans dying out or merging

## Learning and status

### Items

- General items we'll need
  - Model how much clans are able to pay attention to each other
  - Desired rituals/roles/laws structure and sat/dissat with present state
  - Conflict over rituals/roles/laws
  - Have daughter settlements interact somehow -- allow mutual trade and/or
    learning

- Small but important
  - scale bonuses for learning in settlements
  - connectivity bonuses for related settlements
  - merge annals and notetaker
  - trade good effects
  - ritual side effects: +health, +relatedness, +monitoring, +learning

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

- Better display of hamlets
  - properly update settlement selection in all cases
  - enhance buttonpanel
    - smaller font or different size or format so buttons look better here
    - better layout options

- Problems inflicting our people in recent tests:
  - prestige of new junior clans craters as they can be many steps down
  - clans with more ritual skill may have a hard time gaining prestige if
    small or low in traits

- Smaller updates
  - Fix super-low consumption on migration
  - Use population-weighted averages for baselines where appropriate
  - Clean up field names and redundancy in ClanImpact

- Help villages with low subsistence

- Help villages with bad rites
  - debug selection options: current selection doesn't appear neutral
  - lose more information about prestige when things get too big

  - for each clan, record their actual preference for
    leadership selection, possibly including favorability
    of each item
  - add qol penalty for non-agreement
  - add conservatism to leadership selection
    - give the current choice more weight
  - add conformity to leadership selection
    - adjust weights to be more similar to other clans
  - add some noise to leadership selection
    - random noise to weights

  - show leadership selection on map
  - apply society effects for disagreements and/or not getting way on
    leadership selection methods
  - allow a one-time gift to override a small disagreement

  - option to increase the authority of offices
  - option to travel more to pick up new practices
  - option to experiment more with new practices
  - option to modify rituals for scale so that some people
    become observers (and other role splits)
  - structural elements to add to elaborate the ritual
    - will affect quality, prestige, etc
    - may have skill thresholds
    - may have trade good requirements
    - effects wear off over time
  - option to build new types of ritual building

  - different structure options:
    - implement roles having different effects on prestige, quality, and skill gain
      x first, show expected skill changes to make it clearer what's going on
    - give villages the option to switch structure
    - add notifications to show ritual structure changes
  - get people do a better job moving out if the rites are all messed up
  - make ritual skill increase faster/more than farming skill since elaboration is free
  - (P2) option to invite another village to help

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
