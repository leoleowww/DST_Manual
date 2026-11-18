import { createModel, cookingOutcomes, characterName as gameCharacter, stationName as gameStation, METHODS, title } from './domain.mjs';
import { icon } from './icons.mjs';
import { i18nReady, language, languages, setLanguage, t } from './i18n.mjs';
import { ruleHTML } from './recipe-rules.mjs';

const main = document.querySelector('#main');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const msg = (key, values) => escape(t(key, values));
const characterName = recipe => {
  const name = gameCharacter(recipe);
  return name && t(name);
};
const countLabel = (key, count) => msg(key, { count });
const stationName = tech => t(gameStation(tech));
const dateFormat = () => new Intl.DateTimeFormat(language(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Taipei' });
const routeLink = (section, id) => `#${section}${id ? `/${encodeURIComponent(id)}` : ''}`;
const state = {
  food: { query: '', method: 'base', diet: 'all', availability: 'all', sort: 'name', direction: 'asc', showSpecial: false, limit: 60 },
  craft: { query: '', category: 'all', limit: 36 },
  cooker: 'cookpot', explorerId: 'tomato', foodScroll: 0, from: '#foods', quantity: 1,
};
let data, model, art = new Set(), usesPromise, chinese, chinesePromise;
const localizedItems = () => language() === 'zh-TW' ? chinese?.items : undefined;

function loadChinese() {
  if (language() !== 'zh-TW' || chinese) return Promise.resolve();
  if (!chinesePromise) chinesePromise = fetch('/data/zh-TW.json').then(async response => {
    if (!response.ok) throw new Error('Could not load the Traditional Chinese game text.');
    chinese = await response.json();
  }).catch(error => {
    chinesePromise = undefined;
    console.error(error);
  });
  return chinesePromise;
}

function renderShell() {
  document.documentElement.lang = language();
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.dataset.i18n ||= element.textContent;
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll('[data-i18n-label]')) {
    element.dataset.i18nLabel ||= element.getAttribute('aria-label');
    element.setAttribute('aria-label', t(element.dataset.i18nLabel));
  }
  for (const select of document.querySelectorAll('[data-language]')) select.value = language();
  if (data) {
    document.querySelector('#sidebar-version').textContent = t('Build {{build}} · {{date}}', {
      build: data.meta.build, date: dateFormat().format(new Date(data.meta.sourceDate)),
    });
  }
}

function recipeRules(rule, combo) {
  return ruleHTML(rule, combo, { data, artHTML, name: model.name, msg, escape, number });
}

function artHTML(id, extraClass = '') {
  const key = data.items[id]?.icon || id;
  if (art.has(key)) return `<img class="item-art ${extraClass}" src="/assets/items/${encodeURIComponent(key)}.png" alt="" width="48" height="48" loading="lazy" decoding="async">`;
  return `<span class="item-art item-placeholder ${extraClass}" aria-hidden="true">${icon('leaf')}</span>`;
}

function number(value, signed = true) {
  if (!Number.isFinite(value)) return '—';
  const n = new Intl.NumberFormat(language(), { maximumFractionDigits: 3 }).format(Math.abs(value));
  return `${value < 0 ? '−' : signed && value > 0 ? '+' : ''}${n}`;
}

function statHTML(food, stat, label = false) {
  const value = food[stat];
  return `<span class="stat-${stat}${value < 0 ? ' negative' : value === 0 ? ' zero' : ''}">${label ? icon(stat) : ''}${number(value)}${stat === 'health' && food.delayedHealth ? `<span class="stat-asterisk" title="${msg('Also restores {{health}} health over {{seconds}} seconds', { health: number(food.delayedHealth, false), seconds: food.delayedSeconds })}">*</span>` : ''}</span>`;
}

function inlineStats(id) {
  const food = data.foods[id];
  return food ? `<div class="inline-stats" aria-label="${msg('Hunger {{hunger}}, sanity {{sanity}}, health {{health}}', food)}">${['hunger', 'sanity', 'health'].map(stat => statHTML(food, stat, true)).join('')}</div>` : '';
}

function tag(text, type = '') { return `<span class="tag ${type}">${msg(text)}</span>`; }

function foodSubtitle(food) {
  const parts = [METHODS[food.method]];
  if (food.character === 'warly') parts.push('Warly recipe');
  else if (food.event) parts.push('Event');
  if (food.specialDiet) parts.push(food.diet === 'roughage' ? 'Beefalo food' : 'Special diet');
  if (food.delayedHealth) parts.push(t("+{{health}} health over time", { health: food.delayedHealth }));
  return parts.map(part => t(part)).join(' · ');
}

function recipeTags(recipe) {
  return [characterName(recipe) ? tag(characterName(recipe), 'accent') : '', recipe.builder_skill ? tag('Skill required') : '', recipe.event ? tag('Seasonal event', 'warning') : '', recipe.placementRestricted ? tag('Placement rule') : '', recipe.dynamicYield ? tag('Variable yield') : ''].join('');
}

function pageHeading(heading, description, extra = '') {
  return `<div class="page-heading"><div><h1>${msg(heading)}</h1><p>${msg(description)}</p></div>${extra ? `<span class="heading-extra">${extra}</span>` : ''}</div>`;
}

function searchHTML(id, placeholder, value = '', label = 'Search') {
  return `<div class="search-field">${icon('search')}<label class="sr-only" for="${id}">${msg(label)}</label><input id="${id}" type="search" placeholder="${msg(placeholder)}" value="${escape(value)}" autocomplete="off" spellcheck="false"><button class="icon-button" type="button" data-clear="${id}" aria-label="${msg("Clear search")}" ${value ? '' : 'hidden'}>${icon('close')}</button></div>`;
}

function quickIngredients(compact = false) {
  const picks = [{ id: 'tomato', label: 'Tomato' }, { id: 'tallbirdegg', label: 'Tallbird Egg' }, { id: 'honey', label: 'Honey' }];
  if (compact) return `<div class="quick-chips"><span>${msg("Try")}</span>${picks.map(p => `<a class="quick-chip" href="${routeLink('explore', p.id)}">${artHTML(p.id)}${msg(p.label)}</a>`).join('')}</div>`;
  return picks.map(p => `<a class="quick-ingredient" href="${routeLink('explore', p.id)}">${artHTML(p.id)}<span>${msg(p.label)}<small>${msg("Trace recipes & preparation")}</small></span>${icon('chevron')}</a>`).join('');
}

function markNavigation(section) {
  const active = section === 'food' ? 'foods' : section;
  for (const link of document.querySelectorAll('[data-nav]')) {
    if (link.dataset.nav === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    if (link.dataset.nav === 'explore') link.href = routeLink('explore', state.explorerId);
  }
}

function renderFoodTable() {
  const selected = state.food;
  const methods = [['base', 'Base foods'], ['crockpot', 'Crock Pot'], ['raw', 'Raw'], ['roasted', 'Roasted'], ['dried', 'Dried'], ['crafted', 'Crafted'], ['seasoned', 'Seasoned'], ['all', 'All variants']];
  main.innerHTML = `${pageHeading('Food table', 'Know what’s worth a bite.', `${icon('check')} ${msg('DST only · Build {{build}}', { build: data.meta.build })}`)}
    <div class="food-layout"><div class="food-primary">
      ${searchHTML('food-search', 'Search food, e.g. pierogi or tomato', selected.query, 'Search all food')}
      <div class="filter-top"><div class="method-tabs" role="group" aria-label="${msg("Preparation method")}">${methods.map(([key, label]) => `<button type="button" data-method="${key}" aria-pressed="${selected.method === key}">${msg(label)}</button>`).join('')}</div>
        <details class="filters-disclosure" id="food-filters"><summary aria-label="${msg("More food filters")}">${icon('filter')}<span class="filters-label">${msg("Filters")}</span></summary></details>
      </div>
      <div class="filters-panel" id="food-filter-panel" hidden>
        <label class="field-label">${msg("Food type")}<select id="food-diet">${[['all', 'All food types'], ['meat', 'Meat'], ['veggie', 'Vegetarian'], ['goodies', 'Goodies'], ['seeds', 'Seeds'], ['raw', 'Raw food type'], ['roughage', 'Beefalo food'], ['elemental', 'Elemental']].map(([key, label]) => `<option value="${key}" ${key === selected.diet ? 'selected' : ''}>${msg(label)}</option>`).join('')}</select></label>
        <label class="field-label">${msg("Availability")}<select id="food-availability">${[['all', 'All availability'], ['everyday', 'No character / event recipe'], ['warly', 'Warly recipes'], ['event', 'Seasonal events']].map(([key, label]) => `<option value="${key}" ${key === selected.availability ? 'selected' : ''}>${msg(label)}</option>`).join('')}</select></label>
        <label class="checkbox-label"><input id="food-special" type="checkbox" ${selected.showSpecial ? 'checked' : ''}>${msg("Include Beefalo and other special-diet foods")}</label>
        <p class="filter-note">${msg("Warly labels describe who can prepare a dish. Other survivors can eat it if their diet allows.")}</p>
      </div>
      <div class="table-toolbar"><span id="food-count" role="status"></span><span class="sort-description" id="food-sort-label"></span></div>
      <table class="food-table" aria-label="${msg("Food nutrition, fresh baseline values")}"><thead><tr>${['name', 'hunger', 'sanity', 'health'].map((stat, i) => `<th scope="col" data-column="${stat}" class="${i ? 'numeric-col' : ''}" aria-sort="none"><button type="button" data-sort="${stat}">${i ? icon(stat, 'stat-icon stat-' + stat) : ''}<span>${msg(title(stat === 'name' ? 'Food' : stat))}</span>${icon('down', 'sort-icon')}</button></th>`).join('')}</tr></thead><tbody id="food-rows"></tbody></table>
      <div id="food-empty"></div><div id="food-more"></div>
      <p class="table-footnote">${msg("Fresh food, per serving, before survivor modifiers. Values show immediate restoration; * marks additional healing over time. Base foods exclude seasoning variants.")}</p>
    </div><aside class="food-aside" aria-label="${msg("More ways to explore")}">
      <div class="aside-block"><h2>${msg("Start with what")}<br>${msg("you have.")}</h2><p>${msg("One ingredient. Every possibility.")}<br>${msg("Follow it from your inventory to your next meal.")}</p></div>
      <div class="aside-block">${quickIngredients()}<a class="text-button" href="#explore/tomato">${msg("Open ingredient explorer")} ${icon('arrow')}</a></div>
      <div class="aside-callout">${icon('tree')}<p><strong>${msg("There’s more than one path.")}</strong><br>${msg("Roast, dry, refine, or season an item to discover what it can become.")}</p></div>
      <div class="aside-block"><h3>${msg("Building something?")}</h3><p>${msg("Unpack a recipe into its base materials, with quantities and crafting stations.")}</p><a class="text-button" href="#craft/cookpot">${msg("Plan a Crock Pot")} ${icon('arrow')}</a></div>
    </aside></div>`;
  renderFoodRows();
}

function renderFoodRows() {
  const foods = model.foods(state.food);
  const visible = foods.slice(0, state.food.limit);
  document.querySelector('#food-rows').innerHTML = visible.map(food => `<tr><td><a class="food-name-link" href="${routeLink('food', food.id)}" data-open-food="${escape(food.id)}">${artHTML(food.id)}<span class="food-label"><span class="name">${escape(model.name(food.id))}</span><span class="food-subtitle">${escape(foodSubtitle(food))}</span></span></a></td>${['hunger', 'sanity', 'health'].map(stat => `<td>${statHTML(food, stat)}</td>`).join('')}</tr>`).join('');
  document.querySelector('#food-count').textContent = t(state.food.query ? 'foodsFound' : 'foods', { count: foods.length });
  document.querySelector('#food-sort-label').innerHTML = `${icon('sort')}${state.food.sort === 'name' ? msg(state.food.direction === 'asc' ? 'A to Z' : 'Z to A') : `${msg(title(state.food.sort))} · ${msg(state.food.direction === 'desc' ? 'high to low' : 'low to high')}`}`;
  for (const th of document.querySelectorAll('[data-column]')) {
    const selected = th.dataset.column === state.food.sort;
    th.setAttribute('aria-sort', selected ? (state.food.direction === 'asc' ? 'ascending' : 'descending') : 'none');
    th.querySelector('.sort-icon').outerHTML = icon(selected && state.food.direction === 'asc' ? 'up' : 'down', 'sort-icon');
    const column = t(th.dataset.column === 'name' ? 'food name' : title(th.dataset.column));
    const direction = t(state.food.direction === 'asc' ? 'ascending' : 'descending');
    th.querySelector('button').setAttribute('aria-label', selected
      ? t('Sort by {{column}}, currently {{direction}}', { column, direction })
      : t('Sort by {{column}}', { column }));
  }
  document.querySelector('#food-empty').innerHTML = foods.length ? '' : `<div class="empty-state">${icon('search')}<h3>${msg("No foods match those filters.")}</h3><p>${msg("Try an ingredient name, another preparation method, or clear the filters.")}</p><button class="button" data-reset-food type="button">${msg("Clear search & filters")}</button></div>`;
  document.querySelector('#food-more').innerHTML = visible.length < foods.length ? `<button class="button more-button" data-more-food type="button">${msg('Show {{more}} more foods', { more: Math.min(60, foods.length - visible.length) })} <span class="muted">(${msg('{{visible}} of {{total}}', { visible: visible.length, total: foods.length })})</span>${icon('down')}</button>` : '';
  document.querySelector('[data-clear="food-search"]').hidden = !state.food.query;

}

function comboHTML(combo, selected) {
  return `<div class="combo" aria-label="${msg("Four-slot recipe")}">${combo.map(id => `<a class="combo-item ${id === selected ? 'selected' : ''}" href="${routeLink('explore', id)}">${artHTML(id)}<span>${escape(model.name(id))}</span></a>`).join('')}</div>`;
}

function outcomeNote(combo, cooker) {
  const outcomes = cookingOutcomes(combo, data, cooker);
  if (outcomes.length < 2) return '';
  return `<div class="outcome-note">${icon('info')}<span>${msg('Shared priority: {{outcomes}}. This combination can produce any of these results.', { outcomes: outcomes.map(o => `${model.name(o.id)} (${Math.round(o.probability * 100)}%)`).join(', ') })}</span></div>`;
}

function verifiedExample(id, cooker) {
  const recipe = data.recipes[id];
  if (recipe?.example?.length === 4) {
    const outcomes = cookingOutcomes(recipe.example, data, cooker);
    if (outcomes.some(o => o.id === id)) return recipe.example;
  }
  for (const recipes of Object.values(model.uses[cooker] || {})) if (recipes[id]) return recipes[id].combo;
  return null;
}

function sourceLinks(id, recipe = data.recipes[id]) {
  const source = recipe ? `${recipe.source}#L${recipe.line}` : data.foods[id]?.base ? 'spicedfoods.lua' : 'screens/redux/scrapbookdata.lua';
  const url = `https://github.com/${data.meta.repository}/blob/${data.meta.revision}/${source}`;
  return `<div class="source-links"><a href="${escape(url)}" target="_blank" rel="noopener">${msg("Game source")} ${icon('external')}</a><a href="https://dontstarve.wiki.gg/wiki/${encodeURIComponent((data.items[id]?.name || title(id)).replace(/ /g, '_'))}" target="_blank" rel="noopener">${msg("Read more on the wiki")} ${icon('external')}</a></div>`;
}

function renderFoodDetail(id) {
  const item = data.items[id], food = data.foods[id], recipe = data.recipes[id];
  if (!item) { renderMissing(); return; }
  const cooker = recipe?.station === 'portablecookpot' ? 'portablecookpot' : 'cookpot';
  const combo = recipe ? verifiedExample(id, cooker) : null;
  const returnTo = state.from && !state.from.startsWith('#food/') ? state.from : '#foods';
  const returnLabel = returnTo.startsWith('#explore') ? 'Back to ingredient tree' : returnTo.startsWith('#craft') ? 'Back to crafting' : 'Back to food table';
  const parents = data.transforms.filter(t => t.to === id);
  const parent = parents.find(t => !t.extra || data.foods[t.from]);
  const foodCrafts = model.byProduct.get(id) || [];
  main.innerHTML = `<a class="back-link" href="${escape(returnTo)}">${icon('back')}${msg(returnLabel)}</a>
    <div class="item-heading">${artHTML(id)}<div><h1>${escape(model.name(id))}</h1><p>${food ? msg(METHODS[food.method]) + ' · ' + msg(title(food.diet)) : msg('Crock Pot result')}${id === 'tomato' && language() === 'en' ? ' · also called Tomato' : ''}</p><div class="tags">${food?.character === 'warly' ? tag('Warly prepares this', 'accent') : ''}${food?.event ? tag('Seasonal event', 'warning') : ''}${food?.specialDiet ? tag(food.diet === 'roughage' ? 'For Beefalo' : 'Special diet', 'warning') : ''}${recipe?.station === 'portablecookpot' ? tag('Portable Crock Pot') : ''}</div></div></div>
    <div class="detail-layout"><div class="detail-primary">
      ${food ? `<div class="nutrition-strip">${['hunger', 'sanity', 'health'].map(stat => `<div class="nutrition-item stat-${stat}"><span>${icon(stat)}${msg(title(stat))}</span><strong class="${food[stat] < 0 ? 'negative' : ''}">${number(food[stat])}</strong><small>${stat === 'health' && food.delayedHealth ? msg('+{{health}} over {{seconds}}s', { health: food.delayedHealth, seconds: food.delayedSeconds }) : msg('immediate')}</small></div>`).join('')}</div>` : ''}
      ${recipe ? `<section class="section"><div class="section-subheading"><h2>${msg("Make it in the pot")}</h2><span>${msg(cooker === 'portablecookpot' ? 'Portable Crock Pot' : 'Crock Pot')}</span></div>${combo ? `<p class="combo-label">${msg("One verified combination · tap any ingredient to trace its uses")}</p>${comboHTML(combo)}${outcomeNote(combo, cooker)}` : `<p>${msg("No verified example is available in this dataset.")}</p>`}<details class="rules"><summary>${icon('chevron')}${msg("Recipe requirements")}</summary>${recipeRules(recipe.rule, combo)}<p>${msg('Priority {{priority}}. Higher-priority matches take precedence.', { priority: recipe.priority })}</p></details></section>` : ''}
      ${parent ? `<section class="section"><h2>${msg(parent.method === 'Season' ? 'Season this dish' : 'Prepare it')}</h2><ul class="material-list"><li class="material-row">${artHTML(parent.from)}<a href="${routeLink('food', parent.from)}" data-open-food="${escape(parent.from)}">${escape(model.name(parent.from))}</a><strong>× 1</strong></li>${parent.extra ? `<li class="material-row">${artHTML(parent.extra)}<a href="${routeLink('explore', parent.extra)}">${escape(model.name(parent.extra))}</a><strong>× 1</strong></li>` : ''}</ul><p class="combo-caption">${msg('{{method}} at a {{station}}', { method: t(parent.method), station: t(parent.station) })}${parent.character ? ' · ' + msg('Warly required') : ''}.</p></section>` : ''}
      ${foodCrafts.length ? `<section class="section"><h2>${msg("Craft this item")}</h2><p>${msg("Open a crafting recipe to see ingredients, quantities, and required skills.")}</p>${foodCrafts.map(r => `<a class="text-button" href="${routeLink('craft', r.id)}">${escape(characterName(r) ? characterName(r) + ' · ' : '')}${escape(stationName(r.tech))} ${icon('arrow')}</a>`).join('')}</section>` : ''}
      ${food?.effect ? `<section class="section"><h2>${msg("Extra effects")}</h2><p>${escape((language() === 'zh-TW' && chinese?.effects[food.effect]) || food.effect)}${food.delayedHealth ? `. ${msg('Restores {{immediate}} health immediately, then {{health}} more over {{seconds}} seconds.', { immediate: food.health, health: food.delayedHealth, seconds: food.delayedSeconds })}` : '.'}</p></section>` : ''}
      <section class="section"><h2>${msg("Where does it lead?")}</h2><p>${msg("See every recorded recipe using this item, including paths through preparation and crafting.")}</p><a class="text-button" href="${routeLink('explore', id)}">${msg("Trace ingredient uses")} ${icon('arrow')}</a></section>
      ${sourceLinks(id)}
    </div><aside class="detail-aside"><h2>${msg("Field notes")}</h2><dl class="fact-list">
      ${food ? `<div><dt>${msg("Spoilage")}</dt><dd>${food.perish ? msg('{{days}} game days', { days: number(food.perish / 480, false) }) : msg('Does not spoil')}</dd></div>` : ''}
      ${recipe ? `<div><dt>${msg("Cook time")}</dt><dd>${msg('{{seconds}} seconds', { seconds: number(recipe.cooktime, false) })}</dd></div><div><dt>${msg("Output")}</dt><dd>${countLabel('servings', recipe.yield)}</dd></div>` : ''}
      <div><dt>${msg("Game")}</dt><dd>${msg("Don’t Starve Together")}</dd></div></dl>
      <p>${msg("Fresh baseline values, before survivor bonuses, penalties, or food-memory effects. A game day is 480 seconds.")}</p>
      ${food?.specialDiet ? `<div class="outcome-note">${icon('info')}<span>${msg(food.diet === 'roughage' ? 'This is Beefalo food. The values do not imply every survivor can eat it.' : 'This is a special-diet item. The values do not imply every survivor can eat it.')}</span></div>` : ''}
      <a class="button" href="${routeLink('explore', id)}">${icon('tree')}${msg("Explore this item")}</a>
    </aside></div>`;
}

function renderTree(id, ancestry = [id]) {
  if (ancestry.length > 4) return `<p class="cycle-note">${msg("Continue this path in")} <a href="${routeLink('explore', id)}">${msg('{{item}}’s ingredient tree', { item: model.name(id) })}</a>.</p>`;
  const transforms = model.transforms.get(id) || [];
  const recipes = model.directUses(id, state.cooker);
  const crafts = model.consumers.get(id) || [];
  const ancestryAttr = escape(ancestry.join(','));
  const prep = transforms.filter(t => t.method !== 'Season');
  const seasoning = transforms.filter(t => t.method === 'Season');
  const transformBranch = t => `<details class="branch" data-branch-kind="transform" data-item="${escape(id)}" data-target="${escape(t.to)}" data-method="${t.method}" data-extra="${escape(t.extra || '')}" data-station="${escape(t.station)}" data-ancestry="${ancestryAttr}"><summary>${artHTML(t.to)}<span class="branch-name"><strong>${escape(model.name(t.to))}</strong><small>${msg(t.method)} · ${msg(t.station)}${t.extra ? ' + ' + escape(model.name(t.extra)) : ''}${t.character ? ' · ' + msg('Warly') : ''}</small></span>${icon('chevron')}</summary><div class="branch-body"></div></details>`;
  const groups = [['named', 'Named ingredients', 'This item is named in the recipe'], ['value', 'Ingredient values', 'Contributes to a required food value'], ['filler', 'Filler & other uses', 'Fills a slot while the other ingredients meet the rules']];
  return `${prep.length || seasoning.length ? `<section class="tree-section"><div class="tree-section-title">${icon('fire')}<h3>${msg("Prepare first")} <span class="count">${countLabel('paths', transforms.length)}</span></h3></div><div class="tree-root-line">${prep.map(transformBranch).join('')}${seasoning.length ? `<details class="uses-group"><summary>${icon('chevron')}${msg("Seasoning paths")}<span class="count">${seasoning.length}</span></summary>${seasoning.map(transformBranch).join('')}</details>` : ''}</div></section>` : ''}
    ${recipes.length ? `<section class="tree-section"><div class="tree-section-title">${icon('pot')}<h3>${msg("Direct pot recipes")} <span class="count">${msg('{{count}} results', { count: recipes.length })}</span></h3></div><div class="tree-root-line">${groups.map(([key, label, explanation]) => {
      const entries = recipes.filter(r => r.type === key);
      return entries.length ? `<details class="uses-group" ${key === 'named' ? 'open' : ''}><summary title="${msg(explanation)}">${icon('chevron')}${msg(label)}<small>${countLabel('recipes', entries.length)}</small></summary>${entries.map(({ recipe, witness }) => `<details class="branch" data-branch-kind="recipe" data-item="${escape(id)}" data-target="${escape(recipe.id)}" data-ancestry="${ancestryAttr}"><summary>${artHTML(recipe.id)}<span class="branch-name"><strong>${escape(model.name(recipe.id))}</strong><small>${msg(witness.winners.length > 1 ? 'Shared priority · multiple outcomes' : recipe.station === 'portablecookpot' ? 'Warly · Portable Crock Pot' : 'Crock Pot')}${data.foods[recipe.id]?.specialDiet ? ' · ' + msg('Special diet') : ''}${recipe.id === 'wetgoop' ? ' · ' + msg('Failed dish') : ''}</small></span>${icon('chevron')}</summary><div class="branch-body"></div></details>`).join('')}</details>` : '';
    }).join('')}</div></section>` : ''}
    ${crafts.length ? `<section class="tree-section"><div class="tree-section-title">${icon('hammer')}<h3>${msg("Crafting uses")} <span class="count">${countLabel('recipes', crafts.length)}</span></h3></div><div class="tree-root-line">${crafts.slice().sort((a, b) => model.name(a.product).localeCompare(model.name(b.product), language())).map(r => `<details class="branch" data-branch-kind="craft" data-item="${escape(id)}" data-target="${escape(r.product)}" data-recipe="${escape(r.id)}" data-ancestry="${ancestryAttr}"><summary>${artHTML(r.product)}<span class="branch-name"><strong>${escape(model.name(r.product))}${r.yield > 1 ? ' × ' + r.yield : ''}</strong><small>${escape(characterName(r) ? characterName(r) + ' · ' : '')}${escape(stationName(r.tech))}${r.event ? ' · ' + msg('Event') : ''}</small></span>${icon('chevron')}</summary><div class="branch-body"></div></details>`).join('')}</div></section>` : ''}
    ${!transforms.length && !recipes.length && !crafts.length ? `<p class="info-note">${icon('info')}${msg("No further recipe uses are recorded for this item. Creature feeding, loot, and farming chains aren’t included.")}</p>` : ''}`;
}

function branchBody(details) {
  if (!details.open || details.dataset.loaded) return;
  const { branchKind, item, target, recipe: craftId, method, extra, station } = details.dataset;
  const ancestry = details.dataset.ancestry.split(',');
  let content = '';
  if (branchKind === 'recipe') {
    const recipe = data.recipes[target];
    const witness = model.uses[state.cooker]?.[item]?.[target];
    if (!witness) return;
    content = `<p class="combo-label">${msg("One verified combination · your item is highlighted")}</p>${comboHTML(witness.combo, item)}${outcomeNote(witness.combo, state.cooker)}${inlineStats(target)}<details class="rules"><summary>${icon('chevron')}${msg("Why this works")}</summary>${recipeRules(recipe.rule, witness.combo)}</details><div class="branch-actions"><a class="text-button" href="${routeLink('food', target)}" data-open-food="${escape(target)}">${msg(data.foods[target] ? 'View food stats' : 'View recipe')} ${icon('arrow')}</a><span class="muted combo-label">${msg('{{seconds}}s · makes {{yield}}', { seconds: number(recipe.cooktime, false), yield: recipe.yield })}</span></div>`;
  } else if (branchKind === 'transform') {
    content = `<p class="combo-caption">${msg(extra ? '{{method}} {{item}} with 1 × {{extra}} at a {{station}}.' : '{{method}} {{item}} at a {{station}}.', { method: t(method), item: model.name(item), extra: extra && model.name(extra), station: t(station) })}</p>${inlineStats(target)}<a class="text-button" href="${routeLink('food', target)}" data-open-food="${escape(target)}">${msg("View food details")} ${icon('arrow')}</a>`;
  } else if (branchKind === 'craft') {
    const recipe = model.byCraftId.get(craftId);
    content = `${materialList(recipe.ingredients.map(i => ({ id: i.item, amount: i.amount })))}<div class="tags">${recipeTags(recipe)}</div><a class="text-button" href="${routeLink('craft', craftId)}">${msg("Expand crafting requirements")} ${icon('arrow')}</a>`;
  }
  if (ancestry.includes(target)) content += `<p class="cycle-note">${msg('This returns to {{item}}, already in this path.', { item: model.name(target) })}</p>`;
  else content += `<div class="deeper-tree"><h4>${msg('Then, from {{item}}…', { item: model.name(target) })}</h4>${renderTree(target, [...ancestry, target])}</div>`;
  details.querySelector(':scope > .branch-body').innerHTML = content;
  details.dataset.loaded = 'true';
}

function renderExplorer(id) {
  if (!data.items[id]) { renderMissing(); return; }
  state.explorerId = id;
  const directCount = model.directUses(id, state.cooker).length;
  main.innerHTML = `${pageHeading('Ingredient explorer', 'Follow what you have to what you can make.')}
    <div class="explorer-search">${searchHTML('ingredient-search', 'Find an ingredient or material…', '', 'Search ingredients and materials')}<div id="ingredient-results" class="search-results" hidden></div>${quickIngredients(true)}</div>
    <div class="explorer-layout"><div class="detail-primary">
      <div class="tree-controls"><p>${msg("Tap a branch to follow the recipe.")}</p><label class="sr-only" for="explorer-cooker">${msg("Cooking station")}</label><select class="select-control" id="explorer-cooker"><option value="cookpot" ${state.cooker === 'cookpot' ? 'selected' : ''}>${msg("Crock Pot")}</option><option value="portablecookpot" ${state.cooker === 'portablecookpot' ? 'selected' : ''}>${msg("Warly’s Portable Pot")}</option></select></div>
      <div class="explorer-heading">${artHTML(id)}<div><h2>${escape(model.name(id))}</h2><p>${id === 'tomato' && language() === 'en' ? 'Tomato · ' : ''}${msg('{{pot}} direct pot recipes · {{prep}} preparation paths · {{craft}} crafting uses', { pot: directCount, prep: model.transforms.get(id)?.length || 0, craft: model.consumers.get(id)?.length || 0 })}</p></div></div>
      <div id="ingredient-tree">${renderTree(id)}</div>
    </div><aside class="detail-aside"><h2>${msg("Read the branches")}</h2><p>${msg("Open a result for its ingredients. Keep expanding to follow preparation and crafting into new recipes.")}</p><div class="legend"><div>${tag('Named', 'accent')}<p>${msg("The recipe calls for this item or its prepared form.")}</p></div><div>${tag('Value')}<p>${msg("Your ingredient supplies a required food value, such as vegetable or egg.")}</p></div><div>${tag('Filler')}<p>${msg("It fills a slot while other ingredients meet the recipe’s conditions.")}</p></div></div><div class="info-note">${icon('info')}${msg("A Tallbird Egg counts as 4 egg value. Different items can contribute different amounts.")}</div><p>${msg("Every pot example has four slots and respects recipe priorities. Tied outcomes are marked.")}</p><a class="text-button" href="#about">${msg("About the recipe data")} ${icon('arrow')}</a></aside></div>`;
}

function renderIngredientResults(query) {
  const container = document.querySelector('#ingredient-results');
  if (!container) return;
  container.hidden = !query.trim();
  document.querySelector('[data-clear="ingredient-search"]').hidden = !query;
  if (!query.trim()) return;
  const matches = model.items(query, { ingredientsOnly: true }).slice(0, 10);
  container.innerHTML = matches.length ? matches.map(id => `<a class="search-result" href="${routeLink('explore', id)}">${artHTML(id)}<span>${escape(model.name(id))}<small>${escape(id === 'tomato' && language() === 'en' ? 'Tomato · ' : '')}${msg('{{pot}} pot recipes · {{craft}} crafting uses', { pot: model.directUses(id, state.cooker).length, craft: model.consumers.get(id)?.length || 0 })}</small></span>${icon('chevron')}</a>`).join('') : `<div class="empty-state"><h3>${msg("No matching ingredient.")}</h3><p>${msg("Try a game item name, such as Tallbird Egg, logs, or rope.")}</p></div>`;
}

function renderCraftList() {
  main.innerHTML = `${pageHeading('Crafting & building', 'Big plans start with the right materials.', `${icon('hammer')}${countLabel('recipes', data.crafts.length)}`)}
    <div class="craft-toolbar">${searchHTML('craft-search', 'Search a recipe, item, or building…', state.craft.query, 'Search crafting recipes')}<label class="sr-only" for="craft-category">${msg("Crafting category")}</label><select class="select-control" id="craft-category">${[['all', 'All recipes'], ['STRUCTURES', 'Structures'], ['REFINE', 'Refining'], ['COOKING', 'Cooking'], ['TOOLS', 'Tools'], ['PROTOTYPERS', 'Crafting stations'], ['CONTAINERS', 'Containers'], ['GARDENING', 'Gardening'], ['WEAPONS', 'Weapons'], ['ARMOUR', 'Armour'], ['CLOTHING', 'Clothing'], ['MAGIC', 'Magic'], ['CHARACTER', 'Character recipes'], ['LIGHT', 'Light'], ['DECOR', 'Decor']].map(([key, label]) => `<option value="${key}" ${key === state.craft.category ? 'selected' : ''}>${msg(label)}</option>`).join('')}</select></div>
    <div class="table-toolbar"><span id="craft-count" role="status"></span><a class="text-button" href="#explore/boards">${msg("Have a material? Find its uses")} ${icon('arrow')}</a></div><div id="craft-rows" class="craft-list"></div><div id="craft-more"></div>`;
  renderCraftRows();
}

function renderCraftRows() {
  const recipes = data.crafts.filter(r => (model.matches(r.product, state.craft.query) || r.id.toLowerCase().includes(state.craft.query.trim().toLowerCase())) && (state.craft.category === 'all' || r.categories.includes(state.craft.category))).sort((a, b) => model.name(a.product).localeCompare(model.name(b.product), language()) || a.id.localeCompare(b.id));
  const visible = recipes.slice(0, state.craft.limit);
  document.querySelector('#craft-rows').innerHTML = visible.map(r => `<a class="craft-row" href="${routeLink('craft', r.id)}">${artHTML(r.product)}<span><strong>${escape(model.name(r.product))}${r.yield > 1 ? ' × ' + r.yield : ''}</strong><small>${escape(characterName(r) ? characterName(r) + ' · ' : '')}${escape(stationName(r.tech))}${r.event ? ' · ' + msg('Event') : ''}</small></span>${icon('chevron')}</a>`).join('') || `<div class="empty-state"><h3>${msg("No recipes match.")}</h3><p>${msg("Try a shorter name or choose All recipes.")}</p><button class="button" data-reset-craft>${msg("Clear search & category")}</button></div>`;
  document.querySelector('#craft-count').textContent = t('recipes', { count: recipes.length });
  document.querySelector('#craft-more').innerHTML = visible.length < recipes.length ? `<button class="button more-button" data-more-craft type="button">${msg('Show {{more}} more recipes', { more: Math.min(36, recipes.length - visible.length) })} <span class="muted">(${msg('{{visible}} of {{total}}', { visible: visible.length, total: recipes.length })})</span>${icon('down')}</button>` : '';
  document.querySelector('[data-clear="craft-search"]').hidden = !state.craft.query;
}

function materialList(materials) {
  return `<ul class="material-list">${materials.map(r => `<li class="material-row">${artHTML(r.id)}<a href="${routeLink('explore', r.id)}">${escape(model.name(r.id))}</a><strong>${r.amount === 0 ? msg('Required tool') : '× ' + number(r.amount, false)}</strong></li>`).join('')}</ul>`;
}

function needsTree(recipe, quantity, ancestry = [], rootCharacter = gameCharacter(recipe)) {
  const batches = Math.ceil(quantity / recipe.yield);
  const ancestors = [...ancestry, recipe.id];
  if (!recipe.ingredients.length) return `<p class="needs-caption">${msg("This recipe has no consumed ingredient cost. Its station, unlock, or event requirements still apply.")}</p>`;
  return recipe.ingredients.map(i => {
    const amount = i.amount * batches;
    const sub = model.preferredRecipe(i.item, new Set(ancestors), rootCharacter);
    if (!sub) return materialList([{ id: i.item, amount }]);
    return `<details class="needs-branch" data-needs="${escape(sub.id)}" data-quantity="${amount}" data-ancestors="${escape(ancestors.join(','))}" data-root-character="${escape(rootCharacter || '')}"><summary>${artHTML(i.item)}<span>${escape(model.name(i.item))}</span><strong>× ${number(amount, false)}</strong>${icon('chevron')}</summary><div class="needs-content"></div></details>`;
  }).join('');
}

function needsBody(details) {
  if (!details.open || details.dataset.loaded) return;
  const recipe = model.byCraftId.get(details.dataset.needs);
  const quantity = Number(details.dataset.quantity);
  const ancestors = details.dataset.ancestors.split(',');
  let content = `<p class="needs-caption">${countLabel('crafts', Math.ceil(quantity / recipe.yield))} · ${msg('Makes {{yield}} per craft.', { yield: recipe.yield })} · ${escape(stationName(recipe.tech))}${characterName(recipe) ? ' · ' + escape(characterName(recipe)) : ''}</p>`;
  if (ancestors.length >= 5) content += `<a class="text-button" href="${routeLink('craft', recipe.id)}">${msg("Continue this dependency tree")} ${icon('arrow')}</a>`;
  else content += needsTree(recipe, quantity, ancestors, details.dataset.rootCharacter || null);
  content += `<a class="text-button" href="${routeLink('craft', recipe.id)}">${msg("View this recipe")} ${icon('arrow')}</a>`;
  details.querySelector(':scope > .needs-content').innerHTML = content;
  details.dataset.loaded = 'true';
}

function renderCraftDetail(id, keepQuantity = false) {
  const recipe = model.byCraftId.get(id);
  if (!recipe) { renderMissing(); return; }
  if (!keepQuantity) state.quantity = 1;
  const variants = model.byProduct.get(recipe.product) || [];
  main.innerHTML = `<a class="back-link" href="#craft">${icon('back')}${msg("Back to crafting")}</a>
    <div class="item-heading">${artHTML(recipe.product)}<div><h1>${escape(model.name(recipe.product))}</h1><p>${escape(localizedItems()?.[recipe.product]?.description || data.items[recipe.product]?.description || (recipe.structure ? t('Structure') : t(title(recipe.categories.find(c => c !== 'CHARACTER') || 'Crafting recipe'))))}</p><div class="tags">${tag(stationName(recipe.tech))}${recipeTags(recipe)}</div></div></div>
    <div class="quantity-bar"><label for="craft-quantity">${msg("How many do you need?")}</label><input type="number" id="craft-quantity" value="${state.quantity}" min="1" max="9999" step="1" inputmode="numeric" aria-describedby="quantity-help"><p id="quantity-help">${msg('Makes {{yield}} per craft.', { yield: recipe.yield })}</p><p class="quantity-error" id="quantity-error" role="alert" hidden></p></div>
    ${variants.length > 1 ? `<div class="variant-picker"><label for="craft-variant">${msg("Recipe variant")}</label><select class="select-control" id="craft-variant">${variants.map(r => `<option value="${escape(r.id)}" ${r.id === id ? 'selected' : ''}>${escape(characterName(r) ? characterName(r) + ' · ' : '')}${escape(stationName(r.tech))} · ${msg(r.id === r.product ? 'Standard recipe' : title(r.id))}</option>`).join('')}</select></div>` : ''}
    <div id="craft-math" data-craft-id="${escape(id)}"></div>
    <div class="section"><h2>${msg("What uses this?")}</h2><p>${msg("Follow this item into more recipes and refined materials.")}</p><a class="text-button" href="${routeLink('explore', recipe.product)}">${msg("Explore downstream uses")} ${icon('arrow')}</a></div>
    <div class="source-links"><a href="https://github.com/${data.meta.repository}/blob/${data.meta.revision}/recipes.lua" target="_blank" rel="noopener">${msg("Game crafting source")} ${icon('external')}</a></div>`;
  renderCraftMath(recipe);
}

function renderCraftMath(recipe) {
  const totals = model.materials(recipe, state.quantity);
  const count = Math.ceil(state.quantity / recipe.yield);
  const plans = data.construction[recipe.product];
  document.querySelector('#craft-math').innerHTML = `<div class="craft-details"><section class="section"><div class="section-subheading"><h2>${msg("Unpack the recipe")}</h2><span>${countLabel('crafts', count)}</span></div><p class="needs-caption">${msg("Expand an ingredient to see how it’s made.")}</p>${needsTree(recipe, state.quantity)}
    ${recipe.builder_skill ? `<p class="craft-detail-note">${msg('Required skill: {{skill}}.', { skill: title(recipe.builder_skill) })}</p>` : ''}
    ${recipe.placementRestricted ? `<p class="craft-detail-note">${msg("This recipe has placement conditions in the game. Check the ground or surrounding structures before building.")}</p>` : ''}
    ${recipe.nounlock ? `<p class="craft-detail-note">${msg("This recipe is not permanently learned by prototyping; its station or special unlock must remain available.")}</p>` : ''}
    ${plans ? `<section class="section"><h2>${msg("Construction stage")}</h2><p class="needs-caption">${msg("Additional materials for the construction project, separate from the initial craft:")}</p>${materialList(plans.map(i => ({ id: i.item, amount: i.amount })))}</section>` : ''}
    </section><aside class="totals-panel"><h2>${msg("Base materials")}</h2><p>${countLabel('materialItems', state.quantity)} ${msg('Shared batches and spare outputs are counted across the recipe.')}</p>${materialList(totals.materials)}
    ${totals.surplus.length ? `<h3>${msg("Left over")}</h3><p>${totals.surplus.map(r => `${number(r.amount, false)} × ${escape(model.name(r.id))}`).join(', ')}</p>` : ''}
    ${totals.stations.length ? `<h3>${msg("Stations & unlocks")}</h3><div class="tags">${totals.stations.map(s => tag(s)).join('')}</div><p>${msg("Stations are reusable; their construction costs are separate.")}</p>` : ''}
    ${totals.tools.length ? `<h3>${msg("Reusable tools")}</h3><p>${totals.tools.map(id => escape(model.name(id))).join(', ')} · ${msg('required, not consumed.')}</p>` : ''}
    ${totals.warnings.map(w => `<p class="craft-detail-note">${w.startsWith('Requires ') ? msg('Requires {{requirement}}.', { requirement: t(w.slice(9, -1)) }) : msg(w)}</p>`).join('')}
    </aside></div>`;
}

function renderAbout() {
  const date = dateFormat().format(new Date(data.meta.sourceDate));
  main.innerHTML = `<div class="about-content"><a class="back-link" href="#foods">${icon('back')}${msg("Back to the guide")}</a><h1>${msg("A field guide to the Constant.")}</h1><p>${msg("Compare a meal, follow an ingredient, or unpack a building. A compact reference for Don’t Starve Together, made for the moments between surviving.")}</p>
    <section class="section"><h2>${msg("Know your data")}</h2><dl class="fact-list"><div><dt>${msg("Game")}</dt><dd>${msg("Don’t Starve Together · release")}</dd></div><div><dt>${msg("Build")}</dt><dd>${escape(data.meta.build)}</dd></div><div><dt>${msg("Source snapshot")}</dt><dd>${escape(date)}</dd></div><div><dt>${msg("Source revision")}</dt><dd>${escape(data.meta.revision.slice(0, 12))}</dd></div><div><dt>${msg("Food variants")}</dt><dd>${Object.keys(data.foods).length}</dd></div><div><dt>${msg("Crafting recipes")}</dt><dd>${data.crafts.length}</dd></div><div><dt>${msg("Pot recipe rules")}</dt><dd>${Object.keys(data.recipes).length}</dd></div><div><dt>${msg("Four-slot combinations checked")}</dt><dd>${new Intl.NumberFormat(language()).format(data.meta.multisets)}</dd></div></dl><p class="craft-detail-note">${msg("This is a versioned snapshot, not a live connection to the game. Updates after this build may change values or add recipes.")}</p><div class="source-links"><a href="https://github.com/${data.meta.repository}/tree/${data.meta.revision}" target="_blank" rel="noopener">${msg("Browse the pinned game source")} ${icon('external')}</a></div></section>
    <section class="section"><h2>${msg("What the numbers mean")}</h2><p>${msg("Food values are for fresh food, per serving, before survivor-specific bonuses, penalties, or Warly’s food memory. Immediate health is used for health sorting. Jellybeans show their additional healing separately. One game day is 480 seconds.")}</p><p>${msg("Base foods hide seasoning variants. Choose All variants to include them, or Seasoned to compare them on their own. Beefalo and special-diet items are available through the food filters.")}</p><p>${msg("Warly labels describe who can prepare a recipe, not who can eat the dish. Each survivor’s dietary restrictions still apply.")}</p></section>
    <section class="section"><h2>${msg("How the paths work")}</h2><p>${msg("Every pot result has a valid four-slot example containing your selected ingredient. The guide checks the highest matching recipe priority for the selected pot. When multiple recipes tie, it shows every possible outcome and its weighted chance.")}</p><p>${msg("Ingredient classes are equivalent only when their named uses and all relevant food values match. The importer checks every four-slot combination of those classes, including repeated ingredients. Raw and prepared forms remain distinct when their recipe behavior differs.")}</p><p>${msg("Crafting totals use baseline yields, share surplus between repeated dependencies, and stop conversion cycles. Reusable stations are listed separately. Character skill effects, placement conditions, and variable output are flagged.")}</p></section>
    <section class="section"><h2>${msg("Coverage & limits")}</h2><ul class="coverage-list">${data.meta.coverage.map(line => `<li>${msg(line)}</li>`).join('')}</ul><p>${msg("Standard recipes in")} <a href="https://github.com/${data.meta.repository}/blob/${data.meta.revision}/recipes.lua" target="_blank" rel="noopener">recipes.lua</a> ${msg("are included. Event menus and character skills may require additional in-game context. Construction-stage costs are shown separately where the source provides a flat construction plan.")}</p></section>
    <section class="section"><h2>${msg("Credits")}</h2><p>${msg("Don’t Starve Together, its item artwork, and game data belong to Klei Entertainment. This is an unofficial fan reference and is not affiliated with Klei.")}</p><p>${msg("Game scripts are sourced from the")} <a href="https://github.com/${data.meta.repository}" target="_blank" rel="noopener">${msg("CN-DST-DEVELOPER archive")}</a>. ${msg("Original inventory artwork is mirrored from")} <a href="https://github.com/fankimm/dst-craft" target="_blank" rel="noopener">fankimm/dst-craft</a>. ${msg("Fonts: DM Sans and Fraunces, distributed under the SIL Open Font License.")}</p></section>
    <a class="text-button" href="#foods">${msg("Back to the food table")} ${icon('arrow')}</a></div>`;
}

function renderMissing() {
  main.innerHTML = `<div class="empty-state">${icon('question')}<h1>${msg("That page wandered off.")}</h1><p>${msg("The item may not be in this snapshot. Search the guide to find it.")}</p><a class="button" href="#foods">${msg("Open the food table")}</a></div>`;
}

async function loadUses() {
  if (Object.keys(model.uses).length) return;
  if (!usesPromise) usesPromise = fetch('/data/uses.json').then(async r => {
    if (!r.ok) throw new Error('The ingredient paths could not be loaded.');
    model.uses = await r.json();
  }).catch(error => { usesPromise = undefined; throw error; });
  await usesPromise;
}

let renderGeneration = 0;
async function renderRoute({ restoreScroll = false, switchingLanguage = false } = {}) {
  if (!model) return;
  const generation = ++renderGeneration;
  let [section = 'foods', encoded] = location.hash.slice(1).split('/');
  let id;
  try { id = encoded ? decodeURIComponent(encoded) : null; } catch { renderMissing(); return; }
  if (!section) section = 'foods';
  markNavigation(section);
  document.title = `${id && data.items[id] ? model.name(id) : t({ foods: 'Food table', explore: 'Ingredient explorer', craft: 'Crafting & building', about: 'About this guide' }[section] || 'Field guide')} — ${t('The Constant')}`;
  if (section === 'explore' || (section === 'food' && data.recipes[id])) {
    if (!Object.keys(model.uses).length) main.innerHTML = `${pageHeading(section === 'explore' ? 'Ingredient explorer' : model.name(id), 'Opening the recipe paths…')}<div class="loading-state" role="status"><div class="loading-row"></div><div class="loading-row"></div></div>`;
    try { await loadUses(); } catch {
      if (generation !== renderGeneration) return;
      main.innerHTML = `<div class="error-content"><h1>${msg("The paths couldn’t load.")}</h1><p>${msg("Check your connection and try again. The food table is still available.")}</p><button class="button primary" data-retry-paths type="button">${msg("Try again")}</button><a class="text-button" href="#foods">${msg("Open food table")} ${icon('arrow')}</a></div>`;
      return;
    }
  }
  if (generation !== renderGeneration) return;
  if (section === 'foods') renderFoodTable();
  else if (section === 'food' && id) renderFoodDetail(id);
  else if (section === 'explore') renderExplorer(id || state.explorerId);
  else if (section === 'craft' && id) renderCraftDetail(id, switchingLanguage);
  else if (section === 'craft') renderCraftList();
  else if (section === 'about') renderAbout();
  else renderMissing();
  markNavigation(section);
  if (switchingLanguage) return;
  if (restoreScroll && section === 'foods') requestAnimationFrame(() => window.scrollTo(0, state.foodScroll));
  else window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest('.skip-link')) { event.preventDefault(); main.focus(); return; }
  const button = event.target.closest('button');
  const foodLink = event.target.closest('[data-open-food]');
  if (foodLink) {
    state.from = location.hash || '#foods';
    if (location.hash === '#foods' || !location.hash) state.foodScroll = window.scrollY;
  }
  if (!button) return;
  if (button.dataset.sort) {
    const sort = button.dataset.sort;
    if (state.food.sort === sort) state.food.direction = state.food.direction === 'asc' ? 'desc' : 'asc';
    else { state.food.sort = sort; state.food.direction = sort === 'name' ? 'asc' : 'desc'; }
    state.food.limit = 60; renderFoodRows();
  } else if (button.dataset.method) {
    state.food.method = button.dataset.method; state.food.limit = 60;
    for (const tab of document.querySelectorAll('[data-method]')) tab.setAttribute('aria-pressed', String(tab.dataset.method === state.food.method));
    renderFoodRows();
  } else if (button.hasAttribute('data-more-food')) {
    const before = state.food.limit;
    state.food.limit += 60; renderFoodRows();
    document.querySelectorAll('#food-rows .food-name-link')[before]?.focus({ preventScroll: true });
  } else if (button.hasAttribute('data-more-craft')) {
    const before = state.craft.limit;
    state.craft.limit += 36; renderCraftRows();
    document.querySelectorAll('#craft-rows .craft-row')[before]?.focus({ preventScroll: true });
  } else if (button.hasAttribute('data-reset-food')) {
    Object.assign(state.food, { query: '', method: 'base', diet: 'all', availability: 'all', showSpecial: false, limit: 60 });
    renderFoodTable(); document.querySelector('#food-search').focus();
  } else if (button.hasAttribute('data-reset-craft')) {
    Object.assign(state.craft, { query: '', category: 'all', limit: 36 });
    renderCraftList(); document.querySelector('#craft-search').focus();
  } else if (button.dataset.clear) {
    const input = document.getElementById(button.dataset.clear);
    input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus();
  } else if (button.hasAttribute('data-retry-paths')) renderRoute();
  else if (button.hasAttribute('data-retry-game')) loadGame();
});

document.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'food-search') { state.food.query = input.value; state.food.limit = 60; renderFoodRows(); }
  else if (input.id === 'ingredient-search') renderIngredientResults(input.value);
  else if (input.id === 'craft-search') { state.craft.query = input.value; state.craft.limit = 36; renderCraftRows(); }
  else if (input.id === 'craft-quantity') {
    const quantity = Number(input.value);
    const valid = Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 9999 && input.value.trim() !== '';
    input.setAttribute('aria-invalid', String(!valid));
    const error = document.querySelector('#quantity-error'); error.hidden = valid;
    if (!valid) { error.textContent = t('Enter a whole quantity from 1 to 9999.'); return; }
    state.quantity = quantity;
    renderCraftMath(model.byCraftId.get(document.querySelector('#craft-math').dataset.craftId));
  }
});

document.addEventListener('change', async event => {
  const input = event.target;
  if (input.hasAttribute('data-language') && languages.includes(input.value)) {
    await setLanguage(input.value);
    renderShell();
    await loadChinese();
    if (model) renderRoute({ switchingLanguage: true });
    else if (main.querySelector('[data-retry-game]')) renderGameError();
  } else if (input.id === 'food-diet') { state.food.diet = input.value; if (['roughage', 'elemental'].includes(input.value)) { state.food.showSpecial = true; document.querySelector('#food-special').checked = true; } state.food.limit = 60; renderFoodRows(); }
  else if (input.id === 'food-availability') { state.food.availability = input.value; state.food.limit = 60; renderFoodRows(); }
  else if (input.id === 'food-special') { state.food.showSpecial = input.checked; state.food.limit = 60; renderFoodRows(); }
  else if (input.id === 'explorer-cooker') { state.cooker = input.value; renderExplorer(state.explorerId); }
  else if (input.id === 'craft-category') { state.craft.category = input.value; state.craft.limit = 36; renderCraftRows(); }
  else if (input.id === 'craft-variant') location.hash = routeLink('craft', input.value);
});

document.addEventListener('toggle', event => {
  const details = event.target;
  if (!(details instanceof HTMLDetailsElement)) return;
  if (details.id === 'food-filters') document.querySelector('#food-filter-panel').hidden = !details.open;
  else if (details.dataset.branchKind) branchBody(details);
  else if (details.dataset.needs) needsBody(details);
}, true);

window.addEventListener('hashchange', () => renderRoute({ restoreScroll: location.hash === '#foods' }));

function renderGameError() {
  main.innerHTML = `<div class="error-content"><h1>${msg("The guide couldn’t open.")}</h1><p>${msg("Check your connection, then try loading the game data again.")}</p><button type="button" class="button primary" data-retry-game>${msg("Try again")}</button></div>`;
}

async function loadGame() {
  try {
    await i18nReady;
    renderShell();
    const responses = await Promise.all([fetch('/data/game-data.json'), fetch('/data/art.json')]);
    if (responses.some(r => !r.ok)) throw new Error('The guide data is unavailable.');
    [data, art] = await Promise.all(responses.map(r => r.json()));
    art = new Set(art);
    model = createModel(data, {}, { items: localizedItems, language });
    document.querySelector('#nav-food-count').textContent = Object.keys(data.foods).length;
    await loadChinese();
    renderShell();
    await renderRoute();
  } catch (error) {
    renderGameError();
    console.error(error);
  }
}

for (const element of document.querySelectorAll('[data-icon]')) element.innerHTML = icon(element.dataset.icon);
loadGame();
