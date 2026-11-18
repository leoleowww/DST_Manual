const paths = {
  leaf: '<path d="M20 4c-8-2-16 1-16 8a7 7 0 0 0 7 7c7 0 10-8 9-15Z"/><path d="m4 20 11-11M9 15v-4m0 4h4"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M10 4v16M3 15h18"/>',
  tree: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/>',
  hammer: '<path d="m14 12-9 9-3-3 9-9M9 5l4-3 6 6-3 4-7-7ZM16 5l3-3 3 3-3 3"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  filter: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m5 9 7 7 7-7"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  sort: '<path d="m8 4-3 3-3-3M5 3v16m11 2 3-3 3 3M19 5v14"/>',
  up: '<path d="m5 15 7-7 7 7"/>',
  hunger: '<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M18 3c-3 3-3 7 0 8h2M20 3v18"/>',
  health: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  sanity: '<path d="M12 4a4 4 0 0 0-7 2 4 4 0 0 0-2 7 4 4 0 0 0 4 6 3 3 0 0 0 5 1V4Zm0 0a4 4 0 0 1 7 2 4 4 0 0 1 2 7 4 4 0 0 1-4 6 3 3 0 0 1-5 1M7 8l2 2m-4 4 3-1m9-5-2 2m4 4-3-1"/>',
  pot: '<path d="M5 9h14v7a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V9ZM3 12h2m14 0h2M4 9h16M10 5V3m4 2V3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  fire: '<path d="M13 3c1 5-5 5-3 9 2-1 4-1 5-4 5 5 6 10 1 13H8c-7-5-2-10 0-12-1 4 1 5 2 5-2-5 4-5 3-11Z"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 4v.1"/>',
};

export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
}
