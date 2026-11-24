# Token Launch Radar

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
