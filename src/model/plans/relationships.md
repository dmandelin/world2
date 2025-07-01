# Relationships among clans

Each clan has an opinion of the prestige of other clans it
knows about. This is based on observable factors and also
learned from ancestors and peers. Prestige represents how
much one clan views the other as a model to follow.

## Scaling prestige opinions

Clans get information about each other mainly from direct
interactions and gossip. One clan can maintain full 
relationships with about 250 other people (of all ages) or
5 other clans.

For now, we'll assume that each clan chooses up to 5 other
neighbors to form opinions of and gets a default "strangers"
opinion of any others.

*   This may directly impact QoL if people want to know 
    everyone in the village.
*   Knowledge of parent/cadet relationships can be lost.

## Disagreements

Clans can disagree over things:

*   Modeled decisions and practices: e.g., collective
    production methods
*   Random or abstracted social conflicts: e.g., resolution
    of an interpersonal dispute

Disagreements may cause:

*   Reductions in QoL
*   Reductions in prestige opinion
*   Reductions in productivity of a common activity

### Random disagreements

We can use this to create a background amount of conflict
that will induce village fission. Due to a random event
an issue may arise requiring clans to choose A or B. The
obvious choice would be a conflict between two clans, but
keep in mind the issues will naturally expand.

Clans will try to resolve disagreements through the consensus
process: let their opinions evolve until everyone agrees.
However, it's possible they'll evolve toward two factions,
or just bounce around without resolving. Meanwhile, people
will have a chance of moving out due to the QoL penalty
from disagreement, so that will tend to eventually happen.

### Potentially visible disagreements

As an example, let's say one clan develops a new opinion
about the proper ritual leadership selection option. We can
have a disagreement penalty that goes with a(1 - a), where
a is the fraction of clans with the new opinion. Thus, one
outlier doesn't create too much pressure for anyone to
leave but the outlier (if they're getting prestige penalties),
but a 50/50 split creates high pressure to break up.

Clans can learn new ritual leadership selection options from
each other, so eventually one clan's choice may grow.