# `memory-bank/` — Persistent Project Context

Read **all** of these at the start of every task. They are the only link between
sessions; nothing else survives a reset.

## Read order

| # | File | Answers |
|---|------|---------|
| 1 | [`projectbrief.md`](./projectbrief.md) | What this repo is, its scope, goals, constraints |
| 2 | [`productContext.md`](./productContext.md) | Why it exists, who uses it, UX expectations |
| 3 | [`activeContext.md`](./activeContext.md) | What is being worked on *right now*, open decisions |
| 4 | [`systemPatterns.md`](./systemPatterns.md) | Architecture, routes, data flows, recipes |
| 5 | [`techContext.md`](./techContext.md) | Stack, versions, env vars, setup commands |
| 6 | [`progress.md`](./progress.md) | What works, what's broken, decision history |

## Maintenance rules

- Update `activeContext.md` at the end of every session; update `progress.md` when
  status or known issues change.
- Verify claims against the code before writing them — these files are trusted
  without question after a memory reset.
- Keep `systemPatterns.md` reflecting the **actual tree** (e.g. `react-fe/src/Pages/`,
  not the older `domains/` naming still present in `.steering/`).
- `.steering/` is a separate, older knowledge base. Where it disagrees with this
  folder, prefer `memory-bank/` and the code.
- `PIPELINE_ISSUES.md` at the repo root is append-only; never rewrite its history.
