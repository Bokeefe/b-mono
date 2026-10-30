# Recipes page

What the garden and the cupboard can make together. Tick what is in the house
and the page lists the recipes you can cook right now, then the ones that are
exactly one ingredient short, then — under a separate heading — everything else
that uses what you ticked, the ones that eat your garden first. Route:
`/recipes`.

The pantry has **two** sections, not three: _From the garden_ (71 crops, derived)
and _Fridge & cupboard_ (38 hand-authored items). The old third section,
_Extras_, held butter, the named cheeses, cans and condiments — but nobody files
butter separately from the fridge, so it was folded in and the seeds were
re-ordered into a reading order (protein, dairy, condiments, grains, cans,
indoor produce). Because "do I have a normal kitchen?" is one question with one
answer, that section also carries a **`tick all 38`** control — one press ticks
the whole fridge in, and it becomes `untick all`.

That browse list exists because the strict gate alone punishes a small pantry:
tick only `cabbage` and a gate-only page shrugs. With the browse list, one tick
still answers with cabbage recipes, and the promise ("cook it now" / one
ingredient away) stays exact because it is a different, clearly-marked list.

The garden half of the pantry is not maintained here: it is derived from the
Denver planting calendar's crop list
(`nest-server/src/planting-calendar/data/co-englewood.json`), so the page knows
about okra and tomatillos and salsify and nothing the calendar cannot grow.

## Where the recipes come from

All hand-authored, in `nest-server/src/recipes/recipes.catalog.ts`, in sections
named after the crop they serve (zucchini, tomatoes, kale, chard, cucumbers,
tofu, cabbage), then three imported sections:

- **Blue Zones** — twenty dishes adapted from the [Blue Zones recipe
  archive](https://www.bluezones.com/recipes/): ribollita, Tuscan beans, Greek
  lemon potatoes, falafel, sweet potato cakes and fifteen more.
- **Moosewood** — twenty from [The Moosewood Cookbook](https://www.moosewoodcooks.com/)
  (Mollie Katzen, 1977; revised 2000), the book this whole page is shaped like,
  because a garden in July and a 1970s vegetarian cookbook solve the same
  problem: Gypsy soup, Russian cabbage borscht, gingered carrot soup, black bean
  soup, hot and sour soup, gazpacho, onion soup, spinach-rice casserole,
  cauliflower-cheese pie, eggplant enchiladas, gado-gado, stuffed cabbage, baked
  beans, tostadas, potato salad, multi-bean salad, Italian antipasto,
  cauliflower Marranca, green tomato chutney and crepes. Each entry names its
  source in a comment above it — the book's page number wherever the index gave
  one (Gypsy soup 5, Gado-gado 104, Tostadas 144-45), and the substitution it
  needed where it did not.
- **Bon Appétit** — twenty from [bonappetit.com/recipes](https://www.bonappetit.com/recipes),
  read off each dish's own structured data (name, ingredient list, yield) rather
  than guessed at, then written as adaptations in the magazine's name for the
  dish: perfect pasta primavera, creamy pumpkin pasta, orecchiette with fresh
  corn alfredo, pasta with fresh tomato sauce and pasta alla Norma, BA's best
  mashed potatoes, spiced brown butter tomatoes, quick-pickled red onions,
  frico'ed Brussels sprouts, tiny tomato galettes, cheddar biscuits, pumpkin
  enchiladas with black beans, toasted orzo chicken soup, chicken pozole verde,
  watermelon som tam, chili crisp chicken, spicy chicken lettuce wraps, green
  goddess harvest salad, sheet-pan chicken souvlaki and pumpkin chili. The source
  page is in the comment above each entry, alongside the swap it needed.

The rule for admitting a recipe from anywhere is the same, and it is the pantry
that decides: **the main ingredient has to be something a cook can already
tick**, and the dish has to be cookable with what the catalogue can say. Blue
Zones' own flavourings that we do not stock (sumac, dried chiles, tahini, coconut
milk, grape syrup) are dropped or stood in for by something that is — grape syrup
becomes honey, coconut milk becomes milk, pineapple and mushrooms come out of the
cauliflower fried rice. Moosewood gets the same treatment, at scale: mushrooms,
sour cream, yogurt, tahini, bulgur, walnuts, almonds, molasses and cornmeal are
simply not on the pantry list, so honey stands in for the molasses, peanuts for
the almonds, vinegar where the book pours sherry, the sour cream is either
dropped or a swirl of milk, and the tabouli is left out entirely because the
cupboard has no bulgur and `couscous-salad` already covers it. Bon Appétit costs
the same toll: yogurt becomes mayonnaise (chili crisp chicken, green goddess),
cream becomes milk (primavera, pumpkin pasta), hominy becomes corn (pozole), lime
is lemon (som tam, pozole), fish sauce is soy (som tam, lettuce wraps), turkey
stands in for ground beef (pumpkin chili), Old Bay is just the spices already in
the cupboard, and the anchovy, pancetta, olive, mussel, salmon, yeast and
chocolate pages on that site were left where they are. Each entry carries its
source page in a comment above it. None of the imports introduced a new checkbox:
a recipe may only name ids the pantry already has, which the catalogue spec
enforces — the last three added 60 recipes and 0 ingredients.

Names and page numbers were checked against the Internet Archive's full-text
index of both editions before anything was written, which is why the titles are
the book's own (`Gypsy soup`, `Gado-gado`, `Cauliflower Marranca`) rather than
invented, and why the dishes that lean on things the pantry cannot name
(mushroom moussaka, tabouli, the walnut pâté) are absent rather than approximated
into something the book never printed. The Bon Appétit titles come from the
recipe pages themselves — each one was fetched and its `Recipe` structured data
read, so `Frico'ed Brussels sprouts` and `Watermelon som tam` are spelled the way
the magazine spells them, not the way we would have guessed.

## Data flow

```
recipes.ingredients.ts  (71 garden crops ← planting-calendar dataset, + 38 groceries)
        │                       recipes.catalog.ts  (148 hand-written recipes)
        ▼                                     │
   GET /api/recipes[?have=tomatoes,eggs,…] ────┴──▶ payload
        │                                        { schemaVersion, groups, ingredients,
        │                                          families, staples, have,
        │                                          matches, featured, counts }
        ▼
react-fe page (this folder) —— renders `matches` + `featured`, phrases the wording
```

**All the matching is in `nest-server/src/recipes/recipes.match.ts`.** The page
sends ids and prints what comes back; it never re-ranks, never re-scores, and
never decides on its own whether something is one ingredient away. That is
deliberate: two implementations of "one away" would drift and the page would
quietly lie.

`scoreRecipe` counts how many _required_ ingredients are covered, letting a
ticked id satisfy a requirement by three routes — same id, a declared family
(`cheese` for cheddar/mozzarella/parmesan/feta/cream cheese, `onion-family` for
shallots and leeks, …) or an alias (`corn` for sweet corn, `butter` for the
butter family) — and treats `salt`, `black pepper`, `cooking oil` and `water` as
always present, which they are in every kitchen. `isReachable` is the gate: a
recipe is promised only when it needs nothing more, or exactly one more thing.
`selectRecipes` then cuts the one ranking into two lists — `matches` (the rest of
that promise) and `featured` (everything else that uses a ticked ingredient,
garden-first then fewest-missing, capped at 12) — plus the counts the page words.

## Ordering: the garden comes first

Everything you tick in _From the garden_ is something you have **in quantity** —
a glut is the problem this page exists to solve — so the ranking prefers recipes
that eat it, and every card that does says which crops earned it
(`from the garden — Bok Choy`):

| List       | Order                                                                     |
| ---------- | ------------------------------------------------------------------------- |
| `matches`  | `cookable` → garden crops used → `score` → `fromPantry` → minutes → title |
| `featured` | garden crops used → fewest missing → `fromPantry` → minutes → title       |

`cookable` still outranks everything in `matches`: a card badged `cook it now`
must never sit below one that says `needs 2 things`. In the browse list garden
use leads _even over closeness_, because "the bok choy you just ticked, plus
garlic and ginger" beats "shelf-stable, two bits short" when the bok choy is
what is piling up. Tick everything in _Fridge & cupboard_ plus `bok choy` and
`Bok choy with garlic` leads the browse list; tick `garlic` too and it moves into
the promise list on the next fetch.

The signal is `RecipeMatch.garden`: the **picked** garden ingredients a recipe
requires, resolved through family swaps (a ticked `swiss chard` counts for a
recipe that asked for `kale`) and derived from each ingredient's own `group`, so
no crop is hard-coded in the view. `garden` rides along in the payload and the
page only turns those ids into labels.

## Files

| File                    | Role                                                                                                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Recipes.component.tsx` | the page: pantry panel (two grouped checkbox lists, search, clear, per-group `tick all`), the promise list, the browse list, `RecipeCard`                                                                                                                    |
| `recipes.utils.ts`      | pure helpers — `fold`, `filterIngredients`, `parseSelection`/`serializeSelection`, `toggleId`, `allTicked`/`tickAll`/`bulkLabel`, `groupProgress`, `pantryState`, `swapNote`, `missingNote`, `summaryLine`, `featuredLine`, `formatList`, `HAVE_STORAGE_KEY` |
| `Recipes.scss`          | all styling, every selector `rc-`-prefixed and scoped under `.recipes`                                                                                                                                                                                       |

Shared types live in `services/recipes.types.ts` (a mirror of the backend's
`recipes.types.ts`); the API call is `apiService.getRecipes(have)`, which
appends `?have=` only when the list is non-empty.

## Behaviour worth knowing

- **One request per selection, debounced 150 ms.** Ticking is instant, the fetch
  is not: without the beat, five quick ticks fire five requests whose answers can
  land out of order.
- **The selection is the state; the payload is the truth.** `localStorage`
  (`antigogglin.recipes.have`, a comma-separated id list) remembers the ticked
  pantry because that is a standing fact about the house, not a per-visit choice.
  The prerenderer has no `window`, so `loadSelection` guards on
  `typeof window === "undefined"`.
- **Ids the catalogue no longer has are dropped** once the payload arrives, so a
  renamed crop cannot leave a phantom in the `n ticked of 109` count.
- **Nothing ticked means nothing listed.** The empty state says so; the API also
  returns zero matches for an empty `have`, so a stale payload cannot leak a card
  into the empty state while the next request is in flight.
- **The browse list never mixes with the promise.** Both lists come from one
  `rankRecipes` call, so a recipe is in exactly one of them; browse cards are
  muted (`rc-card--far`) and sit below a dashed rule under
  "more with what you ticked". Ticking a missing ingredient pulls a recipe up
  into the promise list on the next fetch.
- **`tick all` acts on the section, not on the search.** The button is driven by
  `group.allAtOnce` from the API (only _Fridge & cupboard_ has it — a garden is
  checked crop by crop), always applies to every id in the group, and carries the
  real count in its label: searching "cheese" and pressing `tick all 38` still
  ticks 38, which is what the label promised. It flips to `untick all` once the
  whole group is ticked, and `tickAll` preserves the existing tick order so the
  storage line and the `?have=` query stay stable.
- **The page never orders the cards.** Both lists arrive ranked; the page only
  prints them. A card that eats a picked garden crop carries a
  `from the garden — Bok Choy` line so the order explains itself, and that line
  is built from ids (`RecipeMatch.garden`) rather than a comparison in the view.
- **A substitution is announced, not hidden.** `have !== id` rows render `⇄ Onions
— using Shallots for onions`, so nobody wonders why a recipe wants an onion
  they never ticked.
- **"also nice" is optional.** `optional` ingredients are chips, ticked ones
  solid — they never affect whether a recipe is listed.
- **The page name is the route.** `/recipes` is registered in `App.tsx` and
  `seo/routes.ts` as a `shell` page (its content is fetched, so it prerenders
  the chrome only), and there is no Home/nav button for it on purpose.

## Checks

- Backend: `cd nest-server && npx jest src/recipes` — 31 tests. The catalogue spec
  pins the garden group to the planting-calendar dataset, checks every
  label/group/family/alias resolves, keeps the pantry to two groups with exactly
  one bulk-tickable, keeps staples un-tickable, gives every recipe unique ids and
  at least one step, refuses to ask for an ingredient a cook cannot tick,
  requires every household ingredient to appear in a recipe, and requires at
  least three recipes apiece for the crops that arrive in bulk (zucchini,
  tomatoes, kale, swiss chard, cucumbers, cabbage, tofu). The matcher spec covers
  `parseHave` (repeats, commas, blanks), `resolveHave` (ids, labels, aliases,
  near-miss spellings, pantry order), `scoreRecipe`/`rankRecipes` (families,
  non-families, cookable-before-one-away, garden-before-score, optional handling)
  and `selectRecipes` (no overlap between the lists, `counts.using`, the
  single-tick/cabbage case, garden-first-then-closest ordering, the 12-card cap),
  plus the garden signal itself: only picked crops count, a garden recipe outranks
  a nearer cupboard-only one, and the bok-choy case leads the browse list.
- Frontend: `npm run build` (tsc + vite + prerender). The pure helpers are
  checked by bundling `recipes.utils.ts` with
  `npx esbuild … --bundle --format=esm --platform=node`, then running an
  assertions script against the emitted JS — the app has no frontend test
  harness.
- The page itself was exercised by mounting the real client bundle in jsdom
  against the running API (`:4171`): 2 groups and 109 pantry chips render
  (71 garden + 38 fridge & cupboard), ticking `cabbage` alone gives
  `0 ready to cook · 2 one ingredient away — out of 148 recipes`
  (`Buttered cabbage`, `Charred cabbage`), then a browse section
  `10 of the 12 recipes that use your picks need two or more things` listing
  `Coleslaw`, `Chicken tacos`, `Stuffed cabbage`, `Hot and sour soup`,
  `Gado-gado`, `Russian cabbage borscht`, `Chili crisp chicken`, `Ribollita`,
  `Watermelon som tam` and `Chicken pozole verde` as `far=true`; ticking
  `zucchini, tomatoes, kale, swiss-chard, cucumbers, tofu` gives
  `2 ready to cook · 5 one ingredient away` (`Kale chips` and `Crispy tofu` are
  literally single-ingredient) plus a browse section
  `12 of the 79 recipes that use your picks need two or more things` starting
  with `Ribollita` (three crops at once); a crop no recipe uses (`anise-hyssop`)
  says `nothing in 148 recipes uses any of that yet` and renders no browse
  section;
  and `tick all 38` on the fridge takes `0 of 38` → `38 of 38`, `0 ticked` →
  `38 ticked of 109`, flips the button to `untick all`, and the page answers
  `11 ready to cook · 40 one ingredient away — out of 148 recipes` with eleven
  `cook it now` cards (`Mac and cheese`, `Crepes`, `French toast`,
  `Egg salad sandwich`, `Peanut butter & jelly`, `Grilled cheese`,
  `Crispy tofu`, `Onion soup`, `Turkey burgers`, `Quick-pickled red onions`,
  `Tofu scramble`);
  `untick all` returns the empty state with storage `""`. The stored line is 38
  ids in pantry order with no duplicates, and searching `cheese` (three chips
  showing) still says `tick all 38` and really ticks 38 — the control answers for
  the section, not for the filter.
- The garden ordering was checked the same way, and over the wire: with the whole
  fridge and cupboard ticked plus `bok choy`, the promise list is unchanged
  (`Mac and cheese`, `French toast`, `Egg salad sandwich`, … — none of them use
  bok choy), while the browse list now opens with `Bok choy with garlic`
  (`garden=['bok-choy'] missing=[garlic,ginger]`), then `Cold peanut noodles`,
  `Eggplant parmesan`, `Turkey sandwich`. The card renders
  `from the garden — Bok Choy`. Adding `garlic` and `ginger` moves it into the
  promise list as the first card (`missing=[soy-sauce]`), above
  `Crispy tofu` (`missing=[tofu]`); with `bread, tomatoes, garlic` ticked,
  `Tomato toast` and `Blistered tomatoes on toast` (`garden=['tomatoes','garlic']`)
  lead, and `Zucchini and tomato skillet` sits above `Baked stuffed tomatoes`
  because it eats two crops instead of one.
