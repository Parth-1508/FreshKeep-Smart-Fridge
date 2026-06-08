export const RECIPES = [
  {
    id: 'r1', name: 'Cheese Toast', emoji: '🍞', time: '5 min', servings: 2,
    ingredients: [
      { name: 'Bread',  category: 'Bread',  required: true },
      { name: 'Butter', category: 'Dairy',  required: true },
      { name: 'Cheese', category: 'Dairy',  required: true },
    ],
    steps: [
      'Butter one side of each bread slice.',
      'Place cheese between two slices, butter side out.',
      'Heat a pan over medium heat.',
      'Cook 2–3 minutes each side until golden and cheese melts.',
      'Cut diagonally and serve hot.',
    ],
  },
  {
    id: 'r2', name: 'Cheese Omelette', emoji: '🍳', time: '10 min', servings: 2,
    ingredients: [
      { name: 'Eggs',   category: 'Eggs',  required: true },
      { name: 'Cheese', category: 'Dairy', required: true },
      { name: 'Butter', category: 'Dairy', required: false },
    ],
    steps: [
      'Beat 2–3 eggs in a bowl.',
      'Melt butter in a non-stick pan.',
      'Pour in eggs and cook on low heat.',
      'Add cheese before folding.',
      'Fold and serve immediately.',
    ],
  },
  {
    id: 'r3', name: 'Milk Pancakes', emoji: '🥞', time: '15 min', servings: 4,
    ingredients: [
      { name: 'Milk',  category: 'Milk',  required: true },
      { name: 'Eggs',  category: 'Eggs',  required: true },
      { name: 'Bread', category: 'Bread', required: false },
    ],
    steps: [
      'Mix 1 cup flour, 1 egg, 1 cup milk, pinch of salt.',
      'Beat until smooth batter forms.',
      'Heat a lightly oiled pan.',
      'Pour batter and cook until bubbles form.',
      'Flip and cook 1 more minute.',
    ],
  },
  {
    id: 'r4', name: 'Green Smoothie', emoji: '🥤', time: '3 min', servings: 1,
    ingredients: [
      { name: 'Spinach', category: 'Vegetables', required: true },
      { name: 'Milk',    category: 'Milk',       required: false },
    ],
    steps: [
      'Add a handful of spinach to blender.',
      'Add 1 cup milk or water.',
      'Add optional banana or honey.',
      'Blend until smooth.',
      'Serve immediately.',
    ],
  },
];

export function matchRecipes(inventoryItems) {
  const itemCategories = new Set(inventoryItems.map(i => i.category));

  return RECIPES.map(recipe => {
    const have    = recipe.ingredients.filter(i => itemCategories.has(i.category));
    const missing = recipe.ingredients.filter(i => !itemCategories.has(i.category) && i.required);
    return {
      ...recipe,
      haveCount:    have.length,
      totalCount:   recipe.ingredients.length,
      missingCount: missing.length,
      canMake:      missing.length === 0,
      priority:     missing.length === 0 ? 2 : have.length > 0 ? 1 : 0,
    };
  }).sort((a, b) => b.priority - a.priority || b.haveCount - a.haveCount);
}

// Helper used in InventoryContext
export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
