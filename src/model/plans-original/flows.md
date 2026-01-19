Looks like we'll have to bring back fairly detailed modeling
of the movement of goods. I thought we could do trade as
binaries, but we need to be able to track it through different
distribution models, and it seems like it will get very
annoying if I try to hack up something simple.

Maybe I can design some things related to trade and religion
at the same time and perhaps simplify a bit.

# Initial discussion

- People produce stuff
  - at a production site
  - into an inventory
    - village
    - clan
- People consume stuff from inventory
  - village inventory shared out per capita

## Goods

### Bringing in a few at a time

- Subsistence: balanced consumption basket
  - Produced on the land
- Flint: up to 1/capita gives +50% farm labor
  - Not produced on the initial map
  - There are trade partners available in the
    Zagros who will take exportables for flint
  - Uses kin-based trade
- Exportables: anything else, can trade for flint
  or keep for small QoL benefit.
  - +1 QoL for other exportables

Transaction costs
- Distance-based component, can start with:
  - inter-city: (bulk/5)%
  - off-map: (bulk/2)%
- Trade volume limited by trade infrastructure
  and practices
  - Kin-based trade: trade up to pop * bulk / 100

### A bit more on status

Clans aren't necessarily able to observe each others'
ability scores directly. They do know each other, but
consider a work group of 100+ people: people won't
have incredibly detailed observations of each person's
work. (Relationship gossip is more effective, because
a few key events or actions have outsized impact, vs
economic production which has many micro-decisions).

And at the beginning, with communal production, it
won't matter too much. But we could have a feature where
people influence each other, so that they gain or lose
skill from nearby farmers. Later they could differentiate
status and imitate the more successful farmers.

We should probably introduce new prestige values now.
The relatedness value could still have use, but it can't
really capture changes from arbitrary sources. It should
still be dyadic, but we should have prestige ratings
influence each other.

### Bringing in more

We don't have to bring in all these points right away. We
can think about when they add something interesting to the
model.

- Foods
  - Cereals
    - Produced in fields
  - Livestock
    - Produced in pastures
  - Fish
    - Produced in fisheries
- Foods consumption model
  - Will have to come up with some annoyingly complicated
    thing again
  - Livestock and fish are substitutes, but having some of
    each is better
  - Cereals and animal products are complements
  - Subsistence is the most nutritious

- Supplies
  - Reed products: mats and the like
    - Produced in marshes
  - Bitumen: adhesive, sealant
    - Produced in tar pits
    - Need small amounts but relatively high demand
  - Obsidian
    - Exported from Zagros Mountains
    - Need small amounts but relatively high demand
- Consumption model
  - We'll assume that these items aren't essential, because
    people can find substitutes or scrounge tiny amounts.
  - It's a little hard to characterize the importance at
    this point, but maybe let's say each is worth 1-3 QoL
    in full amount.

- Decorations
  - Shell beads: have to think about what these are for

