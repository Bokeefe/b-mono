import { RECIPES } from './recipes.catalog';
import { buildIngredients, INGREDIENT_FAMILIES } from './recipes.ingredients';
import {
  isReachable,
  parseHave,
  rankRecipes,
  resolveHave,
  selectRecipes,
} from './recipes.match';
import type { Recipe, RecipeMatch } from './recipes.types';

const ingredients = buildIngredients();

const rank = (have: string[], recipes: Recipe[] = RECIPES): RecipeMatch[] =>
  rankRecipes({ have, ingredients, families: INGREDIENT_FAMILIES, recipes });

const find = (matches: RecipeMatch[], id: string): RecipeMatch | undefined =>
  matches.find((match) => match.recipe.id === id);

describe('recipes matching', () => {
  it('ranks nothing when the pantry is empty', () => {
    expect(rank([])).toEqual([]);
  });

  it('calls a recipe with everything in the pantry cookable', () => {
    const matches = rank(['bread', 'peanut-butter', 'jelly']);
    const pbj = find(matches, 'peanut-butter-and-jelly');

    expect(pbj).toBeDefined();
    expect(pbj?.cookable).toBe(true);
    expect(pbj?.missing).toEqual([]);
    expect(pbj?.score).toBe(1);
    // Every required ingredient is in the pantry exactly, no stand-ins.
    expect(pbj?.required.every((match) => match.exact)).toBe(true);
  });

  it('accepts a family stand-in and says which one it used', () => {
    const [scramble] = rank(
      ['eggs', 'shallots', 'bell-peppers'],
      [RECIPES.find((recipe) => recipe.id === 'veggie-scramble') as Recipe],
    );
    const onions = scramble.required.find((match) => match.id === 'onions');

    expect(scramble.cookable).toBe(true);
    expect(onions).toMatchObject({
      have: 'shallots',
      haveLabel: 'Shallots',
      exact: false,
    });
    // Two exact and one substituted: (1 + 1 + 0.75) / 3.
    expect(scramble.score).toBeCloseTo(0.9167, 4);
  });

  it('does not swap ingredients that are not in the same family', () => {
    const [scramble] = rank(
      ['eggs', 'shallots', 'onions'],
      [RECIPES.find((recipe) => recipe.id === 'veggie-scramble') as Recipe],
    );

    // Onions are covered (twice over), peppers are not, and a jalapeño would
    // not have counted as a bell pepper either.
    expect(scramble.cookable).toBe(false);
    expect(scramble.missing).toEqual(['bell-peppers']);
    expect(scramble.score).toBeCloseTo(0.6667, 4);
  });

  it('leaves out recipes that touch none of the picked ingredients', () => {
    const matches = rank(['jelly']);

    expect(find(matches, 'grilled-cheese')).toBeUndefined();
    expect(find(matches, 'peanut-butter-and-jelly')?.missing).toEqual([
      'bread',
      'peanut-butter',
    ]);
  });

  it('puts every cookable recipe ahead of every one-ingredient-away recipe', () => {
    const matches = rank([
      'eggs',
      'bread',
      'cheese',
      'butter',
      'milk',
      'garlic',
    ]);
    const firstGap = matches.findIndex((match) => !match.cookable);

    expect(firstGap).toBeGreaterThan(0);
    for (const match of matches.slice(firstGap)) {
      expect(match.cookable).toBe(false);
      expect(match.missing.length).toBeGreaterThan(0);
    }

    // Within each block the garden leads, then the better covered recipe.
    const block = matches.slice(0, firstGap);
    const garden = block.map((match) => match.garden.length);
    expect(garden).toEqual([...garden].sort((a, b) => b - a));

    for (const picked of new Set(garden)) {
      const scores = block
        .filter((match) => match.garden.length === picked)
        .map((match) => match.score);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    }
  });

  it('reports the one thing standing between you and dinner', () => {
    const matches = rank(['pasta', 'tomato-sauce', 'garlic', 'shallots']);
    const sauce = find(matches, 'pasta-with-tomato-sauce');

    expect(sauce?.cookable).toBe(true);

    const withoutSauce = rank(['pasta', 'garlic', 'onions']);
    const short = find(withoutSauce, 'pasta-with-tomato-sauce');

    expect(short?.missing).toEqual(['tomato-sauce']);
    expect(isReachable(short as RecipeMatch)).toBe(true);
  });

  it('drops optional ingredients that are missing instead of counting them', () => {
    const [toast] = rank(
      ['bread', 'tomatoes', 'garlic'],
      [RECIPES.find((recipe) => recipe.id === 'tomato-toast') as Recipe],
    );

    expect(toast.cookable).toBe(true);
    expect(toast.optionalMissing).toEqual(['basil', 'parmesan', 'butter']);
  });

  it('summarises the cookable and one-away list it is given', () => {
    const ranked = rank(['bread', 'jelly', 'peanut-butter', 'eggs', 'milk']);
    const { matches, counts } = selectRecipes(ranked, RECIPES.length);

    expect(counts.catalog).toBe(RECIPES.length);
    expect(counts.matches).toBe(matches.length);
    expect(counts.cookable + counts.oneAway).toBe(counts.matches);
    expect(counts.oneAway).toBe(
      matches.filter((match) => match.missing.length === 1).length,
    );
    // Everything that touches the selection, gate or no gate.
    expect(counts.using).toBe(ranked.length);
  });

  it('splits one ranking into two lists with no overlap and no loss', () => {
    const ranked = rank(['tomatoes', 'zucchini', 'kale']);
    const { matches, featured, counts } = selectRecipes(ranked, RECIPES.length);
    const shown = [...matches, ...featured].map((match) => match.recipe.id);

    expect(new Set(shown).size).toBe(shown.length);
    expect(matches.every((match) => match.missing.length <= 1)).toBe(true);
    expect(featured.every((match) => match.missing.length >= 2)).toBe(true);
    expect(counts.featured).toBe(featured.length);
    // Both lists are cut from the same ranking, so together they cannot exceed it.
    expect(matches.length + featured.length).toBeLessThanOrEqual(counts.using);
  });

  it('still answers a single tick — the cabbage case', () => {
    // The whole reason `featured` exists: one tick must be a browse, not a shrug.
    const { matches, featured } = selectRecipes(
      rank(['cabbage']),
      RECIPES.length,
    );

    expect(matches.length).toBeGreaterThan(0);
    expect(featured.length).toBeGreaterThan(0);
    // Everything on the browse list actually uses the thing that was ticked —
    // as a requirement, or as the thing the card offers on the side.
    expect(
      featured.every((match) =>
        [...match.required, ...match.optional].some(
          (item) => item.id === 'cabbage',
        ),
      ),
    ).toBe(true);
  });

  it('names the garden crops a recipe eats, and only ticked ones', () => {
    const [toast] = rank(
      ['bread', 'tomatoes', 'garlic'],
      [RECIPES.find((recipe) => recipe.id === 'tomato-toast') as Recipe],
    );
    // Tomatoes and garlic grow here; bread lives in the cupboard.
    expect(toast.garden).toEqual(['tomatoes', 'garlic']);

    const [pbj] = rank(
      ['bread', 'peanut-butter', 'jelly'],
      [
        RECIPES.find(
          (recipe) => recipe.id === 'peanut-butter-and-jelly',
        ) as Recipe,
      ],
    );
    expect(pbj.garden).toEqual([]);
  });

  it('lifts the garden to the top of both lists — the bok choy case', () => {
    // A full fridge and cupboard, then one crop: everything using that crop
    // has to come before anything that cannot.
    const kitchen = ingredients
      .filter((ingredient) => ingredient.group === 'kitchen')
      .map((ingredient) => ingredient.id);
    const { matches, featured } = selectRecipes(
      rank([...kitchen, 'bok-choy']),
      RECIPES.length,
    );

    for (const list of [matches, featured]) {
      const firstPlain = list.findIndex((match) => match.garden.length === 0);
      if (firstPlain !== -1) {
        expect(
          list.slice(firstPlain).every((match) => match.garden.length === 0),
        ).toBe(true);
      }
    }

    // Needs garlic and ginger as well, so it is a browse card — at the top.
    expect(featured[0].recipe.id).toBe('bok-choy-stir-fry');
    expect(featured[0].garden).toEqual(['bok-choy']);
  });

  it('puts a garden recipe above a nearer one on the browse list', () => {
    const stub = (id: string, uses: string[]): Recipe => ({
      id,
      title: id,
      blurb: '',
      tags: ['dinner'],
      minutes: 10,
      servings: '2',
      uses,
      steps: ['Cook it.'],
    });
    const recipes = [
      // Two bits short, but none of them grow here.
      stub('cupboard-dinner', ['eggs', 'bread', 'milk', 'butter']),
      // Four bits short, and one of them is the crop just ticked.
      stub('garden-dinner', [
        'bok-choy',
        'garlic',
        'ginger',
        'soy-sauce',
        'rice',
      ]),
    ];

    const { featured } = selectRecipes(
      rank(['eggs', 'bread', 'bok-choy'], recipes),
      recipes.length,
    );

    expect(featured.map((match) => match.recipe.id)).toEqual([
      'garden-dinner',
      'cupboard-dinner',
    ]);
    // It really is the further one: garden use outranks closeness.
    expect(featured[0].missing.length).toBeGreaterThan(
      featured[1].missing.length,
    );
  });

  it('puts the garden first, then the closest, on the browse list', () => {
    const ranked = rank(['tomatoes']);
    const { featured } = selectRecipes(ranked, RECIPES.length);

    const garden = featured.map((match) => match.garden.length);
    expect(garden).toEqual([...garden].sort((a, b) => b - a));

    for (const picked of new Set(garden)) {
      const missing = featured
        .filter((match) => match.garden.length === picked)
        .map((match) => match.missing.length);
      expect(missing).toEqual([...missing].sort((a, b) => a - b));
    }

    const capped = selectRecipes(ranked, RECIPES.length, 3);
    expect(capped.featured).toHaveLength(3);
    expect(capped.matches).toEqual(
      selectRecipes(ranked, RECIPES.length).matches,
    );
  });
});

describe('recipes query string', () => {
  it('flattens a single parameter, commas and repeats', () => {
    expect(parseHave(undefined)).toEqual([]);
    expect(parseHave('eggs')).toEqual(['eggs']);
    expect(parseHave('eggs, milk')).toEqual(['eggs', 'milk']);
    expect(parseHave(['eggs', 'milk,bread'])).toEqual([
      'eggs',
      'milk',
      'bread',
    ]);
    expect(parseHave('jelly,, ,')).toEqual(['jelly']);
  });

  it('leaves the names to resolveHave', () => {
    // Garbage survives parsing and is dropped by resolution, never a 400.
    expect(parseHave('unicorn tears,eggs')).toEqual(['unicorn tears', 'eggs']);
    expect(resolveHave(parseHave('unicorn tears,eggs'), ingredients)).toEqual([
      'eggs',
    ]);
  });
});

describe('recipes query resolution', () => {
  it('accepts ids, labels, aliases and near enough spellings', () => {
    expect(
      resolveHave(
        ['Peanut Butter', 'aubergine', 'jalapeño', 'jam', 'corn on the cob'],
        ingredients,
      ),
    ).toEqual([
      'eggplants',
      'jalapeno-peppers',
      'corn',
      'jelly',
      'peanut-butter',
    ]);
  });

  it('drops unknown entries, duplicates and blanks', () => {
    expect(
      resolveHave(['jelly', 'jelly', 'unicorn tears', '', '  '], ingredients),
    ).toEqual(['jelly']);
  });

  it('returns the selection in pantry order, not query order', () => {
    const order = ingredients.map((ingredient) => ingredient.id);
    const pantryOrder = (ids: string[]) =>
      [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b));

    // Eggs are near the top of the fridge list, jelly and bread further down;
    // the answer follows the list on screen, so the chips and `?have=` line up.
    expect(resolveHave(['jelly', 'bread', 'eggs'], ingredients)).toEqual(
      pantryOrder(['jelly', 'bread', 'eggs']),
    );
    expect(resolveHave(['jelly', 'bread', 'eggs'], ingredients)[0]).toBe(
      'eggs',
    );
  });

  it('prefers a real id over an alias that looks like one', () => {
    // "beans" is both the green-bean id and an alias of dried beans.
    expect(resolveHave(['beans'], ingredients)).toEqual(['beans']);
  });
});
