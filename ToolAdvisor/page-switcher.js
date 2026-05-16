// Floating page-switcher injected into all 7 pages
(function(){
  const pages = [
    {href:'index.html',             label:'All'},
    {href:'ToolAdvisor.html',       label:'Advisor'},
    {href:'tools-directory.html',   label:'Catalog'},
    {href:'cross-reference.html',   label:'Cross-Reference'},
    {href:'compare.html',           label:'Compare'},
    {href:'knowledge.html',         label:'Knowledge'},
    {href:'pro.html',               label:'Pro'},
  ];
  const here = location.pathname.split('/').pop() || 'index.html';
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
    {icon:'precision_manufacturing', label:'Turning Inserts'},
    {icon:'rotate_right',            label:'Milling Tools'},
    {icon:'vertical_align_bottom',   label:'Drilling Tools'},
    {icon:'tune',                    label:'Reamers'},
    {icon:'linear_scale',            label:'Threading Tools'},
    {icon:'content_cut',             label:'Grooving & Parting'},
  ];
  const materials = [
    {icon:'category',                label:'ISO P Steel',       color:'#3B82F6'},
    {icon:'layers',                  label:'ISO M Stainless',   color:'#F59E0B'},
    {icon:'architecture',            label:'ISO K Cast Iron',   color:'#EF4444'},
    {icon:'grid_view',               label:'ISO N Non-Ferrous', color:'#10B981'},
    {icon:'settings_suggest',        label:'ISO S Superalloys', color:'#F97316'},
    {icon:'diamond',                 label:'ISO H Hardened',    color:'#64748B'},
  ];

  function buildNav() {
    const aside = document.querySelector('aside');
    if (!aside) return;
    const nav = aside.querySelector('nav');
    if (!nav) return;

    const sectionLabel = (txt) => `
      <div style="padding:18px 8px 8px 8px;">
        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8A8A9A;font-weight:600;margin:0;">${txt}</p>
      </div>`;

    const item = (it, accent) => `
      <a href="#" class="ta-nav-item" style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;color:#43474e;font-family:'Nunito',sans-serif;font-weight:500;font-size:14px;text-decoration:none;transition:background .15s;${accent?`border-left:3px solid ${accent};`:''}">
        <span class="material-symbols-outlined" style="font-size:20px;${accent?`color:${accent};`:''}">${it.icon}</span>
        <span>${it.label}</span>
      </a>`;

    nav.innerHTML =
      sectionLabel('Tool Families') +
      toolFamilies.map(i=>item(i)).join('') +
      sectionLabel('Material Filter') +
      materials.map(i=>item(i, i.color)).join('');

    // Hover effect
    nav.querySelectorAll('.ta-nav-item').forEach(el=>{
      el.addEventListener('mouseenter',()=>el.style.background='#F5F2EE');
      el.addEventListener('mouseleave',()=>el.style.background='transparent');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildNav);
  } else {
    buildNav();
  }
})();
