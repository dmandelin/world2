# Norms

After getting the first three social changes in place, the next
step will be to layer a norms model onto them.

# Expectations and norms

Expectations are things that agents (clans) believe to be true
about the world. For example, they could have an expected type
of house and level of meat consumption. What effects that has
depends on the kind of expectation. 

Norms are expectations that agents want to enforce. For example,
they could have a norm that every clan participates equally in
major rituals. Clans will tend to punish norm violators, e.g.,
by reducing the prestige they grant.

# Norms in small-scale societies

In some societies, such as many hunter-gatherers, there is an
norm that no father may command another, which implies no human
legislating. Norms are often attributed to ancestors or other 
powerful beings.

Norms do of course still change sometimes. Perhaps some people
start violating the norms and others eventually follow, creating
a new norm. Perhaps practices drift without anyone entirely
noticing. Or a change in the environment may make the old normal
behavior impossible.

As societies become denser (e.g., villages), this probably changes
somewhat. There are more people, and they're modifying the local
environment more, so the original norm-changing processes happen
faster. That would get people used to the idea of more change,
although I think they were still quite conservative.

Also, if village councils and assemblies meet more often, people
may have more of a sense of controlling their own destiny on
things that they decide as part of everyday life, such as land
management.

If inequalities of influence grow, then some people or roles may
be able to induce changes in norms more easily. They still wouldn't
easily be able to change core norms, but they could lead fashions
and technological innovation.

## Norms by marker

There might be different norms applied to people with different
noticeable markers, e.g., farmers and herders.

## Freedom

People living together with incompatible norms might continue
to conflict, all change to match, or decide to live and let live.

## Strictness

Some norms are pretty strict, meaning high punishment if violated,
while others get only soft sanctions.

# Expectations and happiness

We can use expectations to normalize quality of life. But then
we should probably split out:

*   Standard of living: a relatively "objective" metric of how
    much desirable stuff they're getting
*   Happiness: Standard of living relative to expectations
*   Quality of life/flourishing/health: the measure directly
    relevant to the demographic model, standard of living
    corrected for harmful but desirable goods with some happiness
    mixed in.

The current QoL calculations will become standard of living.
Expectations will be used to get happiness. At first quality
of life will still be basically the same as standard of living,
but we probably do want to mix in happiness a little.

# Changing prestige

The prestige formula is currently fixed, but we can think of
that as norms that could change as well.

We can also update prestige based on correlations with other
factors (including prestige). So, if farming starts to yield
a lot more QoL than fishing, maybe its prestige starts to rise.

# Attitudes

The changing prestige model implies that the prestige effects of
not matching a norm can float. It should help to define an
"attitude" value and then prestige and other related effects can
be applied proportionally.

# Expectations and norms by example

## Housing

Here we can imagine that for most clans, the starting norm is to
prefer medium-level houses, the current preference in the north.
So that should be their expectation, with QoL penalty if not met.

There might be some who prefer simpler housing to go with older
lifestyles.

I don't think there will be too much judgment of each other on
these in terms of norms, but there probably is a soft prestige
factor.

## Farming vs fishing

At first we'll say that there are no particular expectations. But
we'll give people some visibility into who is collecting how much
stuff, and grant more prestige to those who do more. 

Then, if we imagine that people can tell whether someone is a
farmer or fisher (typical clothes or looks or something), we can 
have that start to affect the general relative prestige of farmers
and fishers.

In the villages, we probably don't need to update the functions
because everyone knows everyone, but they can influence the original
prestige assigned. Or, maybe we should update the functions since
that helps people smooth out knowledge. That implies that prestige
effects of contributions are relative to expectations (which will
avoid double-counting).

As settlements grow, those correlations will start to become more
important. People can learn them from nearby groups or each other,
then apply it to people they don't know who have the markers.

## Clay figurines

We could have these as a starting expectation, but let's say
they're newly introduced. We can have the other clans make a
"reaction roll" to determine their norm, as in what plus or minus
to prestige and QoL they assign the item.

