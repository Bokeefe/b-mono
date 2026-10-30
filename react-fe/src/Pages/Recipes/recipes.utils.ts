/**
 * Pure helpers for the recipes page.
 *
 * Everything here is data-in/data-out so it can be checked without a browser
 * (the app has no frontend test harness — see the README). No matching lives
 * here: the backend already decided what is cookable and which swaps it made,
 * and these functions only decide how to *say* it.
 */

import type {
  Ingredient,
  IngredientGroup,
  PantryMatch,
  RecipeMatch,
  RecipesCounts,
} from "../../services/recipes.types";

/** Where the ticked pantry is remembered between visits. */
export const HAVE_STORAGE_KEY = "antigogglin.recipes.have";

/**
 * Fold a string for searching: lower case, no accents, single spaces.
 *
 * Same trick the backend uses to resolve `?have=`, so "peanut butter" finds
 * `peanut-butter` and "jalapeno" finds "Jalapeño Peppers".
 */
export const fold = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** `"a, b"` from storage → `["a", "b"]`; junk entries are dropped. */
export const parseSelection = (raw: string | null): string[] =>
  (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

/** The storage form: one comma-separated line, in tick order. */
export const serializeSelection = (ids: string[]): string => ids.join(",");

/** Add the id, or remove it if it is already ticked. */
export const toggleId = (ids: string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id];

/** Is every one of these ticked? Decides the group's "tick all" wording. */
export const allTicked = (group: string[], have: string[]): boolean =>
  group.length > 0 && group.every((id) => have.includes(id));

/**
 * Tick or untick a whole group in one press.
 *
 * Used by the fridge & cupboard: "assume a normal kitchen" should be one click,
 * not thirty-eight. Existing tick order is kept (the storage line and the
 * `?have=` query stay stable), and no id can be added twice.
 */
export const tickAll = (
  have: string[],
  group: string[],
  tick: boolean,
): string[] => {
  if (!tick) {
    const drop = new Set(group);
    return have.filter((id) => !drop.has(id));
  }
  const known = new Set(have);
  return [...have, ...group.filter((id) => !known.has(id))];
};

/** `"tick all 38"` / `"untick all"` — the button states what it will do. */
export const bulkLabel = (total: number, ticked: boolean): string =>
  ticked ? "untick all" : `tick all ${total}`;

/** A pantry entry's wording, for a recipe that names an id we do not have. */
export const labelFor = (ingredients: Ingredient[], id: string): string =>
  ingredients.find((ingredient) => ingredient.id === id)?.label ?? id;

/**
 * Ingredients whose label, id or aliases contain the query.
 *
 * An empty query returns the list untouched, so the caller can always filter.
 */
export const filterIngredients = (
  ingredients: Ingredient[],
  query: string,
): Ingredient[] => {
  const needle = fold(query);
  if (!needle) return ingredients;
  return ingredients.filter((ingredient) =>
    [ingredient.label, ingredient.id, ...ingredient.aliases].some((word) =>
      fold(word).includes(needle),
    ),
  );
};

/** `"4 of 71"` — how much of a group is ticked. */
export const groupProgress = (
  group: IngredientGroup,
  ingredients: Ingredient[],
  have: string[],
): string => {
  const total = ingredients.filter((item) => item.group === group.id).length;
  const ticked = ingredients.filter(
    (item) => item.group === group.id && have.includes(item.id),
  ).length;
  return `${ticked} of ${total}`;
};

/** `"a"`, `"a and b"`, `"a, b and c"`. */
export const formatList = (items: string[]): string => {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
};

export type PantryState = "have" | "swap" | "missing";

/** How one of a recipe's ingredients relates to what is ticked. */
export const pantryState = (match: PantryMatch): PantryState => {
  if (!match.have) return "missing";
  return match.exact ? "have" : "swap";
};

/** `"using Shallots for onions"`, or null when the swap is exact. */
export const swapNote = (match: PantryMatch): string | null => {
  if (!match.have || match.exact) return null;
  return `using ${match.haveLabel} for ${match.label.toLowerCase()}`;
};

/** `"needs broth"` / `"needs broth and rice"` — only the uncovered ids. */
export const missingNote = (
  match: RecipeMatch,
  ingredients: Ingredient[],
): string | null => {
  if (match.missing.length === 0) return null;
  const labels = match.missing.map((id) =>
    labelFor(ingredients, id).toLowerCase(),
  );
  return `needs ${formatList(labels)}`;
};

/**
 * The line above the primary cards: what the backend found within reach.
 *
 * Deliberately mentions the catalogue size and, when the gate comes back empty,
 * how many recipes considered the selection at all — "nothing within one
 * ingredient" and "nothing uses that" are very different answers.
 */
export const summaryLine = (counts: RecipesCounts): string => {
  const { catalog, matches, cookable, oneAway, using } = counts;

  if (matches === 0) {
    if (using === 0)
      return `nothing in ${catalog} recipes uses any of that yet`;
    return `none of the ${using} recipes that use your picks is within one ingredient`;
  }

  const parts = [
    `${cookable} ready to cook`,
    oneAway > 0 ? `${oneAway} one ingredient away` : null,
  ].filter(Boolean);

  return `${parts.join(" · ")} — out of ${catalog} recipes`;
};

/**
 * The line above the browse cards.
 *
 * This list is not a promise, so it says plainly what it is: recipes that use a
 * ticked ingredient and are still short. Without it, ticking one thing (cabbage)
 * would answer with an almost-empty page.
 */
export const featuredLine = (counts: RecipesCounts): string =>
  `${counts.featured} of the ${counts.using} recipes that use your picks need two or more things`;
