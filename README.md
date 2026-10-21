# FormIQ research desk

**Analytical and Memorable**

Private source repository: https://github.com/Dellions/formiq. The existing authenticated FormIQ Site remains the live application. GitHub source transfer does not migrate its R2 storage or activate public Pages hosting. Check Actions for actual validation and collection results.

Existing owner-private Site `appgprj_6ad78b6349ec8191bd87c1a8d52f6406`; retains R2 `BUCKET` and access policy. No credentials in source. Legacy adapters and `latest.json` remain intact. V3 data lives under `research/`.

## Execution and limits

The full, unmodified attached framework is in `research/framework.txt` and `/api/framework`. Backend numerical research implements nine status-bearing steps with explicit gaps. It is NOT an AI engine or full framework execution. All supported models remain experimental score-history baselines. V5 adds 46 league-filtered TheSportsDB adapters, today plus two days ahead, and experimental score-only normal / Poisson baselines for basketball, handball and hockey when at least six results per team exist. These are uncalibrated and do not replace full sport-specific research. NHL, EuroLeague and NBA are in the catalog. HTTP 429 can stop collection before all leagues are reached. No synthetic website content or performance.

OpenLigaDB is an explicitly supported no-credential automated API, attributed under ODbL. ESPN/EHF adapters are retained but not invoked because reuse conditions are not established or prohibit extraction. Forebet navigation and terms were inspected; copying permission was not established, so no adapter is activated. No bookmaker price feed has been verified. No picks currently meet publication requirements.

## Private service publishing

Sites dispatch enforces the current owner-private access boundary. Obtain fresh service access via Sites `get_site`; send bearer only to this Site in `OAI-Sites-Authorization`. Never persist it. No audience changes.

- GET `/api/instructions`, `/api/framework`: stable workflow and complete framework.
- POST `/api/refresh?date=YYYY-MM-DD&root=false`: OpenLigaDB scan retaining all returned fixtures. GET `/api/collection-plan` returns dates, league catalog and batch size. POST `/api/collect?date=YYYY-MM-DD&cursor=0` runs two serial league batches with cache-aware rate limits and reports nextCursor. Coverage is incomplete. GET `/api/validation` returns the preliminary retrospective receipt. GET/POST `/api/tickets` audits/records eligible pre-match tickets. POST `/api/collection-status` records a validated collection receipt. No browser refresh trigger.
- GET `/api/research` or `?id=...`: persisted research.
- POST `/api/research`: structured record with fixture, ordered nine steps, status, HTTPS source URLs and retrieval times. Saves research revisions. Claimed facts are not silently independently verified.
- POST `/api/publish`: requires future pre-match fixture, confirmed fixture, numerical estimate, >=6 results per team, calibrated flag AND linked validation evidence with >=100 resolved sample, fresh actual named-bookmaker price URL, rules URL, period and settlement confirmation, >=78% model estimate, >=3% model EV. Football O2.5 additionally >=75% both samples. One immutable prediction per event, conditional R2 create.
- GET `/api/picks`: reads persisted records and constructs qualified same-bookmaker tickets. Does not launch collection.
- POST `/api/settle`: fetches supported OpenLigaDB results; exact matching rules required; uncertain results stay pending. Football totals/1X2/BTTS/double chance supported. Other sports do not settle automatically absent compatible rules.
- GET `/api/performance`: prediction ledger and flat-one-unit single-selection return. Null rates when denominator zero; calibration descriptive bins start at 100 resolved predictions.
- POST/GET `/api/automation-report`: reports fresh task tools, status and limits, independently of scan success.

R2 publication conditional create prevents later selection replacement. Research and scan histories are separate. Original pre-upgrade storage is untouched. Production API authentication is enforced upstream by Sites; local tests cannot establish that boundary.

## Verification

`node tests/research.test.mjs` covers independent O1.5/O2.5 screening, sample gates, missing data, sport separation, exact settlement, duplicate/start exclusion, quote freshness, same-bookmaker ticket mathematics, persistence, rejected cross-origin writes and immutable publication. Test inputs are synthetic and never deployed as recommendations.

`node scripts/live-research-check.mjs YYYY-MM-DD` runs a bounded real-source batch into temporary local storage. `bash scripts/build.sh` and `node scripts/validate-artifact.mjs` build and validate the Worker artifact. Preview uses in-memory storage, production uses existing R2.

Daily 07:00 Africa/Lagos automation is reused. A saved schedule is not proof of full research execution; use run_now and recorded result plus saved run receipt for verification. Fresh task's tool budget and source access must be observed, not assumed.

## GitHub preparation

See [GITHUB_SETUP.md](GITHUB_SETUP.md). The repository contains validation, scheduled research and manual public-odds workflows. Their presence is not proof of successful execution. Static exports contain no authenticated write endpoints. The live Site remains private. Bundled research snapshots are an earlier export, not a complete current R2 backup.
