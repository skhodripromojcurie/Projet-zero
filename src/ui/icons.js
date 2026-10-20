const paths = {
  play: '<path d="m9 5 11 7-11 7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4m-4 6h4m10-6h4m-4 6h4"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  room: '<path d="m3 8 9-5 9 5v12H3zM9 20v-8h6v8"/>',
  camera:
    '<rect x="2" y="6" width="15" height="13" rx="2"/><path d="m17 10 5-3v11l-5-3"/>',
  motion: '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9zM2 14l10 6 10-6"/>',
  save: '<path d="M5 3h12l4 4v14H3V3h2zM7 3v6h10V3M7 21v-8h10v8"/>',
  sound:
    '<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
};
export const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.film}</svg>`;
