# Marriage appeal, one level deeper

This follows on from `ze - marriage appeal behaviors.md`. That analysis
stopped at the alignment and respect *items*; this one goes down to the
*inputs* the items are built from: traits, populations, effort shares,
conversation, memory, and the other clan's view of us. It asks how
marriage appeal depends on each of them.

Notation, as in `ze`: MA(s→o) = P = sgn(A)·sqrt(|A|·R/100). s is the
clan judging (in marriage, the wife-giver) and o is the clan judged.

## 0. Method

Three approaches, which check one another:

1. **Chain rule from the code.** ∂P/∂x = ∂P/∂A · ∂A/∂x or
   ∂P/∂R · ∂R/∂x, using the formulas in `relations/*.ts`, `festivals.ts`,
   `rituals.ts`, `econ/gifts.ts` and `econ/redistribution.ts`.
2. **Sampled typical values and empirical link slopes.**
   `scratch/sample_deep_inputs.ts`: 6 runs × 200 years, same-settlement
   directed pairs every 25 years from year 50, n = 1926 pairs and 590
   clans. Where an input reaches an item through randomness or memory
   (conflict, gifts, beliefs, information), a cross-sectional slope
   stands in for the derivative.
3. **A randomized experiment**, giving total effects including every
   feedback and cost. `scratch/appeal_trait_experiment.ts` and
   `scratch/appeal_trait_analysis.py`: 600 worlds run to year 60. Every
   clan then got an independent ±1 SD shock to each of 9 traits at once.
   The change in how its neighbors see it (MA, A, R and every item) was
   regressed on the shocks, within settlement, after 5 and 15 years. So
   was the share of its eligible men betrothed each year. n = 7040 clans.

Medians used below for a same-settlement pair: **A = 0.69, R = 17.6,
info = 0.52, ∂P/∂A = 0.25, ∂P/∂R = 0.0099 per point, ∂²P/∂A² = −0.20,
∂²P/∂R² = −2.8e-4 per point².** Alignment is clamped at 1 for 15.5% of
pairs. For those pairs every alignment-side derivative below is 0, so
averaged over all pairs the alignment channels are about 15% smaller
than stated.

The "spread" column is sd(input) × |∂P/∂input|: roughly how much
that input actually separates appeal between pairs. Compare it with
sd(MA) ≈ 0.12.

---------------------------------------------------------------------

## 1. The dependency tree

```
MA(s→o) ─┬─ A(s→o) ─┬─ Affinity ── kinship(s,o), residence_s/o, farming_s/o, temperament(s,o), mean affinity of s
         │          ├─ Sociability ── attention(s,o) ← sociability_s,o, time shares, history, help; upbringing ← care_s,o
         │          ├─ Mutual aid ── amount ← pop_s,o, neighbors, trust shares; trust ← A, attention, conflict
         │          ├─ Gifts ── gift/head from o ← MA(o→s), production_o, pop_s; memory
         │          ├─ Generosity belief ── o's non-kin gifts + aid seen ← production_o, giving_o, needs; info
         │          ├─ Conflict ── o's hawk plays vs s ← peaceableness_o + luck; memory
         │          ├─ Bellicosity belief ── o's hawk plays vs anyone ← peaceableness_o, settlement size
         │          ├─ Righteousness belief ← righteousness_o, attention
         │          ├─ Ditching ── seen ditch share_o − expectation_s, × admiration_s
         │          ├─ Festival giving ── festivalGiving_o − expectation_s, × admiration_s × info
         │          ├─ Ritual help ── rites s asked of o ← holiness(s→o), s's troubles, A(o→s) > 0
         │          ├─ Ritual change ── where o stood on settled questions
         │          ├─ Festivals ── settlement feast appeal (same for every o)
         │          └─ Marriages / Kin / Neighbors connections
         └─ R(s→o) ─┬─ Population ── pop_o, × info
                    ├─ Generosity ── aid given by o (absolute), × info
                    ├─ Ritual change ── proposals o carried / lost (← intellect_o)
                    ├─ Festivals ── settlement rite power (same for every o)
                    ├─ Skills, Material / Conversation / Conflict QoL of o, × info
                    └─ Random
           info(s→o) ← contact (attention + feast) and hearsay from shared informants
```

Most inputs are **properties of o** (traits, production, population).
Some are **properties of the pair**, and several of those are symmetric:
kinship, temperament (shared part), attention, mutual-aid amount, and
residence/livelihood similarity. So appeal is strongly reciprocal: the
correlation of MA(s→o) with MA(o→s) is **0.58**. A few inputs are
**properties of s** (its expectations, admirations, and mean affinity).
Those shift how s sees every clan equally and don't change its
rankings.

---------------------------------------------------------------------

## 2. Alignment-side inputs

### 2.1 Affinity

```
affinity term = ½·(abs + (abs − m)/(1 − m)),   abs = ¼·(kinship + residenceSim + livelihoodSim + temperament)
residenceSim  = 1 − |residence_s − residence_o|        livelihoodSim = 1 − |farming_s − farming_o|
m = s's mean absolute affinity over the clans it knows (median 0.63)
```

∂(term)/∂abs = ½·(1 + 1/(1 − m)) = **1.85**, so each affinity factor
moves A by 0.46 per unit.

| Input | Typical p10/p50/p90 | ∂P/∂x | ∂²P/∂x² | Spread |
|---|---|---|---|---|
| Kinship (0, or 0.5 for senior/cadet) | 24% of local pairs are kin | **ΔP ≈ +0.057** (incl. Kin link +0.024 A) | — | **0.024** |
| Temperament (0–1, drifting) | 0.24 / 0.51 / 0.78 | 0.116 | −0.043 | **0.023** |
| Residence_o (share of year in settlement) | 0.59 / 0.69 / 0.75 | ±0.116 (toward residence_s) | kink at equality | 0.006 |
| Farming share_o | 0.45 / 0.55 / 0.55 | ±0.116 (toward farming_s) | kink at equality | 0.006 |
| m (s's mean affinity) | 0.58 / 0.63 / 0.67 | −0.34 | | (a shift; no ranking effect) |

Points to note:

* **Kinship is the largest single structural input.** A cadet or
  senior clan is about half an sd of appeal more attractive. Because
  "kin" means a lineage split, this pushes clans to marry back into
  their own lineage.
* **Temperament is pure luck.** It is a random walk with a ~70-year
  memory, and it separates pairs about as much as kinship does.
* **Residence and livelihood similarity are near 1 locally** (sd 0.05),
  so they barely discriminate. They are the only affinity inputs a
  clan controls, through its effort allocation and residence.
* The relative half is **zero-sum across the clans s knows**: a new
  congenial acquaintance raises m and lowers s's view of everyone else.

### 2.2 Attention (conversation strength, symmetric, 0–1)

Attention enters through the Sociability item (0.124 × upbringing),
through information (info ≈ 0.29 per unit of contact cross-sectionally;
info drives respect, §3.1), and through trust (saturated, ≈0).

| Input | Typical | ∂P/∂x | ∂²P/∂x² | Spread |
|---|---|---|---|---|
| Attention(s,o) | 0.32 / 0.66 / 1.00 | **0.088** (0.030 direct + 0.058 via info→R) | −0.013 | **0.023** |
| Sociability_o or sociability_s (either side, matched as the smaller offer) | 32 / 51 / 66 | 0.0008 /pt via attention (cross-section 0.0092 att/pt) | | |
| Upbringing (care provision of both) | 0.89 / 0.98 / 1.03 | 0.020 | ≈0 | 0.001 |
| History multiplier (0.8–1.2) | 0.91 / 1.10 / 1.20 | acts on future attention | | |

Attention also comes from shares of the year spent in shared settings:
in the settlement (residence), at the ditches, at festivals and in help.
Because each setting's acquaintance is split across all participants,
each partner gets a share in proportion to its affinity-based appeal.

### 2.3 Mutual aid

```
item = 0.775 · 0.05 · (1 − 0.045·miles) · trust · amount
amount: matched help, each side's demand sqrt(10·pop) split by trust share over its neighbors
trust → target clamp(0.5 + A + attention/2 + conflict term, 0, 1), halfway each update
```

| Input | Typical | ∂P/∂x | ∂²P/∂x² | Spread |
|---|---|---|---|---|
| Amount | 2.1 / 3.1 / 6.0 | 0.0091 | −2.7e-4 | **0.018** |
| Trust | 0.80 / 1.00 / 1.00 | 0.030 | | 0.003 |
| Pop_o (through amount) | | ≈0.0004 /person | | |
| Number of neighbors | 2 / 4 / 5 | amount ∝ ~1/n | | |

Trust saturates whenever A > 0.5, which is most pairs. So the loop
A → trust → mutual aid → A is open only for weak relationships.

### 2.4 Gifts received from o (standing, 20-year half-life, memory-limited)

```
gift/head to s this year  g = 0.2 · MA(o→s) · production_o / pop_s   (capped at 80% of o's cereals)
remembered by band of g: <0.01 → 0.005, <0.03 → 0.02, <0.07 → 0.05, <0.12 → 0.095, else 0.16
standing ≈ 204 · g (cross-section: about two years of a steady gift)
```

| Input | Typical | ∂P/∂x | ∂²P/∂x² | Spread |
|---|---|---|---|---|
| g, gift/head from o this year | 0.024 / 0.061 / 0.137 | **0.23** (stepwise: 0 within a band) | ≈0 | 0.012 |
| MA(o→s), o's view of s | 0.16 / 0.34 / 0.48 | **0.032** via gifts (g rises 0.14 per unit) | | |
| Production_o (food units) | 19 / 32 / 61 per clan | ≈0.0005 per unit | | |
| Pop_s | | g ∝ 1/pop_s | | |

* **Reciprocity loop.** o gives to the clans it admires, and gifts make
  s admire o. The loop gain is about 0.03, so it is stable and small.
  Most of the 0.58 reciprocity comes from the symmetric inputs above.
* **Bands make gifts a step function.** A small change in a gift
  usually does nothing, and one at a band edge jumps.
* Gifts also feed the Generosity belief (§2.5), but only between
  non-kin; in-laws count as kin.

### 2.5 Generosity belief (what s thinks o gives away outside its kin, 0–100)

```
seen this year = 100 · Σ band weights of o's aid (to anyone) and non-kin gifts that s hears of (×1.5 if to s)
belief = running mean of that (α ≥ 0.1, so a ~10-year memory)
```

| Input | Typical | ∂P/∂x | ∂²P/∂x² | Spread |
|---|---|---|---|---|
| Belief (pts) | 5 / 12 / 24 | 0.0038 | −4.5e-5 | **0.027** |
| Giving_o (trait) | 32 / 52 / 70 | ≈0.0004 /pt (belief +0.10/pt) | | |
| o's production, gifts to non-kin | | gifts given = 0.22 × production (clan level) | | |

The giving trait explains little of the belief (correlation 0.21).
Most of what o is seen to give away is **prestige-driven gifts,
which scale with production**, not trait-driven aid.

### 2.6 Conflict and bellicosity

```
per pair per year: 5 encounters, o plays hawk with prob h_o = 0.2 − 0.0025·(peaceableness_o − 50)
conflict standing (s's memory of o's hawk plays against s) ≈ 17 · h_o + luck
bellicosity belief (o's hawk plays against anyone, as s hears) ≈ 19 · h_o + noise
```

| Input | Typical | ∂P/∂x | ∂²P/∂x² | Spread |
|---|---|---|---|---|
| Conflict standing (hawk-pts) | 0 / 3.9 / 7.9 | −0.013 | −5.6e-4 | **0.033** |
| Bellicosity belief | 4.7 / 7.3 / 9.9 | −0.0031 | −3e-5 | 0.006 |
| h_o (hawk probability) | 0.16 / 0.20 / 0.23 | −0.29 (−0.23 conflict, −0.06 bellicosity) | | 0.009 |
| Peaceableness_o | | **+0.0007 /pt** | | |

**The largest negative item is mostly luck.** Disposition explains
about 4% of the variance in conflict standing (correlation 0.21). The
rest is binomial noise in 5 encounters a year, kept by a memory about 4
years deep. A clan's peaceableness is a weak lever on how much it is
resented.

### 2.7 Conduct: righteousness, ditching, festival giving

| Input | Path | ∂P/∂x | Spread |
|---|---|---|---|
| Righteousness belief (pts) | 0.0024/pt into A | 0.0006 | 0.005 |
| Righteousness_o (trait) | belief +0.57/pt | 0.00034 /pt | |
| Diligence seen (ditch effort, pts) | 0.728 · admiration_s · (seen − expected_s) | 0.0022 /pt at median admiration (range ≈0 to 0.0046) | 0.004 |
| Ditch share_o (pts of effort) | seen +0.57/pt | 0.0013 /pt | |
| Expectation_s, admiration_s | shift every o equally | | (no ranking effect) |
| FestivalGiving_o (factor 0.7–1.3) | 0.6 · admiration_s · info · (seen − expected) | 0.015 per unit | 0.0025 |

### 2.8 Rites: ritual help, ritual change, festivals

* **Ritual help.** When s asks o to say a rite, A(s→o) gains 0.015 ×
  2.26 per life rite (25-year half-life), which is **+0.0085 P each**,
  or 0.003 × 2.26 per omen (2-year half-life), which is +0.0017 P.
  - Who gets asked: a softmax on holiness(s→o), 20 points per tenfold.
    Holiness has median 38 and sd 22, and comes from rite outcomes,
    which come from a harmonic mean of 2·intellect, righteousness and
    ritual skill.
  - Only clans with A(o→s) > 0 can be asked.
  - s's demand for rites rises with its population and with low
    quality of life (omens).
  - The item has median 0.021 and spread 0.014.
* **Ritual change.**
  - When o puts a question to the settlement and it is carried, o gets
    +5 respect from every clan: **≈ +0.05 P with everyone**. A
    rejection costs the same. These standing credits fade over time.
  - Where o stood relative to s adds ±0.04 A, ≈ ±0.01 P.
  - Initiative rises with intellect_o.
* **Festivals.** Feast appeal (alignment, 0.106 · f/(1+f)) and rite
  power (respect, 10 · p/(1+p)) are settlement-wide. ∂P/∂f ≈ 0.007 and
  ∂P/∂p ≈ 0.028 at typical values, but they are the same for every o
  in a settlement. They change no local ranking and only make local
  clans more appealing than clans in other settlements.

---------------------------------------------------------------------

## 3. Respect-side inputs

### 3.1 Information (s's knowledge of o, 0–1)

```
info → target = 1 − (1 − direct)·Π_t(1 − 0.2·closeness(s,t)·level(t→o)),  direct = 0.5·min(1, contact)
contact = attention(s,o) + 0.4·f(feast appeal) + ...;  level closes 20% of the gap per update
```

Every respect item except Festivals, Ritual Change and Random is
multiplied by info (or by sqrt(info) for the QoL items), so ∂R/∂info ≈
20.5 points.

| Input | Typical | ∂P/∂x | ∂²P/∂x² | Spread |
|---|---|---|---|---|
| Info | 0.33 / 0.52 / 0.61 | **0.20** | −0.12 | **0.024** |
| Contact | 0.52 / 0.87 / 1.21 | 0.058 (info +0.29/unit; capped at 1) | | |
| Hearsay | each informant t covers 0.2 · closeness · level(t→o) of what is unknown | | | |

Being known is a multiplier on everything a clan is respected for. It
counts about twice as much in respect as attention counts directly in
alignment.

### 3.2 Population, giving, and the rest

| Input | Formula | Typical | ∂P/∂x | ∂²P/∂x² | Spread |
|---|---|---|---|---|---|
| Pop_o | 10 · info · log2(pop/10) | 20 / 34 / 52 | **0.0022 /person** direct (+≈0.001 via mutual aid and gifts given); +0.051 per doubling | −7e-5 | **0.026** |
| Aid given by o (food units/yr, absolute) | 2 · info · aid | 0 / 0.8 / 7.3 | **0.010 per unit** | −3e-4 | **0.036** |
| Giving_o → aid | aid +0.04 per point (correlation 0.17) | | 0.0004 /pt | | |
| Mean skill_o | 0.05 · info · (skill − 30) | 41 / 44 / 47 | 0.00026 /pt | ≈0 | 0.0006 |
| Material QoL_o | 0.1 · sqrt(info) · max(0, q + 10) | −24 / −7 / −2 | 0.0007 /pt, 0 below −10 (≈30% of clans) | ≈0 | ≈0.005 |
| Conversation QoL_o | 0.05 · sqrt(info) · (q + 10) | 8 / 12 / 16 | 0.00036 /pt | ≈0 | 0.001 |
| Random | U[0,2] per update, smoothed | | 0.0099 × sd 0.13 | | 0.001 |

---------------------------------------------------------------------

## 4. Total effects of traits (randomized experiment)

Change in how a clan's neighbors see it, per +1 SD shock to one of its
traits, demeaned within settlement. SEs are about 0.0007 (5 years) and
0.0010 (15 years) for MA. ✱ = |t| > 2.5. Betrothal is the change in
the share of the clan's eligible men betrothed per year, over the 15
years, against a base of about 25%/yr.

| Trait (1 SD) | MA at 5 y | MA at 15 y | A at 15 y | R at 15 y | Main channels at 15 y (item Δ) | Betrothal /yr |
|---|---|---|---|---|---|---|
| Diligence (12) | +0.0076✱ | **+0.0124✱** | +0.027✱ | +0.49✱ | Generosity belief +0.017, Gifts +0.010, aid respect +0.54 | **+0.8 pp✱** |
| Giving (15) | +0.0056✱ | **+0.0089✱** | +0.018✱ | +0.44✱ | Generosity belief +0.018, Gifts +0.006, aid respect +0.66; **pop −0.65**, Pop respect −0.18 | **+1.2 pp✱** |
| Intellect (12) | −0.0002 | +0.0042✱ | +0.005 | +0.31✱ | Ritual-change respect +0.26, aid respect +0.26, Gifts +0.004 | +0.3 pp |
| Peaceableness (12) | +0.0028✱ | +0.0036✱ | +0.010✱ | +0.09 | Conflict +0.004, Bellicosity +0.003, Gifts +0.003 | +0.1 pp |
| Righteousness (12) | +0.0010 | +0.0027✱ | +0.012✱ | −0.04 | Righteousness +0.013, Ritual help +0.002; **pop +0.50✱** | **+0.8 pp✱** |
| Sociability (15) | −0.0008 | −0.0012 | −0.005 | +0.03 | Sociability item +0.006, info +0.012, Pop respect +0.15, Conv QoL +0.03; **offset by** Generosity −0.007, Gifts −0.004, aid respect −0.11 | −0.1 pp |
| Ditching effort (0.03) | −0.0009 | −0.0007 | +0.002 | −0.15✱ | Ditching +0.012, **offset by** Generosity −0.006, Gifts −0.005, aid respect −0.17 | −0.2 pp |
| Festival giving (0.15) | +0.0016 | +0.0003 | −0.000 | +0.02 | Festival Giving +0.006, **offset by** Gifts −0.002 | −0.1 pp |
| Tenderness (12) | −0.0003 | −0.0023 | −0.005 | −0.06 | (care costs labor; small, not significant) | −0.1 pp |

Checking these against the chain rule:

* **Giving.** The chain rule predicts about +0.012 per SD: +0.006 via
  belief and +0.006 via aid respect. The measured +0.009 is that, minus
  what giving costs in population.
* **Peaceableness.** The chain rule predicts about +0.009; the measured
  +0.004 is less than half. The cross-sectional conflict slope
  overstates the lever, which is consistent with conflict being mostly
  luck.
* **Sociability.** The positive channels match the chain rule (info
  +0.0115 → R +0.2). They are cancelled because sociability lowers
  productivity ("talk gets in the way of toil", `econ/productivity.ts`),
  which cuts gifts and aid.

---------------------------------------------------------------------

## 5. Discussion

1. **Production surplus is the hub.** The channel that carries nearly
   every trait's effect is food given away: prestige-driven gifts
   (which scale with production), aid (respect, absolute), and the
   generosity belief.
   - Diligence, which raises production, is the best trait for appeal.
   - Every trait that spends labor away from food (ditching, festival
     giving, sociability through toil, care) earns its own item and
     then loses about the same amount through gifts and generosity, for
     a net near zero.
   - So for appeal, **food is the currency**, and any new behavior
     that costs labor or food has to beat what that food would have
     bought as gifts.
2. **Structure and luck beat character.** The inputs with the most
   spread are kinship (0.024), temperament (0.023), luck in conflict
   (0.033), population (0.026), aid given (0.036), info and attention
   (0.024 / 0.023), and gifts and generosity (0.012 / 0.027).
   - A +1 SD trait moves appeal by at most 0.012, about a tenth of the
     between-pair sd, and the betrothal rate by at most about 1.2
     points a year (≈5% relative).
   - Behaviors in `ze` §3 have to be sizeable, or the items they act
     on reweighted, to matter.
3. **Appeal is strongly reciprocal (r = 0.58).** It is mostly built on
   symmetric inputs (kin, shared temperament, attention, mutual aid).
   The gift loop adds a little (gain ≈ 0.03). Clans that like each
   other tend to rank each other high, which suits repeated
   pairwise alliances.
4. **Dead or nearly dead links:**
   - skill (0.0006), material QoL (zero for the ~30% of clans below −10)
     and conversation QoL;
   - upbringing (care) through sociability;
   - residence and livelihood similarity (real levers, but they barely
     vary locally);
   - trust (saturated);
   - festivals (settlement-wide).
5. **Levers with leverage that clans don't yet pull deliberately:**
   - a carried ritual-change proposal (+0.05 with everyone);
   - being asked to officiate (+0.0085 per life rite, long-lived);
   - being known (info, 0.20 per unit);
   - food given away (0.010 per unit of aid).
6. **Implications for the behavior plan (`ze` §3):**
   - The food-sharing stance (3.2) and courtship gifts (3.1) act on the
     hub, so they should work; but they compete for the same food.
   - Manners (3.4) acts mostly on an input that is luck today. It needs
     conflict to depend more on choices, such as targeted restraint, or
     it will barely register.
   - Bride service (3.3) is a natural place to make skill and diligence
     visible, since skill's link is currently dead.
   - Kinship's large bonus should be resolved (exogamy) before
     alliance-building (3.5) is layered on top of it.
