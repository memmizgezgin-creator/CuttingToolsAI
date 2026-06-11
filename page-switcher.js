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

  // Cloudflare Pages strips .html → normalise so 'tools-directory' === 'tools-directory.html'
  const _rawHere = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const here = _rawHere.endsWith('.html') ? _rawHere : _rawHere + '.html';

  // ============================================================
  // TOP NAV
  // ============================================================
  const navLinks = [
    {href:'ToolAdvisor.html',     label:'Advisor',         shortLabel:'Advisor',    icon:'auto_awesome'},
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
            <span class="material-symbols-outlined" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#73777f;font-size:18px;pointer-events:none;">auto_awesome</span>
            <input id="ta-nav-search-input" type="search" placeholder="Ask about any grade, insert or material…" aria-label="Ask Advisor AI" style="
                width:100%;height:38px;
                padding:0 14px 0 38px;
                background:#F5F2EE;
                border:1px solid transparent;
                border-radius:9999px;
                font-family:inherit;font-size:13px;color:#1A1A2E;
                outline:none;
                transition:background .15s, border-color .15s, box-shadow .15s;"
              onfocus="this.style.background='#fff';this.style.borderColor='#123356';this.style.boxShadow='0 0 0 3px rgba(18,51,86,.12)';"
              onblur="this.style.background='#F5F2EE';this.style.borderColor='transparent';this.style.boxShadow='';"
              onkeydown="if(event.key==='Enter'&&this.value.trim()){var q=encodeURIComponent(this.value.trim());window.location.href='ToolAdvisor.html?q='+q;}">
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
  // SIDEBAR (filter-first design — active-state aware, count-aware)
  // ============================================================
  const toolFamilies = [
    {key:'Hole Making', iconKey:'drilling',  label:'Hole Making'},    // Consolidates Drilling + Reaming + Countersinking
    {key:'Milling',    iconKey:'milling',   label:'Milling Tools'},
    {key:'Grooving',   iconKey:'grooving',  label:'Grooving & Parting'},
    {key:'Threading',  iconKey:'threading', label:'Threading Tools'},
    // Phase 2: Turning removed (hidden, moved to Coming Soon as "Turning & Inserts")
  ];
  // Material Filter — each material gets a tone-matched mini 3D insert
  // whose SHAPE is the typical insert geometry for that ISO group.
  const materials = [
    {iso:'P', shape:'C', tone:'iso-p', label:'Steel',        color:'#3B82F6'},
    {iso:'M', shape:'V', tone:'iso-m', label:'Stainless',    color:'#F59E0B'},
    {iso:'K', shape:'W', tone:'iso-k', label:'Cast iron',    color:'#EF4444'},
    {iso:'N', shape:'R', tone:'iso-n', label:'Non-ferrous',  color:'#10B981'},
    {iso:'S', shape:'T', tone:'iso-s', label:'Superalloy',   color:'#F97316'},
    {iso:'H', shape:'D', tone:'iso-h', label:'Hardened',     color:'#64748B'},
  ];

  const isCatalogPage = here === 'tools-directory.html';
  const shouldShowSidebar = isCatalogPage;

  // Maps raw DB family names → sidebar key (mirrors directory-app.jsx FAMILY_MAP)
  const DB_TO_SIDEBAR = {
    'Drilling': 'Hole Making',
    'Reaming':  'Hole Making',
  };

  function getCounts() {
    if (!window.TA_TOOLS) return { families:{}, isos:{}, total:0, ready:false };
    const families = {}, isos = {};
    for (const t of window.TA_TOOLS) {
      if (t.family) {
        const key = DB_TO_SIDEBAR[t.family] || t.family;
        families[key] = (families[key] || 0) + 1;
      }
      const isoGroups = Array.isArray(t.iso_all) ? t.iso_all : (t.iso ? [t.iso] : []);
      for (const g of isoGroups) isos[g] = (isos[g] || 0) + 1;
    }
    return { families, isos, total: window.TA_TOOLS.length, ready:true };
  }

  function navOrFilter(kind, value) {
    // On catalog page: in-page filter event. Elsewhere: navigate to catalog with URL param.
    if (isCatalogPage) {
      window.dispatchEvent(new CustomEvent(`ta:${kind}-filter`, { detail: { [kind]: value } }));
    } else {
      const params = new URLSearchParams();
      if (value) params.set(kind, value);
      const qs = params.toString();
      window.location.href = `tools-directory.html${qs ? '?' + qs : ''}`;
    }
  }

  function buildSidebar() {
    const aside = document.createElement('aside');
    aside.className = 'ta-sidebar';
    aside.setAttribute('data-ta-chrome', '1');
    aside.style.cssText = `
      position:fixed;left:0;top:64px;
      width:260px;height:calc(100vh - 64px);
      background:#F5F2EE;border-right:1px solid #E8E4DE;
      display:flex;flex-direction:column;
      z-index:30;
      font-family:"DM Sans",system-ui,sans-serif;`;

    const sectionLabel = (txt) => `
      <div style="margin:14px 18px 6px;">
        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#8A8A9A;font-weight:700;margin:0;">${txt}</p>
      </div>`;

    const counts = getCounts();

    // Filter status header
    const statusHTML = `
      <div data-ta-filter-status style="padding:16px 14px 12px;border-bottom:1px solid #E8E4DE;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span class="material-symbols-outlined" style="font-size:18px;color:#123356;">filter_alt</span>
          <p style="font-family:'Nunito',sans-serif;font-weight:700;font-size:13px;color:#123356;margin:0;flex:1;">Filters</p>
          <span data-ta-filter-count style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.10em;color:#8A8A9A;font-weight:600;">Brand-neutral</span>
        </div>
        <div data-ta-active-chips style="display:none;flex-wrap:wrap;gap:4px;margin-top:6px;"></div>
        <button data-ta-clear style="display:none;margin-top:8px;background:transparent;border:none;color:#123356;font-size:11px;font-weight:700;cursor:pointer;text-decoration:underline;padding:0;">Clear all filters</button>
        <button data-ta-all data-active="true" style="
            display:flex;align-items:center;gap:8px;width:100%;
            padding:8px 10px;margin-top:6px;border-radius:8px;border:none;
            background:#fff;color:#123356;cursor:pointer;
            font-family:'Nunito',sans-serif;font-weight:700;font-size:13px;
            box-shadow: inset 3px 0 0 0 #123356;
            transition:background .15s;">
          <span class="material-symbols-outlined" style="font-size:18px;">inventory_2</span>
          <span style="flex:1;text-align:left;">All tools</span>
        </button>
      </div>`;

    // Tool family row — clickable, active state (no counts: keeps catalog scale neutral)
    const toolItem = (it) => {
      // Hide family button if no tools in this category yet
      const famCount = counts.ready ? (counts.families[it.key] || 0) : -1;
      const displayStyle = famCount === 0 ? 'display:none;' : 'display:flex;';
      return `
        <button data-ta-family="${it.key}" class="ta-sb-item ta-sb-family" style="
            ${displayStyle}align-items:center;gap:12px;width:calc(100% - 16px);
            padding:8px 12px;margin:0 8px 1px;border-radius:10px;border:none;
            background:transparent;color:#43474e;cursor:pointer;
            font-family:'Nunito',sans-serif;font-weight:500;font-size:14px;text-align:left;
            transition:background .15s,color .15s,box-shadow .2s;">
          <span class="ta-sb-glyph" style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;color:#43474e;transition:color .15s;">
            <span class="ta-tool-icon" data-icon="${it.iconKey}" data-size="20"></span>
          </span>
          <span style="flex:1;">${it.label}</span>
          <span data-ta-family-count="${it.key}" style="font-family:'DM Mono',monospace;font-size:10px;color:#8A8A9A;font-weight:700;"></span>
        </button>`;
    };

    // Material tile — bigger 3D insert, color-coded (no counts)
    const matItem = (it) => {
      return `
        <button data-ta-iso="${it.iso}" class="ta-sb-item ta-sb-mat" style="
            position:relative;
            display:flex;align-items:center;gap:10px;width:calc(100% - 16px);
            padding:9px 10px;margin:0 8px 4px;border-radius:10px;
            background:#fff;border:1px solid #ECE7E0;cursor:pointer;
            color:#43474e;text-align:left;
            font-family:'Nunito',sans-serif;font-weight:600;font-size:13px;
            transition:transform .15s, box-shadow .2s, border-color .2s;">
          <span class="ta-insert3d" data-shape="${it.shape}" data-tone="${it.tone}" data-size="xs" style="flex-shrink:0;width:32px;height:32px;"></span>
          <span style="flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.15;">
            <span style="color:#1A1A2E;">${it.label}</span>
            <span style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.12em;color:${it.color};font-weight:800;margin-top:2px;">ISO ${it.iso}</span>
          </span>
          <span data-ta-iso-count="${it.iso}" style="font-family:'DM Mono',monospace;font-size:10px;color:#8A8A9A;font-weight:700;"></span>
        </button>`;
    };

    aside.innerHTML = `
      ${statusHTML}
      <div style="flex:1;overflow-y:auto;padding:6px 0 8px;" class="custom-scrollbar">
        ${sectionLabel('Tool family')}
        ${toolFamilies.map(toolItem).join('')}
        ${sectionLabel('ISO material group')}
        ${materials.map(matItem).join('')}

        ${sectionLabel('Pro features')}
        <button data-modal-open="pro-upgrade" class="ta-sb-item ta-sb-pro" style="
            display:flex;align-items:center;gap:12px;width:calc(100% - 16px);
            padding:8px 12px;margin:0 8px 1px;border-radius:10px;border:none;
            background:transparent;color:#92400E;cursor:pointer;
            font-family:'Nunito',sans-serif;font-weight:600;font-size:13px;text-align:left;
            transition:background .15s;">
          <span class="material-symbols-outlined" style="font-size:18px;color:#B45309;">bookmark_added</span>
          <span style="flex:1;">Saved searches</span>
          <span style="background:linear-gradient(135deg,#FBBF24,#D97706);color:#fff;font-size:9px;font-weight:900;letter-spacing:.10em;padding:2px 6px;border-radius:5px;text-transform:uppercase;">Pro</span>
        </button>
        <button data-modal-open="pro-upgrade" class="ta-sb-item ta-sb-pro" style="
            display:flex;align-items:center;gap:12px;width:calc(100% - 16px);
            padding:8px 12px;margin:0 8px 1px;border-radius:10px;border:none;
            background:transparent;color:#92400E;cursor:pointer;
            font-family:'Nunito',sans-serif;font-weight:600;font-size:13px;text-align:left;
            transition:background .15s;">
          <span class="material-symbols-outlined" style="font-size:18px;color:#B45309;">picture_as_pdf</span>
          <span style="flex:1;">Bulk PDF export</span>
          <span style="background:linear-gradient(135deg,#FBBF24,#D97706);color:#fff;font-size:9px;font-weight:900;letter-spacing:.10em;padding:2px 6px;border-radius:5px;text-transform:uppercase;">Pro</span>
        </button>
      </div>

      <div style="padding:10px 14px 14px;border-top:1px solid #E8E4DE;">
        <a href="pro.html" data-modal-open="pro-upgrade" style="
            position:relative;overflow:hidden;
            display:flex;align-items:center;gap:10px;
            background:linear-gradient(135deg,#1a3554 0%,#123356 100%);color:#fff;
            padding:12px 14px;border-radius:12px;
            font-family:'Nunito',sans-serif;font-weight:700;font-size:13px;
            text-decoration:none;cursor:pointer;
            transition:transform .15s, box-shadow .15s;"
            onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 18px rgba(18,51,86,.28)';"
            onmouseout="this.style.transform='';this.style.boxShadow='';">
          <span class="material-symbols-outlined" style="font-size:20px;color:#FBBF24;">workspace_premium</span>
          <span style="flex:1;">
            <span style="display:block;line-height:1.15;">Upgrade to Pro</span>
            <span style="display:block;font-family:'DM Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.10em;color:rgba(255,255,255,.6);margin-top:2px;text-transform:uppercase;">Unlimited answers</span>
          </span>
          <span class="material-symbols-outlined" style="font-size:16px;color:rgba(255,255,255,.5);">arrow_forward</span>
        </a>
        <div style="margin-top:10px;display:flex;gap:14px;">
          <a href="#" class="ta-sb-foot" style="display:flex;align-items:center;gap:6px;color:#73777f;text-decoration:none;font-size:11px;font-weight:600;">
            <span class="material-symbols-outlined" style="font-size:14px;">help</span>
            <span>Help</span>
          </a>
          <a href="#" class="ta-sb-foot" style="display:flex;align-items:center;gap:6px;color:#73777f;text-decoration:none;font-size:11px;font-weight:600;">
            <span class="material-symbols-outlined" style="font-size:14px;">description</span>
            <span>Docs</span>
          </a>
        </div>
      </div>`;

    return aside;
  }

  // Sidebar state sync — set/clear active visual state on family + material items
  function applySidebarState(sb, state) {
    const { family, iso, brand } = state || {};
    // All tools button: active when no family + no iso
    const all = sb.querySelector('[data-ta-all]');
    if (all) {
      const isAll = !family && !iso;
      all.setAttribute('data-active', isAll ? 'true' : 'false');
      all.style.background = isAll ? '#fff' : 'transparent';
      all.style.boxShadow = isAll ? 'inset 3px 0 0 0 #123356' : 'none';
      all.style.color = isAll ? '#123356' : '#43474e';
    }
    sb.querySelectorAll('.ta-sb-family').forEach(el => {
      const on = el.dataset.taFamily === family;
      el.setAttribute('data-active', on ? 'true' : 'false');
      el.style.background = on ? '#fff' : 'transparent';
      el.style.color = on ? '#123356' : '#43474e';
      el.style.boxShadow = on ? 'inset 3px 0 0 0 #123356, 0 2px 6px rgba(18,51,86,.08)' : 'none';
      el.style.fontWeight = on ? 700 : 500;
      const g = el.querySelector('.ta-sb-glyph'); if (g) g.style.color = on ? '#123356' : '#43474e';
    });
    sb.querySelectorAll('.ta-sb-mat').forEach(el => {
      const on = el.dataset.taIso === iso;
      el.setAttribute('data-active', on ? 'true' : 'false');
      const color = materials.find(m => m.iso === el.dataset.taIso)?.color || '#123356';
      el.style.borderColor = on ? color : '#ECE7E0';
      el.style.boxShadow = on ? `inset 4px 0 0 0 ${color}, 0 4px 12px ${color}22` : 'none';
      el.style.transform = on ? 'translateX(2px)' : '';
    });

    // Filter status section
    const chipsHost = sb.querySelector('[data-ta-active-chips]');
    const clearBtn  = sb.querySelector('[data-ta-clear]');
    if (chipsHost && clearBtn) {
      const chips = [];
      if (family) chips.push({ label: family, kind:'family' });
      if (iso)    chips.push({ label: `ISO ${iso}`, kind:'iso' });
      if (chips.length) {
        chipsHost.style.display = 'flex';
        clearBtn.style.display = 'block';
        chipsHost.innerHTML = chips.map(c => `
          <span style="display:inline-flex;align-items:center;gap:4px;background:#123356;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;letter-spacing:.02em;">
            ${c.label}
          </span>`).join('');
      } else {
        chipsHost.style.display = 'none';
        clearBtn.style.display = 'none';
        chipsHost.innerHTML = '';
      }
    }
  }

  function refreshSidebarCounts(sb) {
    const counts = getCounts();
    if (!counts.ready) return;
    // Do not display a total count — avoid implying catalog scale

    // Family buttons: show/hide based on count; never display count number
    sb.querySelectorAll('[data-ta-family-count]').forEach(el => {
      el.textContent = ''; // never show count number
      const btn = el.closest('.ta-sb-family');
      if (!btn) return;
      const count = counts.families[el.dataset.taFamilyCount] || 0;
      btn.style.display = count === 0 ? 'none' : 'flex';
    });

    // ISO material tiles: show/hide based on count; never display count number
    sb.querySelectorAll('[data-ta-iso-count]').forEach(el => {
      el.textContent = ''; // never show count number
      const btn = el.closest('.ta-sb-mat');
      if (!btn) return;
      const count = counts.isos[el.dataset.taIsoCount] || 0;
      btn.style.display = count === 0 ? 'none' : 'flex';
    });
  }

  function installSidebar() {
    document.querySelectorAll('body > aside').forEach(a => a.remove());

    const sb = buildSidebar();
    document.body.insertBefore(sb, document.body.firstChild.nextSibling);

    // Hover styles — only affect non-active items
    sb.querySelectorAll('.ta-sb-item').forEach(el => {
      const isMat = el.classList.contains('ta-sb-mat');
      el.addEventListener('mouseenter',()=>{
        if (el.getAttribute('data-active') === 'true') return;
        if (isMat) { el.style.borderColor = '#C7C2BA'; el.style.transform = 'translateX(1px)'; }
        else { el.style.background='#FFFFFF';el.style.color='#123356'; const g = el.querySelector('.ta-sb-glyph'); if (g) g.style.color = '#123356'; }
      });
      el.addEventListener('mouseleave',()=>{
        if (el.getAttribute('data-active') === 'true') return;
        if (isMat) { el.style.borderColor = '#ECE7E0'; el.style.transform = ''; }
        else { el.style.background='transparent';el.style.color='#43474e'; const g = el.querySelector('.ta-sb-glyph'); if (g) g.style.color = '#43474e'; }
      });
    });

    // All-tools button → clear filters
    sb.querySelector('[data-ta-all]')?.addEventListener('click', () => {
      if (isCatalogPage) {
        window.dispatchEvent(new CustomEvent('ta:clear-filters'));
      } else {
        window.location.href = 'tools-directory.html';
      }
    });
    sb.querySelector('[data-ta-clear]')?.addEventListener('click', () => {
      if (isCatalogPage) {
        window.dispatchEvent(new CustomEvent('ta:clear-filters'));
      } else {
        window.location.href = 'tools-directory.html';
      }
    });

    // Tool family clicks
    sb.querySelectorAll('.ta-sb-family').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const fam = el.dataset.taFamily;
        const wasActive = el.getAttribute('data-active') === 'true';
        navOrFilter('family', wasActive ? null : fam);
      });
    });

    // Material clicks (event uses iso letter directly now)
    sb.querySelectorAll('.ta-sb-mat').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const iso = el.dataset.taIso;
        const wasActive = el.getAttribute('data-active') === 'true';
        navOrFilter('iso', wasActive ? null : iso);
      });
    });
    sb.querySelectorAll('.ta-sb-foot').forEach(el => {
      el.addEventListener('mouseenter',()=>{el.style.color='#123356';});
      el.addEventListener('mouseleave',()=>{el.style.color='#73777f';});
    });

    // Hydrate 3D inserts & tool icons (defer scripts may not have finished by now)
    const tryHydrate = () => {
      if (window.taInsert3DHydrate)  window.taInsert3DHydrate(sb);
      if (window.taToolIconHydrate)  window.taToolIconHydrate(sb);
    };
    tryHydrate();
    setTimeout(tryHydrate, 60);
    setTimeout(tryHydrate, 250);

    // Listen for state broadcasts from catalog page → update active visuals
    window.addEventListener('ta:filter-state', (e) => applySidebarState(sb, e.detail || {}));

    // Wait for TA_TOOLS to be ready and refresh counts
    const waitForData = (tries=20) => {
      if (window.TA_TOOLS) { refreshSidebarCounts(sb); return; }
      if (tries <= 0) return;
      setTimeout(() => waitForData(tries - 1), 80);
    };
    waitForData();

    // Apply initial URL params (for cross-page filter handoff)
    if (isCatalogPage) {
      const p = new URLSearchParams(location.search);
      const fam = p.get('family');
      const iso = p.get('iso');
      if (fam || iso) {
        // Wait until React App mounts (Babel compile can take >2s), then push
        // until React echoes the state back. The ready marker can render before
        // React's effect listeners are attached, so a single dispatch is racy.
        let applied = false;
        const onState = (e) => {
          const state = e.detail || {};
          const familyOk = !fam || state.family === fam;
          const isoOk = !iso || state.iso === iso;
          if (familyOk && isoOk) {
            applied = true;
            window.removeEventListener('ta:filter-state', onState);
          }
        };
        window.addEventListener('ta:filter-state', onState);
        const dispatch = () => {
          if (fam) window.dispatchEvent(new CustomEvent('ta:family-filter', { detail:{ family: fam } }));
          if (iso) window.dispatchEvent(new CustomEvent('ta:iso-filter', { detail:{ iso } }));
        };
        const push = (tries=80) => {
          if (applied) return;
          if (window.TA_TOOLS && document.querySelector('#catalog-root [data-app-ready]')) {
            dispatch();
            if (tries <= 0) window.removeEventListener('ta:filter-state', onState);
            else setTimeout(() => push(tries - 1), 150);
            return;
          }
          if (tries <= 0) {
            dispatch();
            window.removeEventListener('ta:filter-state', onState);
            return;
          }
          setTimeout(() => push(tries - 1), 100);
        };
        push();
      }
    }

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
  function fixMainLayout(withSidebar) {
    const mains = document.querySelectorAll('main');
    mains.forEach(m => {
      const apply = () => {
        if (withSidebar && window.innerWidth >= 768) {
          m.style.marginLeft = '260px';
        } else {
          m.style.marginLeft = '0';
        }
      };
      apply();
      window.addEventListener('resize', apply);
    });

    // Same for footers
    document.querySelectorAll('body > footer, main + footer').forEach(f => {
      const apply = () => {
        if (withSidebar && window.innerWidth >= 768) {
          f.style.marginLeft = '260px';
        } else {
          f.style.marginLeft = '0';
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
    const _rawH = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const here = _rawH.endsWith('.html') ? _rawH : _rawH + '.html';
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
    if (shouldShowSidebar) installSidebar();
    fixMainLayout(shouldShowSidebar);
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
