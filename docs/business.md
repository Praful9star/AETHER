# Aether as a business

Not "how do we add a subscription". The question is which revenue model this
particular product can carry without breaking the thing that makes it work.

Everything below is dated October 2026. Figures from vendor reports and
third-party estimators are labelled as such, because most of what is written
about app revenue is one of those two and neither is audited.

---

## 1. The tension to name first

Subscription app economics reward **frequency**: daily habit, streaks,
notifications, retention. That is why Finch — a self-care pet you feed every
day — works, and it is reportedly the strongest retention in the category.

Aether is deliberately built to do the opposite. One exchange, then it closes.
No reassurance. No dependency "by design, not by accident". The research
behind that is real: the MIT/OpenAI trial found voice beat text only at
*moderate* use and reversed at heavy use.

**So a pure daily-habit subscription fights our own design.** Any model that
needs people in the app every day will quietly push us to add streaks, nudges
and a companion that talks back — and that is the product becoming the thing
it was built against.

The way out is to charge for **depth and artefacts, not frequency**. Aether's
commercial asset is not engagement minutes. It is that it produces a beautiful,
personal, longitudinal object: your sky.

---

## 2. What the market says

**Freemium conversion is brutal and should be planned for, not hoped past.**
RevenueCat's 2026 report puts freemium → paid at ~2.1% across categories and
hard paywalls at ~10.7%. Adapty's funnel for Health & Fitness: ~9.5%
install→trial, ~42.2% trial→paid, ~67.7% first renewal. Both are vendor
reports; treat them as order-of-magnitude.

Model it honestly: **100,000 users of a free-first Aether ≈ 2,000–2,600
payers.** At $5/month that is roughly $10–13k/month. That is the realistic
shape, and it is a real business — but only if we can get 100,000 users, which
is a distribution problem, not a pricing one.

**Price for the world, not for India.** This is the most important number in
this document: India generates about **$0.03 revenue per download** against
**$0.20+** in Southeast Asia and Latin America. Indian app spending is growing
fast — a record $345M in Q2 2026, up 35% — but the per-user baseline is still
low. Aether should be priced in USD, marketed to the US/UK/EU, and made cheap
in India through store regional pricing. India is the home market and the test
market. It is not the revenue market, and building for Indian price points
first would cap the whole thing.

**The two closest comparables disagree about subscriptions, and the aesthetic
one won without them.**

| | Model | Scale | Notes |
|---|---|---|---|
| **Co-Star** | **À la carte in-app purchases, no subscription** | ~4.3M MAU | Aesthetic, Gen-Z, grew with no marketing spend; acquired by Midjourney |
| **Finch** | Subscription, $39.99–69.99/yr or $5.99–9.99/mo | ~$1M/mo (Sensor Tower est.) | Bootstrapped; growth is paid social, high-volume UGC creatives |

Co-Star is the closer analogue to Aether — aesthetic, shareable, identity-
adjacent — and it monetises by selling *specific things*, not access. That is
the model that fits a product which refuses to demand daily use.

**The journaling competitors are all priced higher than you'd guess, and one
just closed its free tier.** Rosebud ~$12.99/mo or $107.99/yr and **retired
its free plan in September 2026**. Mindsera ~$14.99/mo or $129/yr. Stoic is
cheapest and notably sells a **~$299 lifetime** unlock. Two readings: there is
room above $5, and the category is discovering that free users of an AI
product cost real money.

---

## 3. The model: free sky, paid voice, paid artefacts

Three lines, in the order they should be built.

### Line 1 — The voice is the honest paywall

Free: everything that exists today. Unlimited thoughts, galaxies, the sky, the
bounded exchange, and the **browser voice**.

Paid: **Aether's real voice** — the cloned, spatial one that lives in the audio
graph. Plus memory across devices once accounts exist.

Why this and not a thought limit: the cloned voice has a **genuine marginal
cost of roughly ₹1–4 per exchange**. A paywall on something that actually costs
money is honest, survives App Store review, and cannot be read as withholding
help from someone who needs it. A cap on how many thoughts you may have could
be. For a product in this category that distinction matters more than the
revenue.

It also means free users never cost us per-exchange money for voice, which is
how consumer AI apps die.

The architecture already does this: `/api/speak` returns 503 when no provider
is configured and the client falls back silently. Gating it per-account is a
small change, not a rebuild.

**Price:** $4.99/mo or $34.99/yr, in USD, with store regional pricing for
India. Below Rosebud and Mindsera, above impulse-noise, and the annual
discount is where the money actually is.

### Line 2 — The printed sky

Aether is the only product in this category that generates something worth
hanging on a wall. A custom star map of your own thoughts, with the dates and
the lines you actually wrote.

The category already exists and tells us the price band: custom star-map prints
retail roughly **$18–55**, printed through partner labs near the customer, and
free generators exist at the bottom of the market. Our moat against those
generators is simple and total: theirs is a date and a latitude, which anyone
can produce. Ours is **your sky, made of your own thoughts** — not
substitutable, and not something a competitor can generate for you.

Why this line matters more than it looks:

- **One-time, and it aligns with the design.** You pay when a year mattered
  enough to keep, not because you opened the app enough times.
- **Print-on-demand means no inventory and no capital.** Margin is in the
  design, which we already have.
- **It is a gift.** Gifting is how an aesthetic object reaches people who were
  never going to download a mental health app.

Start with a **high-resolution digital export** — zero fulfilment cost, instant,
testable this month. Only add physical once people buy the file.

### Line 3 — À la carte, the Co-Star way

Specific things, bought once, that make the sky deeper rather than the app
stickier:

- **Your Year in Stars** — the Spotify Wrapped mechanic, once a year. It is
  simultaneously the purchase moment, the share moment and the reason to still
  be here in twelve months.
- **A reading of your sky** — what your constellations actually show about
  which thoughts returned. This is the one place a longer AI output is
  justified, because it is retrospective and not in-the-moment reassurance.
- **Extra voices**, once voice cloning is in.

---

## 4. What not to do

- **No medical or therapeutic claims, ever.** "An instrument for overthinkers",
  never "treats anxiety". Claims invite App Store rejection and regulatory
  attention, and we cannot support them.
- **No ads.** They would destroy the aesthetic, and ad targeting against mental
  health data is a line we should not go near.
- **No streaks, no daily nudges, no companion that keeps talking.** These are
  the obvious retention levers and every one of them contradicts both the
  design and the evidence. If we ever need them to make the numbers work, the
  model is wrong, not the product.
- **No India-first pricing.** See §2.

---

## 5. The real first question is distribution, not price

Pricing is solvable. The open question is whether the artefact spreads on its
own. Co-Star grew with no marketing spend. Finch spends heavily on
high-volume user-generated creatives. We currently have no distribution at all,
and that — not the price point — is what decides whether any of this matters.

It is cheap to test and should be tested before anything else is built:

1. Post 20–30 galaxies as short vertical video. Measure saves and shares, not
   likes. Saves are the signal that an aesthetic object has landed.
2. Watch whether anyone shares a galaxy *without being asked to*. The share
   page and OG image already exist, so this is measurable today.
3. If the artefact does not spread on its own, no pricing model saves it, and
   the next work is the artefact, not the paywall.

---

## 6. Costs, honestly

Today: **₹0.** Groq, Supabase and Vercel free tiers.

What starts costing money, in the order it will happen:

| | Cost | Scales with |
|---|---|---|
| Cloned voice | ~₹1–4 per exchange | Paying users only, if gated as in §3 |
| LLM (Groq) | Free tier today | Every exchange, including free users |
| Supabase | Free tier today | Stored stars |
| Print fulfilment | Per order, POD | Orders only |

The LLM is the one that scales with free users. That is the number to watch,
and the reason the free tier must stay cheap per exchange — short outputs,
caching, and the bounded exchange all help.

---

## Sources

Vendor reports and third-party estimators, as marked. Numbers in this category
move quickly; re-check before committing money to any of them.

- Conversion benchmarks: [RevenueCat, State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps) ·
  [Adapty, Health & Fitness subscription benchmarks](https://adapty.io/blog/health-fitness-app-subscription-benchmarks/)
- India market: [India is starting to pay for apps, not just download them (TechCrunch, Jul 2026)](https://techcrunch.com/2026/07/31/india-is-starting-to-pay-for-apps-not-just-download-them/) ·
  [India's app market is booming but global platforms capture the gains (TechCrunch, Apr 2026)](https://techcrunch.com/2026/04/22/indias-app-market-is-booming-but-global-platforms-are-capturing-most-of-the-gains/)
- Finch: [How a self-care app hit $30M ARR without VC money](https://blog.sparrowapps.io/p/finch-how-a-self-care-app-hit-30m-arr-without-vc-money) ·
  [Finch paywall and pricing (Adapty)](https://adapty.io/paywall-library/finch/) ·
  [Sensor Tower estimates](https://app.sensortower.com/overview/1528595748?country=US)
- Co-Star: [its own FAQ on how it makes money](https://www.costarastrology.com/faq) ·
  [Gen-Z and personalised astrology (TIME)](https://time.com/6083293/astrology-apps-personalized/) ·
  [Midjourney acquires Co-Star](https://www.aichatdaily.com/ai-business/midjourney-acquires-co-star-astrology-app-4-3m-monthly)
- Journaling competitors: [Rosebud vs Mindsera](https://mindsera.com/articles/rosebud-vs-mindsera) ·
  [AI journaling apps compared](https://blog.mylifenote.ai/ai-journaling-apps-compared/)
- Print category: [Starrymaps](https://starrymaps.com/) · [Modern Map Art](https://www.modernmapart.com/pages/custom-night-sky-star-map) ·
  [Positive Prints](https://positiveprints.com/product/star-map/)
