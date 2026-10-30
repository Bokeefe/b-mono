import type {
  Ingredient,
  IngredientFamily,
  IngredientGroupId,
  PantryMatch,
  Recipe,
  RecipeMatch,
  RecipesCounts,
} from './recipes.types';

/**
 * Matching, as pure functions.
 *
 * A recipe is *cookable* when every id in `uses` is in the pantry, either
 * directly (`exact`) or through a family stand-in. Nothing here reads the
 * clock, the filesystem or a request — the service turns a query string into
 * `have`, calls `rankRecipes`, and ships the result.
 */

/** Score for a required ingredient covered by a family stand-in. */
export const SUBSTITUTE_SCORE = 0.75;

export interface MatchContext {
  /** Picked ids, already resolved against the pantry. */
  have: string[];
  ingredients: Ingredient[];
  families: IngredientFamily[];
  recipes: Recipe[];
}

interface Resolved {
  id: string;
  exact: boolean;
}

const buildLabelMap = (ingredients: Ingredient[]): Map<string, string> =>
  new Map(ingredients.map((ingredient) => [ingredient.id, ingredient.label]));

/** ingredient id → the families it belongs to, in authored order. */
const buildFamiliesFor = (
  ingredients: Ingredient[],
  families: IngredientFamily[],
): Map<string, IngredientFamily[]> => {
  const byId = new Map<string, IngredientFamily>();
  for (const family of families) byId.set(family.id, family);

  const forIngredient = new Map<string, IngredientFamily[]>();
  for (const ingredient of ingredients) {
    const found = ingredient.families
      .map((id) => byId.get(id))
      .filter((family): family is IngredientFamily => Boolean(family));
    if (found.length) forIngredient.set(ingredient.id, found);
  }
  return forIngredient;
};

/**
 * Find what covers one recipe ingredient.
 *
 * Exact beats a stand-in, and among stand-ins the first family (as authored)
 * wins, then the first member of that family. That order does not depend on the
 * order you ticked things, so the page cannot flip its wording between clicks.
 */
const resolveOne = (
  id: string,
  have: Set<string>,
  familiesFor: Map<string, IngredientFamily[]>,
): Resolved | null => {
  if (have.has(id)) return { id, exact: true };

  for (const family of familiesFor.get(id) ?? []) {
    const member = family.members.find((candidate) => have.has(candidate));
    if (member) return { id: member, exact: false };
  }

  return null;
};

const toPantryMatch = (
  id: string,
  have: Set<string>,
  familiesFor: Map<string, IngredientFamily[]>,
  labels: Map<string, string>,
): PantryMatch => {
  const resolved = resolveOne(id, have, familiesFor);

  return {
    id,
    label: labels.get(id) ?? id,
    have: resolved?.id ?? null,
    haveLabel: resolved ? (labels.get(resolved.id) ?? resolved.id) : null,
    exact: resolved?.exact ?? false,
  };
};

const scoreRecipe = (required: PantryMatch[]): number => {
  if (!required.length) return 1;

  const total = required.reduce((sum, match) => {
    if (!match.have) return sum;
    return sum + (match.exact ? 1 : SUBSTITUTE_SCORE);
  }, 0);

  return total / required.length;
};

const countFromPantry = (matches: PantryMatch[]): number =>
  new Set(
    matches
      .map((match) => match.have)
      .filter((id): id is string => id !== null),
  ).size;

/**
 * Which of the picked **garden** crops this recipe leans on, in recipe order.
 *
 * Measured on what was actually used (`have`), not on what was asked for, so a
 * ticked chard counts for a recipe that wanted kale. Group membership comes
 * from the ingredient itself — the page never names a crop.
 */
const gardenPicks = (
  required: PantryMatch[],
  groups: Map<string, IngredientGroupId>,
): string[] => [
  ...new Set(
    required
      .map((match) => match.have)
      .filter((id): id is string => id !== null && groups.get(id) === 'garden'),
  ),
];

/**
 * Match and rank every recipe against the pantry.
 *
 * Recipes that use none of the picked ingredients are dropped — with an empty
 * pantry that is all of them, which is why the page has an empty state instead
 * of a wall of cards.
 *
 * The order is: cookable first (a promise, not a preference), then the recipes
 * that eat the garden you picked, then the best covered, then the ones that
 * touch more of the pantry, then quickest, then alphabetical. Garden use sits
 * above `score` on purpose: "your courgettes, and they're nearly there" beats
 * "all shelf-stable, every one exact".
 */
export const rankRecipes = (context: MatchContext): RecipeMatch[] => {
  const have = new Set(context.have);
  const labels = buildLabelMap(context.ingredients);
  const familiesFor = buildFamiliesFor(context.ingredients, context.families);
  const groups = new Map(
    context.ingredients.map((ingredient) => [ingredient.id, ingredient.group]),
  );

  const matches: RecipeMatch[] = [];

  for (const recipe of context.recipes) {
    const required = recipe.uses.map((id) =>
      toPantryMatch(id, have, familiesFor, labels),
    );
    const optional = (recipe.optional ?? []).map((id) =>
      toPantryMatch(id, have, familiesFor, labels),
    );

    const fromPantry = countFromPantry([...required, ...optional]);
    if (fromPantry === 0) continue;

    matches.push({
      recipe,
      score: scoreRecipe(required),
      cookable: required.every((match) => match.have !== null),
      required,
      optional,
      missing: required.filter((match) => !match.have).map((match) => match.id),
      optionalMissing: optional
        .filter((match) => !match.have)
        .map((match) => match.id),
      fromPantry,
      garden: gardenPicks(required, groups),
    });
  }

  return matches.sort(
    (a, b) =>
      Number(b.cookable) - Number(a.cookable) ||
      b.garden.length - a.garden.length ||
      b.score - a.score ||
      b.fromPantry - a.fromPantry ||
      a.recipe.minutes - b.recipe.minutes ||
      a.recipe.title.localeCompare(b.recipe.title),
  );
};

/**
 * Cookable, or short exactly one required ingredient — the primary list.
 *
 * This gate is the promise of the page: anything in `matches` is dinner tonight
 * or one shop away. Everything further off goes in `featured`, which exists so
 * that ticking a single thing ("cabbage") still answers with cabbage recipes
 * instead of an empty column.
 */
export const isReachable = (match: RecipeMatch): boolean =>
  match.missing.length <= 1;

/** How many "needs two or more" recipes ride along under the gate. */
export const FEATURED_LIMIT = 12;

/**
 * Ordering for recipes that are still short of several things: the ones that
 * eat your garden first (that is the point of the page when a crop comes in),
 * then fewest missing (a three-ingredient dish is nearer than a nine-ingredient
 * one), then the ones that take more of the pantry, then whatever is quickest.
 *
 * Garden use leads even over closeness: a recipe that needs the bok choy you
 * just ticked is a better suggestion than one built from shelf-stable things,
 * however many other bits it wants.
 */
const byGardenThenCloseness = (a: RecipeMatch, b: RecipeMatch): number =>
  b.garden.length - a.garden.length ||
  a.missing.length - b.missing.length ||
  b.fromPantry - a.fromPantry ||
  a.recipe.minutes - b.recipe.minutes ||
  a.recipe.title.localeCompare(b.recipe.title);

export interface RecipeSelection {
  /** Within reach now: cookable, or one ingredient short. */
  matches: RecipeMatch[];
  /** Uses a ticked ingredient but needs two or more. Garden-first. */
  featured: RecipeMatch[];
  counts: RecipesCounts;
}

/**
 * Split a ranking into the two lists the page shows, plus the counts that word
 * them.
 *
 * Both lists come out of one `rankRecipes` call, so a recipe can never appear in
 * both or in neither by accident, and `counts.using` (everything that touches the
 * selection, before the gate) is measured on the same run.
 */
export const selectRecipes = (
  ranked: RecipeMatch[],
  catalogSize: number,
  featuredLimit: number = FEATURED_LIMIT,
): RecipeSelection => {
  const matches = ranked.filter(isReachable);
  const featured = ranked
    .filter((match) => !isReachable(match))
    .sort(byGardenThenCloseness)
    .slice(0, featuredLimit);

  return {
    matches,
    featured,
    counts: {
      catalog: catalogSize,
      matches: matches.length,
      cookable: matches.filter((match) => match.cookable).length,
      oneAway: matches.filter((match) => match.missing.length === 1).length,
      featured: featured.length,
      using: ranked.length,
    },
  };
};

/**
 * Flatten `?have=` into raw entries.
 *
 * Nest hands back a string for one parameter and an array for repeats; either
 * may also be comma separated (`?have=eggs,milk`), so both are accepted and
 * blanks dropped. Unknown names are `resolveHave`'s problem, not this one's.
 */
export const parseHave = (value?: string | string[]): string[] => {
  const entries = Array.isArray(value) ? value : [value ?? ''];
  return entries
    .flatMap((entry) => entry.split(','))
    .map((entry) => entry.trim())
    .filter(Boolean);
};

/**
 * Turn whatever arrived in `?have=` into pantry ids.
 *
 * Accepts ids, labels, aliases and near-enough spellings ("peanut butter",
 * "Peanut Butter", "aubergine"), drops anything unknown rather than throwing,
 * and returns the result in pantry order so the selection has one stable shape.
 */
export const resolveHave = (
  raw: string[],
  ingredients: Ingredient[],
): string[] => {
  const normalize = (value: string): string =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const lookup = new Map<string, string>();

  // Ids and labels first, so an alias can never shadow a real id.
  for (const ingredient of ingredients) {
    lookup.set(normalize(ingredient.id), ingredient.id);
    lookup.set(normalize(ingredient.label), ingredient.id);
  }
  for (const ingredient of ingredients) {
    for (const alias of ingredient.aliases) {
      const key = normalize(alias);
      if (key && !lookup.has(key)) lookup.set(key, ingredient.id);
    }
  }

  const wanted = new Set<string>();
  for (const entry of raw) {
    const id = lookup.get(normalize(entry));
    if (id) wanted.add(id);
  }

  return ingredients
    .map((ingredient) => ingredient.id)
    .filter((id) => wanted.has(id));
};
