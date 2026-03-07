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

## Social Differentiation

## General Points

In "egalitarian" societies, there is usually not much
differentiation, except based on age, gender, and highly visible
traits. However, during specific, high-stakes activities such as
group hunting, warfare, and migration, they may have temporarily
had stronger leadership roles. These societies also can have
"Big Men" operating on a favor-trading basis.

In the early Neolithic, it became possible to accumulate weath
(livestock, stored grain), but at first, architecture and burials
tended to be standardized across the population.

Around 5300 BC, more differentiation started to appear, as well
as town-sized settlements. Early specialized roles:

*   Craft specialists: likely part-time, but still with higher
    levels of knowledge in things like pottery and cloth making
*   Administrators: clay tokens and stamp seals appear
*   Ritual specialists
*   Chiefs: Extra-large houses with more prestige goods are found,
    possibly representing consolidation of elite status to certain
    families

However, Ubaid seems to have been different from "typical" "chiefly"
socities, which typically had elaborate status goods and warfare.
Perhaps that would be further down the line for a society with that
general economy and polity type. Some scholars theorize that there
can be "wealth finance" meaning chiefs maintain power by distributing
luxury goods; or "staple finance" where chiefs control agricultural
surplus.

A key method of coordination may have been the "work feast", where
people are invited to work on a project in exchange for food, beer
and celebration.

There is the concept of a "secret society" that may or may not apply
here. The general concept is a sodality that keeps some of their
doings secret, partly to monopolize ritual knowledge or protect
"magic tricks", uses fear and force against opponents and doubters,
charges high membership fees (and also fines against non-members for
taboo violations), and transcends kin boundaries, enabling safe
passage and trade rights. There isn't really evidence of secret
societies per se in Ubaid, but it's possible religious developments
had similar features.

Early sources of higher status were likely:

*   More farming output - prime source of wealth at this point
*   Organizing bigger irrigation projects
*   Ritual skill and leadership - note this is not only worship but
    also includes healing and divination
*   Long-distance contacts - and our people depend on flint imports

Another important point is that Ubaid and related societies seem to
have been relatively collectively organized -- they seem not to have
had "kings" until rather later. In general we can perhaps imagine
that early on there was a lot of collective water management, which
got people used to working together in that way. Thus, early leaders
there may have been more "delegates of the community" than aristocrats
or appointees.

Apparently, "temples" first appeared in the south, not the older and
more developed north.

Three kinds of leadership identified:

*   Belonging leadership - Someone who very much belongs to the group,
    like traditionalist elders with ties to many people and a reputation
    for fairness.
*   Prestige leadership - Someone with high capability; they may
    actually belong less than usual because of being unusual or
    having a foreign origin.
*   Outsider leadership - Someone with a valuable capability, but
    more outside the usual arrangements, e.g., immigrant merchant
    classes.

## The People of the Proto-Ubaid

Who exactly lived in southern Mesopotamia in 6500 BC and where they
came from is apparenly a mystery. But I'll need to make some choices,
such as whether at start everyone is from the same culture, or
different cultures. Possible early people:

*   Halaf people from the north, who could bring agriculture, long-
    distance trade practices, and pottery.
*   Samarra people from central Mesopotamia, who had irrigation,
    planned villages, and painted pottery.
*   People from Susiana, who also had trade connections (with Zagros)
    and pottery.
*   Local people, adapted to the marshes and experts at fishing.

This may have been a frontier zone, where people of various different
cultures were arriving and mixing. 

## The Flint Trade

Farmers used composite sickles, with a wooden or bone frame and
several small flint blade inset. Good harvesting tools were important,
because grain stalks are tough, but the harvest must be brought in
quickly. Without any flint, farming would be pretty impractical.

Relatively small amounts could be enough: stone is durable and
tools can be repaired or recycled.

Note that chert, quartzite, and obsdian were also used for tools.
I'll probably fold everything into a "tool stone" category. Flint
or chert were the most important for farming: obsidian is sharper 
but more brittle and quartzite is durable but hard to sharpen.

Exports from the south included:

*   Bitumen
*   Fish products
*   Reeds
*   Textiles
*   Cereals

Trade models are also very unclear. Down-the-line trade was common,
but if flint in quantity was necessary for food, people probably had
something more organized, such as village trade expeditions or
mercantile families. If only small amounts are needed, down-the-line
will work for the model, but otherwise I'll need other models.

It's also unclear how the flint was distributed to everyone who
needs it, but I think we can more or less model families who have
trade access as "reselling" locally for:

*   Prestige: That is, give as gifts, but have higher prestige.
    Presumably, for example, people would help save their local
    flint suppliers from disaster.
*   Labor/favors/support: Give as gifts, but with more of an
    expectation of getting something concrete back, which might
    often be assorted labor or favors.
*   Food/materials/goods: More of a sale model, but probably on
    standardized, ritualized terms rather than a free market

### Putting It Together: Sources of Differentiation

From the above, we have:

*   Greater farm output
    *   Where it comes from
        *   Dependency ratio - % of workers in the clan, can be very
            large factor
        *   Land quality
            *   Soil quality - top plots could be 30-50% more productive
            *   Water access and flood effects
            *   More about land
                *   In the very beginning, people might have been able
                    to simply harvest wild barley, although that's not
                    particularly abundant here compared to the Hilly Flanks.
                *   Early on, people may have practiced flood-recession
                    agriculture, which is fairly low-investment. Besides
                    restricted availability, the main issue is that
                    produce is highly variable because it depends on
                    nature
                *   Canal irrigation, starting small, would allow for
                    expansion onto new land and more reliable yields
        *   Local help - help with harvest, repair, livestock exchange,
            can be major factor
        *   Livestock holdings
        *   Skill, but this is probably a lesser factor
        *   Access to tools and materials
        *   Chance - much variation due to climate and pests
        *   Personality - maybe not that important as it was typical
            for everyone to work hard as needed
        *   The "typical rich family" might be:
            *   Large => stable dependency ratio, economies of scale
            *   Good land
            *   Strong connections with kin and others to get help
                when needed
    *   What it does
        *   Generates prestige by itself *if visible*
            *   We can assume some standard conversion of wealth into
                visible signs, except there aren't that many at first
        *   Can fund work feasts
        *   Can be donated for free feasts or disaster relief
*   Trade - especially tool stone imports
    *   Where it comes from
        *   Clans that start with trade connections
            *   Kinship could matter here
        *   Clan or village could send a trade expedition
    *   What it does
        *   Generates prestige by itself *if visible*
            *   It's an important role, so people would pay some attention
        *   Can give in exchange for inclusive benefit, prestige, favors,
            or goods
*   Ritual - sacrifice, worship, healing, and divination
    *   Where it comes from
        *   May require special natural site
        *   Religious buildings
        *   Expertise
        *   Signs of divine favor
        *   More on how this works
            *   Not much seems to be known, but I'm going to assume it's
                a pioneer situation, where people want religion and
                medicine, and at first accept rough-and-ready versions
                but have a strong desire for quality that leads to
                specialization
            *   Farmer immigrants will be assumed to bring farming-
                oriented religions with them that they want to keep
                practicing
            *   Locals might have their own beliefs, possibly waters-
                oriented
            *   First temples might offer services for all beliefs nearby
            *   Clans have their own internal rituals, and perhaps we
                should model those so that bigger religions can compete
                later
            *   Bigger religions will at first be oriented toward the
                farming system and/or local features
    *   What it does
        *   Generates prestige by itself *if visible*, but will tend to
            be visible, and divine favor can be quite strong prestige
        *   Specialist healers producing better results
        *   Specialist diviners producing better advice
        *   Belonging factor for participants
        *   More interaction density for participants
*   Craft - pottery
    *   Where it comes from
        *   Most families make pottery as they need it
        *   Specialists could make particularly fine wares
        *   Kilns would produce better pottery than earlier methods with
            simple fires
            *   Early kilns becoming more common around 5000 BC
            *   Owned by families/clans
    *   What it does
        *   At this point, mainly can be shown off or given as gifts

# Putting it Together II: Near-Term Plans

Initial "development goals" are:

*   Permanent settlements
    *   Partially implemented
    *   Needs ability to stay at settlement longer
    *   Impacts of settlement time on farming, interactions, births
*   First "temple" (roughly 10x13 ft mud brick)
    *   Idea: Because of the floods, life is more precarious in the
        south, so people have an even stronger need to maintain their
        relationships with powerful beings, especially those who
        control the waters.
    *   Track precarity felt by clans based on food security, flood
        damage, and other hazards they experience.
    *   With enough motivation and resources, one or more clans can
        build a first temple
*   First "town" (1000+ people)
    *   It seems that there was plenty of room to expand into, but
        people found new reasons to stay closer together
        *   A network of villages can start to support some specialists
            in ritual, pottery, other crafts, and trade. If they collect
            (and there are probably reasons to), that place will have
            more people
        *   Larger irrigation systems (requiring a certain tech level)
            have economies of scale
    *   That could cause a little growth; social stresses would
        prevent it from going that far, unless mitigated:
        *   Neighborhood organization
        *   Expert mediation
        *   Additional rituals
        *   Stronger norms (peace, respecting mediators, systematic
            compensation)

The most important kinds of differentiation early on are farming
output, trade, and ritual. We can tune prestige so that "by default"
clans are largely equal (but with some small differences) and then
let produce and ritual enhance prestige. Belonging is more important
than prestige, so in the process those models should be firmed up.

List of changes implied by the above:

*   Variable settlement permanence levels
    *   Need residence appeal/effect model
        *   Factors
            *   help when sick or other misfortunes
                *   bonus to health (which should influece productivity)
                *   bonus to productivity (help with repair, lost animal, etc)
                *   bonus to relatedness
            *   help with child care
                *   bonus to birth rate, productivity
                *   bonus to relatedness
            *   (P2) food variety/availability improvement
            *   (P2) learning skills from each other
            *   (P2) learning opinions from each other
            *   disease transmission
            *   entertainment/annoyance
        *   Deltas to the model
            x   Reindex interaction level so that 100% is the "culturally
                typical" closest interaction level
            *   Rework productivity to depend a lot more on this factor
                *   Land quality
                x   Actual worker count
                *   Worker type mix
                *   Community
            x   add interaction type to relationship, "nomad" or "hamlet"
                *   nomad
                    *   a little contact goes a long way
                    *   exchange information, some food, some help
                *   hamlet
                    *   exchange everything
                    *   higher ceiling that nomad for exchange amounts
                    *   more disease transmission
            x   track interaction intensity separately per type
            *   (P2) add health stat with causes and effects
                *   caused by: food, shelter, disease load
            *   (P1.5) figure out what to do about self interaction
                *   For now might be OK to assume fixed clan structure
                    and remove it
            *   add effects and appeal per relationship type
    *   Then can have clans select based on appeal
*   Make sure dependency ratio affects per capita produce as expected
*   Variable land quality
*   Commute distance disamenity
*   Relatedness - make it really count for farm production/food security
*   Gifts of farm produce
*   Work feasts
*   Firm up farm output prestige model
*   Down-the-line trade for flint
*   Local distribution of flint for relatedness, prestige, favors, or goods
*   Firm up trade prestige model
*   Firm up existing rituals model
*   Ritual skill specialization
*   Ritual leadership/specialist roles
*   Ritual elaboration
*   Firm up ritual prestige model
*   Precarity model
*   Action to build first temple
*   Craft specialists (pottery, cloth, jewelry, fine arts, temple
    construction and decoration)
*   Additional trade goods
*   Trade specialization
*   District organization
*   Expert mediation
*   Larger-scale temples and rituals
*   New laws (peace, obedience to mediators, compensation, trade rules)



