# System for clans' perceptions of each other

The basic idea will be that clans can have various numerical
ratings of each other as well as other perceptions. I'll outline
what we could do with just one rating, then what we could do
with additional ratings

## Primary rating: relatedness

If there's just one rating, it will be relatedness, similar
to Hamilton's r, a coefficient of how much one clan thinks
it shares stakes with another.
- Direct clan relationships will produce significant r, perhaps
  0.25 for each hop.
- Shared production pools also generate r, a little more than
  1/n, accounting for direct sharing, returns to scale, and
  good will.
- Increasing or decreasing returns to scale also generate
  positive or negative r. 
- Local cooperation generates r.

Relatedness may have various effects, but at the very least:
- We'll show it in the UI so we can get an idea of how these
  clans relate.
- Clans will give each other some gifts according to the other
  clan's r.

## Secondary rating: power

This one is secondary mainly because at first, clans don't
have that much variation in power level. However, there will
be some difference.

This value really works as a nonnegative coefficient applied 
to relatedness, to see how much we have to care about the 
relationship.

## Further splits

That might cover everything. We could split out things like
how much total power we think they have vs how much they'll
apply toward us, or benevolence separate from relatedness,
but I think those would be internal compute steps. Relatedness
and relevance seem to cover the behaviors.