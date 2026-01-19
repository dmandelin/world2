The skill change model needs some updates for these problems:

*   Processes such as stone tool manufacture could stay the same
    for a long time. The current model has way too much noise for
    that ever to happen.
*   Maximum skill tends to be capped at a number that's around 50
    with not much information about exactly what the cap is, why
    that's the cap, or how clans could go beyond.

Those features emerged from decisions made to model certain ideas
of skill loss, but it's not clear those ideas are even that important
for the goals. So it's time for a fresh look.

Initial things to care about:

*   Clear idea of what current skill maximum is
*   Some idea of what skill growth rate is
*   Diminishing returns to learning
*   Diffusion from the north
*   Whether to discretize things. Continuous averaging implies
    everyone's always doing some mushy combination of ideas,
    which may or may not make sense.

Random thoughts:
*   maybe 10-20% / millennium productivity growth?
*   domestication will be a major factor and that can be somewhat continuous
*   need to understand agricultural intensification and its relationship
    to innovation

Thinking things through:

*   We can imagine various changes in how people do things:
    *   Small or not so small changes in using an existing tool kit.
        For example, different exercise practices. These are small
        variations that many practitioners could dream up. The effects
        may or may not be that obvious.
    *   Bigger jumps that are not so easy to think of, or have
        preconditions. For example, it appears people did huge amounts
        of math without ever coming to the modern concept of zero as
        a number. That may have been a rare idea and/or depended on
        some preconditions like a certain number of people doing a
        certain amount of algebra.
    *   Necessity-based innovation. Need doesn't automatically cause
        innovation, but it increases the incentive to try new things
    *   The key problem for now is simply to get irrigation skill high
        enough for permanent settlements.
        TODO - make some decisions about what the skill basis is

*   Expanding populations and how this interacts
    *   Group sizes were initially small, and we imagine they were using
        naturally occurring alluvial farms that shifted in location.
    *   But they wanted to avoid floods wiping out their crops, so they
        gained skill in flood control. They could also use it to even out
        water supply.
    *   As population increased naturally, they would want more farmland,
        so they would start using their skills to irrigate areas nearby.
        *   At first, this could probably be increased skill with the same
            technology, but maybe that's not quite right. Think it through:
            *   One nice model of skill is that it's what % of possible
                tricks of the trade you've learned.
                *   It probably is reasonable to think of "small scale
                    water management" as a skill set that encompasses
                    both things
                    *   But then we have to say, once they've mastered
                        flood control (or whatever current needs are),
                        they gain further skill very slowly until there's
                        a real need
                *   The alternative would be to add a flag for having
                    irrigation. Then it becomes a lot less obvious how
                    to manage that skill model.
                *   What might be more usable at some point is to think
                    of certain innovations as obsoleting older knowledge,
                    so then we can have TFP go up but skill down.
                *   Thinking ahead to large-scale irrigation, apparently
                    it's a distinct skill.
                    *   One option is then to add it as a new skill. Small-
                        scale skill may convert over to some extent.
                    *   We could also subsume them. Then, we'd lower skill
                        with the change, but give a bonus applying to the
                        "easier" tasks.

*   How does development depend on amount of practice?
    *   For domestication, we might imagine that there's some variance
        in plant traits, and farmers "try" (intentionally or not) to
        choose more favorable plants for the next generation.
    *   This would tend to produce a change proportional to the standard
        deviation in the available traits.
    *   Then ideally improvement would scale with the square root of the
        number of crops grown, but in practice people might not be able
        to compare and communicate so accurately.

*   Skill level of practioners
    *   Consider a skill where the kit is well developed, so that experts
        have a skill level near 100. Then an apprentice (1/3 of learning
        done) would have a skill level of 60 and a journeyman around 90.
    *   A much easier skill with less to learn might have 10/20/30 for
        the levels, or 20/35/50, or 30/50/70.
    *   So around 10 points per rank for less developed skills, 20 for
        highly developed.
    *   Vaguely 2x difference for basic vs able practitioner seems reasonable,
        maybe 1/2-1/4x for punter depending on difficulty curve
    *   Implies around a 3% productivity difference per skill point.

*   Our time period
    *   Since skill is % tricks of the trade, the actual value completely
        depends on the reference definition of "the trade".
    *   For the moment, we'll take that to be "early Ubaid stuff"; it
        seems not too much was introduced in fundamental tech kit but
        there could be increasing diffusion from the north and certain
        local adaptations and changes, maybe worth 3-7 skill points
        over 50 turns = 1 skill point innovation per 10 turns (or 200
        years). Seems vaguely reasonable, and at that rate of improvement
        maybe most people get most stuff via diffusion.
    *   Naively carrying that over to irrigation we get the same idea
        but it's probably a lot less developed. Could be 1/10 the learning
        cost. Thus, they could gain a meaningful skill point each turn.
    *   Maybe then apprentice to master is going from minimal flood control
        to reliable. Since it's on the low end maybe that's 20-30 skill
        points, or around that many turns (400-600 years), which seems
        very workable.

Trying to make some decisions:

x   Let's rebase skill to 100 with discrete 1-point steps.
x   Adjust skill change details per notes above
x   Update migration calculation

Further stuff to figure out/do

*   Tune error vs improvement, get some sense of learning rates
*   Update productivity calculations
*   Bring back expected loss/gain calculations
*   Somehow get settlements stabler -- they still can't quite manage
    to stay the same place for that long

## Tuning experiments

Base experiments go for 50 turns with 5 "clans".

*   10% learning up or down with equal-chance adoption
    *   Skill can go up or down during the time, by maybe 1-5
        points. There's no upward bias, so it should be a sort
        of random walk.
*   10% learning up only with equal-chance adoption
    *   Skill goes up 3-5 points. 
    *   It takes a few tries for skill improvements to be adopted,
        so the benefit of imitation is limited.
*   10% learning up or down with always adoption of best
    *   Dramatic improvement: skill goes up 15 points
    *   Given that each clan gets about 15 points total, apparently
        they adopted on around 12 turns.
    *   That leaves 38 turns to possibly improve, and there we'd
        expect 3-4 points of learning per clan
*   10% learning up or down with 2x weight for best
    *   5-10 points total
    *   Roughly 50% faster learning than all alone, not bad
    *   Similar result if we use 2 ** skill
*   10% learning up or down with 5x weight for best
    *   10-15 points total
*   10% learning up or down with 1.3x weight for best
    *   0-10 points: not much better than equal-chance
    *   Have to go to at least 1.7 to see significant difference
        with equal-chance adoption
*   20% learning up or down with 2 ** skill weighting
    *   10-20 points total
    *   proportional with 10% version
    *   similar proportionality with 5% version

From the above, we have some basic notions of how learning and
adoption parameters influence the overall rate. Another point
that comes up is migration: newcomers tend to arrive with lower
skill, so this will tend to retard skill growth, but now much?

For migration experiments, there's a probability that a random
"clan" will be replaced by one with fewer skill points each turn.

*   10% migration chance, -1 skill on migration
    *   7-10 points total, seems no worse than without migration
*   50% migration chance, -1 skill
    *   5-10 points total, still not much difference
    *   It seems such a small penalty is easily washed out
*   50% migration chance, -3 skill
    *   3-8, although still some 10s
    *   Clans can learn 3 per turn so that's easily washed out
*   50% migration chance, -10 skill
    *   0-10, but with lots of variance among clans, presumably
        from recent replacements
*   50% migration chance, -3 skill, limit imitating 1 point/turn
    *   0-10, but with less variance
    *   key seems to be that if it takes newcomers multiple turns
        to learn, incumbents will imitate them and regress unless
        there's an effect for that

We haven't looked too much at biasing learning as going up or down.
Turn migration off and try that.

*   10% up, 1% down, 2 ** skill imitation
    *   about 10
*   10% up, 2% down
    *   7-10
*   10% up, 5% down
    *   8-10

Not too sensitive to this, apparently because regressions are usually
quickly learned back. So, we can expect errors to be better corrected
in larger groups. Group size was the next thing to try anyway. Here
we'll use 10% up, 10% down, 2 ** skill.

*   1 clan
    *   Growth varies but it averages 0: random walk
*   3 clans
    *   5-10, similar to 5, maybe slightly lower
*   7 clans
    *   7-13, somewhat higher
    *   10 clans is a similar result
*   20 clans
    *   10-15, almost double the 5-clan result
    *   Corresponds to an exponent around 0.3, a bit high but not
        too bad

In the full model, the higher skill is, the harder it is to gain
and the easier it is to lose, which can create a natural equilibrium,
but with imitation, maybe those can be washed out. So let's try
a downward bias and see if #clans can counter that.

*   10% down, 5% up
    *   1 clan: -2 to -3
    *   5 clans: 1-10, still positive but lower
    *   20 clans: about 10, still positive but lower
*   10% down, 2% up
    *   1 clan: -2 to -6
    *   5 clans: 0-1, but once was 4
    *   20 clans: 5, still positive but substantially lower
*   10% down, 1% up
    *   1 clan: -4 to -6
    *   5 clans: 0
    *   20 clans: 3-5
        *   With 20 clans, it's practically impossible to get them
            to regress

Now, we're looking for skill change about like this in the first
50 turns:

*    5 points farming
*   20 points irrigation

In general, there doesn't seem to be any reason for different skills
to have the same learning curve, so we could scale arbitrarily. And
given that farming keeps improving over time, there's no reason we
have to be near any sort of ceiling; but the total productivity gain
ever with preindustrial agriculture will be only so much, vaguely 2x.
That's about 25 skill points, so we could start at skill 75, which
is a 3-1 down/up bias.

*   We get 3-7 points if we use 10% migration, 2 ** skill, and
    5% up/15% down

*   If we use the opposite bias (for irrigation), we get around 10
    points, which is not enough
    *   Might be a reasonable amount of learning; could retune
        flood control calculations to match
    *   It also seems reasonble to make learning significantly
        easier at the bottom end. 2.5x faster seems to get us
        there in this case
