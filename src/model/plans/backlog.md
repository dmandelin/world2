## Key next themes

Get the current feature set working decently well:

*   Fix/flesh out the existing submodels. They more or less work, but
    have missing features and bugs. They don't have to be perfect, but
    they should be "good enough" before doing much else.
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

## Top needs

- Docs
  x README
  - instructions for prereqs
  - bibliography
- Fix seniority
  x change seniority to a rating of how many turns the clan has been
    present in the settlement, up to a max of 4
  x make seniority prestige based on value relative to average like others
  - add relative rank for fully tenured clans (conditional on some cultural move?)
- Fix migration
  - idea: go by average QoL and see if there is a different settlement
    that has higher average QoL -- don't assume total information
  - higher reluctance to move to a different cluster than to a different
    village in the same cluster
  - fix messed up consumption and satisfaction values on migration
- More ritual options
  - give option to attend other clan rituals
  - distribute attendance according to appeal
  - collect total ritual consumption per clan and display
  - add settlement cluster ritual
    
- Small items
  - some migrations not showing as notifications
  - notifications for clans dying out or merging

## Original settlement

- Start out people as semi-nomadic

## Learning and status

### Items

- General items we'll need
  x Recenter prestige to zero: we already did that with QoL, will help
    make comparisons more cogent.
  - Fix up migration code after deleting obsolete things it depends on
    x Migrate based on crowding
    - Show reason for migration in notification
    - Also consider relative status
    - Also consider ritual quality
    - Use Boltzmann model
  - Model how much clans are able to pay attention to each other
  - Desired rituals/roles/laws structure and sat/dissat with present state
  - Conflict over rituals/roles/laws
  - Have daughter settlements interact somehow -- allow mutual trade and/or
    learning

- Small but important
  - more reticence to emigrate to a different cluster / or allow migrating to cluster
  - scale bonuses for learning in settlements
  - connectivity bonuses for related settlements
  - merge annals and notetaker
  - trade good effects
  - ritual side effects: +health, +relatedness, +monitoring, +learning


- Introduce new ritual model
  x different rituals at same granularity as production pot
    - later allow option for subsets of clans or multiple clans
  x calculate appeal for each one
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
  x new views
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
  x allow them to actually change leadership selection

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
    x add ritual lens to map for visualizations
    - implement roles having different effects on prestige, quality, and skill gain
      x first, show expected skill changes to make it clearer what's going on
    - give villages the option to switch structure
    - add notifications to show ritual structure changes
  - get people do a better job moving out if the rites are all messed up
  - make ritual skill increase faster/more than farming skill since elaboration is free
  - (P2) option to invite another village to help

- Fix up learning model
  x verify tuning of basic changes
  x overhaul learning model to get continuity and learning rates
  - have it depend on population pyramid
  - add breakthroughs
  - give a bigger self weight bonus for education vs imitation

- Give people preferences for different settlement types, which can change
- Make coordination costs and scale effects more dynamic, 
  e.g., dependent on settlement relations

Understanding results:
x Historical graphs of key numbers
  x Include satisfaction subscores
- Lenses: show ritual quality and other things on map
- Visualization of leading clans over time
- Display clan moves again

Liveliness:
- Thumbnails or backgrounds to represent settlement or clan

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
