# Bias Taxonomy

The category catalog the Check workflow draws from. Loaded on demand — not every category fires on every source.

Each category has: a one-line definition, the typical tell, and a worked example.

---

## Layer 1 — Biases inside the data

### Source/funding bias

**Definition:** The party paying for or producing the study has a financial or reputational stake in the conclusion.

**Tell:** Sponsor's product/service is the implicit solution to the problem the study documents.

**Example:** A consultancy that sells AI workforce transformation publishes a survey concluding executives need to act fast on AI workforce transformation.

### Sampling bias

**Definition:** The respondents are not representative of the population being claimed about.

**Tells:**
- Vendor-panel recruitment (clients, opt-in lists, conference attendees)
- No reported response rate
- Self-selection (anyone who clicked the link)
- Convenience sample marketed with margin-of-error language as if it were probability sampling
- Sample-frame swap (sample says "executives," headline says "CEOs")

**Example:** "1,000 US executives surveyed" turns out to be ~1,000 respondents of mixed C-suite/HR/investor titles recruited from the vendor's marketing reach.

### Question-design bias

**Definition:** The instrument's wording, scale, or order pushes responses in a direction.

**Tells:**
- Impossibly high agreement (>95% on a substantive question is almost always a low-bar yes/no)
- Loaded vocabulary in the stem
- Forced-choice between an extreme and a moderate option
- Question not publicly available (instrument hidden behind the topline number)

**Example:** "Do you expect AI to affect headcount in any way over the next 24 months?" yields 99% yes; the article reports it as "99% planning AI-driven layoffs."

### Demand characteristics

**Definition:** Respondents infer the "right" answer from context and provide it, regardless of true belief or behavior.

**Tells:**
- Sponsor identity visible to respondent
- Topic with strong professional/peer-pressure norms (saying "we're not doing AI" reads as out-of-touch)
- No anonymity guarantee disclosed

**Example:** Executives in 2026 facing board scrutiny on AI strategy answer "yes, we're planning AI workforce changes" because saying "no" would imply they're not on top of the trend.

### Self-report vs behavior gap

**Definition:** Stated intentions are weak predictors of actual behavior, especially for executives forecasting their own organization's actions.

**Tells:**
- Forward-looking ("expect to," "plan to")
- No prior calibration data (did the same executives' last-year predictions come true?)
- Long time horizon (2–5 years out)

**Example:** 75% of executives in 2023 said they would have AI agents in production by end of 2024. Most did not. The 2026 version is the same shape of claim.

### Causal inflation

**Definition:** Correlational or cross-sectional data presented as causal.

**Tells:**
- Two cross-sections from different time points compared as if they were a longitudinal panel
- Strong causal verbs ("AI is driving…", "this is causing…") layered on data that only shows co-occurrence
- Confounds visible to anyone but not addressed

**Example:** Worker "thriving" drops from 66% (2024) to 44% (2026); article frames as "AI is hurting workers." Both figures come from different respondent samples in vastly different macro conditions (post-COVID, RTO mandates, inflation cycle).

### No-benchmark fallacy

**Definition:** A number is presented as remarkable without a baseline or historical comparison.

**Tells:**
- Big percentage with no "vs N% last year" or "vs N% pre-event"
- Claim that something is "unprecedented" without showing the precedent series
- Pre-AI comparison missing for any AI-attribution claim

**Example:** "99% of executives expect layoffs in next 2 years." Base rate of "any layoffs in next 2 years" was probably already in the 90s before AI; the 99% may just be measuring corporate-churn baseline with an AI label.

### Publication/availability bias

**Definition:** The full methodology, instrument, or dataset is not publicly accessible — only the topline is released.

**Tells:**
- "Download the report" gated by lead-gen form
- Methodology section is one paragraph of marketing copy
- No appendix with question wording or response distributions
- Press release driving all downstream coverage

**Example:** Vendor publishes a 60-page glossy PDF with charts but no question text; trade press cites the topline; mainstream press cites the trade press; no one can audit the instrument.

### Survivorship bias

**Definition:** Sample excludes failed/exited cases, inflating the apparent rate of the studied outcome.

**Tells:**
- "Companies that successfully adopted X" → study of how to adopt X (ignores companies that tried and failed)
- "Investors who held the position" (ignores those who sold at the bottom)
- "Active customers" (ignores churned customers)

**Example:** "Top-performing startups all use AI tooling" — base rate of AI tooling at all-startups is high; survivorship samples on the dependent variable.

### Cross-sectional confounds

**Definition:** Year-over-year comparison treats different respondent populations as the same population.

**Tells:**
- "In 2024, X% said Y; in 2026, Z% said Y" with no panel data
- Question wording may have changed between waves; not disclosed
- Macro context differs (economy, policy, news cycle) between waves

**Example:** Two waves of an HR sentiment survey two years apart drawn from different respondent panels; the delta is attributed to the studied variable when the population shift alone could account for most of it.

---

## Layer 2 — Source-organization biases

### Conflict of interest (commercial)

**Definition:** The producing org's revenue depends on the conclusion the report reaches.

**Tell:** The recommendations section reads as a brochure for the org's services.

**Example:** Consultancy report concludes companies need consulting services; that consultancy sells consulting services.

### Conflict of interest (ideological/political)

**Definition:** The producing org has a stated mission or political stance that aligns with the conclusion.

**Tell:** Think tank with publicly funded position on policy X publishes research concluding policy X.

**Example:** Industry-funded research group studying environmental regulation finds environmental regulation is harmful.

### Motivated consistency

**Definition:** Same org publishes recurring reports with convergent conclusions over time.

**Tell:** The methodology varies year to year but the recommendation never does.

**Example:** Vendor's annual "state of X" report has concluded for 5 years that "now is the inflection point" for buying their product category.

### Disclosure absence

**Definition:** The artifact doesn't disclose the org's relationship to the conclusion within the report itself.

**Tell:** Reader has to look up the org separately to understand the conflict; nothing in the report flags it.

**Example:** Survey report with no "About this research" section, no funding disclosure, no list of who the org's customers are.

### Captive expertise

**Definition:** Cited "experts" are employees, board members, or paid advisors of the producing org.

**Tell:** Every quoted expert turns out to work for or be funded by the same entity.

**Example:** Report on AI safety cites three "leading researchers" who are all on the producing think-tank's payroll.

---

## Layer 3 — Biases added by the journalism/commentary

### Headline-to-source distortion

**Definition:** The headline makes a stronger or different claim than the article body, which in turn is a stronger version of the underlying source's claim.

**Tell:** Headline noun-swap ("executives" → "CEOs"), verb-swap ("expect" → "plan"), or scope-swap ("affect" → "replace").

**Example:** Source says "executives expect AI to affect workforce decisions." Article body says "executives plan AI-driven layoffs." Headline says "CEOs to fire workers due to AI." Each step inflates.

### Frame escalation

**Definition:** Same numbers, hotter framing, to fit the outlet's editorial stance.

**Tell:** Word choices throughout the article systematically push one direction (e.g., "surveillance" instead of "behavioral analytics," "replacement" instead of "augmentation").

**Example:** A finding that "HR teams plan to adopt behavioral analytics" is reframed as "HR turns to surveillance."

### Echo-chain amplification

**Definition:** Source A → trade publication B → mainstream outlet C → social media D. Each hop strips methodology and amplifies the number.

**Tell:** Article cites a secondary outlet, not the primary source. Methodology details disappear at each step.

**Example:** Vendor press release → TechSpot → Futurism → Twitter post. By post-stage the "99% expect any AI-related workforce change" has become "all CEOs planning mass layoffs."

### Causal framing on correlational data

**Definition:** Article asserts X causes Y when the source only shows X correlates with Y or co-occurs with Y.

**Tell:** Causal verbs ("driven by," "due to," "caused by," "the result of") attached to data that's a snapshot comparison or a survey.

**Example:** Worker wellbeing dropped at the same time AI adoption rose; article says AI is causing the wellbeing drop.

### Confound omission

**Definition:** Obvious alternative explanations exist and are not addressed.

**Tell:** Read the article; list three confounds it doesn't mention.

**Example:** "Wellbeing dropped because of AI" — article doesn't mention inflation, RTO mandates, election cycle, or post-COVID burnout, all of which also moved in the same window.

### Selective quoting

**Definition:** Article cites only the topline number; skips methodology caveats that the source itself provided.

**Tell:** Source's own report has a "limitations" section the article doesn't reference.

**Example:** Source notes "non-probability sample, results should not be generalized." Article generalizes.

### Loaded interpretation

**Definition:** Neutral data presented through a framing that implies a conclusion the data doesn't carry.

**Tell:** Adjectives doing work the verbs aren't ("ominous trend," "stark warning," "dire forecast").

**Example:** "44% report being unsatisfied at work" framed as "a stark warning about the workplace" — without context, 44% unsatisfied is neither high nor low; it needs a benchmark.

### Single-frame coverage

**Definition:** Only one interpretive frame is presented when the same data supports multiple.

**Tell:** No contrarian voice cited; no alternative explanation explored.

**Example:** Same survey data could yield "executives finally taking AI seriously" (pro-AI outlet) or "CEOs planning to replace workers" (skeptical outlet). When the article presents only one of these frames, that's a tell.

---

## How to use this taxonomy

For any source, walk these categories top-to-bottom. Most sources fire 3–7 categories total across layers. Don't force categories that don't apply. Don't skip categories that do.

**Rule of thumb:**

- Vendor research with viral coverage → typically fires source/funding bias + question-design + headline-to-source distortion + causal framing
- Academic paper with niche coverage → typically fires sampling + no-benchmark + selective quoting in the article
- Press release reported verbatim → typically fires the entire Layer 2 plus echo-chain amplification
- Op-ed dressed as analysis → wrong tool; redirect to a psychological author-analysis skill
