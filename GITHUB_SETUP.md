# FormIQ GitHub deployment preparation

See [ENGINE_MIGRATION.md](ENGINE_MIGRATION.md) for source access findings, the resumable runner and quote quarantine contract. Flashscore is disabled. A bounded SportyBet football sample has passed on GitHub; Bet9ja remains unfinished.

SportyBet is the primary bookmaker; Bet9ja is backup. The public-page Selenium collector has captured 3 fixtures and 11 displayed prices in GitHub run 39589881594. The bounded collector is configured for 07:27, 13:27 and 19:27 WAT, plus manual dispatch and relevant code changes. Price observations remain research-only and do not enter betting publication. Check the run artifacts, immutable quote archive and failure receipts.

The existing private FormIQ Site and its storage remain the live system. The connected private repository is `Dellions/formiq`. GitHub Pages deployment and full R2 migration have not been activated.

## What this repository contains

- The original Worker application and Sites identity.
- A no-install Node 22 collector, `scripts/refresh-research.mjs`, that refreshes today and two days ahead in Africa/Lagos.
- A verified-source league catalog. Free TheSportsDB daily calls use the documented league filter. Responses remain capped at three events per league per UTC day; season responses at fifteen. This expands coverage but cannot establish a full schedule or full ten-match histories.
- Explicitly experimental score-history models, separate from calibrated published betting selections.
- An immutable pre-match single-selection gate and ticket ledger, with weekly ticket audit.
- A retrospective walk-forward baseline replay (`node scripts/backtest.mjs 2026`); no historic offered odds and no accumulator ROI claim.
- A GitHub Actions workflow at `.github/workflows/research.yml` that tests, collects, preserves source caches, commits research snapshots and produces a static artifact.

## Run without installing dependencies

```bash
node tests/research.test.mjs
node tests/forecast.test.mjs
node scripts/refresh-research.mjs
node scripts/export-github.mjs
```

Use `CORE_ONLY=1 node scripts/refresh-research.mjs` for the smaller OpenLigaDB scan. Full collection is intentionally serial and can take many minutes. Provider HTTP 429 stops collection; completed work stays in `.edgeform-state` and the last snapshot is saved. Cached source responses use their actual retrieval times. Do not rerun repeatedly to bypass source limits.

## Activate GitHub automation

1. Use the authorized **private** repository `Dellions/formiq`. Do not upload short-lived Sites access tokens or personal credentials.
2. Enable GitHub Actions. The workflow uses GitHub's built-in token to commit snapshots. Permit workflow write access for that repository if its policy requires it.
3. Run “Refresh FormIQ research” manually once, inspect logs and the generated snapshot. The supplied cron is 06:17, 12:17 and 18:17 UTC (07:17, 13:17 and 19:17 WAT). GitHub may delay or skip scheduled runs; job history is the evidence of execution.
4. Download the `formiq-static-snapshot` artifact to inspect the generated static website. The snapshot has no live write endpoints, API keys or sign-in implementation.

## Hosting and privacy

GitHub Pages serves static files. It cannot run the Worker APIs, scheduled collector or storage on a browser visit. Actions must generate JSON before Pages serves it. A reload button only reloads the last snapshot.

GitHub Pages is generally publicly accessible even when its source repository is private. Therefore the supplied workflow deliberately **does not deploy to Pages or change this private Site's audience**. Choose an explicitly authorized public snapshot or a host with authentication before enabling deployment. Keeping source in a private GitHub repository and running the Worker behind authenticated hosting is another option.

This export is not a claim that GitHub hosting or scheduled runs have been activated. Existing R2 research and prediction records are not automatically migrated to a new account; export/import them through the authenticated API before any cutover. Do not expose Sites service tokens in browser JavaScript.

## Data needed for production betting evaluation

Broader complete fixture feeds, at least 6–10 results per team, sport-specific pace/efficiency/player inputs, exact market lines and settlement rules, timestamped bookmaker odds, and untouched forward testing are still required. Price feeds may require a provider account or paid plan. No odds are generated from model probabilities.

Your ticket goals (80% at 5 odds, 75% at 10 odds, 70% at 20 odds) are stored as research goals, not achieved accuracy. Weekly reports count only tickets recorded before any leg started. Single-selection hit rate, accumulator hit rate, ROI and probability calibration are different measures.
