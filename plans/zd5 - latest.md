Trying to do tuning around village fission. Latest
effort is trying to get population growth back to
expected levels after various recent model changes.

Exactly why population is declining is somewhat
unclear, and some moves that you might expect to
result in more population (such as removing famine
deaths) can result in less.

One possible clue is that food consumption usually
is below 1.0. It's not that low, though, so maybe
that's not even that bad.

Things to try:

x   Make breakpoint panel options sticky across sessions

*   Note: It would make sense to give clans more ways
    not to starve, but there is not that much starvation,
    so we are probably ready to look at fission
    x   Decisions seem to reduce birth rate enough to
        cap population. So, this would be a reason to
        move out.
    *   Idea:
        x   Completely remove current migration decision
            code
        *   Add new code based entirely on something related
            to decisions penalty
            x   Get an assessment of how moving out will
                impact: what factors will tend to change and
                in what ways? How do interactions change?
            x   Perhaps give clans a threshold for how much
                decision disfavor they're willing to take
            x   And then also a threshold for how many clans
                or people they think they need to successfully
                form a new community
            *   (Add option to clans to split to move if needed)
            x   Then execute moves
            x   Then tune for ~3 villages after 500 years
            *   Also at some point:
                *   Move costs
                    *   Factor variable costs into move decisions.
                        Higher diligence means more willing to pay.
                    *   This is probably pretty important - falsely
                        assuming this to be 0 probably causes
                        villages to spread out too fast - also check
                        on how this influences farmland and what
                        they're "buying" here and for how much
                *   Consider if we do need a mobility trait,
                    possibly just as a way to not have everyone
                    try to move at once
                *   Intellect => bonuses adapting to move
                *   Clans influencing each other or parts of each
                    other to move
            *   Make sure tuning coefficients and model features
                are sensible.
        *   Make sure migrations are recorded as clan
            memory (and so could influence later decisions)
            *   Also have some notion whether the migration
                turned out well
            *   Then at some point make them influence
                later decisions

*   Note2: There is another response to disagreement, for clans
    to change their behavior to agree with each other more often.
    It does make sense to have that, but eventually that should
    fail with scale, so it's fine to have fission before then.
    This could even then be something that helps the first bits
    of growth, or causes some areas to grow more than others.
    *   Compare to ideas about >7 decision-making agents causing
        breakdown

x   Empirical tuning search
x   Smooth the graphs
*   Understand in more detail why birth rate doesn't
    seem to keep up with death rate in the long term
    x   So far:
        x   Fixed a bug causing excessive conflict impact
        x   Age-matched spouses to avoid young husbands
            marrying widows almost out of childbearing
            age
        x   We have a redundant marriage appeal modifier
            to birth rate
    *   Things noticed now:
        *   A small amount of starvation - give clans
            better ways to escape this, possibly
            differentially
            *   This apparently is due to occasional shocks,
                especially flood-related fishing productivity,
                other flooding issues, and generally not
                having much of any food storage
            *   Food sharing doesn't make that much difference
                because stuff tends to impact the whole village
            *   Breaking all that down:
                *   Flood-related fishing productivity. Does seem
                    like it would be an issue.
                    *   We could reduce the fishing productivity
                        modifier to account for the fact that it's
                        not all fishing
                    *   Or add in hunting and gathering properly
                    *   Can also add somewhat option to fish more
                        when this happen
                *   Flood-related farming productivity
                    *   One option is to look at irrigation and make
                        sure clans have enough ways to help themselves
                        there
                    *   We can also make productivity vary more
                        between farms/clans, due to any/all of:
                        *   Different irrigation skill
                        *   Different irrigation investment
                        *   Random impact within the village
                *   Not having much food storage
                    *   Need to look at how clans decide how much to
                        produce
                    *   Might want to give clans a notion that they target
                        producing a certain amount of food; not only
                        personality but possibly transmissable culture
                        *   Need to think about how they measure
            *   Might be good to add intra-clan food balancing, so
                that larger clans are a bit more inherently balanced
            *   Might want to re-introduce concept that some kind of food
                gifts (probably need to specify basis) improve food security
        *   Once population rises, decisions reduce birth
            rate - give clans the chance to move out to
            escape this effect

After that, to try to firm up the model further, it
does appear that marriage opportunities (quantity and
quality) and food insurance relationships are typically
major motivators, so it would make sense to try to
confirm that clans have enough actions and get enough
results out of them. "Supernormal stimuli" probably
closely follow.

*   Marriage appeal
    x   Apparently it does have a substantial effect,
        but because clans drift and mix it doesn't
        necessarily have a huge impact on their very-
        long-term fortunes, which is probably about
        right at this point!
        *   Durable, keepable improvements such as
            infrastructure and culture could change
            this
    *   Clans don't have a way to raise their appeal
        yet, so we need to add some (they're also not
        looking at or trying to improve their appeal,
        which is of course ridiculous!)
    *   Also, we should make some singles more appealing
        than others within clans, partly so the most 
        appealing clan doesn't get all the first marriages,
        partly to create competition for especially
        appealing individuals
    *   Skills and traits are mixed on marriage, but
        we need to add knowledge and also decisions/
        policies

We also need to somewhat prioritize replacing the
"residence fertility bonus" with an early-weaning
model. Mainly because it doesn't make a ton of sense
in its current form.

More on further stuff, occasioned by reading various
papers:

*   The dual model of prestige and dominance apparently
    goes back well before the origin of humanity
    *   The prototype of prestige leadership is someone
        moving to new forage location A (perhaps because
        they scouted it earlier or heard news) and then
        others following
        *   This often has relatively high influence by
            women
        *   Prestige leaders beyond information also may
            provide:
            *   Coordination (based on persuasion)
                *   Including diplomacy
            *   Punishment (based on coalition assembled)
            *   Voluntary services (snowdrift game)
        *   Prestige leaders may receive:
            *   Deference in conversation
            *   Accepting their decisions/advice
                *   This typically ends up somewhat to the
                    advantage of the leader, although not
                    for certain!
            *   Preference as mates and partners
            *   Assistance
            *   Gifts
    *   Dominant leaders are based on ability to punish
        *   They tend to achieve lower levels of cooperation,
            but the cooperation is perhaps more robust, and
            can be sustained even with very weak collaborative
            capabilities
            *   May provide same services as prestige leaders,
                but probably to a lower extent, except for
                dispute resolution and punishment, which they
                probably do more
        *   Tends to be male-dominated
        *   Tends to claim more for self
        *   May be preferred if fighting external parties or
            facing resource shortage
    *   TODO - Look through the model components we are firming
        up and see how these would apply
        *   Marriage choices
        *   Food sharing partner choices
        *   Conflicts
*   Group size
    *   Various sources have it that cooperativeness generally
        goes down with size, due to less frequent/reliable
        rewarding/punishing, and less common knowledge and
        other commonality.
    *   We might be able to model that emergently, or apply as
        abstract modifiers if needed
    *   Roughly, for #agents:
        *   2-5: Can be all highly aligned
        *   8+: Hard to be all aligned all the time; divisions
                start, but simple cooperation can still be strong
        *   ~30: 50% cooperative
        *   50+: 20% cooperative or less
    *   It does also appear that we can pretty much take it as
        empirical fact that people invest their time and attention
        to different levels, with expanding circles of kinship/
        friendship
*   Identity and Status
    *   A recent paper, "Evolutionary foundations of social
        identity", by Li, Grueneisen, and Tomasello, ties
        together a lot of related ideas. (The following
        discussion also includes ideas from some other
        papers and thinking.)
    *   They describe a boosting from joint agency (could be
        dyads, but I think they mean any co-present group) to
        collective agency (including a notional group and thus
        involving reputation)
    *   Key competencies boosted are:
        *   Social self-regulation (following through on joint
            commitments or to collective norms)
        *   Prosociality (helping partners or preferentially
            helping non-personally-known group members)
        *   Common ground (personal or cultural knowledge to
            create affinity and legibility)
        *   Moral emotion (personal or collective guilt to
            repair after violations and mistakes)
    *   A key point here is that for this collective cooperation
        to work, there needs to be a visible collective identity
        *   (Ties back to ideas of how generosity has to be
            directed at the generous (ish - the math is subtler) 
            to be sustainable)
        *   Kinship and phenotype can be used, but are ultimately
            very limiting in applicability and scale!
        *   Cultural markers can travel much further, but note
            that they can also mutate as they travel, to the
            extent of creating separate identities
    *   Side note 1: Varying levels of strict reciprocity can be
        enough to sustain cooperation. In general it's at least
        necessary to require everyone to cooperate with those
        in good standing and allow everyone to punish violators.
        But also:
        *   Requiring punishing violators (and not helping them)
            sustains cooperation even better
        *   Alternatively, withholding cooperation from anyone
            who interacts with violators at all (rather than
            allowing punishment) can also sustain cooperation
    *   Side note 2: Gifts provide a way to reward/punish.
        Consider that there could be a baseline of gift exchange
        but clans withhold from defectors. That is enough to
        sustain cooperation (for the gift exchange anyway,
        assuming it generated value, which I think it currently
        doesn't).
    *   Now, is this identity binary? I think not. For example,
        someone entering a store or interacting with police
        wanting to put out the identity "honest citizen" might
        be easily successful, easily unsuccessful, or somewhere
        in the middle.
        *   This brings up the idea of differential status, as
            in how trustworthy we are, or how much we belong.
        *   Note that this is similar to prestige. We should
            consider prestige a little differently, as it's the
            community-formed judgment of whom is most worth paying
            attention to, and will center on a few people even in
            a big community; this is more the raw material of
            respect ratings
        *   It seems that once wealth and/or conflict come into
            play, there is also some dominance or power component,
            though wealth could be part of both
        *   Like elite roles, basic identity can be ascribed or
            achieved to varying levels (tying kinship - identity -
            cooperation)
    *   We can apply differential identity in a continuous or
        discrete way. We've been modeling impressions continuously;
        it would clearly make sense to have discrete ranks when
        the people involved have them, but with circles of kinship
        and friendship perhaps it makes sense in less formal systems
        as well.
        *   There is also the idea of multilevel identity. This is
            related to the notion that clans might separately track
            "who is a good person (in society/settlement)" and 
            "who is good to me".
            *   "Who is a good person" implies some corporate identity
                in the settlement/society
    *   Let's consider that clans might choose to reward/punish
        the "good" in a similar way as prestige leaders:
        *   Accepting their decisions/advice
            *   Dyadically if aligned/helping/teaching
            *   In village decisions
        *   Preference as mates and partners
            *   Relationship appeal
        *   Assistance
            *   Preference/more willingness for mutual help
            *   Help putting on ritual, investment, or special project
        *   Gifts
            *   Regular gifts: more or less than usual
            *   Food aid and emergency assistance: bare minimum vs
                full restoration
        *   Deference in conversation
            *   This has been lurking at the edges for some time -
                it's a nebulous issue but seems significant
            *   Consider personal experiences and observations:
                *   Deferring: Some stress/mental load from correctly
                    deferring, ceding influence over agenda, micro
                    decisions: +stress, -influence, -utility in terms
                    of individual needs (affecting productivity,
                    health) and preferences (tastes)
                *   Being deferred to: Depending on culture or
                    preferences may not even be desired, but there's
                    probably some form of mild deference that generally
                    works. -stress if culturally/personally desired,
                    +influence, +utility from preferences
                *   Mutual deference: Both still need to take some
                    mental load. Influence and preferences can play
                    out in different ways. If very cautious, neither
                    might get anything. If efficient they can take
                    turns and get a good compromise
                *   No deference: No mental load for deferring, but
                    conflict ensues
            *   The above seems to describe a sort of hawk-dove game
                where:
                *   The stake is "getting your way" for things that
                    *may* typically be relatively low-value
                *   Playing dove has a further cost in correctly
                    deferring
                    *   We should probably allow for errors too,
                        where they fail to defer
*   Putting it all together
    *   One good thing is that all the above is generally consonant
        with the model so far
    *   Suggests a framework about being evaluated for various
        relationships and identities
    *   Then match up the existing models to the rewards and punishments
        listed above
    *   At that point, we would apparently have both a functioning
        reputation system and a set of potentially competing identities
        