/* ToolAdvisor — Advisor AI floating chat widget
   Self-contained: injects its own CSS, works on any page. */
(function () {
  'use strict';

  // Always floating, never inline. Visible at every scroll position —
  // the on-page advisor section is a static illustration, so this launcher
  // is the only live entry point and must never be hidden.

  // Hide the generic page-switcher FAB that this widget replaces
  const style = document.createElement('style');
  style.textContent = `
    body > button.fixed.bottom-8.right-8,
    body > button[class*="fixed"][class*="bottom-8"][class*="right-8"] { display:none!important; }

    #ta-ai-widget * { box-sizing:border-box; font-family:'DM Sans',system-ui,sans-serif; }
    #ta-ai-launcher {
      position:fixed; bottom:24px; right:24px; z-index:9900;
      display:flex; align-items:center; gap:10px;
      padding:10px 18px 10px 10px; border-radius:999px;
      background:linear-gradient(135deg,#1A1A2E 0%,#2C4A6E 100%);
      color:#fff; border:none; cursor:pointer;
      box-shadow:0 8px 32px rgba(26,26,46,.35);
      transition:transform .15s;
    }
    #ta-ai-launcher:hover { transform:translateY(-2px); }
    #ta-ai-launcher-icon {
      width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,.15);
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    #ta-ai-launcher-icon.pulse { animation:ta-ai-pulse 1.8s ease-out infinite; }
    @keyframes ta-ai-pulse {
      0%,100% { box-shadow:0 0 0 0 rgba(245,158,11,.6); }
      50%      { box-shadow:0 0 0 12px rgba(245,158,11,0); }
    }
    #ta-ai-launcher-label { line-height:1.25; }
    #ta-ai-launcher-label span:first-child {
      display:block; font-size:9px; font-family:'DM Mono',monospace;
      text-transform:uppercase; letter-spacing:.1em; opacity:.75;
    }
    #ta-ai-launcher-label span:last-child { display:block; font-size:13px; font-weight:700; }
    #ta-ai-launcher-badge {
      background:#F59E0B; color:#451a03; border-radius:6px;
      padding:2px 6px; font-size:9px; font-weight:800;
      font-family:'DM Mono',monospace; text-transform:uppercase; letter-spacing:.05em;
      white-space:nowrap;
    }

    #ta-ai-panel {
      position:fixed; bottom:24px; right:24px; z-index:9900;
      width:380px; max-width:calc(100vw - 32px);
      height:560px; max-height:calc(100vh - 96px);
      background:#fff; border:1px solid #e8e6f0; border-radius:18px;
      box-shadow:0 24px 64px rgba(26,26,46,.22);
      display:none; flex-direction:column; overflow:hidden;
      animation:ta-slide-up-r .24s cubic-bezier(.4,0,.2,1) both;
    }
    #ta-ai-panel.open { display:flex; }
    @keyframes ta-slide-up-r {
      from { opacity:0; transform:translateY(20px) scale(.96); }
      to   { opacity:1; transform:translateY(0) scale(1); }
    }

    #ta-ai-header {
      padding:12px 14px; flex-shrink:0;
      background:linear-gradient(135deg,#1A1A2E 0%,#2C4A6E 100%);
      color:#fff; display:flex; align-items:center; gap:10px;
    }
    #ta-ai-header-icon {
      width:36px; height:36px; border-radius:50%;
      background:rgba(255,255,255,.15);
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    #ta-ai-header-info { flex:1; min-width:0; }
    #ta-ai-header-info p:first-child { font-size:14px; font-weight:700; margin:0; }
    #ta-ai-header-info p:last-child  { font-size:10px; opacity:.65; margin:0; }
    #ta-ai-pro-btn {
      display:inline-flex; align-items:center; gap:4px;
      padding:4px 9px; border-radius:6px; border:none;
      background:#F59E0B; color:#451a03; cursor:pointer;
      font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.05em;
    }
    #ta-ai-pro-btn:hover { background:#FBBF24; }
    #ta-ai-minimize {
      width:30px; height:30px; border-radius:6px; border:none;
      background:transparent; color:#fff; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      font-size:20px; line-height:1; opacity:.7;
    }
    #ta-ai-minimize:hover { background:rgba(255,255,255,.1); opacity:1; }

    #ta-ai-quick {
      padding:10px 12px; border-bottom:1px solid #e8e6f0;
      background:#f8f7fc; flex-shrink:0;
    }
    #ta-ai-quick-label {
      font-size:9px; text-transform:uppercase; letter-spacing:.1em;
      color:#6b6880; font-weight:700; font-family:'DM Mono',monospace;
      margin-bottom:6px; display:flex; align-items:center;
    }
    #ta-ai-quick-label span { margin-left:auto; font-family:'DM Mono',monospace; font-size:9px; font-weight:400; text-transform:none; letter-spacing:0; white-space:nowrap; min-width:0; }
    #ta-ai-quota-bar-bg {
      height:3px; background:#e8e6f0; border-radius:99px;
      overflow:hidden; margin-bottom:9px;
    }
    #ta-ai-quota-bar {
      height:100%; border-radius:99px; background:#10B981;
      transition:width .35s ease, background .35s ease; width:0%;
    }
    #ta-ai-quick-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
    .ta-ai-qa-btn {
      text-align:left; padding:9px 10px; border-radius:10px;
      border:1px solid #e8e6f0; background:#fff; cursor:pointer;
      font-size:11px; font-weight:700; line-height:1.3; color:#1A1A2E;
      transition:border-color .12s, background .12s; position:relative;
      overflow-wrap:break-word; word-break:break-word; min-width:0;
    }
    .ta-ai-qa-btn:hover { border-color:#2C4A6E; background:#f0f4ff; }
    .ta-ai-qa-btn.pro-qa { background:#fffbeb; border-color:#fde68a; color:#78350f; }
    .ta-ai-qa-btn.pro-qa:hover { background:#fef3c7; }
    .ta-ai-qa-btn .ta-qa-icon {
      display:flex; align-items:center; justify-content:center;
      width:20px; height:20px; margin-bottom:4px;
      color:#2C4A6E;
    }
    .ta-ai-qa-btn.pro-qa .ta-qa-icon { color:#92400e; }
    .ta-pro-badge {
      position:absolute; top:5px; right:5px;
      background:linear-gradient(90deg,#F59E0B,#D97706);
      color:#fff; border-radius:4px; padding:1px 4px;
      font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:.04em;
    }

    #ta-ai-messages {
      flex:1; overflow-y:auto; padding:12px; display:flex;
      flex-direction:column; gap:10px; background:#fff;
    }
    #ta-ai-messages::-webkit-scrollbar { width:4px; }
    #ta-ai-messages::-webkit-scrollbar-track { background:transparent; }
    #ta-ai-messages::-webkit-scrollbar-thumb { background:#d0cde0; border-radius:99px; }
    #ta-ai-empty {
      text-align:center; padding:28px 16px; color:#6b6880;
    }
    #ta-ai-empty .ta-ai-empty-icon {
      width:44px; height:44px; border-radius:50%;
      background:#f0f4ff; margin:0 auto 10px;
      display:flex; align-items:center; justify-content:center;
      color:#2C4A6E;
    }
    #ta-ai-empty p:first-of-type { font-weight:700; font-size:13px; color:#1A1A2E; margin:0 0 4px; }
    #ta-ai-empty p:last-of-type  { font-size:11px; line-height:1.55; margin:0; }
    .ta-ai-msg { display:flex; gap:8px; align-items:flex-start; }
    .ta-ai-msg.user { flex-direction:row-reverse; }
    .ta-ai-msg-avatar {
      width:26px; height:26px; border-radius:50%; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      background:#e8e6f0; color:#1A1A2E;
    }
    .ta-ai-msg.ai .ta-ai-msg-avatar { background:#2C4A6E; color:#fff; }
    .ta-ai-msg-bubble {
      max-width:80%; padding:9px 12px; border-radius:12px;
      font-size:12.5px; line-height:1.55; white-space:pre-wrap;
      overflow-wrap:break-word; word-break:break-word;
    }
    .ta-ai-msg.user .ta-ai-msg-bubble { background:#2C4A6E; color:#fff; border-top-right-radius:3px; }
    .ta-ai-msg.ai  .ta-ai-msg-bubble { background:#f0f4ff; color:#1A1A2E; border-top-left-radius:3px; white-space:normal; }
    .ta-ai-msg.ai .ta-ai-msg-bubble p { margin:0 0 6px; }
    .ta-ai-msg.ai .ta-ai-msg-bubble p:last-child { margin-bottom:0; }
    .ta-ai-msg.ai .ta-ai-msg-bubble ul,
    .ta-ai-msg.ai .ta-ai-msg-bubble ol { margin:3px 0 6px; padding-left:16px; }
    .ta-ai-msg.ai .ta-ai-msg-bubble li { margin-bottom:2px; }
    .ta-ai-msg.ai .ta-ai-msg-bubble strong { font-weight:700; }
    .ta-ai-typing { display:flex; gap:4px; align-items:center; padding:10px 12px; }
    .ta-ai-typing span {
      width:6px; height:6px; border-radius:50%; background:#6b6880;
      animation:ta-ai-dot 1.2s ease-in-out infinite;
    }
    .ta-ai-typing span:nth-child(2) { animation-delay:.15s; }
    .ta-ai-typing span:nth-child(3) { animation-delay:.3s; }
    @keyframes ta-ai-dot {
      0%,80%,100% { opacity:.25; transform:translateY(0); }
      40%          { opacity:1;   transform:translateY(-3px); }
    }

    #ta-ai-credits-bar {
      display:none; padding:8px 12px;
      background:#fffbeb; border-top:1px solid #fde68a;
      align-items:center; gap:8px; flex-shrink:0;
    }
    #ta-ai-credits-bar.show { display:flex; animation:ta-credits-in .3s ease both; }
    @keyframes ta-credits-in {
      from { opacity:0; transform:translateY(6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    #ta-ai-credits-bar span { font-size:11px; color:#78350f; flex:1; }
    #ta-ai-credits-upgrade {
      padding:4px 10px; border-radius:6px; border:none;
      background:#F59E0B; color:#451a03; cursor:pointer;
      font-size:10px; font-weight:800;
    }
    #ta-ai-credits-upgrade:hover { background:#FBBF24; }

    /* Upgrade CTA card (injected into messages when quota = 0) */
    .ta-upgrade-card {
      margin:4px 0; padding:14px 16px;
      background:linear-gradient(135deg,#1A1A2E 0%,#2C4A6E 100%);
      border-radius:14px; color:#fff;
      animation:ta-slide-up-r .3s cubic-bezier(.4,0,.2,1) both;
    }
    .ta-upgrade-card-title {
      display:flex; align-items:center; gap:7px;
      font-size:13px; font-weight:800; margin-bottom:6px;
    }
    .ta-upgrade-card-title span { display:flex; align-items:center; color:#F59E0B; }
    .ta-upgrade-card-body { font-size:11.5px; opacity:.8; line-height:1.55; margin-bottom:12px; }
    .ta-upgrade-card-btn {
      width:100%; padding:9px 14px; border-radius:9px; border:none;
      background:#F59E0B; color:#451a03; font-weight:800; font-size:12px;
      cursor:pointer; transition:background .15s;
    }
    .ta-upgrade-card-btn:hover { background:#FBBF24; }

    /* Quota warning (1 remaining) */
    .ta-quota-warning {
      text-align:center; font-size:11px; color:#92400e; font-weight:600;
      padding:6px 10px; background:#fffbeb; border-radius:8px;
      border:1px solid #fde68a; margin:2px 0;
    }

    /* Error message with retry */
    .ta-error-bubble {
      max-width:80%; padding:9px 12px; border-radius:12px;
      font-size:12.5px; line-height:1.55; border-top-left-radius:3px;
      background:#fef2f2; color:#991b1b; border:1px solid #fecaca;
    }
    .ta-retry-btn {
      display:inline-flex; align-items:center; gap:4px;
      margin-top:7px; padding:4px 10px; border-radius:6px; border:none;
      background:#fecaca; color:#7f1d1d; cursor:pointer;
      font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em;
      transition:background .12s;
    }
    .ta-retry-btn:hover { background:#fca5a5; }

    #ta-ai-form {
      padding:10px 12px; border-top:1px solid #e8e6f0;
      display:flex; gap:8px; flex-shrink:0;
    }
    #ta-ai-input {
      flex:1; height:38px; padding:0 12px; border-radius:8px;
      border:1px solid #e8e6f0; background:#f8f7fc;
      font-size:13px; color:#1A1A2E; outline:none;
      font-family:'DM Sans',system-ui,sans-serif;
      transition:border-color .12s, background .12s;
    }
    #ta-ai-input:focus { border-color:#2C4A6E; background:#fff; box-shadow:0 0 0 3px rgba(44,74,110,.1); }
    #ta-ai-input:disabled { opacity:.45; cursor:not-allowed; }
    #ta-ai-send {
      width:38px; height:38px; border-radius:8px;
      border:none; background:#2C4A6E; color:#fff; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      transition:transform .12s;
    }
    #ta-ai-send:hover:not(:disabled) { transform:translateY(-1px); }
    #ta-ai-send:disabled { opacity:.4; cursor:not-allowed; }

    @media (max-width:480px) {
      #ta-ai-panel { bottom:0; right:0; width:100vw; max-width:100vw; border-radius:18px 18px 0 0; height:85vh; max-height:85vh; }
      #ta-ai-launcher { bottom:16px; right:16px; }
    }
  `;
  document.head.appendChild(style);

  // ── constants ──────────────────────────────────────────────────────────────
  const API_URL    = '/proxy';
  const FREE_DAILY = 5;   // initial display default; server is authoritative after first call

  const IC = {
    sparkle: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="display:block"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2zm6 10.5.75 2.25L21 15.75l-2.25.75L18 18.75l-.75-2.25L15 15.75l2.25-.75L18 12.5zM6 14.5l.5 1.5L8 16.5l-1.5.5L6 18.5l-.5-1.5L4 16.5l1.5-.5L6 14.5z"/></svg>`,
    person:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:block"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`,
    school:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:block"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>`,
    build:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:block"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>`,
    pdf:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:block"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM11.5 9.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zm5 1.5h1v-3h-1v3zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/></svg>`,
    savings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:block"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07c-1.72-.45-3-1.97-3-3.79h2c0 1.1.9 2 2 2s2-.9 2-2c0-1.1-.9-2-2-2-2.21 0-4-1.79-4-4 0-1.82 1.28-3.34 3-3.79V4h2v1.07c1.72.45 3 1.97 3 3.79h-2c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2c2.21 0 4 1.79 4 4 0 1.82-1.28 3.34-3 3.86z"/></svg>`,
    crown:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:block"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z"/></svg>`,
    send:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:block"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
    refresh: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="display:block"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:block"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
  };

  const QUICK_ACTIONS = [
    { id:'iso-pm',    icon:IC.school,   label:'ISO P vs M inserts',       prompt:'In 4 short bullet points, explain when to use ISO P (steel) vs ISO M (stainless) inserts. Focus on practical CNC operator criteria.', pro:false },
    { id:'wear',      icon:IC.build,    label:'Diagnose tool wear',        prompt:'I\'m seeing flank wear on my insert. What are the most common causes and how do I fix each one?', pro:false },
    { id:'pdf',       icon:IC.pdf,      label:'CAM-ready spec PDF',        prompt:null, pro:true },
    { id:'cheapswap', icon:IC.savings,  label:'Cheapest cross-brand swap', prompt:null, pro:true },
  ];

  // ── admin bypass (cosmetic UI only — server enforces all real limits) ────────
  function isAdmin() {
    try { return localStorage.getItem('ta_admin') === 'true' || !!localStorage.getItem('ta_admin_key'); } catch { return false; }
  }

  function getAdminKey() {
    try { return localStorage.getItem('ta_admin_key') || null; } catch { return null; }
  }

  // ── server-authoritative quota state ─────────────────────────────────────
  // Populated from X-Plan / X-Quota-Remaining / X-Quota-Limit response headers.
  // null = unknown (first request not yet made); display FREE_DAILY as default.
  let serverState = { plan: null, remaining: null, limit: FREE_DAILY };

  function remaining() {
    if (isAdmin()) return 999;
    if (serverState.plan === 'pro') return 999;
    return serverState.remaining !== null ? serverState.remaining : FREE_DAILY;
  }

  function syncFromHeaders(headers) {
    if (!headers) return;
    const plan = headers.get('X-Plan');
    const rem  = headers.get('X-Quota-Remaining');
    const lim  = headers.get('X-Quota-Limit');
    if (plan) serverState.plan = plan;
    if (lim  !== null && lim  !== undefined) { const n = parseInt(lim,  10); if (!isNaN(n)) serverState.limit     = n; }
    if (rem  !== null && rem  !== undefined) { const n = parseInt(rem,  10); if (!isNaN(n)) serverState.remaining = n; }
  }

  // ── open pro modal ─────────────────────────────────────────────────────────
  function openPro() {
    if (window.TA && typeof window.TA.openModal === 'function') { window.TA.openModal('pro-upgrade'); return; }
    if (typeof window.openProModal === 'function') { window.openProModal(); return; }
    if (typeof window.TA_openProModal === 'function') { window.TA_openProModal(); return; }
    window.location.href = 'pro.html';
  }

  // ── build HTML ─────────────────────────────────────────────────────────────
  const quickBtns = QUICK_ACTIONS.map(a => `
    <button class="ta-ai-qa-btn${a.pro ? ' pro-qa' : ''}" data-qa-id="${a.id}" type="button">
      <span class="ta-qa-icon">${a.icon}</span>${a.label}${a.pro ? '<span class="ta-pro-badge">Pro</span>' : ''}
    </button>`).join('');

  const root = document.createElement('div');
  root.id = 'ta-ai-widget';
  root.innerHTML = `
    <button id="ta-ai-launcher" type="button" aria-label="Open Advisor AI chat">
      <span id="ta-ai-launcher-icon" class="pulse">
        ${IC.sparkle}
      </span>
      <span id="ta-ai-launcher-label">
        <span>Advisor AI</span>
        <span>Ask a question</span>
      </span>
      <span id="ta-ai-launcher-badge">${remaining()}/${FREE_DAILY} free</span>
    </button>

    <div id="ta-ai-panel" role="dialog" aria-label="Advisor AI" aria-modal="true">
      <div id="ta-ai-header">
        <span id="ta-ai-header-icon">
          ${IC.sparkle}
        </span>
        <div id="ta-ai-header-info">
          <p>Advisor AI</p>
          <p>Trained on cutting-tool engineering</p>
        </div>
        <button id="ta-ai-pro-btn" type="button">
          ${IC.crown} Unlock Pro
        </button>
        <button id="ta-ai-minimize" type="button" aria-label="Minimize">&#8722;</button>
      </div>

      <div id="ta-ai-quick">
        <div id="ta-ai-quick-label">Quick actions <span id="ta-ai-quota-label">${remaining()}/${FREE_DAILY} free today</span></div>
        <div id="ta-ai-quota-bar-bg"><div id="ta-ai-quota-bar"></div></div>
        <div id="ta-ai-quick-grid">${quickBtns}</div>
      </div>

      <div id="ta-ai-messages">
        <div id="ta-ai-empty">
          <div class="ta-ai-empty-icon">${IC.sparkle}</div>
          <p>How can I help?</p>
          <p>Try a quick action above, or ask anything about speeds, feeds, ISO groups, grades, geometry, or tool wear.</p>
        </div>
      </div>

      <div id="ta-ai-credits-bar">
        <span style="color:#92400e;flex-shrink:0;display:flex;align-items:center">${IC.crown}</span>
        <span>Pro launches in July — join the waitlist for early access.</span>
        <button id="ta-ai-credits-upgrade" type="button">Join waitlist</button>
      </div>

      <form id="ta-ai-form" autocomplete="off">
        <input id="ta-ai-input" type="text" placeholder="Ask about tools, speeds, materials…" autocomplete="off"/>
        <button id="ta-ai-send" type="submit" aria-label="Send" disabled>${IC.send}</button>
      </form>
    </div>
  `;
  document.body.appendChild(root);

  // ── element refs ──────────────────────────────────────────────────────────
  const launcher    = document.getElementById('ta-ai-launcher');
  const panel       = document.getElementById('ta-ai-panel');
  const minimize    = document.getElementById('ta-ai-minimize');
  const proBtns     = [document.getElementById('ta-ai-pro-btn'), document.getElementById('ta-ai-credits-upgrade')];
  const messages    = document.getElementById('ta-ai-messages');
  const empty       = document.getElementById('ta-ai-empty');
  const creditsBar  = document.getElementById('ta-ai-credits-bar');
  const form        = document.getElementById('ta-ai-form');
  const input       = document.getElementById('ta-ai-input');
  const sendBtn     = document.getElementById('ta-ai-send');
  const badge       = document.getElementById('ta-ai-launcher-badge');
  const quotaLabel  = document.getElementById('ta-ai-quota-label');
  const quotaBar    = document.getElementById('ta-ai-quota-bar');
  const launcherIcon = document.getElementById('ta-ai-launcher-icon');

  let busy = false;

  // ── keep the launcher clear of the cookie consent banner ───────────────────
  // The banner (modals.js, .ta-cookie-banner) spans the bottom edge on first
  // visit; without this the launcher covers its consent buttons.
  function avoidCookieBanner() {
    const banner = document.querySelector('.ta-cookie-banner');
    if (banner) {
      launcher.style.bottom = (banner.getBoundingClientRect().height + 36) + 'px';
    } else {
      launcher.style.bottom = '';
    }
  }
  avoidCookieBanner();
  window.addEventListener('resize', avoidCookieBanner);
  new MutationObserver(avoidCookieBanner).observe(document.body, { childList: true });

  // ── state helpers ─────────────────────────────────────────────────────────
  function updateQuota() {
    const r = remaining();

    if (isAdmin()) {
      badge.textContent      = 'Admin';
      badge.style.background = '#2C4A6E';
      badge.style.color      = '#fff';
      quotaLabel.textContent = 'Admin: unlimited';
      if (quotaBar) { quotaBar.style.width = '0%'; quotaBar.style.background = '#10B981'; }
      creditsBar.classList.remove('show');
      input.disabled   = busy;
      sendBtn.disabled = busy || !input.value.trim();
      input.placeholder = 'Ask about tools, speeds, materials…';
      return;
    }

    if (serverState.plan === 'pro') {
      badge.textContent      = 'Pro';
      badge.style.background = '#10B981';
      badge.style.color      = '#fff';
      quotaLabel.textContent = 'Pro — unlimited';
      if (quotaBar) { quotaBar.style.width = '0%'; quotaBar.style.background = '#10B981'; }
      creditsBar.classList.remove('show');
      input.disabled   = busy;
      sendBtn.disabled = busy || !input.value.trim();
      input.placeholder = 'Ask about tools, speeds, materials…';
      return;
    }

    const limit = serverState.limit ?? FREE_DAILY;
    badge.textContent      = `${r}/${limit} free`;
    badge.style.background = '';
    badge.style.color      = '';
    quotaLabel.textContent = `${r}/${limit} free today`;
    if (quotaBar) {
      const used = limit - Math.max(0, r);
      const pct  = Math.min(100, limit > 0 ? (used / limit) * 100 : 0);
      quotaBar.style.width      = pct + '%';
      quotaBar.style.background = r === 0 ? '#EF4444' : r === 1 ? '#F59E0B' : '#10B981';
    }
    creditsBar.classList.toggle('show', r <= 0);
    input.disabled   = busy || r <= 0;
    sendBtn.disabled = busy || !input.value.trim() || r <= 0;
    input.placeholder = r > 0 ? 'Ask about tools, speeds, materials…' : 'Out of free queries — join the waitlist';
  }

  function setInputState() {
    const r = remaining();
    if (serverState.plan === 'pro' || isAdmin()) {
      sendBtn.disabled = busy || !input.value.trim();
      input.disabled   = busy;
      return;
    }
    sendBtn.disabled = busy || !input.value.trim() || r <= 0;
    input.disabled   = busy || r <= 0;
  }

  function renderMarkdown(text) {
    // Clean artifacts: collapse 3+ newlines to 2, remove lone-dash/whitespace lines
    let s = text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^[ \t]*-[ \t]*$/gm, '');

    // Escape HTML first to prevent XSS
    s = s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // **bold** -> <strong>
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Process double-newline-separated blocks into paragraphs / lists / headings
    const out = [];
    for (const block of s.split(/\n\n+/)) {
      if (!block.trim()) continue;
      const lines = block.split('\n');
      const filled = lines.filter(l => l.trim());
      if (filled.length === 1 && /^#{2,3} /.test(filled[0])) {
        out.push('<p><strong>' + filled[0].replace(/^#{2,3} /, '') + '</strong></p>');
      } else if (filled.length && filled.every(l => /^-\s/.test(l))) {
        out.push('<ul>' + filled.map(l => '<li>' + l.replace(/^-\s/, '') + '</li>').join('') + '</ul>');
      } else if (filled.length && filled.every(l => /^\d+\.\s/.test(l))) {
        out.push('<ol>' + filled.map(l => '<li>' + l.replace(/^\d+\.\s/, '') + '</li>').join('') + '</ol>');
      } else {
        out.push('<p>' + lines.join('<br>') + '</p>');
      }
    }
    return out.join('');
  }

  function addMessage(role, text) {
    if (empty) empty.style.display = 'none';
    const row = document.createElement('div');
    row.className = `ta-ai-msg ${role}`;
    const icon = role === 'ai' ? IC.sparkle : IC.person;
    row.innerHTML = `
      <div class="ta-ai-msg-avatar">${icon}</div>
      <div class="ta-ai-msg-bubble">${text}</div>`;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row.querySelector('.ta-ai-msg-bubble');
  }

  function addErrorMessage(text, retryPrompt) {
    if (empty) empty.style.display = 'none';
    const row = document.createElement('div');
    row.className = 'ta-ai-msg ai';
    const retryHTML = retryPrompt
      ? `<button class="ta-retry-btn" onclick="this.closest('.ta-ai-msg').remove();ask(${JSON.stringify(retryPrompt)})">
           ${IC.refresh} Retry
         </button>`
      : '';
    row.innerHTML = `
      <div class="ta-ai-msg-avatar">${IC.error}</div>
      <div class="ta-error-bubble">${escapeHtml(text)}${retryHTML}</div>`;
    // Wire retry after DOM insert (onclick in attribute won't have closure access)
    messages.appendChild(row);
    const retryBtn = row.querySelector('.ta-retry-btn');
    if (retryBtn && retryPrompt) {
      retryBtn.onclick = () => { row.remove(); ask(retryPrompt); };
    }
    messages.scrollTop = messages.scrollHeight;
  }

  let upgradeCTAShown = false;
  function showUpgradeCta() {
    if (upgradeCTAShown) return;
    upgradeCTAShown = true;
    if (empty) empty.style.display = 'none';
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="ta-upgrade-card">
        <div class="ta-upgrade-card-title">
          <span>${IC.crown}</span> You've used today's 5 free queries
        </div>
        <div class="ta-upgrade-card-body">Pro launches in July. Join the waitlist now — the first 50 sign-ups get 50% off the first 3 months.</div>
        <button class="ta-upgrade-card-btn" id="ta-cta-upgrade-btn">Join the waitlist</button>
      </div>`;
    messages.appendChild(wrap);
    wrap.querySelector('#ta-cta-upgrade-btn').addEventListener('click', openPro);
    messages.scrollTop = messages.scrollHeight;
  }

  function showQuotaWarning() {
    const warn = document.createElement('div');
    warn.className = 'ta-quota-warning';
    warn.textContent = '⚠ This is your last free query today.';
    messages.appendChild(warn);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    if (empty) empty.style.display = 'none';
    const row = document.createElement('div');
    row.id = 'ta-ai-typing-row';
    row.className = 'ta-ai-msg ai';
    row.innerHTML = `
      <div class="ta-ai-msg-avatar">${IC.sparkle}</div>
      <div class="ta-ai-typing"><span></span><span></span><span></span></div>`;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  // ── send message ───────────────────────────────────────────────────────────
  async function ask(prompt) {
    if (busy || !prompt) return;
    // External callers (homepage presets, header CTA) may fire while the
    // panel is closed — a query must never run invisibly.
    if (!panel.classList.contains('open')) openPanel();
    // Block client-side only once the server has confirmed quota is exhausted.
    if (serverState.plan !== 'pro' && !isAdmin() && serverState.remaining !== null && serverState.remaining <= 0) return;

    busy = true;
    addMessage('user', escapeHtml(prompt));
    setInputState();
    const typingRow = showTyping();

    let res;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: Object.assign({ 'Content-Type': 'application/json' }, getAdminKey() ? { 'X-Admin-Key': getAdminKey() } : {}),
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      let data = {};
      try { data = await res.json(); } catch { /* non-JSON response */ }

      console.log('[ToolAdvisor AI] status:', res.status, 'response:', JSON.stringify(data).substring(0, 300));
      typingRow.remove();

      if (!res.ok) {
        if (res.status === 429) {
          // Server is the source of truth — update state and show upgrade UI.
          serverState.remaining = 0;
          syncFromHeaders(res.headers);
          updateQuota();
          showUpgradeCta();
        } else if (res.status === 401) {
          addErrorMessage('API key not authorised. Contact support if this persists.', null);
        } else if (res.status === 500) {
          const msg = (data.error || '');
          if (typeof msg === 'string' && msg.includes('API key')) {
            addErrorMessage('The advisor isn\'t configured yet. Check back soon.', null);
          } else {
            addErrorMessage('Server error — please try again in a moment.', prompt);
          }
        } else if ((res.status === 503 || res.status === 502) && data.retryable) {
          addErrorMessage('AI is temporarily unavailable. Please try again in a moment.', prompt);
        } else {
          addErrorMessage(`Something went wrong (${res.status}). Please try again.`, prompt);
        }
      } else {
        const reply = data.answer
          || data.content?.[0]?.text
          || data.error?.message
          || (typeof data.error === 'string' ? data.error : null)
          || 'Sorry, I had trouble answering that. Please try again.';
        addMessage('ai', renderMarkdown(reply));
      }
    } catch (fetchErr) {
      typingRow.remove();
      const isOffline = !navigator.onLine;
      addErrorMessage(
        isOffline
          ? 'You appear to be offline. Reconnect and try again.'
          : 'Connection error — please try again in a moment.',
        prompt
      );
    }

    // Server headers are the sole source of truth for quota state.
    if (res && res.headers) {
      syncFromHeaders(res.headers);
    }
    updateQuota();

    const rem = remaining();
    if (rem === 1) showQuotaWarning();
    if (rem === 0) showUpgradeCta();

    busy = false;
    setInputState();
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── open/close helpers ─────────────────────────────────────────────────────
  function openPanel() {
    panel.classList.add('open');
    launcher.style.display = 'none';
    launcherIcon.classList.remove('pulse');
    input.focus();
    updateQuota();
  }

  function closePanel() {
    panel.classList.remove('open');
    launcher.style.display = '';
    updateQuota();
  }

  // Open the panel with a query pre-filled in the input (not auto-sent —
  // the user confirms with Send, so a stray click never burns quota).
  function openWith(query) {
    openPanel();
    if (query) {
      input.value = query;
      setInputState();
      input.focus();
    }
  }

  // ── events ────────────────────────────────────────────────────────────────
  launcher.addEventListener('click', openPanel);

  minimize.addEventListener('click', closePanel);

  proBtns.forEach(btn => btn && btn.addEventListener('click', openPro));

  document.querySelectorAll('.ta-ai-qa-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.qaId;
      const action = QUICK_ACTIONS.find(a => a.id === id);
      if (!action) return;
      if (action.pro) { openPro(); return; }
      if (!action.prompt) return;
      ask(action.prompt);
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    input.value = '';
    setInputState();
    ask(v);
  });

  input.addEventListener('input', setInputState);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
  });

  // ── pulse after 4s to draw attention ──────────────────────────────────────
  setTimeout(() => {
    if (!panel.classList.contains('open')) launcherIcon.classList.add('pulse');
  }, 4000);

  updateQuota();

  // Public API for external callers (homepage CTAs, preset job cards):
  //   open()          — expand the chat panel
  //   openWith(query) — expand the panel with a query pre-filled (user confirms send)
  //   ask(prompt)     — send a query immediately (opens the panel first)
  window.TAAdvisor = { ask, open: openPanel, openWith };
})();
