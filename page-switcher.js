// Floating page-switcher injected into all pages
(function(){
  const pages = [
    {href:'ToolAdvisor.html',       label:'Advisor'},
    {href:'tools-directory.html',   label:'Catalog'},
    {href:'cross-reference.html',   label:'Cross-Reference'},
    {href:'compare.html',           label:'Compare'},
    {href:'knowledge.html',         label:'Knowledge'},
    {href:'pro.html',               label:'Pro'},
  ];
  const here = location.pathname.split('/').pop() || 'ToolAdvisor.html';
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border:1px solid #E8E4DE;border-radius:999px;padding:6px;display:flex;gap:4px;box-shadow:0 8px 24px rgba(0,0,0,.08);font-family:"DM Sans",system-ui,sans-serif;';
  pages.forEach(p=>{
    const a = document.createElement('a');
    a.href = p.href;
    a.textContent = p.label;
    const active = p.href === here;
    a.style.cssText = 'padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600;text-decoration:none;transition:all .15s;'+
      (active ? 'background:#2C4A6E;color:#fff;' : 'color:#1A1A2E;');
    if(!active){
      a.addEventListener('mouseenter',()=>a.style.background='#F5F2EE');
      a.addEventListener('mouseleave',()=>a.style.background='transparent');
    }
    bar.appendChild(a);
  });
  document.body.appendChild(bar);

  // ---- Unified sidebar nav ----
  const toolFamilies = [
    {icon:'precision_manufacturing', label:'Turning Inserts',    family:'Turning'},
    {icon:'rotate_right',            label:'Milling Tools',      family:'Milling'},
    {icon:'vertical_align_bottom',   label:'Drilling Tools',     family:'Drilling'},
    {icon:'tune',                    label:'Reamers',            family:'Reaming'},
    {icon:'linear_scale',            label:'Threading Tools',    family:'Threading'},
    {icon:'content_cut',             label:'Grooving & Parting', family:'Grooving'},
  ];
  const materials = [
    {icon:'category',                label:'ISO P Steel',       color:'#3B82F6', iso:'P'},
    {icon:'layers',                  label:'ISO M Stainless',   color:'#F59E0B', iso:'M'},
    {icon:'architecture',            label:'ISO K Cast Iron',   color:'#EF4444', iso:'K'},
    {icon:'grid_view',               label:'ISO N Non-Ferrous', color:'#10B981', iso:'N'},
    {icon:'settings_suggest',        label:'ISO S Superalloys', color:'#F97316', iso:'S'},
    {icon:'diamond',                 label:'ISO H Hardened',    color:'#64748B', iso:'H'},
  ];

  let activeFamily = null;
  let activeIso = null;

  // Read filters from URL params (for cross-page navigation)
  const params = new URLSearchParams(location.search);
  if (params.get('family')) activeFamily = params.get('family');
  if (params.get('iso')) activeIso = params.get('iso');

  function isCatalogPage() {
    return here === 'tools-directory.html';
  }

  function applyFilters() {
    const cards = document.querySelectorAll('.ta-product-card');
    if (!cards.length) return;

    let visible = 0;
    cards.forEach(card => {
      const matchFamily = !activeFamily || card.dataset.family === activeFamily;
      const matchIso = !activeIso || card.dataset.iso === activeIso;
      if (matchFamily && matchIso) {
        card.style.display = '';
        visible++;
      } else {
        card.style.display = 'none';
      }
    });

    // Show/hide empty state
    let emptyMsg = document.getElementById('ta-filter-empty');
    if (visible === 0) {
      if (!emptyMsg) {
        emptyMsg = document.createElement('div');
        emptyMsg.id = 'ta-filter-empty';
        emptyMsg.style.cssText = 'grid-column:1/-1;text-align:center;padding:48px 24px;color:#73777f;font-family:"DM Sans",sans-serif;';
        emptyMsg.innerHTML = '<span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:12px;opacity:.5">search_off</span><p style="font-size:15px;font-weight:600;margin:0 0 4px">No products found for this combination</p><p style="font-size:13px;margin:0">Try a different tool family or material filter.</p>';
        const grid = cards[0]?.parentElement;
        if (grid) grid.appendChild(emptyMsg);
      }
      emptyMsg.style.display = '';
    } else if (emptyMsg) {
      emptyMsg.style.display = 'none';
    }

    updateClearButton();
    updateChipFilters();
  }

  function updateClearButton() {
    const btn = document.getElementById('ta-clear-filters');
    if (btn) btn.style.display = (activeFamily || activeIso) ? 'flex' : 'none';
  }

  function updateChipFilters() {
    // Sync the top chip filters on tools-directory page
    const chips = document.querySelectorAll('.ta-family-chip');
    chips.forEach(chip => {
      const isAll = chip.dataset.family === 'all';
      const isActive = isAll ? !activeFamily : chip.dataset.family === activeFamily;
      if (isActive) {
        chip.className = 'ta-family-chip px-4 py-2 rounded-full bg-primary text-white font-bold text-xs';
      } else {
        chip.className = 'ta-family-chip px-4 py-2 rounded-full bg-white border border-border-warm text-primary font-bold text-xs hover:bg-surface-container-low transition-colors';
      }
    });
  }

  function handleFamilyClick(family, el) {
    if (activeFamily === family) {
      activeFamily = null;
      el.classList.remove('ta-nav-active');
    } else {
      document.querySelectorAll('.ta-nav-family').forEach(e => e.classList.remove('ta-nav-active'));
      activeFamily = family;
      el.classList.add('ta-nav-active');
    }

    if (!isCatalogPage()) {
      const p = new URLSearchParams();
      if (activeFamily) p.set('family', activeFamily);
      if (activeIso) p.set('iso', activeIso);
      location.href = 'tools-directory.html' + (p.toString() ? '?' + p.toString() : '');
      return;
    }
    applyFilters();
  }

  function handleMaterialClick(iso, el) {
    if (activeIso === iso) {
      activeIso = null;
      el.classList.remove('ta-nav-active');
    } else {
      document.querySelectorAll('.ta-nav-material').forEach(e => e.classList.remove('ta-nav-active'));
      activeIso = iso;
      el.classList.add('ta-nav-active');
    }

    if (!isCatalogPage()) {
      const p = new URLSearchParams();
      if (activeFamily) p.set('family', activeFamily);
      if (activeIso) p.set('iso', activeIso);
      location.href = 'tools-directory.html' + (p.toString() ? '?' + p.toString() : '');
      return;
    }
    applyFilters();
  }

  function clearAllFilters() {
    activeFamily = null;
    activeIso = null;
    document.querySelectorAll('.ta-nav-family, .ta-nav-material').forEach(e => e.classList.remove('ta-nav-active'));
    applyFilters();
  }

  function buildNav() {
    const aside = document.querySelector('aside');
    if (!aside) return;
    const nav = aside.querySelector('nav');
    if (!nav) return;

    const sectionLabel = (txt) => {
      const d = document.createElement('div');
      d.style.cssText = 'padding:18px 8px 8px 8px;';
      d.innerHTML = `<p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8A8A9A;font-weight:600;margin:0;">${txt}</p>`;
      return d;
    };

    const createItem = (it, type, accent) => {
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'ta-nav-item ' + (type === 'family' ? 'ta-nav-family' : 'ta-nav-material');
      if (type === 'family') a.dataset.family = it.family;
      if (type === 'material') a.dataset.iso = it.iso;
      a.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;color:#43474e;font-family:"Nunito",sans-serif;font-weight:500;font-size:14px;text-decoration:none;transition:all .15s;border-left:3px solid transparent;cursor:pointer;' +
        (accent ? `border-left-color:transparent;` : '');
      a.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;${accent?`color:${accent};`:''}">${it.icon}</span><span>${it.label}</span>`;

      a.addEventListener('mouseenter', () => { if (!a.classList.contains('ta-nav-active')) a.style.background = '#F5F2EE'; });
      a.addEventListener('mouseleave', () => { if (!a.classList.contains('ta-nav-active')) a.style.background = 'transparent'; });
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (type === 'family') handleFamilyClick(it.family, a);
        else handleMaterialClick(it.iso, a);
      });

      // Apply active state if filter matches URL params
      if (type === 'family' && activeFamily === it.family) a.classList.add('ta-nav-active');
      if (type === 'material' && activeIso === it.iso) a.classList.add('ta-nav-active');

      return a;
    };

    nav.innerHTML = '';

    // Tool Families
    nav.appendChild(sectionLabel('Tool Families'));
    toolFamilies.forEach(i => nav.appendChild(createItem(i, 'family')));

    // Material Filter
    nav.appendChild(sectionLabel('Material Filter'));
    materials.forEach(i => nav.appendChild(createItem(i, 'material', i.color)));

    // Clear filters button
    const clearBtn = document.createElement('button');
    clearBtn.id = 'ta-clear-filters';
    clearBtn.style.cssText = 'display:none;align-items:center;gap:6px;margin:12px 14px 0;padding:8px 14px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;cursor:pointer;font-family:"DM Sans",sans-serif;font-size:12px;font-weight:600;color:#DC2626;transition:background .15s;';
    clearBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">close</span> Clear filters';
    clearBtn.addEventListener('mouseenter', () => clearBtn.style.background = 'rgba(239,68,68,.15)');
    clearBtn.addEventListener('mouseleave', () => clearBtn.style.background = 'rgba(239,68,68,.08)');
    clearBtn.addEventListener('click', clearAllFilters);
    nav.appendChild(clearBtn);

    // Apply initial filters from URL
    if (isCatalogPage() && (activeFamily || activeIso)) {
      applyFilters();
    }
    updateClearButton();
  }

  // Also wire up the top chip filters on tools-directory
  function wireChipFilters() {
    if (!isCatalogPage()) return;
    const chipContainer = document.querySelector('.flex.flex-wrap.items-center.gap-2.mb-6');
    if (!chipContainer) return;
    const buttons = chipContainer.querySelectorAll('button');
    buttons.forEach(btn => {
      const text = btn.textContent.trim();
      const familyMap = {'All':'all','Turning':'Turning','Milling':'Milling','Drilling':'Drilling','Threading':'Threading','Reaming':'Reaming'};
      const family = familyMap[text];
      if (!family) return;
      btn.classList.add('ta-family-chip');
      btn.dataset.family = family;
      btn.addEventListener('click', () => {
        if (family === 'all') {
          activeFamily = null;
          document.querySelectorAll('.ta-nav-family').forEach(e => e.classList.remove('ta-nav-active'));
        } else {
          if (activeFamily === family) {
            activeFamily = null;
            document.querySelectorAll('.ta-nav-family').forEach(e => e.classList.remove('ta-nav-active'));
          } else {
            activeFamily = family;
            document.querySelectorAll('.ta-nav-family').forEach(e => {
              e.classList.toggle('ta-nav-active', e.dataset.family === family);
            });
          }
        }
        applyFilters();
      });
    });
    updateChipFilters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { buildNav(); wireChipFilters(); });
  } else {
    buildNav();
    wireChipFilters();
  }
})();
