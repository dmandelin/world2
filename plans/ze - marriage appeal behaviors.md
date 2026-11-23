# Marriage appeal: analysis, and behaviors for raising it

Three parts: (1) how marriage appeal is calculated now, with its
derivatives and what to make of it; (2) what clans can currently
decide or do; (3) a short list of behaviors clans could use to raise
their appeal, with enough to start on but no model details settled.

`ze1 - marriage appeal inputs.md` goes one level deeper, to the inputs
of the alignment and respect items. It includes a randomized
trait-shock experiment giving total effects, and some of its findings
bear on §3 below.

Typical values come from `scratch/sample_appeal.ts` (4 runs x 200
years, all directed clan pairs that know each other, sampled every 25
years from year 50: 1376 same-settlement pairs and 376 cross-settlement
pairs) and `scratch/appeal_effect.ts`. To rerun them:

    npx esbuild scratch/sample_appeal.ts --bundle --platform=node --outfile=<tmp>/s.cjs && node <tmp>/s.cjs 4 200

---------------------------------------------------------------------

## 1. How marriage appeal is calculated

### 1.1 Where it's used

`getMarriageAppeal(s, o)` in `relations/marriage.ts` simply returns
`getPrestige(s, o)`. Matching runs Gale-Shapley by clan:

* A clan with men ranks the clans with women by **MA(husband → wife)**
  and proposes to its top 3 each round.
* A clan with women takes its proposers in order of **MA(wife →
  husband)**, until its women run out.

Only the order matters. There is no reservation value: a proposer with
negative appeal is still accepted if any women are left. A clan with
no perception edge has appeal 0, so a disliked clan (A < 0) ranks below
a stranger.

Marriage is short of women. At any time there are 1.3–1.7 eligible men
per clan against 0.6–0.7 eligible women, so the binding constraint is
**being accepted by wife-givers**, which depends on MA(wife-giver → us).
When clans are bucketed by local-appeal quartile within their
settlement, the share of a clan's eligible men betrothed each year is:

| Appeal quartile | 1 (low) | 2 | 3 | 4 (high) |
|---|---|---|---|---|
| Men betrothed / yr | 16% | 24% | 31% | 34% |

That is about a 2x difference in how fast men marry, so appeal has a
real effect on births.

### 1.2 Formula

```
MA(s→o) = P(s,o) = sgn(A) · sqrt(|A| · r)          r = max(0, R) / 100

A = clamp( Σ_i a_i , -1, 1 )                          alignment, rebuilt each update
R ← 0.9·R + 0.1·Σ_j ρ_j                               respect, EMA; 2 updates/yr
                                                      → ~19%/yr, half-life ≈ 3.3 yr
                                                      steady state R* = Σ_j ρ_j
```

Alignment items a_i (`relations/alignment.ts`). These are directional
and mostly dyadic:

| Item | Formula | Group |
|---|---|---|
| Affinity | ½(absolute + relative affinity); absolute = mean(kinship, residence sim., livelihood sim., temperament) | social |
| Connections | 0.194 · {Marriages: relatedness, Kin: 0.125, Friendship: 0.25, Neighbors: 0.05} | social |
| Sociability | 0.124 · relativeAttention · upbringing(care) | social |
| Festivals | 0.886 · feastAlignmentEffect (same settlement) | social |
| Mutual Aid | 0.775 · 0.05 · trust · amount · (1 − 0.045·miles) | direct |
| Gifts | 0.0045 · giftsReceived (100 × food/head, 20-yr half-life) | direct |
| Ritual Help | 2.26 · ritual bond (decaying) | direct |
| Ritual Change | standing bond from votes (decaying) | direct |
| Conflict | −0.0527 · hawk plays suffered (20-yr half-life) | direct |
| Generosity | 0.01508 · believed giving outside kin (0–100 scale, running avg) | reputation |
| Righteousness | 0.0024 · (believed righteousness − 50) | reputation |
| Bellicosity | −0.01224 · believed hawk plays / yr | reputation |
| Ditching | 0.728 · admiration_s · (seen diligence − expected_s) | reputation |
| Festival Giving | 0.60 · festAdmiration_s · info · (seen − expected_s) | reputation |

Respect items ρ_j (`relations/respect.ts`). These are about the object
clan, so they look much the same to every observer apart from the info
scaling. In practice respect works as public status:

| Item | Formula |
|---|---|
| Population | 10 · info · max(0, log2(pop/10)) |
| Generosity | 2 · info · food aid given this year (absolute units) |
| Skills | 0.05 · info · max(0, mean non-care skill − 30) |
| Material QoL | 0.1 · sqrt(info) · max(0, QoL_material + 10) |
| Conversation QoL | 0.05 · sqrt(info) · max(0, QoL_conv + 10) |
| Conflict QoL | 0.05 · sqrt(info) · max(0, QoL_conflict + 10) |
| Festivals | riteRespectEffect (same settlement) |
| Ritual Change | decaying credit from proposals carried / failed |
| Random | U[0, 2] per update (smoothed by the EMA) |

### 1.3 Typical values

| | Same settlement p10 / p50 / p90 | Other settlement p50 |
|---|---|---|
| A (alignment) | 0.34 / 0.65 / 1.00 | 0.38 |
| R (respect, 0–100) | 7.5 / 17.3 / 24.4 | 1.07 |
| info | 0.33 / 0.52 / 0.61 | 0.005 |
| **P = MA** | **0.17 / 0.32 / 0.47** (sd 0.11) | **0.06** |
| alignment clamped at ±1 | 13% of pairs | 0.5% |

Respect sits far below its nominal 0–100 range, because info is about
0.5 and most items are small. Cross-settlement appeal is about 1/5 of
local appeal. Nearly all of that gap comes from info (respect about 1
instead of 17), so in practice marriage is almost entirely local.

### 1.4 Top-level partial derivatives

For A > 0 (signs flip where noted for A < 0). r = R/100. Per-respect-point
values divide ∂/∂r by 100.

| | Formula | Same settl. (A=.65, R=17.3) | Other settl. (A=.38, R=1.07) |
|---|---|---|---|
| ∂P/∂A | ½·sqrt(r/\|A\|) (same sign both sides) | **0.26** | 0.084 |
| ∂P/∂R (per pt) | ½·sgn(A)·sqrt(\|A\|/r) / 100 | **0.0097** | 0.030 |
| ∂²P/∂A² | −¼·sgn(A)·sqrt(r)·\|A\|^(−3/2) | −0.20 | −0.11 |
| ∂²P/∂R² (per pt²) | −¼·sgn(A)·sqrt(\|A\|)·r^(−3/2) / 10⁴ | −2.8e-4 | −1.4e-2 |
| ∂²P/∂A∂R (per pt) | ¼ / sqrt(\|A\|·r) / 100 | +0.0075 | +0.039 |

* **Cobb-Douglas with exponents ½, ½.** Elasticity to each input is
  ½: +10% alignment and +10% respect each give +5% appeal. A and R are
  complements (positive cross-partial). The best result comes from
  raising both, and a gain in one is worth more when the other is high.
* **Exchange rate:** at the medians, 1 respect point ≈ 0.037
  alignment. Respect is the cheaper lever in relative terms, because it
  sits so low.
* **Concave in both,** with diminishing returns. Respect is very
  concave for strangers (r ≈ 0.01).
* **Cusp at A = 0.** ∂P/∂A → ∞ there, and the sign flip is abrupt.
  For a near-stranger, a small change in alignment swings appeal a lot.
* **Clamp.** For the 13% of local pairs already at A = 1, every
  alignment lever has zero marginal effect, and only respect can move
  their appeal.

### 1.5 Per-input derivatives (same settlement, steady-state respect)

∂P/∂x = (∂P/∂A)·w_x for alignment inputs, or (∂P/∂R)·m_x for respect
inputs. ∂²P/∂x² = (∂²P/∂A²)·w_x² (plus the item's own curvature where it
isn't linear). The **spread** column is sd(item contribution across pairs)
× marginal effect: roughly how much that input actually separates one
clan's appeal from another's. Compare it with sd(P) = 0.11.

| Input (unit) | Typical p10/p50/p90 | ∂P/∂x | ∂²P/∂x² | Spread |
|---|---|---|---|---|
| **Alignment inputs** | | | | |
| Affinity (0–1) | 0.18 / 0.30 / 0.47 | 0.26 | −0.20 | **0.032** |
| Conflict suffered (hawk plays, standing) | 0 / 3.9 / 7.9 | −0.0137 | −5.6e-4 | **0.036** |
| Generosity belief (pts) | 5 / 13 / 25 | 0.0039 | −4.5e-5 | **0.026** |
| Mutual aid (base value) | 0.09 / 0.15 / 0.28 | 0.20 | −0.12 | 0.019 |
| Gifts received (pts, standing) | 5 / 19 / 41 | 0.0012 | −4e-6 | 0.016 |
| Ritual help (bond) | 0 / 0.006 / 0.054 | 0.59 | −1.0 | 0.016 |
| Ditching (pts over expectation) | −2.6 / 2.5 / 6.1 | ≈0.0024 (by admiration) | ≈−2e-5 | 0.009 |
| Ritual change bond | −0.03 / 0 / 0.05 | 0.26 | −0.20 | 0.009 |
| Sociability (rel. attention 0–1) | 0.29 / 0.58 / 1.0 | 0.032 | −0.003 | 0.008 |
| Bellicosity belief (hawk/yr) | 5 / 8 / 11 | −0.0032 | −3e-5 | 0.007 |
| Righteousness belief (pts−50) | ±15 | 0.0006 | ≈0 | 0.005 |
| Marriage relatedness (0–1) | 0.04 / 0.12 / 0.27 | 0.050 | −0.0075 | 0.004 |
| Festival giving (std over exp.) | ±0.1 | ≈0.027 | ≈0 | 0.002 |
| Festivals (feast) | 0.06, uniform | 0.23 | — | 0.001 |
| Kin / Neighbors (binary) | +0.024 / +0.010 | ΔP ≈ +0.006 / +0.003 | — | 0 |
| **Respect inputs** | | | | |
| Population (people) | 20 / 34 / 53 | 0.0021 /person (≈+0.05 per doubling) | −7e-5 | **0.031** |
| Food aid given (food units/yr) | 0 / 0.9 / 7.5 | 0.010 | −2.8e-4 | **0.030** |
| Ritual change credit (pts) | −2.5 / 0 / 4.1 | 0.0097 | −2.8e-4 | 0.023 |
| Information level (0–1) | 0.33 / 0.52 / 0.61 | ≈0.19 | ≈−0.10 | 0.019 |
| Festivals respect (pts) | 3.8 / 4.4 / 5.1 | 0.0097 | −2.8e-4 | 0.005 |
| Material QoL (pts) | value ≈ −6 | 0.0007 | ≈0 | 0.002 |
| Conversation QoL (pts) | | 0.0004 | ≈0 | 0.002 |
| Mean skill (pts) | 43 / 46 / 50 | **0.00024** | ≈0 | **0.001** |
| Random (smoothed) | mean 1.0, sd ≈ 0.13 | 0.0097 | | 0.001 |
| Conflict QoL | 0 in 92% | ≈0 | | ≈0 |

Cross-partials: any two alignment inputs interact through
∂²P/∂A²·w_i·w_j < 0, so they substitute for each other with diminishing
returns. Any alignment input paired with any respect input interacts
through +0.0075·w_i·m_j > 0, so they complement each other.

### 1.6 Discussion

**Does it make sense?** In broad shape, yes. "Do we like them" and
"are they capable or strong" combined geometrically is a reasonable
model of wife-giver judgment. The ½/½ complementarity is nice: a strong
but hostile clan, or a friendly but feeble one, isn't a great match.
The dyadic/public split (alignment/respect) is also good for behaviors.
A clan can target one wife-giver through alignment, or broadcast to all
of them through respect.

**What actually drives it today.** By spread, ordered: conflict
suffered, affinity, population, food aid given, generosity reputation,
ritual-change credit, mutual aid, information, gifts, ritual help. So
appeal is mostly about **being big, being open-handed, not fighting, and
being alike**.

**Negligible factors.** These are worth dropping, folding together, or
reweighting:

* **Skills (spread ≈ 0.001).** z7 lists skill as a basis for marriage
  appeal that is already in place, but it is now about 100x too weak to
  matter. +10 points of average skill is worth +0.0025 appeal. It also
  averages all skills, where a wife-giver would care about the specific
  ones that feed a daughter.
* **Material / Conversation / Conflict QoL.** Their total spread is
  ≈0.004. "Standard of living" barely registers.
* **Festival Giving, Righteousness.** Both are small, and Festival
  Giving is info-scaled twice.
* **Festivals (both alignment and respect)** are almost the same for
  every object clan within a settlement. They raise appeal for all
  local clans together but don't change rankings. They only matter
  against clans in other settlements.
* **Random** is noise of ±2 per update, but after the EMA its
  effective sd is about 0.13 points. In practice it is a floor of
  roughly 1 respect point for strangers, which makes up nearly all of a
  distant clan's respect. Rankings across settlements are therefore
  mostly noise and info.
* **Marriage relatedness** (0.05 per unit, spread 0.004). Existing
  alliances barely make a clan more appealing.

**Missing factors.**

1. **What the wife-giver is getting for its daughter.** The husband
   clan's food security, nutrition and health, and how well it treats
   wives (care). The current QoL items stand in for this but are
   negligible.
2. **Reciprocity / exchange balance.** Daughters given vs. received
   between the two clans, bride service actually delivered, and broken
   betrothals. Nothing records whether a clan has been a good in-law.
3. **Distance.** A daughter moving to another village is a cost.
   Today that is handled only indirectly, through info.
4. **Repeated alliance preference** (e.g. cross-cousin-style
   preferential partners). This would need a stronger Marriages item,
   or one that is specific to marriage.
5. **Exogamy.** Kin (senior/cadet) clans get an alignment *bonus*,
   where a close lineage would more likely be off-limits or penalized
   as marriage partners.
6. **Reservation appeal.** Wife-givers can't refuse a clan they dislike
   or hold out for a better offer. Without that, appeal is purely about
   order of acceptance.
7. **Individual variation** (already in zd5). Some singles should be
   more appealing than others within a clan, so the top clan doesn't
   take every first marriage.
8. **Holiness and ritual standing** are computed in Perceptions but
   aren't in appeal. A sacred or ritually potent lineage is a plausible
   marriage draw.
9. **Marriage payments** (bridewealth). Bride service exists, but its
   terms are fixed and it has no effect on appeal.

**Structural notes.**

* Prestige also has its own birth-rate (+0.3%/pt) and death-rate
  modifiers in `population.ts`, and a QoL item. The comment there says
  appeal works through marriages, and zd5 marks a "redundant marriage
  appeal modifier" as removed, but the Prestige modifier is still
  there. Worth confirming that this isn't double counting.
* Food gifts (`econ/gifts.ts`) flow **toward** the clans a donor finds
  appealing (0.2 · P · production per local neighbor, capped at 80% of
  cereals). Receiving gifts doesn't raise a clan's appeal, but giving
  them raises the giver's appeal in the recipient's eyes. That is a
  reasonable reciprocity loop, but it's admiration-driven, not
  strategic: nobody gives *in order to* be appealing.
* Respect Generosity counts **absolute** aid given, so it favors large
  clans on top of the Population item. Big clans get two scale bonuses.
* **No clan looks at its own appeal or marriage outcomes.** Every
  input moves as a side effect of fixed traits or of other clans'
  admiration (zd5: "they're also not looking at or trying to improve
  their appeal").

---------------------------------------------------------------------

## 2. What clans can do now

### 2.1 Choices computed each year (some optimization or weighing)

| Decision | Where | Basis | Appeal channel today |
|---|---|---|---|
| Effort allocation (production vs. care, farm vs. fish, nutrition target) | `decisions/effort.ts` | traits (diligence, tenderness), food outlook | Indirect: QoL, livelihood → affinity |
| Land picking | `econ/land.ts` | eagerness from diligence | Indirect: production |
| Housing | `decisions/housingdecision.ts` | imitate high-prestige clans + cost/benefit | Shelter → births only |
| Maintenance | `people.ts planMaintenance` | | |
| Conversation partners within group settings | `relations/conversation.ts appealOf` | affinity-weighted | Sociability, info |
| Marriage proposals & acceptance | `relations/marriage.ts` | appeal rankings | It *is* appeal |
| Food aid (who to ask, how much to give) | `econ/redistribution.ts` | Giving trait → aid ratio; asks follow conversation | Generosity (respect + reputation), Gifts |
| Food gifts | `econ/gifts.ts` | donor's appeal toward recipient | Gifts (in recipient's eyes) |
| Mutual help offers | `world.ts planMutualHelpForSettlement` | **equal split** of 10% to all local connections, matched by the smaller offer | Mutual Aid |
| Skill imitation | `people/skillchange.ts` | whom to imitate, by rating | Skills (negligible) |
| Migration / founding | `people/migration.ts` | size, favor, alignment, random | Resets affinity/info |
| Merge into a neighbor | `people/merging.ts` | small clans ask; neighbor accepts by alignment and type | Population |
| Split | `people.ts splitIfNeeded` | size | Kin link; halves population |
| Ritual change: propose, vote | `ritualchange.ts` | rigidity, stance | Ritual Change (respect + alignment) |
| Village decisions | `decision.ts` | inclusive/coordinated favorability | Indirect |
| Rites for neighbors | `rituals.ts` | always performs its own for now | Ritual Help |
| Trade | `people.ts exchange` | | |

### 2.2 Fixed dispositions, which act as *de facto* standing policies

These are inherited traits that drift and blend from mothers' clans.
None are chosen. Each is a natural place to put a policy a clan can
change:

* `giving` → aid ratio (food sharing)
* `peaceableness` → hawk probability (conflict, bellicosity)
* `ditchingEffort` / `ditchingExpectation` / `ditchingAdmiration`
  ("At Will" organization)
* `festivalGiving` / expectation / admiration (festival willingness is
  "the same for all, for now")
* `sociability`, `tenderness`, `diligence`, `righteousness`,
  `intellect`, `rigidity`, `pride`

### 2.3 Implied by model options and plan notes

* **latest.md brainstorm:** share food, hold better feasts, give gifts
  (including decorative goods), offer compensation, accept or cast
  blame, demonstrate skill, display luxuries, host (choosing whom, at a
  cost per guest), special actions (epic feast, bumper-crop
  opportunities), and stances ("give to whoever asks / those we know /
  those in need").
* **zd5:** clans should look at and improve their appeal; individual
  singles' appeal; knowledge and policies inherited through marriage;
  "durable, keepable improvements such as infrastructure and culture".
* **z7:** partnership appeal, syncing appeal judgments through talk,
  "make sure skill blends with marriage", verify gifts and land in
  appeal.
* **decision.ts:** "backing a neighbor for what it might get back... is
  still to come". **respect.ts TODOs:** seniority, beauty.
* **Ditching "At Will"** implies other organizational methods later.
  **Festivals:** varying levels of willingness and contribution.

**Takeaway:** clans have many levers wired into appeal, but nearly all
of them are fixed traits or admiration-driven reflexes. The missing
piece is **a clan noticing a marriage shortfall and deliberately
pulling a lever**, ideally aimed at specific wife-givers.

---------------------------------------------------------------------

## 3. Behaviors for raising marriage appeal

### 3.0 Shared groundwork

Every behavior below needs these three pieces:

* **Marriage pressure.** Each clan tracks its own marriage outcome:
  eligible men waiting, years waited, and the betrothal rate against
  the settlement. Pressure drives how much the clan invests in the
  behaviors below, as a motivator in the latest.md sense (a gap to a
  target). `ClanMarriageRecord` (marriage.ts) already keeps fading
  averages of each sex's age at first match and of partner appeal.
  A men's first-match age above the settlement norm is a natural
  pressure signal. Add a count of men waiting if age alone is too
  laggy.
* **Target wife-givers.** Clans with eligible women that the clan can
  reach, weighted by how close it is to their acceptance cutoff. The
  matching code already knows each wife-giver's sorted proposer list,
  so "how far below the cutoff were we" can be exposed directly.
* **UI.** The Marriage Appeal tab should show pressure, targets, and
  which levers are active.

Keep in mind that appeal only acts through **rank order**, so if every
clan raises its appeal equally, nobody's position changes and only the
costs remain. That arms race is realistic, but each behavior should
deliver real value to the target (food, labor, safety, alliance), so
the competition isn't pure waste. Watch for runaway behavior.

### 3.1 Courtship gifts (gifts)

**What:** Pressured clans tilt their food gifts (and later, goods or
decorative items) toward target wife-givers, beyond the
admiration-driven baseline.

**Moves:** Gifts (dyadic, 20-yr memory) in the target's alignment.
Generosity reputation is unaffected toward in-laws (`withinKin`), but
it counts toward not-yet-in-laws.

**Size:** One "large" gift (≈0.095 food/head of recipient, about 3
food units for a 34-person clan) ≈ +9.5 pts → +0.011 P. Repeated yearly
for five years, the standing total reaches ≈ +0.05 P, about half an sd
of P. That's costly but meaningful.

**Hooks:** `econ/gifts.ts` (add a strategic term next to the prestige
term), `recordFoodGift`, and a goods channel through `trade.ts` later.

**Open questions:** Whether it should be a budget or a per-target bid.
Does the target read a gift as courtship or as tribute (it could lift
the target's respect for the giver less, or lower it)? Should a gift
create an obligation the target remembers?

### 3.2 Open-hand stance for food sharing (food sharing)

**What:** A food-sharing *stance* the clan can change, sitting on top
of the Giving trait: e.g. "those in need" (trait default), "anyone who
asks", "open granary in bad years". Pressure, or a good harvest, pushes
toward the open settings. Later this could include proactive offers
rather than only answering requests.

**Moves:** Respect Generosity (broadcast, ≈0.010 P per food unit of
aid, multiplied by everyone's info) and the Generosity reputation in
alignment (0.0039 P/pt). These are already among the largest spreads,
so this is the **highest-leverage broadcast lever**.

**Hooks:** `econ/redistribution.ts aidRatio` (a stance multiplier or
offset), the information `Generosity` observation, and a stance field
on Clan.

**Open questions:** Respect uses *absolute* aid, so consider per
capita or log scaling so small clans have a chance. Should giving
outside kin count more toward marriage specifically? How fast should
the stance revert once pressure eases?

### 3.3 Bride service as a showcase (skills + relationships)

**What:** Grooms already work 2 years for the bride's clan. Let the
husband clan choose how hard or how well they serve (diligence and
skill on show), and let the wife clan form a direct opinion of the
husband clan from that service. This is where wife-givers would
plausibly judge skill: they see it up close.

**Moves:** A new direct alignment item, "Served us well" (standing,
decaying), and/or a skill-specific respect term seen at high info. It
fixes the negligible Skills factor in a way that's well grounded. It
also feeds into the reciprocity ledger (missing factor 2).

**Hooks:** `marriage.ts startServiceYear` / `brideServiceIn/Out`, the
effort allocation for men serving away, and labor/production
accounting in `econ/labor.ts`.

**Open questions:** Is service effort a cost to the husband clan
(lost labor at home is already the case) or extra effort? Should this
item be general (all clans hear about a good groom) or only between the
two clans? Should a broken betrothal or poor service count against the
clan?

### 3.4 Manners: restraint and meeting expectations (manners, traits)

**What:** A conduct policy toward target or prospective in-laws: hold
back from force (lower hawk probability toward them), and meet the
target's expectations on the ditches and at festivals ("show up, pull
your weight").

**Moves:** Conflict suffered is the **largest negative item** (−0.0137
P per hawk play remembered). Halving hawk plays toward a target is
worth about +0.025 P over a few years, plus less bellicosity
reputation. Meeting ditch expectations adds about +0.002 P per point,
scaled by the target's admiration disposition.

**Hooks:** `relations/conflict.ts` (per-pair hawk probability instead
of only the trait), ditching willingness in `people.ts` (currently
`= traits.ditchingEffort`, explicitly "At Will"), and
`FestivalOperation.willingness`.

**Open questions:** Restraint costs the clan conflict payoffs, so does
it get pushed around more? Should manners be a clan-wide policy or
per-target? Should it be visible as a reputation of its own
("well-mannered") or only through existing items? Festival Giving
would need reweighting before it matters.

### 3.5 Cultivating alliances: help, visits, reciprocal daughters (relationships)

**What:** Let clans steer their relationship investment toward target
wife-givers:

* **Tilt mutual-help offers.** Offers are currently split equally.
  Because help is matched by the smaller offer, tilting only works if
  the target tilts back, which is a nice built-in reciprocity check.
* **Spend conversation or visits on targets.** The `appealOf` weights
  in the group settings could take a strategic bonus.
* **Give daughters strategically.** Prefer to give daughters to the
  clans whose daughters you want (sister-exchange logic), with a
  daughters-given/received balance as a new alignment item.

**Moves:** Mutual aid (0.20 P per unit of base; spread 0.019),
sociability and info (info ≈ 0.19 P per unit, and it multiplies all
respect items), and a new reciprocity item that fills missing factor 2.

**Hooks:** `world.ts planMutualHelpForSettlement`,
`conversation.ts appealOf`, wife-side acceptance order in
`getMarriageDecisions`, and `PairingCounts` / `marriageHistory` for the
balance.

**Open questions:** Should reciprocity be strict (owed daughters) or
soft (alignment)? How does this interact with Gale-Shapley stability?
Strategic acceptance on the wife side changes the algorithm's
guarantees.

### 3.6 Prestige-biased adoption of admired traits (traits)

**What:** The slow, cultural lever. A clan under sustained marriage
pressure has its trait drift biased toward what its wife-givers
admire. Examples: giving, peaceableness, ditching effort, festival
giving, and possibly livelihood (farming/fishing share feeds affinity,
which is one of the two biggest discriminators). This makes "being
marriageable" heritable culture rather than a yearly expense.

**Moves:** Everything above, but permanently, plus affinity through
livelihood and residence similarity.

**Hooks:** `people/traits.ts` drift (`beginYear`, the drift
stddevs), and the existing blending from mothers' clans in
`inheritFromMothers`, which already pulls a clan toward its wife-givers'
traits.

**Open questions:** Bias the direction of drift, or have clans copy
traits from high-appeal clans? How do we keep every clan from
converging on the same traits? Admiration dispositions vary by clan,
which helps.

### Suggested order

1. 3.0 groundwork, plus a reweighting pass: Skills, Material QoL,
   Festival Giving, and the absolute scale of aid in respect. Otherwise
   behaviors that work through those inputs won't register.
2. 3.2 food-sharing stance (largest leverage, simplest hook).
3. 3.1 courtship gifts.
4. 3.4 manners.
5. 3.5 alliances.
6. 3.3 bride service showcase (needs labor accounting work).
7. 3.6 trait adoption (long-run; tune after the rest).
