import { loadDataset } from '../planting-calendar/planting-calendar.dataset';
import { RECIPES } from './recipes.catalog';
import {
  buildGardenSeeds,
  buildIngredients,
  GARDEN_EXCLUDED,
  INGREDIENT_FAMILIES,
  INGREDIENT_GROUPS,
  STAPLES,
} from './recipes.ingredients';
import { INGREDIENT_ALIASES } from './recipes.ingredients';

/**
 * The catalogue is hand-authored, so these are the tests that keep it honest:
 * the pantry really is the planting calendar, and no recipe can reference an
 * ingredient that does not exist (or leave a household staple stranded).
 */
describe('recipes catalogue', () => {
  const ingredients = buildIngredients();
  const ids = new Set(ingredients.map((ingredient) => ingredient.id));
  const used = new Set(
    RECIPES.flatMap((recipe) => [...recipe.uses, ...(recipe.optional ?? [])]),
  );

  it('takes the garden group from the planting-calendar dataset', () => {
    const dataset = loadDataset();
    if (!dataset) throw new Error('committed dataset is missing');

    const crops = Object.values(dataset.tables).flatMap((table) => table.crops);
    const slugs = [...new Set(crops.map((crop) => crop.slug))];
    const garden = buildGardenSeeds(dataset);

    expect(garden).toHaveLength(
      slugs.length - Object.keys(GARDEN_EXCLUDED).length,
    );
    expect(garden.map((seed) => seed.id).sort()).toEqual(
      slugs.filter((slug) => !GARDEN_EXCLUDED[slug]).sort(),
    );

    // The four exclusions are all in the data, so nothing is silently skipped.
    for (const slug of Object.keys(GARDEN_EXCLUDED)) {
      expect(slugs).toContain(slug);
    }
  });

  it('has one entry per ingredient, with a label and a real group', () => {
    const groupIds = INGREDIENT_GROUPS.map((group) => group.id);

    expect(ids.size).toBe(ingredients.length);
    for (const ingredient of ingredients) {
      expect(ingredient.label.trim()).not.toBe('');
      expect(groupIds).toContain(ingredient.group);
    }
  });

  it('keeps the pantry to two groups, one of them bulk-tickable', () => {
    // Two sections is a decision, not an accident: the garden is checked crop
    // by crop, the kitchen is checked all at once ("assume a normal fridge"),
    // and a third folder of "extras" only made the list longer.
    expect(INGREDIENT_GROUPS.map((group) => group.id)).toEqual([
      'garden',
      'kitchen',
    ]);

    const bulk = INGREDIENT_GROUPS.filter((group) => group.allAtOnce);
    expect(bulk.map((group) => group.id)).toEqual(['kitchen']);

    // The bulk group has to be worth pressing: everything on it is tickable.
    const kitchen = ingredients.filter((item) => item.group === 'kitchen');
    expect(kitchen.length).toBeGreaterThan(20);
  });

  it('only lists family members and aliases that exist', () => {
    for (const family of INGREDIENT_FAMILIES) {
      expect(family.members.length).toBeGreaterThan(1);
      for (const member of family.members) expect(ids).toContain(member);
    }
    for (const [id, aliases] of Object.entries(INGREDIENT_ALIASES)) {
      expect(ids).toContain(id);
      for (const alias of aliases) expect(alias.trim()).not.toBe('');
    }
  });

  it('never lets a staple be picked', () => {
    for (const staple of STAPLES) {
      expect(ids).not.toContain(staple);
      expect(used).not.toContain(staple);
    }
  });

  it('has unique recipe ids and at least one step each', () => {
    const recipeIds = RECIPES.map((recipe) => recipe.id);

    expect(new Set(recipeIds).size).toBe(recipeIds.length);
    for (const recipe of RECIPES) {
      expect(recipe.title.trim()).not.toBe('');
      expect(recipe.blurb.trim()).not.toBe('');
      expect(recipe.minutes).toBeGreaterThan(0);
      expect(recipe.servings.trim()).not.toBe('');
      expect(recipe.tags.length).toBeGreaterThan(0);
      expect(recipe.steps.length).toBeGreaterThanOrEqual(2);
      for (const step of recipe.steps) expect(step.trim()).not.toBe('');
    }
  });

  it('only asks for ingredients a cook can tick', () => {
    for (const recipe of RECIPES) {
      expect(recipe.uses.length).toBeGreaterThan(0);
      for (const id of recipe.uses) expect(ids).toContain(id);
      for (const id of recipe.optional ?? []) expect(ids).toContain(id);

      // An id in both lists means the page would show it twice on the card.
      const overlap = recipe.uses.filter((id) => recipe.optional?.includes(id));
      expect(overlap).toEqual([]);
    }
  });

  it('uses every household ingredient in at least one recipe', () => {
    // The fridge & cupboard exists to make recommendations, so an entry that no
    // recipe names is dead weight on the page.
    const stranded = ingredients
      .filter((ingredient) => ingredient.group !== 'garden')
      .filter((ingredient) => !used.has(ingredient.id))
      .map((ingredient) => ingredient.id);

    expect(stranded).toEqual([]);
  });

  it('covers enough of the garden to be worth calling a garden app', () => {
    const garden = ingredients.filter(
      (ingredient) => ingredient.group === 'garden',
    );
    const covered = garden.filter((ingredient) => used.has(ingredient.id));

    // Herbs and oddities go unused on purpose (lovage, salad burnet, salsify…);
    // the vegetables should not.
    expect(covered.length / garden.length).toBeGreaterThanOrEqual(0.5);
  });

  it('keeps the crops that arrive in bulk in depth', () => {
    // The garden gives zucchini, tomatoes, greens and cucumbers all at once, so
    // each of those needs more than one idea — and tofu is the hinge that makes
    // them dinner out of season. One recipe each would make the page a novelty.
    const lists = RECIPES.map((recipe) => [
      ...recipe.uses,
      ...(recipe.optional ?? []),
    ]);

    for (const id of [
      'zucchini',
      'tomatoes',
      'kale',
      'swiss-chard',
      'cucumbers',
      'cabbage',
      'tofu',
    ]) {
      const using = lists.filter((ids) => ids.includes(id));
      expect(using.length).toBeGreaterThanOrEqual(3);
    }
  });
});
