/** Pure game-data queries, Lua-compatible recipe evaluation, and crafting math. */
export const METHODS = { raw: 'Raw', roasted: 'Roasted', dried: 'Dried', crockpot: 'Crock Pot', seasoned: 'Seasoned', crafted: 'Crafted' };
export const CHARACTERS = {
  pyromaniac: 'Willow', masterchef: 'Warly', professionalchef: 'Warly', merm_builder: 'Wurt',
  ghostlyfriend: 'Wendy', elixirbrewer: 'Wendy', strongman: 'Wolfgang', bookbuilder: 'Wickerbottom',
  werehuman: 'Woodie', shadowmagic: 'Maxwell', plantkin: 'Wormwood', valkyrie: 'Wigfrid',
  battlesinger: 'Wigfrid', spiderwhisperer: 'Webber', handyperson: 'Winona', portableengineer: 'Winona',
  balloonomancer: 'Wes', pebblemaker: 'Walter', pinetreepioneer: 'Walter', clockmaker: 'Wanda',
  upgrademoduleowner: 'WX-78',
};
export const STATIONS = {
  NONE: 'No station', SCIENCE_ONE: 'Science Machine', SCIENCE_TWO: 'Alchemy Engine', SCIENCE_THREE: 'Science level 3',
  MAGIC_TWO: 'Prestihatitator', MAGIC_THREE: 'Shadow Manipulator', ANCIENT_TWO: 'Broken Ancient Pseudoscience Station',
  ANCIENT_FOUR: 'Ancient Pseudoscience Station', CELESTIAL_ONE: 'Celestial Orb', CELESTIAL_THREE: 'Celestial Altar',
  CARTOGRAPHY_TWO: "Cartographer’s Desk", SEAFARING_ONE: 'Think Tank', SEAFARING_TWO: 'Think Tank',
  SCULPTING_ONE: "Potter’s Wheel", ORPHANAGE_ONE: 'Rock Den', FOODPROCESSING_ONE: 'Portable Grinding Mill',
  FISHING_ONE: 'Tackle Receptacle', WINTERSFEASTCOOKING_ONE: 'Masonry Oven', MADSCIENCE_ONE: 'Mad Science Lab',
  HERMITCRABSHOP_ONE: 'Crabby Hermit · friendship 1', HERMITCRABSHOP_THREE: 'Crabby Hermit · friendship 3',
  HERMITCRABSHOP_FIVE: 'Crabby Hermit · friendship 5', HERMITCRABSHOP_SEVEN: 'Crabby Hermit · friendship 7',
  SPIDERCRAFT_ONE: 'Spider crafting', ROBOTMODULECRAFT_ONE: 'Bio Scanalyzer', BOOKCRAFT_ONE: 'Bookcase',
  LUNARFORGING_TWO: 'Brightsmithy', SHADOWFORGING_TWO: 'Shadowcraft Plinth', CARPENTRY_TWO: 'Sawhorse',
  CARPENTRY_THREE: 'Sawhorse', WAGPUNK_WORKSTATION_TWO: 'W.A.R.B.I.S. Bin', TURFCRAFTING_TWO: 'Turf-Raiser Helm',
  MASHTURFCRAFTING_TWO: 'Terra Firma Tamper', SHELLWEAVER_ONE: 'Shell Weaver', SHELLWEAVER_THREE: 'Shell Weaver',
  RABBITKINGSHOP_TWO: 'Rabbit King', VAULT_REFINE_ONE: 'Vault refiner', CARNIVAL_GOLFPROPS_ONE: 'Golf Tee',
  CARNIVAL_HOSTSHOP_ONE: 'Cawnival host', CARNIVAL_HOSTSHOP_THREE: 'Cawnival host', CARNIVAL_PRIZESHOP_ONE: 'Prize Booth',
  LOST: 'Blueprint / special unlock',
};
export const truthy = value => value !== null && value !== undefined && value !== false;
export const title = value => String(value ?? '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
export const normalize = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function evaluateRule(node, names, tags, cooker = 'cookpot') {
  const [op, a, b] = node;
  if (op === 'literal') return a;
  if (op === 'ref') return (a === 'names' ? names : tags)[b];
  if (op === 'cooker') return cooker;
  if (op === 'not') return !truthy(evaluateRule(a, names, tags, cooker));
  if (op === 'neg') return -evaluateRule(a, names, tags, cooker);
  const left = evaluateRule(a, names, tags, cooker);
  if (op === 'and') return truthy(left) ? evaluateRule(b, names, tags, cooker) : left;
  if (op === 'or') return truthy(left) ? left : evaluateRule(b, names, tags, cooker);
  const right = evaluateRule(b, names, tags, cooker);
  switch (op) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
    case '>=': return left >= right;
    case '<=': return left <= right;
    case '>': return left > right;
    case '<': return left < right;
    case '==': return left === right;
    case '~=': return left !== right;
    default: throw new Error(`Unsupported recipe operator: ${op}`);
  }
}

export function ingredientValues(combo, data) {
  const names = Object.create(null), tags = Object.create(null);
  for (const item of combo) {
    const key = data.aliases[item] || item;
    if (!data.ingredients[key]) throw new Error(`Not a Crock Pot ingredient: ${item}`);
    names[key] = (names[key] || 0) + 1;
    for (const [tag, value] of Object.entries(data.ingredients[key])) tags[tag] = (tags[tag] || 0) + value;
  }
  return { names, tags };
}

export function cookingOutcomes(combo, data, cooker = 'cookpot') {
  if (!['cookpot', 'portablecookpot'].includes(cooker)) throw new Error('Choose a supported cooking station.');
  if (!Array.isArray(combo) || combo.length !== 4) throw new Error('A Crock Pot needs exactly four ingredients.');
  const { names, tags } = ingredientValues(combo, data);
  let priority = -Infinity;
  const candidates = [];
  for (const recipe of Object.values(data.recipes)) {
    if (recipe.station === 'portablecookpot' && cooker !== 'portablecookpot') continue;
    if (recipe.priority < priority || !truthy(evaluateRule(recipe.rule, names, tags, cooker))) continue;
    if (recipe.priority > priority) { candidates.length = 0; priority = recipe.priority; }
    candidates.push(recipe);
  }
  const weight = candidates.reduce((sum, recipe) => sum + recipe.weight, 0);
  return candidates.map(recipe => ({ id: recipe.id, probability: recipe.weight / weight })).sort((a, b) => a.id.localeCompare(b.id));
}

export function ruleReferences(node, group, includeNegated = true, negated = false) {
  if (node[0] === 'ref') return node[1] === group && (includeNegated || !negated) ? [node[2]] : [];
  return node.slice(1).filter(Array.isArray).flatMap(child => ruleReferences(child, group, includeNegated, node[0] === 'not' ? !negated : negated));
}

export function useType(item, recipe, data) {
  const key = data.aliases[item] || item;
  if (ruleReferences(recipe.rule, 'names').includes(key)) return 'named';
  const tags = data.ingredients[key] || {};
  return ruleReferences(recipe.rule, 'tags', false).some(tag => tags[tag]) ? 'value' : 'filler';
}

export function createModel(data, uses = {}, localization = {}) {
  const byProduct = new Map(), consumers = new Map(), transforms = new Map();
  for (const recipe of data.crafts) {
    if (!byProduct.has(recipe.product)) byProduct.set(recipe.product, []);
    byProduct.get(recipe.product).push(recipe);
    for (const ingredient of recipe.ingredients) {
      if (!consumers.has(ingredient.item)) consumers.set(ingredient.item, []);
      consumers.get(ingredient.item).push(recipe);
    }
  }
  for (const transform of data.transforms) {
    if (!transforms.has(transform.from)) transforms.set(transform.from, []);
    transforms.get(transform.from).push(transform);
  }
  const byCraftId = new Map(data.crafts.map(recipe => [recipe.id, recipe]));
  const name = id => localization.items?.()?.[id]?.name || data.items[id]?.name || title(id);
  const compareNames = (a, b) => name(a).localeCompare(name(b), localization.language?.());
  const matches = (id, query) => normalize(`${name(id)} ${data.items[id]?.name || ''} ${localization.items?.()?.[id]?.description || ''} ${id} ${data.items[id]?.description || ''}`).includes(normalize(query).trim());
  const recipeScore = recipe => (recipe.builder_tag || recipe.builder_skill ? 100 : 0) + (recipe.event ? 200 : 0) + (recipe.manufactured ? 50 : 0) + (recipe.id.startsWith('transmute_') ? 300 : 0);
  for (const entries of byProduct.values()) entries.sort((a, b) => recipeScore(a) - recipeScore(b) || a.id.localeCompare(b.id));
  const routine = (recipe, character) => !recipe.event && !recipe.manufactured && !recipe.limitedamount && !recipe.tech.includes('SHOP') && !recipe.id.startsWith('transmute_') && (!characterName(recipe) || characterName(recipe) === character);
  const preferredRecipe = (id, ancestors = new Set(), character = null) => byProduct.get(id)?.find(recipe => !ancestors.has(recipe.id) && routine(recipe, character));

  return {
    data, uses, byProduct, byCraftId, consumers, transforms, name, matches, preferredRecipe,
    foods({ query = '', method = 'base', diet = 'all', availability = 'all', sort = 'name', direction = 'asc', showSpecial = false } = {}) {
      const list = Object.values(data.foods).filter(food => {
        if (!matches(food.id, query)) return false;
        if (method === 'base' && food.method === 'seasoned') return false;
        if (!['all', 'base'].includes(method) && food.method !== method) return false;
        if (diet !== 'all' && food.diet !== diet) return false;
        if (!showSpecial && food.specialDiet) return false;
        if (availability === 'everyday' && (food.character || food.event)) return false;
        if (availability === 'warly' && food.character !== 'warly') return false;
        if (availability === 'event' && !food.event) return false;
        return true;
      });
      return list.sort((a, b) => {
        const primary = sort === 'name' ? compareNames(a.id, b.id) : (a[sort] - b[sort]);
        return (direction === 'asc' ? primary : -primary) || compareNames(a.id, b.id) || a.id.localeCompare(b.id);
      });
    },
    directUses(id, cooker = 'cookpot') {
      return Object.entries(this.uses[cooker]?.[id] || {}).map(([rid, witness]) => ({ recipe: data.recipes[rid], witness, type: useType(id, data.recipes[rid], data) })).sort((a, b) => ['named', 'value', 'filler'].indexOf(a.type) - ['named', 'value', 'filler'].indexOf(b.type) || compareNames(a.recipe.id, b.recipe.id));
    },
    items(query = '', { ingredientsOnly = false } = {}) {
      return Object.keys(data.items).filter(id => matches(id, query) && (!ingredientsOnly || this.uses.cookpot?.[id] || consumers.has(id) || transforms.has(id))).sort((a, b) => {
        const exactA = normalize(name(a)) === normalize(query) || a === normalize(query), exactB = normalize(name(b)) === normalize(query) || b === normalize(query);
        return Number(exactB) - Number(exactA) || Number(Boolean(data.foods[b])) - Number(Boolean(data.foods[a])) || compareNames(a, b);
      });
    },
    materials(recipe, quantity = 1) {
      if (!recipe || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 9999) throw new Error('Choose a whole quantity from 1 to 9999.');
      const materials = new Map(), surplus = new Map(), stations = new Set(), tools = new Set(), warnings = new Set(), batches = new Map();
      const addMaterial = (id, amount) => materials.set(id, (materials.get(id) || 0) + amount);
      const consume = (id, amount, ancestry = new Set(), chosen) => {
        const spare = surplus.get(id) || 0;
        const needed = Math.max(0, amount - spare);
        surplus.set(id, Math.max(0, spare - amount));
        if (!needed) return;
        const current = chosen || preferredRecipe(id, ancestry, characterName(recipe));
        if (!current) {
          addMaterial(id, needed);
          if (byProduct.get(id)?.some(r => ancestry.has(r.id))) warnings.add('A conversion cycle was stopped. The remaining item is listed as a base material.');
          return;
        }
        if (ancestry.has(current.id)) { addMaterial(id, needed); warnings.add('A conversion cycle was stopped. The remaining item is listed as a base material.'); return; }
        // Do not silently assume a character's alchemy or an event-only purchase
        // is the source for an ordinary base resource in a different recipe.
        if (!chosen && (current.id.startsWith('transmute_') || current.event || current.manufactured)) { addMaterial(id, needed); return; }
        const count = Math.ceil(needed / current.yield);
        surplus.set(id, (surplus.get(id) || 0) + count * current.yield - needed);
        batches.set(current.id, (batches.get(current.id) || 0) + count);
        if (current.tech !== 'NONE') stations.add(stationName(current.tech));
        if (current.dynamicYield) warnings.add('Skill-dependent output may vary. These totals use the base recipe yield.');
        if (current.builder_tag || current.builder_skill) warnings.add(`Requires ${characterName(current) || 'a character skill'}.`);
        const next = new Set(ancestry).add(current.id);
        for (const ingredient of current.ingredients) {
          if (ingredient.amount === 0) tools.add(ingredient.item);
          else consume(ingredient.item, ingredient.amount * count, next);
        }
      };
      consume(recipe.product, quantity, new Set(), recipe);
      return { materials: [...materials].map(([id, amount]) => ({ id, amount })).sort((a, b) => compareNames(a.id, b.id)), surplus: [...surplus].filter(([, amount]) => amount > 0).map(([id, amount]) => ({ id, amount })), stations: [...stations].sort(), tools: [...tools], warnings: [...warnings], batches };
    },
  };
}

export function stationName(tech) {
  if (STATIONS[tech]) return STATIONS[tech];
  if (tech.startsWith('YOT') || tech.endsWith('OFFERING_THREE') || tech === 'PERDOFFERING_ONE') return 'Lunar New Year shrine';
  if (tech === 'HALLOWED_NIGHTS') return 'Hallowed Nights';
  if (tech === 'WINTERS_FEAST') return 'Winter’s Feast';
  return title(tech);
}

export function characterName(recipe) {
  if (recipe.builder_skill) {
    const id = recipe.builder_skill.split('_')[0];
    return { wx78: 'WX-78', waxwell: 'Maxwell', wathgrithr: 'Wigfrid' }[id] || title(id);
  }
  return CHARACTERS[recipe.builder_tag] || (recipe.builder_tag ? title(recipe.builder_tag) : null);
}

export function groupCombo(combo) {
  const map = new Map();
  for (const id of combo) map.set(id, (map.get(id) || 0) + 1);
  return [...map].map(([id, amount]) => ({ id, amount }));
}
