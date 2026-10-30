import { Injectable, Logger } from '@nestjs/common';

import { RECIPES } from './recipes.catalog';
import {
  buildIngredients,
  INGREDIENT_FAMILIES,
  INGREDIENT_GROUPS,
  STAPLES,
} from './recipes.ingredients';
import { rankRecipes, resolveHave, selectRecipes } from './recipes.match';
import type { Ingredient, RecipesPayload } from './recipes.types';

/**
 * Bumped when the payload shape changes in a way the SPA must notice.
 *
 * 2 — added `featured` and `counts.featured` / `counts.using` (the browse list).
 * 3 — the pantry lost its third group (`extras` folded into `kitchen`) and
 *     `IngredientGroup` gained `allAtOnce` (the "tick all" control).
 * 4 — `RecipeMatch` gained `garden` (the picked garden crops a recipe eats),
 *     which is now the first ordering signal behind "cook it now".
 */
export const RECIPES_SCHEMA_VERSION = 4;

/**
 * Builds the pantry once (it reads the planting-calendar dataset) and delegates
 * the matching to `recipes.match.ts`, which is framework free and unit-tested on
 * its own.
 *
 * Nothing is cached per selection: the catalogue is 88 recipes and the ranking is
 * a few thousand comparisons, so recomputing on every request keeps the service
 * free of invalidation bugs and the code readable.
 */
@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);
  private ingredients: Ingredient[] | null = null;

  getIngredients(): Ingredient[] {
    if (!this.ingredients) {
      this.ingredients = buildIngredients();
      const garden = this.ingredients.filter(
        (ingredient) => ingredient.group === 'garden',
      ).length;
      this.logger.log(
        `Pantry: ${this.ingredients.length} ingredients (${garden} from the planting calendar), ${RECIPES.length} recipes`,
      );
    }
    return this.ingredients;
  }

  /** The pantry, the selection, and what you could cook with it. */
  getPayload(rawHave: string[] = []): RecipesPayload {
    const ingredients = this.getIngredients();
    const have = resolveHave(rawHave, ingredients);

    const ranked = rankRecipes({
      have,
      ingredients,
      families: INGREDIENT_FAMILIES,
      recipes: RECIPES,
    });

    // Two lists from one ranking: what is within reach, and what merely uses
    // your picks (so one tick is a browse, not an empty column).
    const { matches, featured, counts } = selectRecipes(ranked, RECIPES.length);

    return {
      schemaVersion: RECIPES_SCHEMA_VERSION,
      groups: INGREDIENT_GROUPS,
      ingredients,
      families: INGREDIENT_FAMILIES,
      staples: STAPLES,
      have,
      matches,
      featured,
      counts,
    };
  }
}
