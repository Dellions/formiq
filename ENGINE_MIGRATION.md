# FormIQ engine migration

Status: private GitHub source transfer and CI verified; data collection remains partial; authenticated backend cutover pending.
Existing project: `appgprj_6ad78b6349ec8191bd87c1a8d52f6406`.
Existing private site and R2 records remain authoritative.

## Runtime design

GitHub is the source repository. GitHub Actions runs scheduled collectors and deterministic calculations. The site displays saved results; a page view never launches hundreds of provider requests. Selenium, if an authorized source needs rendered-page collection, belongs on the Actions runner, not GitHub Pages or the current Worker.

The private application stays behind authenticated hosting. GitHub Pages is a separate static snapshot option; it is not a backend replacement, and private source does not automatically make Pages private. Do not enable public deployment as part of this migration.

## Data path

1. Collect upcoming fixtures for today and two days ahead in Africa/Lagos; preserve original source IDs and observation times.
2. Normalize competitions, team identities and kickoff times. Match exact identities or reviewed aliases, never automatically fuzzy-join prices across teams or dates.
3. Collect completed historical results and sport-specific inputs, with missing fields retained as missing.
4. Calculate the nine-step research trail. Keep score baselines experimental. A future AI engine can research and explain evidence, but must not supply invented numbers, prices or calibration.
5. Import actual bookmaker quotes into a separate research/quarantine channel. Match the precise event, period, market, side, line and settlement. Preserve source and verification evidence.
6. Evaluate calibrated models against fresh prices. The existing publication gate remains authoritative. Imported price data alone cannot qualify a selection.
7. Record pre-match single selections and 5/10/20 combined-odds tickets; settle and audit those ledgers separately.

## Source decisions checked 21 October 2026

| Source | Current development state | Evidence / missing work |
| --- | --- | --- |
| OpenLigaDB, Football-Data, TheSportsDB | Existing collectors retained | Existing source audit, cache periods and feed limitations still apply. |
| Flashscore | Requested adapter not enabled | https://www.flashscore.com/terms-of-use/ clauses 2.9–2.10 restrict substantial database extraction and scraping without express consent, subject to applicable law. No access basis or tested adapter established. |
| SportyBet Nigeria | Primary; bounded sample verified on GitHub | GitHub run 39589881594 captured 3 upcoming fixtures and 11 displayed prices on 21 October 2026. Visible-table parsing and the page's timezone were checked. Exact fixture mapping, settlement and calibration remain unverified. Indexed Nigeria terms section 7.1 reserves blocking of automated traffic; public reachability does not establish provider approval. |
| Bet9ja | Backup; adapter not implemented | Public homepage responded, but rendered odds were not obtained. No price collection claimed. |

Flashscore remains disabled. At the owner's request, SportyBet is primary and Bet9ja is backup. The SportyBet Selenium prototype uses public rendered text and a market-title class observed in the live DOM, with no hidden feed calls, login cookies, CAPTCHA solvers, proxy rotation or anti-bot bypasses. Browser reachability and a working production scraper are different milestones.

`scripts/collect-public-odds.py` serially samples at most ten match pages, spaced at least ten seconds apart, detects source challenges, and retains original source labels and observation times. Only exact ordinary 1X2, half-point match totals, double chance and BTTS headings are parsed; promoted, partial-period, team and player markets are excluded. Rules and cross-source fixture matching remain unverified, so observations do not enter recommendations. Failure receipts do not replace earlier observation files.

The supplied `.github/workflows/public-odds.yml` runs on relevant main-branch code changes, manual dispatch, and a configured 07:27 / 13:27 / 19:27 WAT schedule. Future cron execution must be verified in run history. Successful samples are archived under `research/odds-history/` and copied to `research/snapshot/bookmaker-observations.json`; failed or empty collections cannot overwrite successful samples. The current default is six fixtures, not complete coverage. Only the football table has passed a live automated sample; basketball/hockey coverage and Bet9ja remain unfinished. No automatic cross-source matching or publication is enabled.

The local execution workspace could not launch Chrome (`socket() failed: Operation not permitted`), but Chrome did run successfully on GitHub. Initial GitHub attempts timed out due to a collector selector assumption. Visible-page diagnostics showed the odds table and UTC display; the parser was fixed and then collected the verified sample. Earlier failed runs remain visible in Actions rather than being relabelled as success.

For an approved browser source: first implement and fixture-test a provider-specific parser, pin its Selenium/browser versions, confirm permitted pages and cadence, save source timestamps, detect empty/changed layouts, stop on access challenges and 403/429, and preserve the last good dataset. A generic browser stub must not be described as a working collector. Site-specific live extraction and permission still require validation.

## Implemented changes

`scripts/horizon-runner.mjs` refreshes the core inventory for all three dates before extended collection, processes batches serially, records unfinished cursors, and stops on a provider 429 including history failures. Failed batches retain their starting cursor. These receipts describe collection only, never full framework execution.

`scripts/refresh-research.mjs` uses that runner and stores `run-receipt.json` and `collection-progress.json` beside the private research snapshots. The workflow also preserves resumable state and receipts after failed jobs. Existing source requests remain capped and cached.

`scripts/market-ingestion.mjs` provides a conservative, offline quote validator. It quarantines stale prices, identity mismatches, unsupported lines, unknown settlement and missing verification evidence. Passing records remain research-only, with no probability or EV inferred. Boolean verification claims in an import are not independently corroborated by this validator.

Run on a locally supplied permitted quote export:

```sh
node scripts/inspect-market-import.mjs research/imports/quotes.json
```

The input directory and review output are ignored by Git. Import inspection does not modify stored fixtures, publish selections or make network requests.

## Quote contract

Each input array item must contain `eventId`, `sport`, `league`, `home`, `away`, `start`, `bookmaker`, `bookmakerEventId`, `sourceURL`, `observedAt`, `type`, `side`, `period`, `settlement`, `odds`, `rulesURL`, `mappingVerified`, `priceVerified`, `rulesVerified`, `verificationURL`, `verifiedAt`. Totals additionally require a half-point `line`.

Use actual observed decimal prices, ISO timestamps with timezone, precise home/away names and competition matching the stored fixture. Regulation, overtime and shootout markets are different. The initial validator accepts only supported full-match win, double-chance, BTTS and half-point totals; player, partial-period, integer Asian and quarter-line markets remain unsupported.

## Activation and acceptance

Repository access is established for the private `Dellions/formiq` repository. Required next: verify the transferred source, run CI, dispatch one collection job and verify its receipts. Workflow files and snapshots do not establish a live backend migration or successful unattended execution. No persistent personal data-provider API key is introduced. GitHub's workflow token is supplied by GitHub itself, not a sports-data key.

Before cutover: export all existing R2 records and immutable ledgers through authenticated APIs, import and compare IDs/counts/content, select authenticated backend hosting and its secrets, verify writes and readback there, and only then change traffic. A private repository is not a record migration. Do not commit service-access tokens or put them in browser code.

Do not claim fully automated deep analysis until real collector, data completeness, sport inputs, calibration, exact-price matching and unattended job execution have passed acceptance. No achieved accumulator target is asserted.

References: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages ; https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule ; https://www.selenium.dev/documentation/webdriver/ .
