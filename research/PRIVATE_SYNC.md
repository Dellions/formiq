# Private FormIQ synchronization

GitHub Actions collect bounded public observations and save research snapshots in this private repository. The existing ChatGPT task, Refresh FormIQ research and odds, is configured for 07:45, 13:45 and 19:45 Africa/Lagos, after the Actions jobs. This is an agent-mediated import, not a GitHub webhook or a migrated production backend. Future unattended execution remains to be verified.

Each task obtains fresh Sites service access and uses it only in the designated authorization header to the existing private origin. No Sites bearer is stored in GitHub. GitHub-hosted secrets administration and Sites connected-app eligibility are not exposed in the current tool surface.

Research transfer uses `research/snapshot/sync/manifest.json` and bounded batch files generated from the current snapshot. Each batch contains at most ten records and 180KB. Oversized records are listed as skipped. The updater reads at one commit, compares existing live records and preserves published and externally enriched research. Imports require individual write/readback checks.

Bookmaker observations have a separate append-only history, duplicate-import idempotence and rejection of older batches. Explicit aliases only produce identity candidates. Kickoff, sport, competition and home/away must still agree; no fuzzy team matching, general gender/age stripping, price invention or automatic ticket eligibility is enabled. Missing exact settlement evidence remains missing.

Scheduled imports are bounded to 20 research records per run. Partial provider coverage, API rate limits, failed/missing tool access and runtime limits must be reported rather than called completed research. Research and odds archives do not prove calibration or betting accuracy.
