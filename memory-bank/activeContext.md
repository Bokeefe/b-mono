# Active Context — b-mono

> Current work focus, recent changes, next steps. Update this file at the end of
> every meaningful session.

## Session snapshot — 2026-10-22

- **Branch:** `feature/new` at `53134a1` "fixes for lunch app" (tracked on
  `origin/feature/new`).
- **Working tree:** clean at time of writing (ignore `.DS_Store` noise).
- **Just done:** initialized `memory-bank/` (all six core files).
- **Recent commits (newest first):** lunch-app fixes → mobile background link
  restore → static file copy fixes → API-served MP3 work (3 commits) →
  claimjumpers demo page → music page basics → home button animation →
  explainer/cleanup → text-corpse write fix → "cline added a bunch of steering".

## Current focus

1. **Lunch app stability on mobile.** Recent commits target the background/
   reconnect path: the client re-emits `joinRoom` on socket reconnect and on
   `visibilitychange` so a backgrounded phone still sees the winner. The gateway
   replays `winner`/`completedAt` for finished rooms (4h retention) and keeps
   empty in-progress rooms for 2 minutes.
2. **Claimjumpers audio.** A new mini-app (`/claimjumpers`) that lists and plays
   MP3s from `nest-server/public/audio/claimjumpers`; served both by
   `/api/claimjumpers/:filename` (Range-capable `sendFile`) and the static
   `/audio/claimjumpers/...` path. This is the newest feature and the least
   battle-tested.
3. **Static asset serving correctness.** `main.ts` now skips SPA fallback for
   `/api`, `/audio`, `/assets`, `/socket.io`, `/backup` so missing JS chunks 404
   instead of returning `index.html`.

## Active decisions & considerations

- **`.steering/` docs are partly stale.** `architecture.md` / `domains.md` still
  say `react-fe/src/domains/` and list `Pages/Examples`; reality is
  `react-fe/src/Pages/` with no `Examples` routes. Trust the code and
  `memory-bank/systemPatterns.md`, not the folder name in those docs.
  (Fixing `.steering/` is an open candidate task.)
- **New feature checklist is unchanged:** server module → shared type → page →
  route → Home button.
- **URL-only pages are normal here.** `/resume` and `/claimjumpers` work but have
  no Home button; do not "fix" this without asking — it may be intentional
  sequencing.
- **CI/CD still needs a human check.** `PIPELINE_ISSUES.md` states the pipeline
  was worked around by manual SSH; the file is **append-only** — add dated
  entries, never rewrite.
- **Lunch and TextCorpse sockets are deliberately different.** Don't refactor
  them into one client as drive-by cleanup.

## Patterns & preferences observed in this repo

- Commits are short, lowercase, sometimes joking ("faux push", "fake change").
  Several are DevOps retries — expect redundant-looking history.
- Comments are informal and explanatory ("faux push", "curl -X GET ..." usage
  examples above controller methods). Preserve that style; usage comments are
  welcome.
- Fail-soft services: wrap `fs` reads in try/catch, `console.error`, return `[]`.
- Security-sensitive bits are hardcoded rather than configured
  (`MASTER_PASSWORD = 'corpseunlock'`, `/backup` password via env).
- Local models are the primary coding driver; dense context files pay off.

## Next steps (suggested, not committed)

1. Decide whether to refresh `.steering/architecture.md` + `domains.md` to match
   `Pages/` and include Claimjumpers.
2. Add a Home button for `/claimjumpers` (and decide on `/resume`).
3. Verify CD actually deploys unattended (per `PIPELINE_ISSUES.md` goal) and
   append a dated entry with the result.
4. Consider moving the Lunch client to the `/text-corpse` shared pattern or at
   least documenting the divergence.
5. Add a minimal test for `LunchGateway` room lifecycle (retention/grace), since
   that logic is the most time-sensitive and currently untested.

## Session log

### 2026-10-22
- Created `memory-bank/` six core files from verified repo state.
- Confirmed: branch `feature/new` @ `53134a1`; routes include `/claimjumpers`;
  pages live under `react-fe/src/Pages/`; no frontend tests exist; backend has
  three `.spec.ts` files.
- No source code modified.
