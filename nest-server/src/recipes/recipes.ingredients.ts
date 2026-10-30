import { loadDataset } from '../planting-calendar/planting-calendar.dataset';
import type { PlantingDataset } from '../planting-calendar/planting-calendar.types';
import type {
  Ingredient,
  IngredientFamily,
  IngredientGroup,
  IngredientGroupId,
} from './recipes.types';

/**
 * The pantry — what you are allowed to tick.
 *
 * Two groups, deliberately:
 *  - `garden` is **not** written out here: it is read from the same
 *    `co-englewood.json` the planting calendar serves, so the two apps cannot
 *    drift apart and re-scraping the Almanac updates this list for free. Only
 *    the four crops nobody eats are held back (see `GARDEN_EXCLUDED`).
 *  - `kitchen` is hand-authored: the author's grocery list, then the odds and
 *    ends that make more recipes work. It used to be two groups (`kitchen` and
 *    `extras`); they were merged because a stocked kitchen is one answer to one
 *    question, and the group is bulk-tickable for exactly that reason.
 */
export interface IngredientSeed {
  id: string;
  label: string;
  group: IngredientGroupId;
}

export const INGREDIENT_GROUPS: IngredientGroup[] = [
  {
    id: 'garden',
    label: 'From the garden',
    blurb: 'Everything in the planting calendar that ends up on a plate.',
  },
  {
    id: 'kitchen',
    label: 'Fridge & cupboard',
    blurb: 'A normal kitchen: groceries, cans, dairy, condiments.',
    allAtOnce: true,
  },
];

/**
 * Rows in the planting calendar that are growing, not cooking: the two local
 * additions (tobacco, cannabis), the ornamental marigold and comfrey, which is
 * fodder and medicine rather than food.
 */
export const GARDEN_EXCLUDED: Record<string, string> = {
  cannabis: 'not an ingredient',
  tobacco: 'not an ingredient',
  marigolds: 'ornamental flower',
  'comfrey-plant': 'fodder and medicine, not food',
};

/**
 * The kitchen: the author's groceries first, then the odds and ends that make
 * more recipes work (fat, acid, stock, tins, named cheeses, baking).
 *
 * Order is the order it appears on the page — protein, dairy, condiments,
 * grains and bread, cans and tomatoes, then the produce that lives indoors.
 * Everything here is `group: 'kitchen'`; the two blocks are a reading order,
 * not a taxonomy, so the section stays one list you either have or you don't.
 */
export const KITCHEN_SEEDS: IngredientSeed[] = [
  // Protein
  { id: 'chicken', label: 'Chicken', group: 'kitchen' },
  { id: 'turkey', label: 'Turkey (ground or leftover)', group: 'kitchen' },
  { id: 'deli-turkey', label: 'Deli turkey slices', group: 'kitchen' },
  { id: 'turkey-bacon', label: 'Turkey bacon', group: 'kitchen' },
  { id: 'eggs', label: 'Eggs', group: 'kitchen' },
  { id: 'tofu', label: 'Tofu', group: 'kitchen' },
  // Dairy and fat — `cheese` is the generic one; the named ones are for the
  // recipes where the type matters (mozzarella on a caprese, feta on a salad).
  { id: 'milk', label: 'Milk', group: 'kitchen' },
  { id: 'cheese', label: 'Cheese (any)', group: 'kitchen' },
  { id: 'cheddar', label: 'Cheddar', group: 'kitchen' },
  { id: 'mozzarella', label: 'Mozzarella', group: 'kitchen' },
  { id: 'parmesan', label: 'Parmesan', group: 'kitchen' },
  { id: 'feta', label: 'Feta', group: 'kitchen' },
  { id: 'cream-cheese', label: 'Cream cheese', group: 'kitchen' },
  { id: 'butter', label: 'Butter', group: 'kitchen' },
  // Condiments, acid, sweet
  { id: 'mayonnaise', label: 'Mayonnaise', group: 'kitchen' },
  { id: 'mustard', label: 'Mustard', group: 'kitchen' },
  { id: 'soy-sauce', label: 'Soy sauce', group: 'kitchen' },
  { id: 'vinegar', label: 'Vinegar', group: 'kitchen' },
  { id: 'lemon', label: 'Lemon or lime', group: 'kitchen' },
  { id: 'honey', label: 'Honey', group: 'kitchen' },
  { id: 'jelly', label: 'Jelly', group: 'kitchen' },
  { id: 'peanut-butter', label: 'Peanut butter', group: 'kitchen' },
  // Grains, bread, baking
  { id: 'bread', label: 'Bread', group: 'kitchen' },
  { id: 'tortillas', label: 'Tortillas', group: 'kitchen' },
  { id: 'pasta', label: 'Pasta', group: 'kitchen' },
  { id: 'orzo', label: 'Orzo', group: 'kitchen' },
  { id: 'couscous', label: 'Couscous', group: 'kitchen' },
  { id: 'rice', label: 'Rice', group: 'kitchen' },
  { id: 'wild-rice', label: 'Wild rice', group: 'kitchen' },
  { id: 'flour', label: 'Flour', group: 'kitchen' },
  { id: 'sugar', label: 'Sugar', group: 'kitchen' },
  // Cans, stock, tomatoes
  { id: 'broth', label: 'Broth or stock', group: 'kitchen' },
  { id: 'canned-beans', label: 'Canned beans', group: 'kitchen' },
  { id: 'chickpeas', label: 'Chickpeas', group: 'kitchen' },
  { id: 'tomato-sauce', label: 'Tomato sauce', group: 'kitchen' },
  { id: 'sun-dried-tomatoes', label: 'Sun-dried tomatoes', group: 'kitchen' },
  // Indoors produce
  { id: 'shallots', label: 'Shallots', group: 'kitchen' },
  { id: 'avocado', label: 'Avocado', group: 'kitchen' },
];

/**
 * Interchangeable ingredients. Keep these *narrow*: a swap the page announces
 * ("using parsnips for potatoes") should be one a cook would shrug at, so
 * garlic is not in the onion family and jalapeños are not bell peppers.
 */
export const INGREDIENT_FAMILIES: IngredientFamily[] = [
  {
    id: 'onion-family',
    label: 'onions',
    members: ['onions', 'shallots', 'leeks'],
  },
  {
    id: 'cheese-family',
    label: 'cheese',
    members: [
      'cheese',
      'cheddar',
      'mozzarella',
      'parmesan',
      'feta',
      'cream-cheese',
    ],
  },
  {
    id: 'cooking-greens',
    label: 'cooking greens',
    members: ['kale', 'swiss-chard', 'spinach', 'collards', 'mustard-greens'],
  },
  {
    id: 'salad-greens',
    label: 'salad greens',
    members: ['lettuce', 'arugula', 'watercress', 'spinach'],
  },
  { id: 'riced-grain', label: 'rice', members: ['rice', 'wild-rice'] },
  {
    id: 'small-pasta',
    label: 'small pasta and grains',
    members: ['pasta', 'orzo', 'couscous'],
  },
  {
    id: 'bread-and-tortillas',
    label: 'bread',
    members: ['bread', 'tortillas'],
  },
  {
    id: 'root-veg',
    label: 'root vegetables',
    members: [
      'potatoes',
      'sweet-potatoes',
      'carrots',
      'parsnips',
      'turnips',
      'radishes',
      'beets',
      'kohlrabi',
    ],
  },
];

/**
 * Search words and query-string spellings, keyed by ingredient id. These make
 * `?have=peanut%20butter` and a search for "aubergine" work without a second
 * id scheme.
 */
export const INGREDIENT_ALIASES: Record<string, string[]> = {
  // Garden ids are the planting calendar's slugs, which are not always what
  // the crop is called in a kitchen.
  'anise-hyssop': ['anise', 'hyssop'],
  beans: ['green beans', 'string beans', 'snap beans'],
  'bell-peppers': ['capsicum', 'sweet peppers', 'peppers'],
  'bok-choy': ['pak choi', 'bok choi'],
  'brussels-sprouts': ['sprouts'],
  'cilantro-coriander': ['coriander', 'cilantro'],
  corn: ['sweetcorn', 'sweet corn', 'corn on the cob'],
  'dry-beans': ['dried beans'],
  eggplants: ['aubergine', 'aubergines', 'eggplant'],
  'fava-beans': ['broad beans'],
  'honeydew-melons': ['honeydew', 'melon'],
  'jalapeno-peppers': ['jalapeno', 'jalapeño', 'chile', 'chilli'],
  'lovage-plants': ['lovage'],
  onions: ['onion', 'yellow onion', 'scallion', 'scallions', 'green onion'],
  peas: ['snap peas', 'snow peas', 'sugar snap peas'],
  potatoes: ['potato', 'spuds'],
  pumpkins: ['pumpkin'],
  salsify: ['oyster plant'],
  savory: ['summer savory'],
  'sweet-potatoes': ['sweet potato', 'yam'],
  'swiss-chard': ['chard'],
  tomatoes: ['tomato'],
  'turmeric-root': ['turmeric'],
  watermelons: ['watermelon'],
  'winter-squash': ['butternut', 'butternut squash'],
  zucchini: ['courgette', 'courgettes', 'summer squash'],
  // Kitchen
  bread: ['toast', 'sliced bread', 'loaf'],
  cheese: ['shredded cheese', 'block cheese'],
  chicken: ['chicken breast', 'rotisserie chicken'],
  couscous: ['cous cous'],
  'deli-turkey': ['sliced turkey', 'lunch meat', 'cold cuts'],
  eggs: ['egg'],
  jelly: ['jam', 'preserves'],
  milk: ['whole milk'],
  orzo: ['risoni'],
  pasta: ['spaghetti', 'noodles', 'penne', 'macaroni'],
  'peanut-butter': ['pb', 'peanutbutter'],
  rice: ['white rice', 'brown rice', 'jasmine rice'],
  shallots: ['shallot'],
  'sun-dried-tomatoes': ['sundried tomatoes'],
  tofu: ['bean curd', 'firm tofu', 'silken tofu', 'extra firm tofu'],
  'tomato-sauce': ['marinara', 'pasta sauce', 'passata', 'canned tomatoes'],
  turkey: ['ground turkey', 'turkey mince'],
  'turkey-bacon': ['bacon'],
  'wild-rice': ['wild rice blend'],
  // The odds and ends added so more recipes work
  avocado: ['avocados'],
  broth: ['stock', 'chicken stock', 'chicken broth', 'bouillon'],
  'canned-beans': [
    'tinned beans',
    'black beans',
    'kidney beans',
    'white beans',
    'cannellini',
  ],
  cheddar: ['sharp cheddar'],
  chickpeas: ['garbanzo', 'garbanzo beans'],
  'cream-cheese': ['neufchatel'],
  feta: ['feta cheese'],
  flour: ['all-purpose flour', 'ap flour'],
  honey: ['maple syrup'],
  lemon: ['lime', 'lemon juice', 'lime juice'],
  mayonnaise: ['mayo'],
  mozzarella: ['fresh mozzarella'],
  mustard: ['dijon', 'yellow mustard'],
  parmesan: ['parmigiano', 'pecorino'],
  'soy-sauce': ['tamari', 'soya sauce'],
  sugar: ['brown sugar'],
  tortillas: ['wrap', 'wraps', 'flatbread'],
  vinegar: ['white vinegar', 'red wine vinegar', 'apple cider vinegar'],
  butter: ['salted butter', 'unsalted butter'],
};

/** Always assumed on hand, so never a checkbox and never a "missing". */
export const STAPLES: string[] = [
  'salt',
  'black pepper',
  'cooking oil',
  'water',
];

/**
 * The garden group, from the planting-calendar dataset.
 *
 * Fail-soft like the calendar itself: if the JSON cannot be read the group is
 * empty and the rest of the pantry still works — `recipes.catalog.spec.ts`
 * fails on a missing dataset instead of the app.
 */
export const buildGardenSeeds = (
  dataset: PlantingDataset | null = loadDataset(),
): IngredientSeed[] => {
  if (!dataset) return [];

  const seen = new Set<string>();
  const seeds: IngredientSeed[] = [];

  for (const table of Object.values(dataset.tables ?? {})) {
    for (const crop of table.crops ?? []) {
      const id = crop.slug;
      if (!id || seen.has(id) || GARDEN_EXCLUDED[id]) continue;
      seen.add(id);
      seeds.push({ id, label: crop.name, group: 'garden' });
    }
  }

  return seeds.sort((a, b) => a.label.localeCompare(b.label));
};

export const buildIngredientSeeds = (
  dataset?: PlantingDataset | null,
): IngredientSeed[] => [...buildGardenSeeds(dataset), ...KITCHEN_SEEDS];

/**
 * Seeds plus the derived `families`/`aliases`, which is what the API ships.
 * Family membership is computed here (never authored twice), so moving an
 * ingredient between families is a one-line change.
 */
export const buildIngredients = (
  seeds: IngredientSeed[] = buildIngredientSeeds(),
): Ingredient[] => {
  const familiesByIngredient = new Map<string, string[]>();
  for (const family of INGREDIENT_FAMILIES) {
    for (const member of family.members) {
      familiesByIngredient.set(member, [
        ...(familiesByIngredient.get(member) ?? []),
        family.id,
      ]);
    }
  }

  return seeds.map((seed) => ({
    ...seed,
    families: familiesByIngredient.get(seed.id) ?? [],
    aliases: INGREDIENT_ALIASES[seed.id] ?? [],
  }));
};
