// ToolAdvisor — shared chrome (top nav + sidebar + modal system loader)
// One script applied to every page; edit here to propagate everywhere.
(function(){

  // ---- Inject modals.css + modals.js (so every page picks up the global modal system) ----
  function injectAsset(tag, attrs) {
    const key = attrs.href ? 'href' : 'src';
    const val = attrs[key];
    if (document.querySelector(`${tag}[${key}="${val}"]`)) return;
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
    document.head.appendChild(el);
  }
  injectAsset('link', {rel:'stylesheet', href:'modals.css'});
  injectAsset('script', {src:'modals.js', defer:''});
  injectAsset('script', {src:'ta-3d-insert.js', defer:''});
  injectAsset('script', {src:'ta-tool-icons.js', defer:''});

  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  // ============================================================
  // TOP NAV
  // ============================================================
  const navLinks = [
    {href:'ToolAdvisor.html',     label:'Advisor',         shortLabel:'Advisor',    icon:'auto_awesome'},
    {href:'tools-directory.html', label:'Catalog',         shortLabel:'Catalog',    icon:'inventory_2'},
    {href:'cross-reference.html', label:'Cross-Reference', shortLabel:'Cross-Ref',  icon:'compare_arrows'},
    {href:'compare.html',         label:'Compare',         shortLabel:'Compare',    icon:'fact_check'},
    {href:'knowledge.html',       label:'Knowledge',       shortLabel:'Knowledge',  icon:'menu_book'},
  ];

  function buildHeader() {
    const header = document.createElement('header');
    header.className = 'ta-top-nav';
    header.setAttribute('data-ta-chrome', '1');
    header.style.cssText = `
      position:sticky;top:0;left:0;right:0;width:100%;
      background:rgba(255,255,255,.95);backdrop-filter:blur(8px);
      border-bottom:1px solid #E8E4DE;z-index:50;
      font-family:"DM Sans",system-ui,sans-serif;`;

    const linksHTML = navLinks.map(l => {
      const active = l.href.toLowerCase() === here;
      return `
        <a href="${l.href}" class="ta-nav-link" data-active="${active}" style="
            display:inline-flex;align-items:center;gap:8px;
            padding:8px 12px;border-radius:8px;
            font-size:14px;font-weight:${active?700:500};
            color:${active?'#123356':'#43474e'};
            background:${active?'#F0EDE8':'transparent'};
            text-decoration:none;white-space:nowrap;flex-shrink:0;
            transition:background .15s,color .15s;">
          <span class="material-symbols-outlined" style="font-size:18px;">${l.icon}</span>
          <span class="ta-nav-label-full">${l.label}</span>
          <span class="ta-nav-label-short" style="display:none;">${l.shortLabel}</span>
        </a>`;
    }).join('');

    const proActive = here === 'pro.html';
    const profileActive = here === 'profile.html';

    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;padding:0 24px;height:64px;">
        <a href="ToolAdvisor.html" style="display:flex;align-items:center;gap:10px;margin-right:8px;text-decoration:none;flex-shrink:0;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;background:#123356;border-radius:8px;">
            <span class="material-symbols-outlined" style="color:#fff;font-size:20px;">precision_manufacturing</span>
          </span>
          <span style="font-family:'Nunito',sans-serif;font-weight:800;font-size:18px;color:#123356;letter-spacing:-0.01em;">ToolAdvisor</span>
        </a>

        <nav class="ta-nav-primary" style="display:flex;align-items:center;gap:2px;min-width:0;flex-shrink:1;overflow-x:auto;">
          ${linksHTML}
        </nav>

        <div class="ta-nav-search" style="flex:1;max-width:340px;margin-left:auto;min-width:0;">
          <div style="position:relative;width:100%;">
            <span class="material-symbols-outlined" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#73777f;font-size:18px;pointer-events:none;">search</span>
            <input type="search" placeholder="Search tools, materials, geometries…" aria-label="Search" style="
                width:100%;height:38px;
                padding:0 14px 0 38px;
                background:#F5F2EE;
                border:1px solid transparent;
                border-radius:9999px;
                font-family:inherit;font-size:13px;color:#1A1A2E;
                outline:none;
                transition:background .15s, border-color .15s, box-shadow .15s;"
              onfocus="this.style.background='#fff';this.style.borderColor='#123356';this.style.boxShadow='0 0 0 3px rgba(18,51,86,.12)';"
              onblur="this.style.background='#F5F2EE';this.style.borderColor='transparent';this.style.boxShadow='';">
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <button data-modal-open="notifications" aria-label="Notifications" style="
              position:relative;width:38px;height:38px;border-radius:10px;
              border:none;background:transparent;color:#123356;cursor:pointer;
              display:inline-flex;align-items:center;justify-content:center;
              transition:background .15s;"
              onmouseover="this.style.background='#F5F2EE';"
              onmouseout="this.style.background='transparent';">
            <span class="material-symbols-outlined" style="font-size:22px;">notifications</span>
            <span style="position:absolute;top:8px;right:9px;width:7px;height:7px;background:#EF4444;border-radius:50%;border:2px solid #fff;"></span>
          </button>
          <button data-modal-open="settings" aria-label="Settings" style="
              width:38px;height:38px;border-radius:10px;
              border:none;background:transparent;color:#123356;cursor:pointer;
              display:inline-flex;align-items:center;justify-content:center;
              transition:background .15s;"
              onmouseover="this.style.background='#F5F2EE';"
              onmouseout="this.style.background='transparent';">
            <span class="material-symbols-outlined" style="font-size:22px;">settings</span>
          </button>
          <a href="pro.html" class="ta-pro-link" data-modal-open="pro-upgrade" style="
              display:none;align-items:center;gap:6px;
              padding:8px 12px;border-radius:8px;
              font-size:14px;font-weight:${proActive?700:600};
              color:#123356;
              background:${proActive?'#F0EDE8':'transparent'};
              text-decoration:none;white-space:nowrap;">
            <span class="material-symbols-outlined" style="font-size:18px;color:#F59E0B;">workspace_premium</span>
            <span>Pro</span>
          </a>
          <a href="profile.html" data-modal-open="sign-in" style="
              padding:8px 14px;border-radius:8px;font-size:14px;font-weight:600;
              color:#123356;text-decoration:none;white-space:nowrap;cursor:pointer;
              background:${profileActive?'#F0EDE8':'transparent'};">Sign in</a>
          <a href="profile.html" data-modal-open="sign-up" style="
              display:inline-flex;align-items:center;gap:6px;
              padding:8px 14px;border-radius:8px;font-size:14px;font-weight:700;
              background:#123356;color:#fff;text-decoration:none;white-space:nowrap;
              transition:transform .15s, box-shadow .15s;"
              onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(18,51,86,.18)';"
              onmouseout="this.style.transform='';this.style.boxShadow='';">
            <span>Sign up</span>
            <span class="material-symbols-outlined" style="font-size:16px;">arrow_forward</span>
          </a>
        </div>
      </div>`;
    return header;
  }

  function installTopNav() {
    document.querySelectorAll('body > header').forEach(h => h.remove());
    document.querySelectorAll('main > header').forEach(h => h.remove());

    const newHeader = buildHeader();
    document.body.insertBefore(newHeader, document.body.firstChild);

    newHeader.querySelectorAll('.ta-nav-link').forEach(el=>{
      const active = el.getAttribute('data-active') === 'true';
      if (!active) {
        el.addEventListener('mouseenter',()=>{el.style.background='#F5F2EE';el.style.color='#123356';});
        el.addEventListener('mouseleave',()=>{el.style.background='transparent';el.style.color='#43474e';});
      }
    });

    const applyResponsive = () => {
      const w = window.innerWidth;
      newHeader.querySelectorAll('.ta-nav-label-full').forEach(el => {
        el.style.display = (w >= 1280) ? '' : 'none';
      });
      newHeader.querySelectorAll('.ta-nav-label-short').forEach(el => {
        el.style.display = (w >= 768 && w < 1280) ? '' : 'none';
      });
      const proLink = newHeader.querySelector('.ta-pro-link');
      if (proLink) proLink.style.display = (w >= 1440) ? 'inline-flex' : 'none';
      // Hide search on narrow viewports to keep auth buttons visible
      const searchWrap = newHeader.querySelector('.ta-nav-search');
      if (searchWrap) searchWrap.style.display = (w >= 1024) ? '' : 'none';
    };
    applyResponsive();
    window.addEventListener('resize', applyResponsive);
  }

  // ============================================================
  // SIDEBAR (Precision Intelligence + Tool Families + Material Filter)
  // ============================================================
  const toolFamilies = [
    {iconKey:'turning',   label:'Turning Inserts'},
    {iconKey:'milling',   label:'Milling Tools'},
    {iconKey:'drilling',  label:'Drilling Tools'},
    {iconKey:'reamers',   label:'Reamers'},
    {iconKey:'threading', label:'Threading Tools'},
    {iconKey:'grooving',  label:'Grooving & Parting'},
  ];
  // Material Filter — each material gets a tone-matched mini 3D insert
  // whose SHAPE is the typical insert geometry for that ISO group.
  const materials = [
    {shape:'C', tone:'iso-p', label:'ISO P Steel',       color:'#3B82F6'},
    {shape:'V', tone:'iso-m', label:'ISO M Stainless',   color:'#F59E0B'},
    {shape:'W', tone:'iso-k', label:'ISO K Cast Iron',   color:'#EF4444'},
    {shape:'R', tone:'iso-n', label:'ISO N Non-Ferrous', color:'#10B981'},
    {shape:'T', tone:'iso-s', label:'ISO S Superalloys', color:'#F97316'},
    {shape:'D', tone:'iso-h', label:'ISO H Hardened',    color:'#64748B'},
  ];

  function buildSidebar() {
    const aside = document.createElement('aside');
    aside.className = 'ta-sidebar';
    aside.setAttribute('data-ta-chrome', '1');
    aside.style.cssText = `
      position:fixed;left:0;top:64px;
      width:260px;height:calc(100vh - 64px);
      background:#F5F2EE;border-right:1px solid #E8E4DE;
      display:flex;flex-direction:column;
      padding:24px 0;
      z-index:30;
      font-family:"DM Sans",system-ui,sans-serif;`;

    const brandHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:0 20px;margin-bottom:24px;">
        <div style="width:40px;height:40px;background:#123356;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span class="material-symbols-outlined" style="color:#fff;font-size:22px;">precision_manufacturing</span>
        </div>
        <div style="min-width:0;">
          <p style="font-family:'Nunito',sans-serif;font-weight:700;font-size:15px;color:#123356;margin:0;line-height:1.2;">Precision Intelligence</p>
          <p style="font-size:12px;color:#43474e;margin:2px 0 0;">Tool Decision Platform</p>
        </div>
      </div>`;

    const sectionLabel = (txt) => `
      <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8A8A9A;font-weight:600;margin:18px 20px 8px;">${txt}</p>`;

    // Tool family row — custom SVG glyph + label
    const toolItem = (it) => `
      <a href="#" class="ta-sb-item" style="
          display:flex;align-items:center;gap:12px;
          padding:7px 14px;margin:0 8px;border-radius:10px;
          color:#43474e;
          font-family:'Nunito',sans-serif;font-weight:500;font-size:14px;
          text-decoration:none;transition:background .15s,color .15s;">
        <span class="ta-sb-glyph" style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;color:#43474e;transition:color .15s;">
          <span class="ta-tool-icon" data-icon="${it.iconKey}" data-size="20"></span>
        </span>
        <span>${it.label}</span>
      </a>`;

    // Material row — mini 3D insert + label.
    // Using inline data-attrs; the 3D hydrator picks it up after we render.
    const matItem = (it) => `
      <a href="#" class="ta-sb-item ta-sb-mat" data-mat-key="${it.shape}" style="
          display:flex;align-items:center;gap:12px;
          padding:8px 14px;margin:0 8px;border-radius:10px;
          color:#43474e;
          font-family:'Nunito',sans-serif;font-weight:500;font-size:14px;
          text-decoration:none;transition:background .15s,color .15s,box-shadow .2s;
          position:relative;">
        <span class="ta-insert3d" data-shape="${it.shape}" data-tone="${it.tone}" data-size="xs" style="flex-shrink:0;"></span>
        <span style="display:flex;flex-direction:column;line-height:1.2;">
          <span>${it.label.replace(/^ISO\s\w\s/, '')}</span>
          <span style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.10em;color:${it.color};font-weight:700;margin-top:2px;">ISO ${it.label.match(/ISO\s(\w)/)?.[1]||''}</span>
        </span>
      </a>`;

    aside.innerHTML = `
      ${brandHTML}
      <div style="flex:1;overflow-y:auto;padding-bottom:8px;" class="custom-scrollbar">
        ${sectionLabel('Tool Families')}
        ${toolFamilies.map(toolItem).join('')}
        ${sectionLabel('Material Filter')}
        ${materials.map(matItem).join('')}
      </div>
      <div style="padding:0 16px;margin-top:8px;">
        <a href="pro.html" data-modal-open="pro-upgrade" style="
            display:flex;align-items:center;justify-content:center;gap:8px;
            background:#123356;color:#fff;
            padding:11px 16px;border-radius:10px;
            font-family:'Nunito',sans-serif;font-weight:700;font-size:13px;
            text-decoration:none;letter-spacing:.02em;cursor:pointer;
            transition:transform .15s, box-shadow .15s;"
            onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(18,51,86,.2)';"
            onmouseout="this.style.transform='';this.style.boxShadow='';">
          Upgrade to Pro
        </a>
        <div style="border-top:1px solid #E8E4DE;margin-top:14px;padding-top:12px;display:flex;flex-direction:column;gap:6px;">
          <a href="#" class="ta-sb-foot" style="display:flex;align-items:center;gap:10px;padding:6px 6px;color:#43474e;text-decoration:none;font-size:13px;font-weight:500;">
            <span class="material-symbols-outlined" style="font-size:18px;">help</span>
            <span>Help Center</span>
          </a>
          <a href="#" class="ta-sb-foot" style="display:flex;align-items:center;gap:10px;padding:6px 6px;color:#43474e;text-decoration:none;font-size:13px;font-weight:500;">
            <span class="material-symbols-outlined" style="font-size:18px;">description</span>
            <span>Documentation</span>
          </a>
        </div>
      </div>`;

    return aside;
  }

  function installSidebar() {
    // Remove any existing <aside> at top level so we don't double up
    document.querySelectorAll('body > aside').forEach(a => a.remove());

    // Hide sidebar on narrow viewports
    const sb = buildSidebar();
    document.body.insertBefore(sb, document.body.firstChild.nextSibling);

    // Hover styles
    sb.querySelectorAll('.ta-sb-item').forEach(el => {
      el.addEventListener('mouseenter',()=>{
        if (el.getAttribute('data-active') === 'true') return;
        el.style.background='#FFFFFF';el.style.color='#123356';
        const g = el.querySelector('.ta-sb-glyph'); if (g) g.style.color = '#123356';
      });
      el.addEventListener('mouseleave',()=>{
        if (el.getAttribute('data-active') === 'true') return;
        el.style.background='transparent';el.style.color='#43474e';
        const g = el.querySelector('.ta-sb-glyph'); if (g) g.style.color = '#43474e';
      });
    });

    // Material filter: click-to-toggle. Only one active at a time (radio).
    // State is local — broadcasts a window event so other parts of the page can react.
    const materialKeys = Array.from(sb.querySelectorAll('.ta-sb-mat'));
    materialKeys.forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const wasActive = el.getAttribute('data-active') === 'true';
        materialKeys.forEach(m => {
          m.removeAttribute('data-active');
          m.style.background = 'transparent';
          m.style.boxShadow = '';
        });
        if (!wasActive) {
          el.setAttribute('data-active', 'true');
          el.style.background = '#FFFFFF';
          el.style.boxShadow = 'inset 3px 0 0 0 currentColor, 0 2px 6px rgba(18,51,86,.10)';
        }
        window.dispatchEvent(new CustomEvent('ta:material-filter', {
          detail: { shape: wasActive ? null : el.dataset.matKey }
        }));
      });
    });
    sb.querySelectorAll('.ta-sb-foot').forEach(el => {
      el.addEventListener('mouseenter',()=>{el.style.color='#123356';});
      el.addEventListener('mouseleave',()=>{el.style.color='#43474e';});
    });

    // Hydrate freshly injected 3D inserts & tool icons (defer scripts may not
    // have finished by now; retry on next tick if helpers are missing).
    const tryHydrate = () => {
      if (window.taInsert3DHydrate)  window.taInsert3DHydrate(sb);
      if (window.taToolIconHydrate)  window.taToolIconHydrate(sb);
    };
    tryHydrate();
    setTimeout(tryHydrate, 60);
    setTimeout(tryHydrate, 250);

    // Show / hide on viewport size
    const applyResponsive = () => {
      sb.style.display = (window.innerWidth >= 768) ? 'flex' : 'none';
    };
    applyResponsive();
    window.addEventListener('resize', applyResponsive);
  }

  // ============================================================
  // Layout fix: push <main> right by 260px so it doesn't sit under sidebar
  // ============================================================
  function fixMainLayout() {
    const mains = document.querySelectorAll('main');
    mains.forEach(m => {
      const apply = () => {
        if (window.innerWidth >= 768) {
          m.style.marginLeft = '260px';
        } else {
          m.style.marginLeft = '';
        }
      };
      apply();
      window.addEventListener('resize', apply);
    });

    // Same for footers
    document.querySelectorAll('body > footer, main + footer').forEach(f => {
      const apply = () => {
        if (window.innerWidth >= 768) {
          f.style.marginLeft = '260px';
        } else {
          f.style.marginLeft = '';
        }
      };
      apply();
      window.addEventListener('resize', apply);
    });
  }

  // ============================================================
  // FAB — wire the floating button(s) into the advisor wizard
  // ============================================================
  function rewireFabs() {
    const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    // Per-page action: catalog → filter, knowledge → search focus, else → advisor
    const target = {
      'tools-directory.html': { modal: 'filter',          icon: 'tune',            label: 'Advanced filters' },
      'knowledge.html':       { modal: null,              icon: 'search',          label: 'Search guides',          action: 'focus-search' },
      'cross-reference.html': { modal: 'advisor-wizard',  icon: 'auto_awesome',    label: 'Start advisor' },
      'compare.html':         { modal: 'advisor-wizard',  icon: 'auto_awesome',    label: 'Start advisor' },
      'profile.html':         { modal: null,              icon: null,              label: null,                     action: 'remove' },
      'pro.html':             { modal: 'advisor-wizard',  icon: 'auto_awesome',    label: 'Start advisor' },
    }[here] || { modal: 'advisor-wizard', icon: 'auto_awesome', label: 'Start advisor' };

    document.querySelectorAll('button.fixed.bottom-8.right-8, button[class*="fixed"][class*="bottom-8"][class*="right-8"]').forEach(fab => {
      if (target.action === 'remove') { fab.remove(); return; }
      if (target.icon) {
        const span = fab.querySelector('.material-symbols-outlined');
        if (span) span.textContent = target.icon;
      }
      if (target.label) fab.setAttribute('aria-label', target.label);
      // Strip noisy hover-rotate animation if present
      const ico = fab.querySelector('.material-symbols-outlined');
      if (ico) ico.classList.remove('group-hover:rotate-90');
      fab.classList.remove('group');

      if (target.modal) {
        fab.setAttribute('data-modal-open', target.modal);
        // Tooltip
        fab.title = target.label || '';
      } else if (target.action === 'focus-search') {
        fab.addEventListener('click', (e) => {
          e.preventDefault();
          const input = document.querySelector('.ta-nav-search input') ||
                        document.querySelector('input[type="search"], input[placeholder*="earch" i]');
          if (input) { input.focus(); window.scrollTo({top:0, behavior:'smooth'}); }
        });
      }
    });
  }

  // ============================================================
  function run() {
    installTopNav();
    installSidebar();
    fixMainLayout();
    rewireFabs();
    // Re-attach modals.js search-dropdown to the newly-injected search input(s).
    // page-switcher runs at DOMContentLoaded; modals.js (deferred) ran a tick earlier
    // and scanned for inputs before our chrome existed.
    const rescan = () => { if (window.TA && TA.attachSearchDropdowns) TA.attachSearchDropdowns(); };
    rescan();
    setTimeout(rescan, 50); // belt-and-braces in case modals.js loads late
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
