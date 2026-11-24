# Token Launch Radar

## Methodology

The board's implied value is calculated from TVL, a median token market-cap-to-TVL benchmark observed in the same sealed snapshot, seven-day TVL change, and days since first listing. The median is calculated from records with a positive token market cap and TVL, after excluding ratios outside 0.005–8; it is clamped to 0.03–1.5. Growth is clamped to −50% through +80%. Operating history contributes a maturity adjustment capped at 1,095 days. Missing growth is treated as zero, and an unknown listing date uses the documented 365-day default. This produces a consistent comparison, not a forecast of launch timing or token price.

The detail view's confidence score (0–100) describes snapshot evidence quality. It rewards the presence of TVL, seven-day change, and listing age plus a modest TVL-depth component; it deducts for large weekly movement and very recent listings. It is not a probability of a token launch, an airdrop, or a return. Risk flags are mechanical labels from those same observations: thin data, sharp TVL decline, recent listing, unusually volatile TVL, or a recorded market capitalization. The flags identify facts to inspect; they do not certify safety.

## Dashboard guide

Use the search box for protocol, chain, or category. The category and chain menus narrow the board together. Click the implied value, TVL, or age headings to set sort priority; Shift-click another heading to add up to two tie-break columns. Export CSV downloads the currently visible ranking with its farm plans. Select a row to open its model breakdown and checklist. Checklist progress is stored in this browser's local storage for that protocol. The market-context section keeps token-bearing protocols separate from the ranked candidates.

## Limitations

All inputs are one sealed DefiLlama snapshot, so values can become stale and unreported changes remain unknown. Listing date is only a proxy for operating history; it does not prove how long a protocol has operated or whether it plans a token. The snapshot does not include fees, revenue, investor allocations, token supply, emissions, app eligibility, or a complete parent-product graph. TVL can be borrowed, concentrated, or incentive-driven. Farm steps are generic starting points, not personalized financial advice: confirm contract addresses, supported assets, fees, withdrawal terms, and official eligibility rules before transacting. Capital can be lost, and no token or reward is promised.

[![make.fun bounty](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![Live rank](https://make.fun/badge/token-radar-01/Jsmile19/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01)
[![Live reward](https://make.fun/badge/token-radar-01/Jsmile19/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

An offline token launch radar built from the sealed DefiLlama snapshot for [token-radar-01](https://make.fun/bounty/token-radar-01). It covers all 40 watchlist protocols and adds early candidates below the $50M TVL floor. Each ranked row includes an implied token value and six farm steps with capital, fee budgets and time estimates. Token-bearing records appear separately.

The value model multiplies TVL by a snapshot-derived median market-cap/TVL benchmark, then adjusts for capped seven-day growth and time since first listing. Listing age is an operating-history proxy, not proof of time without a token. Unknown growth uses zero; unknown age uses 365 days. The benchmark keeps ratios from 0.005 to 8 and clamps its median to 0.03–1.5. Values are model estimates, not launch forecasts or promised rewards; plans require checking actual asset support and eligibility in official documentation.

## Run

Requires Node.js 22.18 or newer; no packages or network access are needed.

```sh
node main.ts --input /workspace/token-radar-kit/token-radar-01-kit/input/snapshot.json --output .
```

This writes `board.json`, `data.js`, and `dossier.json` using the unchanged kit library `vendor/makefun-board.ts`. For the grader layout:

```sh
MAKEFUN_OUTPUT_DIR=/output node main.ts --input /input/snapshot.json
```

The program copies `dashboard/` and `screenshots/` to a separate output directory. Without three captures, it writes the board and dashboard but reports that dossier generation is pending.

## Use the dashboard

After running the pipeline, open `dashboard/index.html` directly in a browser. It reads the adjacent generated `../data.js` without fetching anything. Search by protocol, category or chain; choose a category; click column headers to sort; and select any row for its valuation inputs and exact farm plan. Use the Live token tab for market context. Detail and filter state can be restored from the URL hash, for example `#p=steakhouse-financial` or `#category=Lending`.

The badge URLs assume the future public repository is `Jsmile19/token-launch-radar`.

## Capture handoff

No screenshots were taken during this build session. The three files currently in `screenshots/` are inherited starter captures and do **not** represent this changed dashboard. Replace them from a plain shell with captures of the current board, detail view and filtered view, then rerun `main.ts` to regenerate the dossier. Capture at 1280×800 and keep each image at or below 256 KiB to satisfy both the requested limits and the kit's minimum short side. A generated dossier containing starter captures is a development artifact, not submission-ready evidence.

The source uses the MIT license. Preserve the original agent session logs for transcript bundling; this build does not fabricate or export transcripts.

---

Built for [make.fun](https://make.fun/?ref=q3bse5cn) · referral `ref=q3bse5cn`.
