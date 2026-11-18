import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel, cookingOutcomes, evaluateRule, truthy, useType } from '../src/domain.mjs';

const data = JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url)));
const uses = JSON.parse(readFileSync(new URL('../public/data/uses.json', import.meta.url)));
const model = createModel(data, uses);

test('pinned dataset covers the agreed DST reference scope', () => {
  assert.equal(data.meta.game, "Don't Starve Together");
  assert.match(data.meta.revision, /^[a-f0-9]{40}$/);
  assert.ok(Object.keys(data.foods).length > 300);
  assert.ok(data.crafts.length > 800);
  assert.ok(data.meta.multisets > 1_000_000);
  for (const recipe of data.crafts) {
    assert.ok(Array.isArray(recipe.ingredients), recipe.id);
    assert.ok(Number.isFinite(recipe.yield) && recipe.yield > 0, recipe.id);
    assert.ok(data.items[recipe.product], recipe.product);
    for (const ingredient of recipe.ingredients) assert.ok(data.items[ingredient.item], ingredient.item);
  }
});

test('nutrition uses fresh base values and separates delayed Jellybean healing', () => {
  assert.equal(data.foods.meatballs.hunger, 62.5);
  assert.equal(data.foods.tomato.health, 3);
  assert.equal(data.foods.tallbirdegg.hunger, 25);
  assert.equal(data.foods.jellybean.health, 2);
  assert.equal(data.foods.jellybean.delayedHealth, 120);
  assert.equal(data.foods.jellybean.delayedSeconds, 120);
  assert.equal(data.foods.jellybean_spice_salt.delayedHealth, 120);
  assert.equal(data.foods.beefalotreat.specialDiet, true);
});

test('Lua boolean semantics preserve zero, short-circuiting, and absent ingredients', () => {
  assert.equal(truthy(0), true);
  assert.equal(truthy(undefined), false);
  assert.equal(evaluateRule(['or', ['literal', 0], ['literal', 3]], {}, {}), 0);
  assert.equal(evaluateRule(['not', ['ref', 'tags', 'meat']], {}, {}), true);
  assert.equal(evaluateRule(['and', ['ref', 'tags', 'meat'], ['>=', ['ref', 'tags', 'meat'], ['literal', 3]]], {}, {}), undefined);
});

test('every imported ingredient-use witness reproduces the game priority and ties', () => {
  let count = 0;
  for (const [cooker, items] of Object.entries(uses)) {
    for (const [item, dishes] of Object.entries(items)) {
      assert.ok(data.ingredients[data.aliases[item] || item], item);
      for (const [dish, witness] of Object.entries(dishes)) {
        assert.equal(witness.combo.length, 4);
        assert.ok(witness.combo.includes(item), `${item} missing from its ${dish} witness`);
        const actual = cookingOutcomes(witness.combo, data, cooker).map(outcome => outcome.id);
        assert.deepEqual(actual, witness.winners.slice().sort(), `${item} → ${dish} in ${cooker}`);
        assert.ok(actual.includes(dish));
        count++;
      }
    }
  }
  assert.ok(count > 2000, `Only ${count} witnesses were tested`);
});

test('Tallbird Egg and tomato include named, value, filler, and competing outcomes', () => {
  const egg = model.directUses('tallbirdegg');
  assert.ok(egg.some(use => use.recipe.id === 'talleggs' && use.type === 'named'));
  assert.ok(egg.some(use => use.recipe.id === 'baconeggs' && use.type === 'value'));
  assert.ok(egg.some(use => use.recipe.id === 'perogies'));
  assert.ok(egg.some(use => use.witness.winners.length > 1));
  assert.ok(model.directUses('tomato').some(use => use.recipe.id === 'salsa' && use.type === 'named'));
  assert.equal(useType('tomato', data.recipes.ratatouille, data), 'value');
  assert.equal(useType('tomato', data.recipes.meatballs, data), 'filler');
  assert.ok(model.matches('tomato', 'tomato'));
});

test('recipe paths can load after the table without leaving stale query state', () => {
  const lazy = createModel(data);
  assert.equal(lazy.directUses('tallbirdegg').length, 0);
  lazy.uses = uses;
  assert.ok(lazy.directUses('tallbirdegg').some(use => use.recipe.id === 'talleggs'));
  assert.ok(lazy.items('honey', { ingredientsOnly: true }).includes('honey'));
});

test('four-slot limits and cooker restrictions are enforced', () => {
  assert.throws(() => cookingOutcomes(['tomato'], data), /four/);
  assert.throws(() => cookingOutcomes(['boards', 'tomato', 'ice', 'meat'], data), /Not a Crock Pot/);
  assert.throws(() => cookingOutcomes(['tomato', 'tomato', 'ice', 'meat'], data, 'invalid'), /station/);
  const recipe = Object.values(data.recipes).find(recipe => recipe.station === 'portablecookpot');
  const witness = Object.values(uses.portablecookpot).flatMap(Object.values).find(w => w.winners.includes(recipe.id));
  assert.ok(witness, recipe.id);
  assert.ok(!cookingOutcomes(witness.combo, data, 'cookpot').some(r => r.id === recipe.id));
  assert.ok(cookingOutcomes(witness.combo, data, 'portablecookpot').some(r => r.id === recipe.id));
});

test('preparation paths include roasting, drying, and seasoning', () => {
  assert.ok(model.transforms.get('tomato').some(edge => edge.to === 'tomato_cooked'));
  assert.ok(model.transforms.get('meat').some(edge => edge.to === 'meat_dried'));
  assert.ok(model.transforms.get('meatballs').some(edge => edge.to === 'meatballs_spice_garlic' && edge.extra === 'spice_garlic'));
  assert.ok(model.consumers.get('cutgrass').some(recipe => recipe.product === 'rope'));
  assert.ok(model.consumers.get('rope').some(recipe => recipe.product === 'spear'));
});

test('sorting covers the full filtered dataset, including negative and fractional values', () => {
  for (const sort of ['hunger', 'sanity', 'health']) {
    for (const direction of ['asc', 'desc']) {
      const result = model.foods({ sort, direction, method: 'all', showSpecial: true });
      for (let i = 1; i < result.length; i++) assert.ok(direction === 'asc' ? result[i - 1][sort] <= result[i][sort] : result[i - 1][sort] >= result[i][sort]);
    }
  }
  assert.ok(model.foods({ method: 'seasoned' }).every(f => f.method === 'seasoned'));
  assert.ok(model.foods({ query: 'tomato', method: 'all' }).some(f => f.id === 'tomato'));
  assert.ok(model.foods({ query: 'unlikely-no-food' }).length === 0);
});

test('Crock Pot totals expand Cut Stone and keep stations reusable', () => {
  const totals = model.materials(model.byCraftId.get('cookpot'), 2);
  assert.deepEqual(Object.fromEntries(totals.materials.map(r => [r.id, r.amount])), { charcoal: 12, rocks: 18, twigs: 12 });
  assert.ok(totals.stations.includes('Science Machine'));
  assert.ok(!totals.materials.some(r => r.id === 'researchlab'));
});

test('shared batches use recipe yields and carry surplus between branches', () => {
  const fixture = {
    items: Object.fromEntries(['root', 'left', 'right', 'batch', 'raw'].map(id => [id, { name: id }])),
    foods: {}, ingredients: {}, aliases: {}, transforms: [],
    crafts: [
      { id: 'root', product: 'root', yield: 1, tech: 'NONE', ingredients: [{ item: 'left', amount: 1 }, { item: 'right', amount: 1 }] },
      { id: 'left', product: 'left', yield: 1, tech: 'NONE', ingredients: [{ item: 'batch', amount: 1 }] },
      { id: 'right', product: 'right', yield: 1, tech: 'NONE', ingredients: [{ item: 'batch', amount: 1 }] },
      { id: 'batch', product: 'batch', yield: 3, tech: 'NONE', ingredients: [{ item: 'raw', amount: 2 }] },
    ],
  };
  const f = createModel(fixture);
  const result = f.materials(f.byCraftId.get('root'), 1);
  assert.deepEqual(result.materials, [{ id: 'raw', amount: 2 }]);
  assert.deepEqual(result.surplus, [{ id: 'batch', amount: 1 }]);
});

test('cyclic conversions terminate and invalid quantities do not corrupt totals', () => {
  const fixture = { items: { a: { name: 'A' }, b: { name: 'B' } }, foods: {}, transforms: [], crafts: [
    { id: 'a', product: 'a', yield: 1, tech: 'NONE', ingredients: [{ item: 'b', amount: 1 }] },
    { id: 'b', product: 'b', yield: 1, tech: 'NONE', ingredients: [{ item: 'a', amount: 1 }] },
  ] };
  const f = createModel(fixture);
  assert.deepEqual(f.materials(f.byCraftId.get('a')).materials, [{ id: 'a', amount: 1 }]);
  for (const quantity of [0, -1, NaN, 1.5, 10000]) assert.throws(() => model.materials(model.byCraftId.get('cookpot'), quantity), /whole quantity/);
});
