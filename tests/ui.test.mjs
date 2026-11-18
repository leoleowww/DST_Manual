import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';

// DOM integration checks complement the pure data tests. These do not claim
// real-browser layout, font rendering, touch behavior, or viewport verification.
test('table, ingredient paths, and crafting remain connected through the UI', async t => {
  const root = new URL('../', import.meta.url);
  const window = new Window({ url: 'http://localhost/', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
  window.document.write(await readFile(new URL('public/index.html', root), 'utf8'));
  const doc = window.document;
  Object.assign(globalThis, { window, document: doc, location: window.location, Element: window.Element, Event: window.Event, HTMLDetailsElement: window.HTMLDetailsElement, requestAnimationFrame: callback => callback() });
  let failLoad = true;
  const requests = [];
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  globalThis.fetch = async request => {
    requests.push(request);
    if (failLoad) return new Response('', { status: 503 });
    const body = await readFile(new URL('public' + new URL(request, 'http://localhost').pathname, root));
    return new Response(body, { headers: { 'Content-Type': 'application/json' } });
  };
  const settle = async predicate => {
    for (let i = 0; i < 100; i++) {
      if (predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    assert.ok(predicate(), 'Expected UI state did not settle');
  };
  const navigate = async (hash, predicate) => {
    window.location.hash = hash;
    await settle(predicate);
  };
  const input = (selector, value) => {
    const field = doc.querySelector(selector);
    assert.ok(field, selector);
    field.value = value;
    field.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  const change = (selector, value) => {
    const field = doc.querySelector(selector);
    field.value = value;
    field.dispatchEvent(new window.Event('change', { bubbles: true }));
  };
  const expand = selector => {
    const details = doc.querySelector(selector);
    assert.ok(details, selector);
    details.open = true;
    details.dispatchEvent(new window.Event('toggle'));
    return details;
  };

  try {
    await import('../src/app.mjs');
    await t.test('a failed initial data request offers a working retry', async () => {
      await settle(() => doc.querySelector('[data-retry-game]'));
      assert.match(doc.querySelector('main').textContent, /couldn’t open/);
      assert.equal(errors.length, 1);
      errors.length = 0;
      failLoad = false;
      doc.querySelector('[data-retry-game]').click();
      await settle(() => doc.querySelectorAll('#food-rows tr').length > 0);
    });

    await t.test('the table is the home view, with accessible numeric sorting', () => {
      assert.equal(doc.querySelector('main h1').textContent, 'Food table');
      assert.equal(doc.querySelectorAll('#food-rows tr').length, 60);
      assert.equal(doc.querySelectorAll('[data-column]').length, 4);
      assert.equal(requests.filter(url => url === '/data/uses.json').length, 0, 'Recipe paths should load lazily');
      doc.querySelector('[data-sort="hunger"]').click();
      assert.equal(doc.querySelector('[data-column="hunger"]').getAttribute('aria-sort'), 'descending');
      doc.querySelector('[data-sort="hunger"]').click();
      assert.equal(doc.querySelector('[data-column="hunger"]').getAttribute('aria-sort'), 'ascending');
    });

    await t.test('search aliases, empty states, method filters, and clear controls work', () => {
      input('#food-search', 'tomato');
      assert.match(doc.querySelector('#food-rows').textContent, /Toma Root/);
      input('#food-search', 'no-such-dish-123');
      assert.match(doc.querySelector('#food-empty').textContent, /No foods match/);
      doc.querySelector('[data-clear="food-search"]').click();
      assert.ok(doc.querySelectorAll('#food-rows tr').length > 1);
      doc.querySelector('[data-method="crockpot"]').click();
      assert.equal(doc.querySelector('[data-method="crockpot"]').getAttribute('aria-pressed'), 'true');
      input('#food-search', 'pierogi');
      assert.equal(doc.querySelectorAll('#food-rows tr').length, 1);
    });

    await t.test('food details preserve the table’s search, method, and sort on return', async () => {
      doc.querySelector('[data-open-food="perogies"]').click();
      await settle(() => doc.querySelector('main h1')?.textContent === 'Pierogi' && doc.querySelector('.nutrition-strip'));
      assert.equal(doc.querySelectorAll('.combo-item').length, 4);
      assert.match(doc.querySelector('.nutrition-strip').textContent, /40/);
      doc.querySelector('.back-link').click();
      await settle(() => Boolean(doc.querySelector('#food-search')));
      assert.equal(doc.querySelector('#food-search').value, 'pierogi');
      assert.equal(doc.querySelector('[data-method="crockpot"]').getAttribute('aria-pressed'), 'true');
      assert.equal(doc.querySelector('[data-column="hunger"]').getAttribute('aria-sort'), 'ascending');
    });

    await t.test('the skip link focuses content without changing the current route', () => {
      const hash = window.location.hash;
      doc.querySelector('.skip-link').click();
      assert.equal(window.location.hash, hash);
      assert.equal(doc.activeElement.id, 'main');
    });

    await t.test('Tallbird Egg offers named and generic uses, checked combinations, and indirect paths', async () => {
      await navigate('#explore/tallbirdegg', () => doc.querySelector('.explorer-heading h2')?.textContent === 'Tallbird Egg');
      assert.match(doc.querySelector('#ingredient-tree').textContent, /Bacon and Eggs/);
      const recipe = expand('[data-branch-kind="recipe"][data-target="talleggs"]');
      assert.equal(recipe.querySelectorAll(':scope > .branch-body > .combo .combo-item').length, 4);
      assert.ok(recipe.querySelector('.combo-item.selected').href.includes('tallbirdegg'));
      const transform = expand('[data-branch-kind="transform"][data-target="tallbirdegg_cooked"]');
      assert.match(transform.querySelector('.deeper-tree').textContent, /Direct pot recipes/);
      const tied = expand('[data-branch-kind="recipe"][data-target="jammypreserves"]');
      assert.match(tied.querySelector('.outcome-note').textContent, /multiple|Shared priority/);
      change('#explorer-cooker', 'portablecookpot');
      assert.equal(doc.querySelector('#explorer-cooker').value, 'portablecookpot');
    });

    await t.test('ingredient search finds the tomato alias and keeps a usable empty state', () => {
      input('#ingredient-search', 'tomato');
      assert.ok(doc.querySelector('#ingredient-results a[href="#explore/tomato"]'));
      input('#ingredient-search', 'no-such-material-123');
      assert.match(doc.querySelector('#ingredient-results').textContent, /No matching ingredient/);
    });

    await t.test('building quantities expand dependencies and validate input', async () => {
      await navigate('#craft/cookpot', () => Boolean(doc.querySelector('#craft-quantity')));
      input('#craft-quantity', '2');
      const totals = doc.querySelector('.totals-panel');
      assert.match(totals.textContent, /Charcoal× 12/);
      assert.match(totals.textContent, /Rocks× 18/);
      assert.match(totals.textContent, /Twigs× 12/);
      const sub = expand('[data-needs="cutstone"]');
      assert.match(sub.querySelector('.needs-content').textContent, /Rocks× 18/);
      input('#craft-quantity', '-1');
      assert.equal(doc.querySelector('#quantity-error').hidden, false);
      assert.equal(doc.querySelector('#craft-quantity').getAttribute('aria-invalid'), 'true');
      assert.match(doc.querySelector('.totals-panel').textContent, /Twigs× 12/);
    });

    await t.test('crafting search, category filters, provenance, and unknown routes work', async () => {
      await navigate('#craft', () => Boolean(doc.querySelector('#craft-search')));
      input('#craft-search', 'Crock Pot');
      assert.ok(doc.querySelector('#craft-rows a[href="#craft/cookpot"]'));
      change('#craft-category', 'STRUCTURES');
      assert.ok(doc.querySelector('#craft-rows a[href="#craft/cookpot"]'));
      await navigate('#about', () => Boolean(doc.querySelector('.about-content')));
      assert.match(doc.querySelector('main').textContent, /762172/);
      assert.match(doc.querySelector('main').textContent, /not a live connection/);
      await navigate('#food/nonexistent-item', () => doc.querySelector('main').textContent.includes('wandered off'));
    });

    assert.equal(errors.length, 0, 'No unexpected UI runtime errors');
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    await window.happyDOM.close();
  }
});
