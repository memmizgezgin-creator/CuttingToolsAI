// ToolAdvisor — custom tool-family icons (SVG)
// Replaces generic Material Symbols (precision_manufacturing, rotate_right, ...)
// with distinctive technical glyphs that READ as the actual tool type.
//
// Exposes window.taToolIcon(key, opts) → SVG string.
// Keys: 'turning', 'milling', 'drilling', 'reamers', 'threading', 'grooving'
//
// All icons drawn in a 24×24 viewBox, sized down via CSS.
// Stroke-based, single-color (currentColor), 1.5–1.8px stroke. No fills.
(function () {

  const ICONS = {
    // INDEXABLE INSERT — 80° rhomb seen face-on with mounting hole + chipbreaker hint
    turning: `
      <path d="M 12 3 L 21 12 L 12 21 L 3 12 Z"/>
      <circle cx="12" cy="12" r="2.2"/>
      <path d="M 12 6.5 L 17.5 12 L 12 17.5 L 6.5 12 Z" stroke-opacity=".5" stroke-dasharray="1.5 1.2"/>
    `,
    // END MILL — cylinder body + helical flute lines
    milling: `
      <rect x="7.5" y="3" width="9" height="14" rx="1.2"/>
      <path d="M 7.5 6 L 16.5 9.5 M 7.5 9 L 16.5 12.5 M 7.5 12 L 16.5 15.5"/>
      <path d="M 9.5 17 L 14.5 17 L 13 20 L 11 20 Z" stroke-linejoin="round"/>
    `,
    // TWIST DRILL — pointed cone + twin helical lines
    drilling: `
      <path d="M 9 3 L 15 3 L 15 14 L 12 21 L 9 14 Z" stroke-linejoin="round"/>
      <path d="M 9.5 6 L 14.5 9 M 9.5 9 L 14.5 12 M 9.5 12 L 14.5 14"/>
    `,
    // REAMER — long slender tool with multiple straight flutes + small chamfer at tip
    reamers: `
      <path d="M 10 3 L 14 3 L 14 18 L 12 20.5 L 10 18 Z" stroke-linejoin="round"/>
      <line x1="10.7" y1="4" x2="10.7" y2="17"/>
      <line x1="12" y1="4"   x2="12"   y2="17"/>
      <line x1="13.3" y1="4" x2="13.3" y2="17"/>
    `,
    // THREADING — V-tooth thread profile
    threading: `
      <path d="M 3 18 L 6 12 L 9 18 L 12 12 L 15 18 L 18 12 L 21 18" stroke-linejoin="round" stroke-linecap="round"/>
      <line x1="3" y1="20" x2="21" y2="20" stroke-opacity=".55"/>
      <line x1="3" y1="8"  x2="21" y2="8"  stroke-opacity=".35"/>
    `,
    // GROOVING / PARTING — thin blade making a groove
    grooving: `
      <path d="M 4 6 L 20 6 L 20 9 L 14 9 L 14 19 L 10 19 L 10 9 L 4 9 Z" stroke-linejoin="round"/>
      <line x1="10.5" y1="11" x2="13.5" y2="11" stroke-opacity=".5"/>
      <line x1="10.5" y1="14" x2="13.5" y2="14" stroke-opacity=".5"/>
      <line x1="10.5" y1="17" x2="13.5" y2="17" stroke-opacity=".5"/>
    `,
  };

  function taToolIcon(key, opts) {
    opts = opts || {};
    const size = opts.size || 22;
    const sw = opts.strokeWidth || 1.6;
    const body = ICONS[key] || ICONS.turning;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="${sw}"
              stroke-linecap="round" aria-hidden="true">${body}</svg>`;
  }

  window.taToolIcon = taToolIcon;

  // Hydrator — turns <span class="ta-tool-icon" data-icon="milling"></span> into SVG
  function hydrate(root) {
    (root || document).querySelectorAll('.ta-tool-icon:not([data-hydrated])').forEach(el => {
      const key = el.dataset.icon;
      if (!key) return;
      el.innerHTML = taToolIcon(key, { size: el.dataset.size || 22 });
      el.setAttribute('data-hydrated', '1');
    });
  }
  window.taToolIconHydrate = hydrate;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrate());
  } else {
    hydrate();
  }
})();
