/* ToolAdvisor — Advisor AI floating chat widget
   Self-contained: injects its own CSS, works on any page. */
(function () {
  'use strict';

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
      margin-bottom:7px; display:flex; align-items:center;
    }
    #ta-ai-quick-label span { margin-left:auto; font-family:'DM Mono',monospace; font-size:9px; font-weight:400; text-transform:none; letter-spacing:0; }
    #ta-ai-quick-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
    .ta-ai-qa-btn {
      text-align:left; padding:9px 10px; border-radius:10px;
      border:1px solid #e8e6f0; background:#fff; cursor:pointer;
      font-size:11px; font-weight:700; line-height:1.3; color:#1A1A2E;
      transition:border-color .12s, background .12s; position:relative;
    }
    .ta-ai-qa-btn:hover { border-color:#2C4A6E; background:#f0f4ff; }
    .ta-ai-qa-btn.pro-qa { background:#fffbeb; border-color:#fde68a; color:#78350f; }
    .ta-ai-qa-btn.pro-qa:hover { background:#fef3c7; }
    .ta-ai-qa-btn .ta-qa-icon {
      display:block; font-size:15px; margin-bottom:4px;
      font-family:'Material Symbols Outlined'; font-variation-settings:'FILL' 1;
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
      font-family:'Material Symbols Outlined'; font-variation-settings:'FILL' 1;
      font-size:22px; color:#2C4A6E;
    }
    #ta-ai-empty p:first-of-type { font-weight:700; font-size:13px; color:#1A1A2E; margin:0 0 4px; }
    #ta-ai-empty p:last-of-type  { font-size:11px; line-height:1.55; margin:0; }
    .ta-ai-msg { display:flex; gap:8px; align-items:flex-start; }
    .ta-ai-msg.user { flex-direction:row-reverse; }
    .ta-ai-msg-avatar {
      width:26px; height:26px; border-radius:50%; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      font-family:'Material Symbols Outlined'; font-variation-settings:'FILL' 1; font-size:13px;
      background:#e8e6f0; color:#1A1A2E;
    }
    .ta-ai-msg.ai .ta-ai-msg-avatar { background:#2C4A6E; color:#fff; }
    .ta-ai-msg-bubble {
      max-width:80%; padding:9px 12px; border-radius:12px;
      font-size:12.5px; line-height:1.55; white-space:pre-wrap;
    }
    .ta-ai-msg.user .ta-ai-msg-bubble { background:#2C4A6E; color:#fff; border-top-right-radius:3px; }
    .ta-ai-msg.ai  .ta-ai-msg-bubble { background:#f0f4ff; color:#1A1A2E; border-top-left-radius:3px; }
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
    #ta-ai-credits-bar.show { display:flex; }
    #ta-ai-credits-bar span { font-size:11px; color:#78350f; flex:1; }
    #ta-ai-credits-upgrade {
      padding:4px 10px; border-radius:6px; border:none;
      background:#F59E0B; color:#451a03; cursor:pointer;
      font-size:10px; font-weight:800;
    }
    #ta-ai-credits-upgrade:hover { background:#FBBF24; }

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
      font-family:'Material Symbols Outlined'; font-size:18px;
      transition:transform .12s;
    }
    #ta-ai-send:hover:not(:disabled) { transform:translateY(-1px); }
    #ta-ai-send:disabled { opacity:.4; cursor:not-allowed; }

    @media (max-width:480px) {
      #ta-ai-panel { bottom:0; right:0; width:100vw; max-width:100vw; border-radius:18px 18px 0 0; height:70vh; max-height:70vh; }
      #ta-ai-launcher { bottom:16px; right:16px; }
    }
  `;
  document.head.appendChild(style);

  // ── constants ──────────────────────────────────────────────────────────────
  const WORKER_URL  = 'https://tooladvisor-ai.memmizgezgin.workers.dev/api/chat';
  const FREE_DAILY  = 3;
  const LS_KEY      = 'ta:ai:count';
  const QUICK_ACTIONS = [
    { id:'iso-pm',    icon:'school',        label:'ISO P vs M inserts', prompt:'In 4 short bullet points, explain when to use ISO P (steel) vs ISO M (stainless) inserts. Focus on practical CNC operator criteria.', pro:false },
    { id:'wear',      icon:'build',         label:'Diagnose tool wear', prompt:'I\'m seeing flank wear on my insert. What are the most common causes and how do I fix each one?', pro:false },
    { id:'pdf',       icon:'picture_as_pdf',label:'CAM-ready spec PDF',  prompt:null, pro:true },
    { id:'cheapswap', icon:'savings',       label:'Cheapest cross-brand swap', prompt:null, pro:true },
  ];

  // ── admin bypass ───────────────────────────────────────────────────────────
  function isAdmin() {
    try { return localStorage.getItem('ta_admin') === 'true'; } catch { return false; }
  }

  // ── quota ──────────────────────────────────────────────────────────────────
  function getCount() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const st = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      if (st.day !== today) return { day: today, used: 0 };
      return st;
    } catch { return { day: new Date().toISOString().slice(0, 10), used: 0 }; }
  }
  function incrCount() {
    if (isAdmin()) return getCount();
    const c = getCount();
    c.used += 1;
    try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch {}
    return c;
  }
  function remaining() {
    if (isAdmin()) return 999;
    return Math.max(0, FREE_DAILY - getCount().used);
  }

  // ── open pro modal or fallback ─────────────────────────────────────────────
  function openPro() {
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
        <span style="font-family:'Material Symbols Outlined';font-size:22px;font-variation-settings:'FILL' 1">auto_awesome</span>
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
          <span style="font-family:'Material Symbols Outlined';font-size:20px;font-variation-settings:'FILL' 1">auto_awesome</span>
        </span>
        <div id="ta-ai-header-info">
          <p>Advisor AI</p>
          <p>Trained on cutting-tool engineering</p>
        </div>
        <button id="ta-ai-pro-btn" type="button">
          <span style="font-family:'Material Symbols Outlined';font-size:12px;font-variation-settings:'FILL' 1">workspace_premium</span> Unlock Pro
        </button>
        <button id="ta-ai-minimize" type="button" aria-label="Minimize">&#8722;</button>
      </div>

      <div id="ta-ai-quick">
        <div id="ta-ai-quick-label">Quick actions <span id="ta-ai-quota-label">${remaining()}/${FREE_DAILY} free today</span></div>
        <div id="ta-ai-quick-grid">${quickBtns}</div>
      </div>

      <div id="ta-ai-messages">
        <div id="ta-ai-empty">
          <div class="ta-ai-empty-icon">auto_awesome</div>
          <p>How can I help?</p>
          <p>Try a quick action above, or ask anything about speeds, feeds, ISO groups, grades, geometry, or tool wear.</p>
        </div>
      </div>

      <div id="ta-ai-credits-bar">
        <span style="font-family:'Material Symbols Outlined';font-size:16px;font-variation-settings:'FILL' 1;color:#92400e;flex-shrink:0">workspace_premium</span>
        <span>Free questions used. Unlock unlimited with Pro.</span>
        <button id="ta-ai-credits-upgrade" type="button">Upgrade</button>
      </div>

      <form id="ta-ai-form" autocomplete="off">
        <input id="ta-ai-input" type="text" placeholder="Ask about tools, speeds, materials…" autocomplete="off"/>
        <button id="ta-ai-send" type="submit" aria-label="Send" disabled>send</button>
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
  const launcherIcon = document.getElementById('ta-ai-launcher-icon');

  let busy = false;

  // ── state helpers ─────────────────────────────────────────────────────────
  function updateQuota() {
    const r = remaining();
    if (isAdmin()) {
      badge.textContent      = 'Admin';
      badge.style.background = '#2C4A6E';
      badge.style.color      = '#fff';
      quotaLabel.textContent = 'Admin: unlimited';
      creditsBar.classList.remove('show');
      input.disabled   = busy;
      sendBtn.disabled = busy || !input.value.trim();
      input.placeholder = 'Ask about tools, speeds, materials…';
      return;
    }
    badge.textContent      = `${r}/${FREE_DAILY} free`;
    badge.style.background = '';
    badge.style.color      = '';
    quotaLabel.textContent = `${r}/${FREE_DAILY} free today`;
    creditsBar.classList.toggle('show', r <= 0);
    input.disabled   = busy || r <= 0;
    sendBtn.disabled = busy || !input.value.trim() || r <= 0;
    input.placeholder = r > 0 ? 'Ask about tools, speeds, materials…' : 'Out of free questions — upgrade to continue';
  }

  function setInputState() {
    sendBtn.disabled = busy || !input.value.trim() || remaining() <= 0;
    input.disabled = busy || remaining() <= 0;
  }

  function addMessage(role, text) {
    if (empty) empty.style.display = 'none';
    const row = document.createElement('div');
    row.className = `ta-ai-msg ${role}`;
    const icon = role === 'ai' ? 'auto_awesome' : 'person';
    row.innerHTML = `
      <div class="ta-ai-msg-avatar">${icon}</div>
      <div class="ta-ai-msg-bubble">${text}</div>`;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row.querySelector('.ta-ai-msg-bubble');
  }

  function showTyping() {
    if (empty) empty.style.display = 'none';
    const row = document.createElement('div');
    row.id = 'ta-ai-typing-row';
    row.className = 'ta-ai-msg ai';
    row.innerHTML = `
      <div class="ta-ai-msg-avatar">auto_awesome</div>
      <div class="ta-ai-typing"><span></span><span></span><span></span></div>`;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  // ── send message ───────────────────────────────────────────────────────────
  async function ask(prompt) {
    if (busy || !prompt || remaining() <= 0) return;
    busy = true;
    addMessage('user', escapeHtml(prompt));
    setInputState();
    const typingRow = showTyping();

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });
      const data = await res.json();
      typingRow.remove();
      const reply = data.reply || data.error || 'Sorry, I had trouble answering that.';
      addMessage('ai', escapeHtml(reply).replace(/\n/g, '<br>'));
    } catch {
      typingRow.remove();
      addMessage('ai', 'Connection error. Please try again in a moment.');
    }

    incrCount();
    updateQuota();
    busy = false;
    setInputState();
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── events ────────────────────────────────────────────────────────────────
  launcher.addEventListener('click', () => {
    panel.classList.add('open');
    launcher.style.display = 'none';
    launcherIcon.classList.remove('pulse');
    input.focus();
    updateQuota();
  });

  minimize.addEventListener('click', () => {
    panel.classList.remove('open');
    launcher.style.display = '';
    updateQuota();
  });

  proBtns.forEach(btn => btn && btn.addEventListener('click', openPro));

  document.querySelectorAll('.ta-ai-qa-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.qaId;
      const action = QUICK_ACTIONS.find(a => a.id === id);
      if (!action) return;
      if (action.pro) { openPro(); return; }
      if (!action.prompt) return;
      panel.classList.add('open');
      launcher.style.display = 'none';
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
    if (e.key === 'Escape' && panel.classList.contains('open')) {
      panel.classList.remove('open');
      launcher.style.display = '';
    }
  });

  // ── pulse after 4s to draw attention ──────────────────────────────────────
  setTimeout(() => {
    if (!panel.classList.contains('open')) launcherIcon.classList.add('pulse');
  }, 4000);

  updateQuota();
})();
