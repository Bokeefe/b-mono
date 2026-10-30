/**
 * Mirror of the API payload from `GET /api/recipes`
 * (`nest-server/src/recipes/recipes.types.ts`).
 *
 * The matching, the ranking and the substitution decisions all happen in the
 * backend, so this page never scores a recipe — it renders `matches` as given
 * and reads `missing` / `have` / `exact` to decide how to word things.
 */

export type IngredientGroupId = "garden" | "kitchen";

export interface IngredientGroup {
  id: IngredientGroupId;
  label: string;
  /** One line under the heading — says where the group came from. */
  blurb: string;
  /**
   * This group gets a "tick all" control: the fridge & cupboard is a list you
   * either have or you don't. The garden is not — every crop is its own fact.
   */
  allAtOnce?: boolean;
}

export interface Ingredient {
  /** Stable id, also the query-string value (`?have=peanut-butter`). */
  id: string;
  label: string;
  group: IngredientGroupId;
  families: string[];
  /** Extra search words ("aubergine", "jam"), lower case. */
  aliases: string[];
}

/**
 * Ingredients that can stand in for each other. The page says which swap it
 * made, so a substitution is never silent.
 */
export interface IngredientFamily {
  id: string;
  label: string;
  members: string[];
}

export type RecipeTag =
  "breakfast" | "lunch" | "dinner" | "side" | "snack" | "sauce";

export interface Recipe {
  id: string;
  title: string;
  blurb: string;
  tags: RecipeTag[];
  minutes: number;
  /** Free text: "2 people", "4 as a side". */
  servings: string;
  uses: string[];
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
  /** 1 when everything is exact, 0.75 per substituted required ingredient. */
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
   * The picked garden crops this recipe requires (ids, recipe order). Resolved
   * server-side, `have`-based — the page only turns these into labels. The
   * backend already ordered both lists by this, so do not re-sort.
   */
  garden: string[];
}

export interface RecipesCounts {
  /** Recipes in the whole catalogue. */
  catalog: number;
  /** Recipes returned in `matches`: cookable, plus one ingredient away. */
  matches: number;
  cookable: number;
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
  /** Cookable first, then one ingredient away. Nothing further off. */
  matches: RecipeMatch[];
  /**
   * The browse half: uses something you ticked but needs two or more, closest
   * first. This is why ticking one thing still returns a list.
   */
  featured: RecipeMatch[];
  counts: RecipesCounts;
}
