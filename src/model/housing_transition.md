# Plan for the housing/storage/distribution transition

Clans produce subsistence by a lognormal distribution on
ability.
x Initially they are collectors with 1.2x income per SD.
- Technologies can raise this (and in some cases lower it),
  generally within the range 1.1-1.5x.
- There is a scale bonus to production of ^(1/3-1/6) per
  capita contributing to a pot. Thus, there is a positive
  incentive to contribute as long as there is not too much
  defection or productivity difference.

Clans then decide whether to:
- Consume individually
- Contribute to an equal-sharing pot
- Contribute to an equal-sharing pot, but with lower effort

Shirking can be deterred, but there is a monitoring cost
and limited capacity. If one person detects another shirking,
they can communicate that to everyone else, but this costs
something that depends on the social network structure.
- We can tune this, but we'll say that the monitoring cost
  is k * pop ^ (1 + a), and if that's greater than 1, then
  1 / (k * pop ^ (1 + a)) fraction of actions are undeterred.
- a = 0.166 looks good.

The basic sequence is then:
- Clans generate subsistence
- Clans select their move: I, C, D
  - % of shirking allowed determines impact of D, may be 0
  - Clans select their strategy based on inclusive benefit,
    which can include both relatedness and desire for growth
- Subsistence is placed into collective and individual pots
  per move
- Subsistence is distributed from collective and individual
  pots per move
- Welfare and population change computed from distributions

We'll want to clearly visualize their moves and the relevant
metrics. Also probably the history of moves.

Once the base model is running, we could add personality traits
for clans to give them more variability in strategy.

Limits to village size:
- Commute penalty to productivity based on sqrt(size)
- Interaction stress penalty for interpersonal and inter-clan
  issues
