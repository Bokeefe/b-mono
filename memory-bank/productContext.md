# Product Context — b-mono

## Why this project exists

`b-mono` is a **showcase and a playground**. It solves two personal problems at
once:

1. **"Where do all my small projects live?"** Instead of many one-off repos and
   deployments, every idea ships from one codebase to one domain.
2. **"How do I show my work?"** The Resume, About, and Music sections are
   job-search surfaces. They must look intentional, not like demos.

It is also an intentional learning vehicle: the author drives development with
local LLMs (LM Studio) and keeps the repo heavily documented so agents can pick
up work cold.

## Problems it solves for users

| User | Need | How the app answers |
|------|------|---------------------|
| Recruiter / peer | Quickly assess the author | `/resume`, `/about`, `/music` |
| Friend group | Decide lunch together, fast, on phones | `/lunch` real-time ranked-choice vote |
| Friends / collaborators | Play a low-friction writing game | `/text-corpse` shared writing rooms |
| The author | Listen to own music at work | `/slomo`, `/claimjumpers` |
| Gardener / cook | Decide dinner from what's already growing and in the cupboard | `/recipes` |
| The author | Rehearse API patterns | `/fetch`, `/axios`, `/sandbox` (legacy) |

## How it should work (experience goals)

### General
- **Mobile-first.** Every interactive surface must be usable one-handed on a
  phone; buttons are large (`MobileButton`), layouts are single-column.
- **No sign-up, no friction.** Identity is a name typed once and kept in
  `localStorage["name"]` (Lunch).
- **Instant-ish.** State travels over Socket.IO so multiple phones converge
  without refreshing.

### Home
A wall of big buttons — the only navigation primitive. Currently live:
`music`, `slomo`, `lunch`, `text-corpse`, `about`, `planting-calendar`.
`/resume`, `/claimjumpers` and the newest app, `/recipes`, are reachable by URL but
not surfaced on Home (see `progress.md`).

### Lunch
- A group opens `/lunch`, creates or joins a room, adds places, votes, and after a
  20-minute timer the top-voted place wins.
- Votes are **changeable** (one per user; moving your vote removes the old one).
- Ties break randomly.
- **A late joiner must still see the answer.** Finished rooms keep their winner
  for 4 hours and `joinRoom` replays it. Backgrounded phones re-sync on
  `visibilitychange` and reconnect.
- Empty in-progress rooms survive 2 minutes so a phone losing signal doesn't
  destroy the vote.

### TextCorpse
- One shared text stream per room; you only read the recent tail (last ~1000
  chars) so the game stays "exquisite corpse".
- Submissions are capped (170 chars) and auto-spaced when appended.
- Rooms may be public/private and password-protected; there is a universal
  master password for the owner.

### SloMo / Claimjumpers
- Background-friendly playback on a phone, with optional speed and reverb.
- Persist volume/speed/reverb choices across visits (`localStorage`).
- Known tension: Web Audio reverb (Pizzicato) vs. mobile background playback —
  see `react-fe/src/Pages/SloMo/SloMo.md`. Do not "fix" one by breaking the other.

### Resume
- Readable in one scroll; exports to PDF (`jsPDF`, `react-to-print`) and TXT
  (`Blob`).

### Recipes
- The question is **"what can I cook right now?"**, not "browse a cookbook":
  only recipes that need nothing more, or exactly one more thing, are listed.
- The pantry is **ticked, not typed** — big checkboxes, searchable, remembered in
  `localStorage` because what is in the house is a standing fact. The garden half
  is the planting calendar's own crop list, so it moves with what can be grown.
- **The server decides, the page phrases.** Matching, families, aliases and
  staples live in `nest-server/src/recipes/`, never in React.
- A substitution is **announced** (`using shallots for onions`), and anything the
  recipe merely *likes* is an optional chip, never a blocker.

## Product principles to preserve

1. **One route = one self-contained page.** No global state manager; local state
   plus services.
2. **Server is dumb and in-memory where possible.** Prefer a `Map` over a schema.
3. **Fail soft.** Scanners and file readers return `[]` and log instead of
   throwing (see `ClaimjumpersService`, `SlomoService`).
4. **Content over chrome.** The personality lives in copy, fonts, and imagery —
   not in a heavy UI framework.
5. **Hidden is fine.** Features may exist as URL-only experiments; do not assume
   Home lists everything.

## Tone / aesthetic

Dark, typographic, slightly chaotic-personal: custom fonts (Astloch, Caesar
Dressing, Major Mono Display, Quicksand, Oxygen Mono), texture images in
`react-fe/src/assets/`, SCSS per component. MUI is used sparingly (Header icons,
Resume links) — not as the visual system.
