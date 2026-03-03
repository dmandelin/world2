I took a separate slice through the vision 
[here](https://github.com/dmandelin/world3/blob/main/vision.md).
Now I can use that to think through the shortest path to get
*this* codebase (which has a lot of working stuff) expressing
the key points of the vision.

The key clan interactions (along with key questions about how
they work, to be analyzed in terms of *Structures of Social Life*,
by Alan Fiske) early on are:
*   Marriage and family formation
    *   How do clans create/maintain the relationships that
        enable finding marriage partners?
    *   Who moves?
    *   Are resources or social credit exchanged?
    *   How does the relationship between the clans change?
*   Community and fellowship in the ordinary sense
    *   Who does the clan ordinarily interact with?
        *   All other clans in the village?
        *   Only clans in the neighborhood, or with
            other relationships?
        *   More random slices of people via places such
            as shops and baths?
    *   What effects does that have for appeal/happiness?
    *   What effects for learning and information exchange?
    *   Other effects, such as disease?
*   Learning and information exchange
    *   What kinds of relationships let clans learn technology
        and skill from each other? Does it "cost" social credit
        or involve alliances?
    *   How do clans exchange information with each other about
        who is good at what, whom to trust, etc.?
*   Help with needs large and small
    *   What were the social arrangements and practices for insurance
        for individual clans against floods, failed harvests, etc.?
    *   How were flint and obsidian for tools obstained? What was
        the nature of the relationships involved? How were they
        established and maintained?
    *   How was exchange of more everyday favors and mild specializations
        (e.g., the clan good at making beer) arranged? What effects
        did those have? How significant were they?
*   Special ritual and ritual changes
    *   How were rituals and religious observances organized early on?
        How were the led (or were they led)? How were needed resources
        collected?
    *   How did that change as villages became more numerous, and larger?
*   Disputes and dispute resolution
    *   How were disputes (over land, marriages, crimes, etc.) handled
    *   How did that change as villages became more numerous, and larger?

Let's take initial goals to be:

*   Stabilizing the models for founding new villages and for migration.
    *   (This part looks OK for now.)
    *   First, we need to establish some sort of model for land 
        availability, no matter how simple.
        *   Current model of collective allocation *is* actually
            workable but we'll have to allow people to change soon.
    *   The model should also have clans improving their land, so
        that clans who have been resident longer will generally
        have less reason to move. This will help keep everyone
        from moving at once.
        *   We can probably defer this, though it would be good to get.
    *   Moving out all alone isn't actually that good -- founding a
        new village really should be an event decided upon by a few 
        clans together.
        *   This could be OK for now, clans are kinda sizable,
            multiple movers could be fine but not strictly required.
    *   Clarify whether people are moving due to (a) lack of local
        farmland (b) other local geo constraints (e.g., longer walks)
        (c) local social issues (discontent, new conflicts). Which
        factors were most important (pre)historically? Make sure
        the modeling reflects those.
        *   Ideas are reasonably well worked out here.
*   Model in proper detail what happens as society expands beyond
    "everybody knows everybody"
    *   (Next step is to figure out what are the first triggers
        that will cause some settlements to grow larger. Consider
        that it could be a scale factor to generate a certain
        amount of resources or rich clans (e.g., in a Boltzmann
        model). Consider also bigger food storage, local trade
        opportunities.)
    *   One point is relationship of daughter village to mother
        village: how did that usually work? Did people in each
        rely on the other for anything? Was there a ritual or
        political relationship?
    *   What changes in a settlement as it grows to where people
        don't know each other? Is there more use of identifying
        dress and other symbols? How does that work? What are
        attitudes to unaccompanied strangers or visitors?
    *   Who is still known to "everybody"? Clan leaders? "Big men"
        of some sort? Prominent ritual leaders? Performers such as
        singers?
    *   Do people maintain former relationships for disaster 
        insurance, marriage, rituals, and dispute resolution? How
        are they changed, augmented, and/or replaced as a settlement
        grows toward a "town"
*   Model *some* meaningful emergence of a special role or status
    *   What were the original prominent roles or statuses in
        local hunter-gather society, if any?
    *   What were prominent roles/status as people originally adopted
        agriculture? Was there any special place for those who taught
        farming or could supply tools?
    *   What were prominent roles/status in villages? Just a village
        head, or would there be any ritual specialists or anything?
    *   What about large villages starting to verge on towns? What
        were the notable/specialized roles/statuses for individuals
        and clans there?

## Migration

The primary factor driving migration in our early setting appears
to be difficulty getting along in groups of larger than 150 or so.
Apparently it becomes difficult for everyone to synchronize on major
decisions, such as what to do about a serious inter-family dispute.
Ideally, at this stage we have that behavior emerge out of a more 
granular model, but it would be acceptable to abstract if needed.

People might disagree about things like:

*   What to do with agricultural surplus
*   Water rights
*   Land rights
*   Family (marriage, divorce, inheritance, adoption)
*   "Crimes"
*   Insults and social offenses

The general concept of "inter-clan dispute" covers most of that,
but there are also "political" points. Both could be relevant,
but for now I'll focus on disputes.

We can imagine that disputes appear between clans as a Poisson-like
process, with clans having certain features optionally having a
higher or lower rate. We also imagine that there are community
discussion processes by which the people of the settlement all come
to a rough consensus. Note that in the alernate scenario of 150
atomized individuals living in an area, they will probably not
come to any kind of consensus: agreement clearly depends on pervasive
communication, and probably also sufficient "relatedness".

What happens if each or both of those factors is missing or
reduced, especially for the case of a village growing to be
a town?

*   Communication
    *   Not everyone may know both parties to the case, so it
        will be harder for them to judge as they are used to
        (in a high-context way, understanding the role and
        needs of each person).
    *   There may be too many disputes for the discussion space.
        If a dispute requires the whole community to talk about
        it a certain amount, then even linearly rising disputes
        (and they're probably superlinear) will use up capacity.
        *   The increasing fraction of time spent dealing with
            disputes as a community would be a disamenity. This
            alone could be a reasonable way to model fission,
            though obviously there will be other limiters.
    *   It's harder for everyone to reliably be heard, either
        in assembly or the gossip network. This increases the
        chance that someone doesn't agree with the community
        decision.
    *   With full communication, everyone's opinions on the case
        can synchronize in a relatively symmetrical way. But with
        less than full communication, we'll have either of:
        *   Thinner communication with everyone: synchronization
            is weaker generally
        *   More selective communication: network radius increases,
            so there are more links where a split can form

*   Relatedness
    *   In a village, people have kin and long-term neighbors,
        so they will naturally want to have good relations with
        them and not treat them unjustly. As things get larger:
        *   Someone might be related to one party to a case but
            not know the other, and vice versa, creating splits.
        *   If the parties to the case are not related to each
            other, they have less reason to patch up.

Here are a few kinds of models that could serve:

*   Simplest: Bandwith-Based
    *   Main model is limited bandwidth for disputes.
        *   More time spent on this => disamenity
        *   A little time spent on this => amenity!
        *   Schedule fills up: some disputes go *unprocessed*
            (to be explained below)
    *   We also already have an interaction density and relatedness
        model, so naturally that should see some changes with scale.
        *   Tune appropriately
*   More Complicated: Issue Processing
    *   Main model is issues coming up, whether inter-clan
        disputes or settlement decisions
        *   Same points as in the bandwidth apply
        *   Also, clans decide the issue by synch process,
            so even with bandwidth may fail to converge
        *   This can then create factions
*   Looking ahead: How to deal with the problems of scale?
    *   One option is to have things mediated by elders first,
        and only the most important things go to general assembly.
        That can help with bandwidth somewhat, but major issues
        and factioning can still apply. We might even assume
        this as a start state.
    *   Another solution is neighborhoods, where each neighborhood
        acts like a village. But there will still be some inter-
        neighborhood disputes. Those could still be handled by
        general assembly, to a point.
        *   This may call for neighborhood representatives.
    *   Another possibility is a new settlement type or feature.
        If a new "temple" is built, the priests might insist that
        anyone who wants to live nearby accept holiness rules,
        which would naturally include keeping the peace and
        accepting religious judgments.
    *   But: Remember that we have some centuries before any of
        that happens. 