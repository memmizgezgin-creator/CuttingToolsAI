// ToolAdvisor — 3D insert SVG generator
// Exposes window.taInsert3D(shape, opts) → returns SVG string.
// Used both inline (page-switcher → catalog cards) and as a hydrator
// that turns <div class="ta-insert3d" data-shape="C"></div> into a 3D figure.
//
// Shapes (ISO 1832 first letter):
//   C  80° rhomb (default workhorse)
//   V  35° rhomb (narrow, finishing)
//   D  55° rhomb
//   T  60° triangle
//   W  80° trigon (3-sided, rounded vertices — TNMG family approximation drawn as soft tri)
//   S  square
//   R  round
//
// Each SVG is drawn in a 120×120 viewBox, centred. The 3D effect comes from:
//   • a flattened ellipse drop-shadow at the base
//   • a "side" polygon offset down/right (depth face)
//   • a "top" polygon (the visible insert top, filled with --tone-top → --tone-hi gradient)
//   • a small mounting hole + optional chipbreaker concentric rings
(function () {
  const SHAPES = {
    // points are TOP-of-3D-stack (rendered straight; container rotates X+Z for isometric look)
    C: [[60,10],[112,60],[60,110],[8,60]],            // 80° rhomb, wide
    V: [[60,10],[88,60],[60,110],[32,60]],            // 35° rhomb, narrow
    D: [[60,12],[100,60],[60,108],[20,60]],           // 55° rhomb, medium
    T: [[60,10],[110,98],[10,98]],                    // 60° triangle
    W: [[60,12],[107,95],[13,95]],                    // 80° trigon (soft tri)
    S: [[60,8],[112,60],[60,112],[8,60]],             // square at 45° (SNMG)
    R: 'circle',                                       // round
  };

  // Depth offset — same for every shape, gives the side face its mass
  const DX = 0;     // horizontal offset (we keep depth straight-down for isometric base)
  const DY = 18;    // vertical depth

  function svgHeader() {
    return '<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
        // Top face gradient — highlight upper-left to mid lower-right
        '<linearGradient id="t3d-top" x1="0%" y1="0%" x2="100%" y2="100%">' +
          '<stop offset="0%"  stop-color="var(--tone-hi)"/>' +
          '<stop offset="55%" stop-color="var(--tone-top)"/>' +
          '<stop offset="100%" stop-color="var(--tone-rim)"/>' +
        '</linearGradient>' +
        // Side face — uniform dark with slight gradient
        '<linearGradient id="t3d-side" x1="0%" y1="0%" x2="0%" y2="100%">' +
          '<stop offset="0%"  stop-color="var(--tone-rim)"/>' +
          '<stop offset="100%" stop-color="var(--tone-side)"/>' +
        '</linearGradient>' +
        // Specular sheen on top face
        '<linearGradient id="t3d-spec" x1="0%" y1="0%" x2="60%" y2="60%">' +
          '<stop offset="0%"  stop-color="rgba(255,255,255,.55)"/>' +
          '<stop offset="60%" stop-color="rgba(255,255,255,0)"/>' +
        '</linearGradient>' +
        // Soft contact shadow
        '<radialGradient id="t3d-cast" cx="50%" cy="50%" r="50%">' +
          '<stop offset="0%"  stop-color="var(--tone-glow)"/>' +
          '<stop offset="70%" stop-color="rgba(0,0,0,0)"/>' +
        '</radialGradient>' +
      '</defs>';
  }

  function castShadow() {
    return '<ellipse cx="60" cy="135" rx="46" ry="6" fill="url(#t3d-cast)"/>';
  }

  function polyStr(pts, dy = 0) {
    return pts.map(p => (p[0]) + ',' + (p[1] + dy)).join(' ');
  }

  // Build side-face polygon: take bottom-half edges of top polygon and extrude downward
  function sideFacePolys(pts) {
    // For each edge in the polygon, if its midpoint is on the "lower" half (relative to centroid),
    // create a rectangle face from edge → edge+DY.
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const faces = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const mid = (a[1] + b[1]) / 2;
      if (mid >= cy - 2) {
        // visible side face
        faces.push([a, b, [b[0], b[1] + DY], [a[0], a[1] + DY]]);
      }
    }
    return faces;
  }

  function chipbreakerRings(cx, cy) {
    return '' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="22" fill="none" stroke="var(--tone-chip)" stroke-width="1"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="16" fill="none" stroke="var(--tone-chip)" stroke-width="1"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="10" fill="rgba(0,0,0,.18)" stroke="var(--tone-hi)" stroke-width="1.2"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="5"  fill="rgba(0,0,0,.55)"/>';
  }

  function buildPolygon(shape, opts = {}) {
    const pts = SHAPES[shape] || SHAPES.C;
    const withHole = opts.hole !== false;
    const withChip = opts.chipbreaker !== false;

    // Centroid for chipbreaker placement
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;

    const sides = sideFacePolys(pts);
    const sideMarkup = sides.map(f =>
      '<polygon points="' + polyStr(f) + '" fill="url(#t3d-side)" stroke="var(--tone-side)" stroke-width="0.6"/>'
    ).join('');

    const topMarkup =
      '<polygon points="' + polyStr(pts) + '" fill="url(#t3d-top)" stroke="var(--tone-rim)" stroke-width="0.8"/>' +
      // specular highlight overlay (clipped to top shape)
      '<polygon points="' + polyStr(pts) + '" fill="url(#t3d-spec)" opacity=".7"/>';

    const chip = withChip ? chipbreakerRings(cx, cy) : '';
    const hole = withHole ? '' : ''; // hole is part of chipbreakerRings; here for clarity
    return svgHeader() + castShadow() + sideMarkup + topMarkup + chip + hole + '</svg>';
  }

  function buildCircle(opts = {}) {
    const cx = 60, cy = 60, r = 50;
    const withChip = opts.chipbreaker !== false;
    return svgHeader() + castShadow() +
      // side ring (depth)
      '<path d="M ' + (cx - r) + ' ' + cy + ' a ' + r + ' ' + r + ' 0 1 0 ' + (r * 2) + ' 0 l 0 ' + DY + ' a ' + r + ' ' + r + ' 0 1 1 ' + (-r * 2) + ' 0 z" fill="url(#t3d-side)"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#t3d-top)" stroke="var(--tone-rim)" stroke-width="0.8"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#t3d-spec)" opacity=".6"/>' +
      (withChip ? chipbreakerRings(cx, cy) : '') +
      '</svg>';
  }

  function taInsert3D(shape, opts = {}) {
    if ((SHAPES[shape] || '') === 'circle') return buildCircle(opts);
    return buildPolygon(shape, opts);
  }

  // Auto-hydrate existing .ta-insert3d divs that don't already have an <svg>.
  function hydrate(root) {
    (root || document).querySelectorAll('.ta-insert3d:not([data-hydrated])').forEach(el => {
      if (el.querySelector('svg')) { el.setAttribute('data-hydrated', '1'); return; }
      const shape = (el.dataset.shape || 'C').toUpperCase();
      const opts = {
        hole: el.dataset.hole !== 'false',
        chipbreaker: el.dataset.chipbreaker !== 'false',
      };
      el.innerHTML = taInsert3D(shape, opts);
      el.setAttribute('data-hydrated', '1');
    });
  }

  window.taInsert3D = taInsert3D;
  window.taInsert3DHydrate = hydrate;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrate());
  } else {
    hydrate();
  }
})();
