import { groupCombo, ruleReferences } from './domain.mjs';

const tags = {
  veggie: ['Vegetable value', 'carrot'], egg: ['Egg value', 'bird_egg'],
  meat: ['Meat value', 'meat'], fish: ['Fish value', 'fishmeat'],
  sweetener: ['Sweetener value', 'honey'], inedible: ['Inedible value', 'twigs'],
  dairy: ['Dairy value', 'goatmilk'], fruit: ['Fruit value', 'berries'],
  monster: ['Monster value', 'monstermeat'], fat: ['Fat value', 'butter'],
  frozen: ['Frozen value', 'ice'], seed: ['Seed value', 'seeds'],
  magic: ['Magic value', 'mandrake'], decoration: ['Decoration value', 'butterflywings'],
  precook: ['Precooked value', 'cookedmeat'], dried: ['Dried value', 'smallmeat_dried'],
};
const symbols = { '>=': '≥', '<=': '≤', '==': '=', '~=': '≠', '*': '×', '/': '÷', '-': '−' };
const refKey = ([op, type, key]) => op === 'ref' ? `${type}:${key}` : null;

function clauses(node) {
  return node[0] === 'and' ? [...clauses(node[1]), ...clauses(node[2])] : [node];
}

function requirements(node) {
  const parts = clauses(node);
  const implied = new Set(parts.flatMap(([op, left, right]) =>
    ['>', '>=', '=='].includes(op) && left[0] === 'ref' && right[0] === 'literal' && right[1] > 0
      ? [refKey(left)] : []));
  return parts.filter(part => !implied.has(refKey(part)));
}

export function ruleHTML(rule, combo, { data, artHTML, name, msg, escape, number }) {
  const operator = label => `<span class="rule-operator">${escape(label)}</span>`;
  const term = (label, id) => `<span class="rule-term">${id ? artHTML(id) : ''}<span>${label}</span></span>`;
  const tagTerm = key => {
    const [label, id] = tags[key] || [key];
    return term(msg(label), id);
  };
  const reference = (group, key) => group === 'tags' ? tagTerm(key) : term(escape(name(key)), key);

  function expression([op, a, b], condition = true, nested = false) {
    if (op === 'ref') return reference(a, b) + (condition ? ' ' + operator('>') + ' 0' : '');
    if (op === 'literal') return a === true ? msg('Any four valid ingredients') : a == null ? msg('None') : escape(a);
    if (op === 'cooker') return msg('Cooking station');
    if (op === 'not' && a[0] === 'ref') return reference(a[1], a[2]) + ' ' + operator('=') + ' 0';
    if (op === 'not') return `${msg('No')} (${expression(a)})`;
    if (op === 'neg') return operator('−') + expression(a, false, true);

    const logical = op === 'and' || op === 'or';
    const result = `${expression(a, logical, true)} ${operator(logical ? msg(op) : symbols[op] || op)} ${expression(b, logical, true)}`;
    return nested ? `(${result})` : result;
  }

  const list = requirements(rule).map(part => `<li><span class="rule-expression">${expression(part)}</span></li>`).join('');
  const totals = combo ? [...new Set(ruleReferences(rule, 'tags'))].map(key => {
    const amounts = groupCombo(combo).map(({ id, amount }) => {
      const value = data.ingredients[data.aliases[id] || id]?.[key] || 0;
      return { id, amount, value };
    }).filter(({ value }) => value !== 0);
    const total = amounts.reduce((sum, { amount, value }) => sum + amount * value, 0);
    const sum = amounts.map(({ id, amount, value }) => `<span class="rule-amount" title="${escape(name(id))}">${artHTML(id)}<span class="sr-only">${escape(name(id))} </span><span>${amount > 1 ? `${amount} × ` : ''}${number(value, false)}</span></span>`).join(` ${operator('+')} `);
    return `<li class="rule-total">${tagTerm(key)} ${operator('=')} ${sum ? `${sum} ${operator('=')} ` : ''}<strong>${number(total, false)}</strong></li>`;
  }).join('') : '';

  return `<ul class="rule-list">${list}</ul>${totals ? `<div class="rule-totals"><strong>${msg('Example totals')}</strong><ul class="rule-list">${totals}</ul></div>` : ''}`;
}
