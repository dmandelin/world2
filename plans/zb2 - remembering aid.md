Clans without writing cannot keep fifty years of donation
records. Right now they do exactly that: every aid transfer
becomes a ledger entry with an exact amount, kept until it
decays past 1% of its original weight, which at a 20-year
half-life is about 133 years. A pair that trades aid every
year ends up with a hundred-odd exact figures each. That is
not how people remember favors.

How people actually remember favors:

*   A few things stand out and are recounted for decades.
    "They fed us through the flood year."
*   Everything else dissolves into a general sense of how
    things have gone lately. "They have been good to us."
*   Nobody remembers amounts. They remember roughly how big
    it felt, and that depends as much on how badly it was
    needed as on how much it was.

So: three tiers of remembering, two of which are about events
and one of which we already have.

*   Episodes - a few remembered occasions, kept individually,
    fading slowly. This is the ledger we have, but capped and
    coarsened.
*   Tally - one decaying number per pair per kind of event,
    fed by everything that happens. This is new.
*   Traits - what sort of clan they are (generous, pious).
    This is the observation system, already built.

Episodes and the tally both live in Memory, since both are
memory of things done. Traits stay in Observations, since
that is memory of what someone is like.

## Recording an event

An event stops carrying a float amount and starts carrying
two categories.

Size, from food per head of the receiving clan. One food unit
is one person's ration for a year, so these are fractions of
a year's eating for one member:

    Token      < 0.01    a gesture
    Small     0.01-0.03
    Notable   0.03-0.07
    Large     0.07-0.12
    Enormous   >= 0.12

The scale looks cramped against the unit and has to be. A
donor may only give away its surplus above a 0.8 ration, a
requester asks only for enough to reach 0.8, and that request
is split across every willing donor, so a single transfer
tops out near 0.15 per head. The bands are set against the
range aid actually occupies rather than against the unit. See
the calibration note at the end for the measurements these
came from.

Need, from the receiving clan's food per head at the time,
which is already what drives the aid request (a clan asks for
aid below 0.8):

    Comfortable  >= 1.00
    Short        0.80-1.00
    Hungry       0.60-0.80
    Desperate    < 0.60

Storing bands rather than amounts is the point: it is what a
clan could actually carry in its head, and it makes an event
tellable ("a large gift when we were starving") in a way that
"4.1 food" never was.

Note that the two parties should no longer share one entry.
What is salient to the receiver is its own need; what is
salient to the giver is what the gift cost it. Two entries
with the same event id handles this - the id already exists
for exactly this reason, and the views already coalesce on
it. Giver-side sizing (cost relative to the giver's surplus)
can come later; for now both sides can record the receiver's
view.

## The tally

Per pair, per event kind, one number:

    tally = tally * decay + inflow

Inflow for the turn is the summed weight of that turn's
events, where weight is the size band's midpoint scaled by
how badly it was needed:

    size weight    Token 0.005, Small 0.02, Notable 0.05,
                   Large 0.095, Enormous 0.16
    need factor    Comfortable 0.5, Short 1.0, Hungry 2.0,
                   Desperate 4.0

Size weights are band midpoints in the same units as the
measurement, which is what keeps a sum of weights comparable
to a sum of real amounts - useful for checking the
abstraction against ground truth.

The tally is then approximately a decayed sum of per-capita
aid, but assembled out of categories rather than
measurements. The clan is not doing arithmetic; the
arithmetic is our description of what its disposition ends up
looking like.

Decay wants to be faster than episode decay - this is
"lately", not "ever". Half-life around 10 years to start,
against 20 for aid episodes.

The tally does not travel. You cannot tell someone how
grateful you feel; you tell them an episode, or you tell them
what sort of clan you think they are.

## Episodes

Only events worth recounting become episodes. Memorability
runs off both bands - a token gift when comfortable is
forgettable, an enormous one when desperate is not:

                Comf  Short  Hungry  Desp
    Token         -      -      -      -
    Small         -      -      -      o
    Notable       -      -      o      X
    Large         -      o      X      X
    Enormous      o      X      X      X

    X = always an episode
    o = an episode if nothing better crowds it out
    - = tally only

Plus a hard cap - three or so episodes per pair per kind. On
overflow, drop the weakest by memorability times freshness.
The cap is the real fix for the unbounded ledger, and it
makes the DTO clone cheap again.

## How the two hand off

Everything feeds the tally. Episodes additionally persist. So
a big recent gift is felt twice for a while - once as fresh
gratitude, once as a remembered kindness - and then the tally
term fades out from under it over a decade and only the
episode is left.

That double count is deliberate and worth stating plainly,
because it will look like a bug during tuning. It reads as
recency weighting: a great kindness looms largest while it is
still recent. If it turns out too strong, the fix is to hold
episodes out of the tally, at the cost of a discontinuity
when an event crosses the memorability threshold.

## Effect on stats

Later phase, but this is what it is all for. Today alignment
reads only the current turn:

*   AlignmentItem.forGifts - food received this turn over
    income
*   AlignmentItem.forGenerosity - object's aid given this
    turn over its income
*   RespectItem.forGenerosity - object's aid given this turn

All three are instantaneous, which is why a clan that fed you
for twenty years is worth nothing to you in a year it happens
not to give. Replace with:

*   Gratitude - from the aid tally. Decays on its own; no
    separate alignment decay needed for this component.
*   Remembered kindness - summed over episodes, each weighted
    by memorability and freshness. Long-lived.
*   Generosity - from the observed trait, once generosity
    becomes an ObservationDef. This is the one that travels,
    and the one that lets a clan be known as generous by
    people it has never given anything to.

The third is what closes the loop with the observation
system: aid given is observable behavior, so a clan watching
its neighbors should form a view of how freely they give, and
that view should spread the way piety does.

## Implementation, in order

Part 1, the ledger:

*   Size and need bands on the event defs, with the
    classification done at record time.
*   RunningTally in Memory, one per event kind, with decay
    and per-turn inflow.
*   Memorability table, episode cap, eviction on overflow.
*   Recording splits: tally always, episode sometimes, and
    two entries per event instead of one shared.
*   Transmission retells episodes only, which it nearly does
    already - the one-year window and firsthand rule carry
    over unchanged.
*   Information panel shows the tally next to the episodes,
    and episodes show bands rather than amounts.

Part 2, the stats:

*   Gratitude and remembered-kindness alignment items
    replacing forGifts.
*   Generosity as an ObservationDef, replacing both
    forGenerosity items.
*   Retune alignment now that its inputs carry their own
    memory - the global ALPHA smoothing may be doing work
    that the tally decay should be doing instead.

## Open questions

*   Does the tally want a sign? Conflict would use the same
    structure with negative inflow, and gifts and aid might
    share one account rather than having two.
*   Should episode memorability decay, so that an old great
    kindness eventually loses its slot to a newer moderate
    one? Freshness in the eviction rule does this, but it
    means a clan can genuinely forget its founding debt.
*   Giver-side sizing needs the giver's surplus at the time,
    which we have but do not currently record.
*   What happens to the tally on a split. Episodes divide by
    the rule we just built; a scalar tally would presumably
    just be inherited by both, perhaps degraded.

## Calibration note

Measured over 147 aid events, per-capita size (fraction of a
recipient member's yearly ration):

    min 0   p25 0.01   median 0.02   p75 0.03
    p90 0.07   p95 0.08   p99 0.11   max 0.12

The whole observed range sits inside the bottom two bands.
There is a structural ceiling: a donor may only give away its
surplus above a 0.8 ration, a requester asks only for enough
to reach 0.8, and that request is split across every willing
donor. A single transfer therefore cannot much exceed about
0.15 per recipient head. Need has its own ceiling for the
same reason - aid is only requested below 0.8, so Short and
Comfortable can never appear on an aid event, though they
would on a gift.

Rescaling against that observed range, keeping size absolute
(the option taken), gives the bands above. The alternative
considered and set aside was measuring size as the share of
the shortfall a gift closed, which spans 0 to 1 by
construction and is arguably closer to how a debt is felt;
it stays available if the absolute scale proves brittle as
the economy changes.

One further constant had the same units bug and was fixed
with the rescale: unforgettableSalience, the threshold above
which both successors to a split keep an event, was 0.25 on a
quantity whose observed maximum is 0.12, so it never fired.
It is now 0.07, the Large floor, which reads as "Large and
above survives a split intact".

Still uncalibrated, and deliberately left alone: newsReach
multiplies the same raw per-capita salience, so its
contribution to the transmission exponent runs 0 to about
0.6, meaning event size barely moves how far news travels.
That gets fixed when transmission and split retention switch
over to reading the bands instead of the raw float.
