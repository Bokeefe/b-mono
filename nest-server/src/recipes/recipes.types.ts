/**
 * Shapes for the pantry → recipe recommender (`/recipes`).
 *
 * Two different kinds of data meet here:
 *  - the **pantry**, which is mostly hand-authored but takes its `garden` group
 *    straight from the planting-calendar dataset (`recipes.ingredients.ts`);
 *  - the **recipes** (`recipes.catalog.ts`), which are hand-authored and may
 *    only reference ids that exist in the pantry (enforced by
 *    `recipes.catalog.spec.ts`).
 *
 * Everything the page renders is computed in the backend (`recipes.match.ts`)
 * and shipped as one payload, the same call as the planting calendar: one
 * ranking, one shape, no second implementation in React.
 */

/**
 * Two groups only: what is growing, and what is in the house.
 *
 * There used to be a third (`extras`) for the odds and ends added so more
 * recipes work — but nobody thinks of butter as a separate category from the
 * fridge, and a three-tab pantry made the page feel longer than the shopping
 * list it replaces. The distinction is kept in the *order* of the seeds and in
 * their comments, where it belongs.
 */
export type IngredientGroupId = 'garden' | 'kitchen';

export interface IngredientGroup {
  id: IngredientGroupId;
  label: string;
  /** One line under the heading — says where the group came from. */
  blurb: string;
  /**
   * Show a "tick all" control for this group.
   *
   * True for the fridge & cupboard, which you either have or you don't — one
   * press says "assume the normal kitchen" and the page answers immediately.
   * False for the garden, where every crop is a separate fact about the summer.
   */
  allAtOnce?: boolean;
}

export interface Ingredient {
  /** Stable id, also the query-string value (`?have=peanut-butter`). */
  id: string;
  label: string;
  group: IngredientGroupId;
  /** Family ids, derived from `INGREDIENT_FAMILIES` at load. */
  families: string[];
  /** Extra search words ("aubergine", "jam"), lower case. */
  aliases: string[];
}

/**
 * Ingredients that can stand in for each other. Membership is symmetric: a
 * recipe asking for `onions` is satisfied by `shallots`, and a recipe asking
 * for `shallots` by `onions`. The page always says which swap it made
 * ("using shallots for onions"), so a substitution is never silent.
 */
export interface IngredientFamily {
  id: string;
  label: string;
  members: string[];
}

export type RecipeTag =
  'breakfast' | 'lunch' | 'dinner' | 'side' | 'snack' | 'sauce';

export interface Recipe {
  id: string;
  title: string;
  /** One line: why you would cook this. */
  blurb: string;
  tags: RecipeTag[];
  minutes: number;
  /** Free text: "2 people", "4 as a side". */
  servings: string;
  /** Required ingredient ids. Every one must be covered to count as cookable. */
  uses: string[];
  /** Nice-to-haves: shown, never counted as missing. */
  optional?: string[];
  /** Assumed flavourings (salt, cumin…) — displayed, never matched. */
  seasonings?: string[];
  steps: string[];
}

/** One `uses`/`optional` id after being resolved against the pantry. */
export interface PantryMatch {
  /** What the recipe asked for. */
  id: string;
  label: string;
  /** The picked ingredient that covers it, or `null` when nothing does. */
  have: string | null;
  haveLabel: string | null;
  /** `true` when `have === id`; `false` when a family stand-in was used. */
  exact: boolean;
}

export interface RecipeMatch {
  recipe: Recipe;
  /**
   * 1 when every required ingredient is in the pantry exactly; a stand-in
   * counts 0.75. `missing.length === 0` is what "cookable" means — score is
   * only there to order cookable recipes that leaned on substitutions.
   */
  score: number;
  cookable: boolean;
  /** Every required id, resolved or not (recipe order). */
  required: PantryMatch[];
  /** Every optional id, resolved or not (recipe order). */
  optional: PantryMatch[];
  /** Required ids nothing covers. */
  missing: string[];
  /** Optional ids the pantry does not cover. */
  optionalMissing: string[];
  /** How many distinct picked ingredients this recipe eats. */
  fromPantry: number;
  /**
   * The picked **garden** ingredients this recipe requires (ids, recipe order).
   *
   * The garden is the half of the pantry that arrives in a glut, so a recipe
   * that eats it is worth more than one built from shelf-stable things even
   * when it needs another ingredient or two — both orderings in
   * `recipes.match.ts` put this ahead of everything but "cook it now".
   */
  garden: string[];
}

export interface RecipesCounts {
  /** Recipes in the whole catalogue. */
  catalog: number;
  /** Recipes returned in `matches`: cookable, plus one ingredient away. */
  matches: number;
  /** Of those, how many need nothing else. */
  cookable: number;
  /** Of those, how many are short exactly one required ingredient. */
  oneAway: number;
  /** Recipes in `featured` — they use a ticked ingredient but need two or more. */
  featured: number;
  /** Every recipe that uses at least one ticked ingredient, before the gate. */
  using: number;
}

export interface RecipesPayload {
  schemaVersion: number;
  groups: IngredientGroup[];
  ingredients: Ingredient[];
  families: IngredientFamily[];
  /** Always assumed on hand: never pickable, never counted as missing. */
  staples: string[];
  /** The selection actually used (unknown ids and aliases resolved away). */
  have: string[];
  /**
   * Ranked: cookable first, then one ingredient away. Recipes that need two or
   * more things are left out of `matches` — that list is a promise, not a
   * browse — and appear in `featured` instead.
   */
  matches: RecipeMatch[];
  /**
   * The browse half, and the reason a single tick is not a dead end: every
   * recipe that uses something you ticked but needs two or more things, closest
   * first, capped at `FEATURED_LIMIT` (`recipes.match.ts`).
   */
  featured: RecipeMatch[];
  counts: RecipesCounts;
}
