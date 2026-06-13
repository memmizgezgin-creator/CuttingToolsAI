// ToolAdvisor — global modal system
// Loaded on every page (via page-switcher.js). Provides:
//   • Sign in / Sign up
//   • Pro Upgrade (pricing comparison)
//   • Tool Detail
//   • Compare drawer (bottom sheet, persistent)
//   • Advisor Wizard (4 steps)
//   • Advanced Filter
//   • Cross-Reference alternatives
//   • Notification & Settings dropdowns
//   • Search dropdown
//   • Cookie consent banner
//
// Trigger via:  data-modal-open="sign-in"   (any element)
// Close via:    data-modal-close            (inside the modal)
// Programmatic: window.TA.openModal('sign-in') / closeModal()
(function(){

  // ============================================================
  // Modal definitions
  // ============================================================
  const M = {};

  // ---------- Sign in ----------
  M['sign-in'] = {
    size: 'sm',
    body: () => `
      <div class="ta-modal-header no-border">
        <div>
          <p class="ta-eyebrow">Welcome back</p>
          <h2>Sign in to CuttingToolsAI</h2>
          <p class="ta-sub">Access saved projects, decisions and Pro features.</p>
        </div>
        <button class="ta-modal-close" data-modal-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="ta-modal-body">
        <div class="ta-sso">
          <button type="button"><span class="material-symbols-outlined" style="font-size:18px;color:#4285F4;">login</span> Google</button>
          <button type="button"><span class="material-symbols-outlined" style="font-size:18px;color:#0078D4;">window</span> Microsoft</button>
        </div>
        <div class="ta-divider">or with email</div>
        <form onsubmit="event.preventDefault(); TA.closeModal('sign-in'); TA.toast('Signed in (demo)');">
          <div class="ta-field">
            <label>Email</label>
            <input type="email" placeholder="you@workshop.com" required>
          </div>
          <div class="ta-field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" required>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 16px;">
            <label class="ta-checkbox"><input type="checkbox"> Remember me</label>
            <a href="#" style="font-size:13px;font-weight:600;color:var(--ta-primary);text-decoration:none;">Forgot password?</a>
          </div>
          <button type="submit" class="ta-btn ta-btn-primary ta-btn-block ta-btn-lg">Sign in</button>
        </form>
      </div>
      <div class="ta-modal-footer" style="justify-content:center;">
        <span style="font-size:13px;color:var(--ta-text-soft);">Don't have an account?</span>
        <a href="#" data-modal-open="sign-up" data-modal-close style="font-size:13px;font-weight:700;color:var(--ta-primary);text-decoration:none;">Sign up</a>
      </div>`
  };

  // ---------- Sign up ----------
  M['sign-up'] = {
    size: 'sm',
    body: () => `
      <div class="ta-modal-header no-border">
        <div>
          <p class="ta-eyebrow">Create account</p>
          <h2>Start using CuttingToolsAI</h2>
          <p class="ta-sub">Free tier · no card required. Upgrade anytime.</p>
        </div>
        <button class="ta-modal-close" data-modal-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="ta-modal-body">
        <div class="ta-sso">
          <button type="button"><span class="material-symbols-outlined" style="font-size:18px;color:#4285F4;">login</span> Google</button>
          <button type="button"><span class="material-symbols-outlined" style="font-size:18px;color:#0078D4;">window</span> Microsoft</button>
        </div>
        <div class="ta-divider">or with email</div>
        <form onsubmit="event.preventDefault(); TA.closeModal('sign-up'); TA.toast('Account created (demo)');">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="ta-field"><label>First name</label><input type="text" required></div>
            <div class="ta-field"><label>Last name</label><input type="text" required></div>
          </div>
          <div class="ta-field"><label>Work email</label><input type="email" placeholder="you@workshop.com" required></div>
          <div class="ta-field"><label>Password</label><input type="password" placeholder="At least 8 characters" required></div>
          <div class="ta-field">
            <label>Role</label>
            <select>
              <option>Machinist / Operator</option>
              <option>Manufacturing engineer</option>
              <option>Production manager</option>
              <option>Tool buyer / Procurement</option>
              <option>Other</option>
            </select>
          </div>
          <label class="ta-checkbox" style="margin:6px 0 14px;">
            <input type="checkbox" required>
            <span>I agree to the <a href="#" style="color:var(--ta-primary);font-weight:600;">Terms</a> and <a href="#" style="color:var(--ta-primary);font-weight:600;">Privacy Policy</a>.</span>
          </label>
          <button type="submit" class="ta-btn ta-btn-primary ta-btn-block ta-btn-lg">Create free account</button>
        </form>
      </div>
      <div class="ta-modal-footer" style="justify-content:center;">
        <span style="font-size:13px;color:var(--ta-text-soft);">Already have an account?</span>
        <a href="#" data-modal-open="sign-in" data-modal-close style="font-size:13px;font-weight:700;color:var(--ta-primary);text-decoration:none;">Sign in</a>
      </div>`
  };

  // ---------- Pro Upgrade ----------
  const PRO_FEATURES = [
    {icon:'auto_awesome',   title:'Unlimited advisor runs',     desc:'Run the decision advisor as often as needed, with full reasoning.'},
    {icon:'compare_arrows', title:'Cross-Reference deep mode',  desc:'Match into 4 result tiers, premium and economy alternatives.'},
    {icon:'history',        title:'Chat memory & history',      desc:'Every advisor conversation saved to your account — revisit past recommendations anytime.'},
    {icon:'fact_check',     title:'Compare matrix + export',    desc:'Side-by-side tools with PDF / CSV export for purchasing. (Coming soon)'},
    {icon:'shield_lock',    title:'Sourcing transparency',      desc:'Every spec tagged: manufacturer / generated / engineer-reviewed.'},
    {icon:'support_agent',  title:'Priority engineering help',  desc:'Email a real machining engineer if a decision is critical.'},
  ];

  M['pro-upgrade'] = {
    size: 'xl',
    body: () => `
      <div class="ta-modal-header" style="background:linear-gradient(135deg,#123356 0%,#2c4a6e 100%);color:#fff;border:none;">
        <div style="position:relative;z-index:1;">
          <p class="ta-eyebrow" style="color:#F59E0B;">CuttingToolsAI Pro — Coming July 2026</p>
          <h2 style="color:#fff;">Today's 3 free answers are used.</h2>
          <p class="ta-sub" style="color:rgba(255,255,255,.78);max-width:560px;">The next question is usually the expensive one: a feed and speed you are not sure about, a material you do not run every day, a zero you cannot afford to get wrong.</p>
          <p class="ta-sub" style="color:rgba(255,255,255,.78);max-width:560px;">One broken tool and a stopped machine cost more than a month of Pro.</p>
          <p class="ta-sub" style="color:rgba(255,255,255,.78);max-width:560px;">Pro gives you unlimited queries, the full reasoning behind every recommendation, and the catalog source behind every tool we suggest.</p>
          <p class="ta-sub" style="color:#F59E0B;font-weight:700;max-width:560px;">€29/month. First 50 on the waitlist get 50% off at launch.</p>
        </div>
        <button class="ta-modal-close" data-modal-close aria-label="Close" style="background:rgba(255,255,255,.14);color:#fff;"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="ta-modal-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:28px;">
          ${PRO_FEATURES.map(f => `
            <div style="padding:14px;border:1px solid var(--ta-warm);border-radius:14px;">
              <span class="material-symbols-outlined" style="font-size:22px;color:var(--ta-primary);">${f.icon}</span>
              <p style="font-family:'Nunito',sans-serif;font-weight:700;color:var(--ta-primary);margin:6px 0 4px;font-size:14px;">${f.title}</p>
              <p style="font-size:12px;color:var(--ta-text-soft);line-height:1.5;margin:0;">${f.desc}</p>
            </div>
          `).join('')}
        </div>

        <div id="ta-waitlist-wrap" style="max-width:480px;margin:0 auto;">
          <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:0 0 12px;">Get early access</p>
          <form id="ta-waitlist-form" style="display:flex;gap:8px;flex-wrap:wrap;">
            <input id="ta-waitlist-email" type="email" placeholder="you@workshop.com" required autocomplete="email"
              style="flex:1;min-width:200px;height:42px;padding:0 14px;border:1.5px solid var(--ta-warm);border-radius:10px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;color:var(--ta-primary);"/>
            <button type="submit" id="ta-waitlist-submit"
              style="height:42px;padding:0 20px;border-radius:10px;border:none;background:#F59E0B;color:#451a03;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;cursor:pointer;white-space:nowrap;">
              Join waitlist
            </button>
          </form>
          <p id="ta-waitlist-msg" style="margin:10px 0 0;font-size:13px;min-height:18px;"></p>
        </div>
      </div>
      <div class="ta-modal-footer">
        <span style="font-size:12px;color:var(--ta-text-muted);">No payment needed. We'll email you when Pro launches.</span>
        <button class="ta-btn ta-btn-text" data-modal-close>Maybe later</button>
      </div>`,
    onOpen(host) {
      const form   = host.querySelector('#ta-waitlist-form');
      const emailInput = host.querySelector('#ta-waitlist-email');
      const submit = host.querySelector('#ta-waitlist-submit');
      const msg    = host.querySelector('#ta-waitlist-msg');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        submit.disabled = true;
        submit.textContent = 'Joining…';
        msg.style.color = '';
        msg.textContent = '';

        try {
          const res  = await fetch('/waitlist', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, source: 'pro_cta' }),
          });
          const data = await res.json().catch(() => ({}));
          if (data.ok) {
            form.style.display  = 'none';
            msg.style.color     = '#047857';
            msg.style.fontWeight = '600';
            msg.textContent = "You're on the list. We'll email you when Pro launches.";
          } else if (data.error === 'invalid_email') {
            msg.style.color = '#DC2626';
            msg.textContent = 'Please enter a valid email address.';
            submit.disabled = false;
            submit.textContent = 'Join waitlist';
          } else {
            msg.style.color = '#DC2626';
            msg.textContent = 'Something went wrong. Please try again.';
            submit.disabled = false;
            submit.textContent = 'Join waitlist';
          }
        } catch {
          msg.style.color = '#DC2626';
          msg.textContent = 'Something went wrong. Please try again.';
          submit.disabled = false;
          submit.textContent = 'Join waitlist';
        }
      });
    }
  };
  function proPlanCard(name, price, period, features, cta, variant, highlighted) {
    const ring = highlighted ? 'box-shadow:0 0 0 2px var(--ta-amber);position:relative;' : '';
    const badge = highlighted ? `<span style="position:absolute;top:-10px;left:14px;background:var(--ta-amber);color:var(--ta-primary);font-size:10px;letter-spacing:.14em;font-weight:700;padding:3px 10px;border-radius:999px;text-transform:uppercase;">Most popular</span>` : '';
    const btnClass = variant === 'amber' ? 'ta-btn-amber' : variant === 'ghost' ? 'ta-btn-ghost' : 'ta-btn-primary';
    return `
      <div style="padding:18px;border:1px solid var(--ta-warm);border-radius:14px;background:#fff;${ring}">
        ${badge}
        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:0;">${name}</p>
        <p style="font-family:'Nunito',sans-serif;font-weight:800;color:var(--ta-primary);margin:6px 0 4px;font-size:26px;">${price}<span style="font-size:13px;font-weight:500;color:var(--ta-text-soft);">${period}</span></p>
        <ul style="list-style:none;padding:0;margin:14px 0;display:flex;flex-direction:column;gap:8px;">
          ${features.map(f => `<li style="display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--ta-text);"><span class="material-symbols-outlined" style="font-size:16px;color:var(--ta-green);margin-top:2px;">check_circle</span>${f}</li>`).join('')}
        </ul>
        <button class="ta-btn ${btnClass} ta-btn-block">${cta}</button>
      </div>`;
  }

  // ---------- Tool Detail ----------
  M['tool-detail'] = {
    size: 'lg',
    body: (opts={}) => {
      const tool = opts.tool || {
        brand: 'Iscar', code: 'VCMT 160404-PM', grade: 'IC907', iso: 'M',
        type: 'Turning Insert', best: 'Stainless finishing',
        vc: '140–280 m/min', feed: '0.08–0.30 mm/rev', depth: '0.4–2.5 mm',
        confidence: 91, sourceLabel: 'Manufacturer data', costTier: '€€'
      };
      return `
      <div class="ta-modal-header">
        <div>
          <p class="ta-eyebrow">${tool.brand} · ${tool.type}</p>
          <h2>${tool.code}</h2>
          <p class="ta-sub">Grade <span style="font-family:'DM Mono',monospace;color:var(--ta-primary);font-weight:700;">${tool.grade}</span> · Best for ${tool.best}</p>
        </div>
        <button class="ta-modal-close" data-modal-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="ta-modal-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:18px;">
          <div style="padding:14px;background:var(--ta-warm-soft);border-radius:10px;">
            <span class="ta-iso-badge ta-iso-${tool.iso}">ISO ${tool.iso}</span>
            <p style="margin:8px 0 0;font-size:12px;color:var(--ta-text-soft);">Material group</p>
          </div>
          <div class="ta-stat" style="padding:14px;background:var(--ta-warm-soft);border-radius:10px;">
            <span class="ta-stat-label">Cost tier</span>
            <span class="ta-stat-value">${tool.costTier}</span>
          </div>
          <div class="ta-stat" style="padding:14px;background:var(--ta-warm-soft);border-radius:10px;">
            <span class="ta-stat-label">Source</span>
            <span class="ta-stat-value" style="font-size:13px;color:var(--ta-green);">${tool.sourceLabel}</span>
          </div>
        </div>

        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:0 0 10px;">Cutting data</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:18px;">
          <div style="padding:12px;border:1px solid var(--ta-warm);border-radius:10px;">
            <span class="ta-stat-label">Vc</span>
            <p style="font-family:'DM Mono',monospace;font-weight:600;color:var(--ta-text);margin:4px 0 0;font-size:14px;">${tool.vc}</p>
          </div>
          <div style="padding:12px;border:1px solid var(--ta-warm);border-radius:10px;">
            <span class="ta-stat-label">Feed</span>
            <p style="font-family:'DM Mono',monospace;font-weight:600;color:var(--ta-text);margin:4px 0 0;font-size:14px;">${tool.feed}</p>
          </div>
          <div style="padding:12px;border:1px solid var(--ta-warm);border-radius:10px;">
            <span class="ta-stat-label">Depth</span>
            <p style="font-family:'DM Mono',monospace;font-weight:600;color:var(--ta-text);margin:4px 0 0;font-size:14px;">${tool.depth}</p>
          </div>
        </div>

        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:0 0 8px;">Data confidence</p>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
          <div class="ta-confidence-bar" style="flex:1;"><div style="width:${tool.confidence}%;"></div></div>
          <span style="font-family:'DM Mono',monospace;font-weight:700;color:var(--ta-text);font-size:14px;">${tool.confidence}%</span>
        </div>

        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:0 0 10px;">Notes</p>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">
          <li style="display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--ta-text);"><span class="material-symbols-outlined" style="font-size:16px;color:var(--ta-green);margin-top:2px;">check_circle</span>PM chipbreaker tuned to finishing feed range.</li>
          <li style="display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--ta-text);"><span class="material-symbols-outlined" style="font-size:16px;color:var(--ta-green);margin-top:2px;">check_circle</span>Cost-per-edge within target tier for mid-volume runs.</li>
          <li style="display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--ta-text);"><span class="material-symbols-outlined" style="font-size:16px;color:var(--ta-amber);margin-top:2px;">warning</span>Verify chipbreaker on duplex stainless variants before commit.</li>
        </ul>
      </div>
      <div class="ta-modal-footer">
        <button class="ta-btn ta-btn-text" data-modal-close>Close</button>
        <div style="display:flex;gap:8px;">
          <button class="ta-btn ta-btn-ghost" onclick="TA.addToCompare('${tool.brand}', '${tool.code}'); TA.closeModal('tool-detail');"><span class="material-symbols-outlined" style="font-size:18px;">fact_check</span> Add to Compare</button>
          <button class="ta-btn ta-btn-primary" data-modal-open="cross-reference">Find alternatives</button>
        </div>
      </div>`;
    }
  };

  // ---------- Advisor Wizard ----------
  const WIZARD_STEPS = [
    { eyebrow: '01 · Material',     title: 'What material are you machining?',
      content: `
        <div class="ta-field"><label>ISO group</label>
          <select id="ta-wiz-iso">
            <option value="P">ISO P — Steel</option>
            <option value="M">ISO M — Stainless</option>
            <option value="K">ISO K — Cast iron</option>
            <option value="N">ISO N — Non-ferrous</option>
            <option value="S">ISO S — Superalloys (Inconel, titanium)</option>
            <option value="H">ISO H — Hardened</option>
          </select>
        </div>
        <div class="ta-field"><label>Grade / designation</label><input type="text" placeholder="e.g. 316L, 42CrMo4, GG25"></div>
        <div class="ta-field"><label>Hardness (HB / HRC)</label><input type="text" placeholder="optional"></div>`
    },
    { eyebrow: '02 · Operation',    title: 'What operation?',
      content: `
        <div class="ta-field"><label>Type</label>
          <select>
            <option>Turning</option><option>Milling</option><option>Drilling</option><option>Threading</option><option>Reaming</option>
          </select>
        </div>
        <div class="ta-field"><label>Pass</label>
          <select><option>Finishing</option><option>Medium</option><option>Roughing</option></select>
        </div>
        <div class="ta-field"><label>Cut character</label>
          <select><option>Continuous</option><option>Lightly interrupted</option><option>Heavily interrupted</option></select>
        </div>`
    },
    { eyebrow: '03 · Constraints',  title: 'Any constraints?',
      content: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="ta-field"><label>Vc target (m/min)</label><input type="text" placeholder="optional"></div>
          <div class="ta-field"><label>Feed (mm/rev)</label><input type="text" placeholder="optional"></div>
          <div class="ta-field"><label>Depth (mm)</label><input type="text" placeholder="optional"></div>
          <div class="ta-field"><label>Rigidity</label>
            <select><option>Stable</option><option>Medium</option><option>Compromised</option></select>
          </div>
        </div>
        <label class="ta-checkbox"><input type="checkbox" checked> Coolant available</label>`
    },
    { eyebrow: '04 · Goal',         title: 'Optimize for…',
      content: `
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
          ${['Productivity','Tool life','Cost per edge','Safest bet'].map((g,i)=>`
            <label style="display:flex;align-items:center;gap:10px;padding:14px;border:1px solid var(--ta-warm);border-radius:10px;cursor:pointer;">
              <input type="radio" name="ta-goal" value="${g}" ${i===3?'checked':''} style="accent-color:var(--ta-primary);">
              <span style="font-weight:600;color:var(--ta-text);">${g}</span>
            </label>`).join('')}
        </div>`
    }
  ];

  M['advisor-wizard'] = {
    size: 'md',
    onOpen: (host) => { host._step = 0; renderWizard(host); },
    body: () => `
      <div class="ta-modal-header no-border" id="ta-wiz-header"></div>
      <div class="ta-wizard-steps" id="ta-wiz-steps"></div>
      <div class="ta-modal-body" id="ta-wiz-body"></div>
      <div class="ta-modal-footer" id="ta-wiz-footer"></div>`
  };

  function renderWizard(host) {
    const i = host._step;
    const step = WIZARD_STEPS[i];
    host.querySelector('#ta-wiz-header').innerHTML = `
      <div>
        <p class="ta-eyebrow">${step.eyebrow}</p>
        <h2>${step.title}</h2>
      </div>
      <button class="ta-modal-close" data-modal-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>`;
    host.querySelector('#ta-wiz-steps').innerHTML = WIZARD_STEPS.map((_,k)=>{
      const c = k < i ? 'done' : (k === i ? 'active' : '');
      return `<div class="ta-wizard-step ${c}"></div>`;
    }).join('');
    host.querySelector('#ta-wiz-body').innerHTML = step.content;
    const isLast = i === WIZARD_STEPS.length - 1;
    host.querySelector('#ta-wiz-footer').innerHTML = `
      <button class="ta-btn ta-btn-text" ${i===0?'data-modal-close':'id="ta-wiz-back"'}>${i===0?'Cancel':'Back'}</button>
      <button class="ta-btn ta-btn-primary" id="ta-wiz-next">
        ${isLast ? 'Run advisor' : 'Continue'}
        <span class="material-symbols-outlined" style="font-size:16px;">${isLast?'auto_awesome':'arrow_forward'}</span>
      </button>`;
    const back = host.querySelector('#ta-wiz-back');
    if (back) back.onclick = () => { host._step--; renderWizard(host); };
    host.querySelector('#ta-wiz-next').onclick = () => {
      if (isLast) {
        TA.closeModal('advisor-wizard');
        TA.toast('Running advisor… (demo)');
      } else {
        host._step++;
        renderWizard(host);
      }
    };
  }

  // ---------- Advanced Filter ----------
  M['filter'] = {
    size: 'md',
    body: () => `
      <div class="ta-modal-header">
        <div>
          <p class="ta-eyebrow">Refine results</p>
          <h2>Advanced filters</h2>
        </div>
        <button class="ta-modal-close" data-modal-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="ta-modal-body">
        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:0 0 8px;">Tool family</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px;">
          ${['Turning','Milling','Drilling','Threading','Reaming','Grooving'].map((t,i)=>`<button class="ta-pill" style="${i===0?'background:var(--ta-primary);color:#fff;':''}border:none;cursor:pointer;">${t}</button>`).join('')}
        </div>

        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:0 0 8px;">ISO material</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px;">
          ${['P','M','K','N','S','H'].map(iso=>`<button class="ta-iso-badge ta-iso-${iso}" style="cursor:pointer;border:none;font-family:'DM Mono',monospace;">ISO ${iso}</button>`).join('')}
        </div>

        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:0 0 8px;">Brand</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:18px;">
          ${['Sandvik','Iscar','Kennametal','Mitsubishi','Walter','Tungaloy','Seco','Korloy'].map(b=>`<label class="ta-checkbox" style="padding:8px 10px;border:1px solid var(--ta-warm);border-radius:8px;"><input type="checkbox">${b}</label>`).join('')}
        </div>

        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:0 0 8px;">Cost tier</p>
        <div style="display:flex;gap:6px;margin-bottom:18px;">
          ${['€','€€','€€€'].map((t,i)=>`<button class="ta-pill" style="${i===1?'background:var(--ta-primary);color:#fff;':''}border:none;cursor:pointer;min-width:60px;justify-content:center;">${t}</button>`).join('')}
        </div>

        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:0 0 8px;">Minimum confidence</p>
        <input type="range" min="0" max="100" value="70" style="width:100%;accent-color:var(--ta-primary);">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ta-text-muted);font-family:'DM Mono',monospace;">
          <span>0%</span><span style="color:var(--ta-primary);font-weight:700;">70%</span><span>100%</span>
        </div>
      </div>
      <div class="ta-modal-footer">
        <button class="ta-btn ta-btn-text">Reset all</button>
        <div style="display:flex;gap:8px;">
          <button class="ta-btn ta-btn-ghost" data-modal-close>Cancel</button>
          <button class="ta-btn ta-btn-primary" data-modal-close>Show 47 results</button>
        </div>
      </div>`
  };

  // ---------- Cross-Reference alternatives ----------
  M['cross-reference'] = {
    size: 'lg',
    body: () => `
      <div class="ta-modal-header">
        <div>
          <p class="ta-eyebrow">Cross-reference</p>
          <h2>Alternatives to VCMT 160404-PM</h2>
          <p class="ta-sub">Ranked by geometry, coating and grade match. Source flags shown.</p>
        </div>
        <button class="ta-modal-close" data-modal-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="ta-modal-body">
        ${altRow('Sandvik',    'VBMT 160404',     'GC2025',  88, '#3B82F6', 'Manufacturer data')}
        ${altRow('Kennametal', 'VCMT 160404-MF',  'KCM25',   85, '#F59E0B', 'Manufacturer data')}
        ${altRow('Mitsubishi', 'VCMT 160404',     'MV1020',  81, '#10B981', 'Generated estimate')}
        ${altRow('Walter',     'VCGT 160404-PF', 'WSM20S',  78, '#EF4444', 'Engineer reviewed')}
      </div>
      <div class="ta-modal-footer">
        <button class="ta-btn ta-btn-text" data-modal-close>Close</button>
        <button class="ta-btn ta-btn-primary"><a href="cross-reference.html" style="color:inherit;text-decoration:none;">Full cross-reference</a></button>
      </div>`
  };
  function altRow(brand, code, grade, score, accent, src) {
    return `
      <div style="display:flex;align-items:center;gap:14px;padding:14px;border:1px solid var(--ta-warm);border-radius:12px;margin-bottom:10px;">
        <div style="width:6px;align-self:stretch;background:${accent};border-radius:3px;"></div>
        <div style="flex:1;min-width:0;">
          <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:0;">${brand} · ${grade}</p>
          <p style="font-family:'Nunito',sans-serif;font-weight:700;color:var(--ta-primary);margin:2px 0 0;font-size:15px;">${code}</p>
        </div>
        <div style="text-align:right;">
          <p style="font-family:'DM Mono',monospace;font-weight:700;color:var(--ta-text);margin:0;font-size:18px;">${score}%</p>
          <p style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--ta-green);margin:2px 0 0;font-weight:700;">${src}</p>
        </div>
        <button class="ta-btn ta-btn-ghost" style="padding:8px 12px;" onclick="TA.addToCompare('${brand}','${code}'); TA.toast('${code} added to compare');"><span class="material-symbols-outlined" style="font-size:16px;">add</span> Compare</button>
      </div>`;
  }

  // ---------- Notifications dropdown ----------
  M['notifications'] = {
    size: 'sm',
    position: 'top-right',
    body: () => `
      <div class="ta-modal-header" style="padding:14px 18px 10px;">
        <h2 style="font-size:16px;">Notifications</h2>
        <button class="ta-modal-close" data-modal-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="ta-modal-body tight" style="max-height:380px;">
        ${notifRow('verified', 'Cross-reference confidence updated', 'VCMT 160404-PM · 91% → 93% after engineer review.', '2h')}
        ${notifRow('compare_arrows', 'New alternative available', 'Walter WSM20S now indexed for ISO M finishing.', '1d')}
        ${notifRow('warning', 'Verify chipbreaker', 'Duplex 2205 in your project may need different PM grade.', '3d')}
      </div>
      <div class="ta-modal-footer" style="justify-content:space-between;">
        <button class="ta-btn ta-btn-text">Mark all read</button>
        <button class="ta-btn ta-btn-ghost" data-modal-close>View all</button>
      </div>`
  };
  function notifRow(icon, title, body, time) {
    return `
      <div style="display:flex;gap:10px;padding:10px 4px;border-bottom:1px solid var(--ta-warm);">
        <span class="material-symbols-outlined" style="font-size:20px;color:var(--ta-primary);margin-top:2px;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <p style="margin:0;font-size:13px;font-weight:700;color:var(--ta-text);">${title}</p>
          <p style="margin:2px 0 0;font-size:12px;color:var(--ta-text-soft);line-height:1.5;">${body}</p>
        </div>
        <span style="font-size:11px;color:var(--ta-text-muted);white-space:nowrap;">${time}</span>
      </div>`;
  }

  // ---------- Settings dropdown ----------
  M['settings'] = {
    size: 'sm',
    position: 'top-right',
    body: () => `
      <div class="ta-modal-header" style="padding:14px 18px 10px;">
        <h2 style="font-size:16px;">Preferences</h2>
        <button class="ta-modal-close" data-modal-close aria-label="Close"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="ta-modal-body tight">
        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:8px 0 6px;">Units</p>
        <div style="display:flex;background:var(--ta-warm-soft);padding:3px;border-radius:8px;margin-bottom:14px;">
          <button class="ta-btn" style="flex:1;background:#fff;color:var(--ta-primary);padding:6px 12px;font-size:13px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Metric</button>
          <button class="ta-btn" style="flex:1;background:transparent;color:var(--ta-text-soft);padding:6px 12px;font-size:13px;">Imperial</button>
        </div>
        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:8px 0 6px;">Language</p>
        <select class="ta-field" style="width:100%;height:40px;border:1px solid var(--ta-warm);border-radius:8px;padding:0 12px;background:#fff;font-family:inherit;font-size:14px;margin-bottom:14px;">
          <option>English</option><option>Deutsch</option><option>Türkçe</option><option>Français</option>
        </select>
        <p style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ta-text-muted);font-weight:600;margin:8px 0 6px;">Theme</p>
        <div style="display:flex;background:var(--ta-warm-soft);padding:3px;border-radius:8px;">
          <button class="ta-btn" style="flex:1;background:#fff;color:var(--ta-primary);padding:6px 12px;font-size:13px;box-shadow:0 1px 2px rgba(0,0,0,.06);">Light</button>
          <button class="ta-btn" style="flex:1;background:transparent;color:var(--ta-text-soft);padding:6px 12px;font-size:13px;">Dark</button>
          <button class="ta-btn" style="flex:1;background:transparent;color:var(--ta-text-soft);padding:6px 12px;font-size:13px;">Auto</button>
        </div>
      </div>`
  };

  // ============================================================
  // Modal manager
  // ============================================================
  const openHosts = new Map();

  function openModal(id, opts={}) {
    if (!M[id]) { console.warn('Modal not found:', id); return; }
    closeModal(id); // re-open fresh

    const host = document.createElement('div');
    host.className = 'ta-modal-host is-open';
    host.dataset.modal = id;
    if (M[id].position) host.dataset.position = M[id].position;

    host.innerHTML = `
      <div class="ta-modal-backdrop" data-modal-close></div>
      <div class="ta-modal-panel" data-size="${M[id].size || 'md'}">
        ${M[id].body(opts)}
      </div>`;
    document.body.appendChild(host);
    openHosts.set(id, host);

    // Close on backdrop click + ESC
    host.addEventListener('click', (e) => {
      if (e.target.closest('[data-modal-close]')) closeModal(id);
    });

    if (M[id].onOpen) M[id].onOpen(host);
  }

  function closeModal(id) {
    if (!id) {
      openHosts.forEach((_, k) => closeModal(k));
      return;
    }
    const host = openHosts.get(id);
    if (host) { host.remove(); openHosts.delete(id); }
  }

  // ============================================================
  // Compare drawer (persistent bottom sheet)
  // ============================================================
  let compareItems = []; // {brand, code}

  function buildCompareDrawer() {
    let el = document.querySelector('.ta-compare-drawer');
    if (!el) {
      el = document.createElement('div');
      el.className = 'ta-compare-drawer';
      document.body.appendChild(el);
    }
    return el;
  }

  function renderCompareDrawer() {
    const el = buildCompareDrawer();
    if (compareItems.length === 0) {
      el.classList.remove('is-open');
      return;
    }
    el.classList.add('is-open');
    const chips = compareItems.map((c,i) => `
      <span class="ta-cd-chip">
        ${c.code}
        <button onclick="TA.removeFromCompare(${i})" aria-label="Remove"><span class="material-symbols-outlined" style="font-size:14px;">close</span></button>
      </span>
    `).join('');
    el.innerHTML = `
      <div>
        <p class="ta-cd-label">Compare</p>
        <p style="margin:2px 0 0;font-family:'Nunito',sans-serif;font-weight:700;color:var(--ta-primary);font-size:14px;">${compareItems.length} of 6</p>
      </div>
      <div class="ta-cd-chips">${chips}</div>
      <div style="display:flex;gap:6px;">
        <button class="ta-btn ta-btn-text" style="font-size:13px;padding:8px 10px;" onclick="TA.clearCompare()">Clear</button>
        <button class="ta-btn ta-btn-primary" style="font-size:13px;padding:8px 14px;" onclick="window.location.href='compare.html'">Compare ${compareItems.length}<span class="material-symbols-outlined" style="font-size:16px;">arrow_forward</span></button>
      </div>`;
  }

  function addToCompare(brand, code) {
    if (compareItems.some(c => c.code === code)) return;
    if (compareItems.length >= 6) { toast('Compare limit reached (6 max)'); return; }
    compareItems.push({brand, code});
    try { localStorage.setItem('ta-compare', JSON.stringify(compareItems)); } catch(e){}
    renderCompareDrawer();
  }
  function removeFromCompare(i) {
    compareItems.splice(i,1);
    try { localStorage.setItem('ta-compare', JSON.stringify(compareItems)); } catch(e){}
    renderCompareDrawer();
  }
  function clearCompare() {
    compareItems = [];
    try { localStorage.removeItem('ta-compare'); } catch(e){}
    renderCompareDrawer();
  }
  function loadCompare() {
    try {
      const s = localStorage.getItem('ta-compare');
      if (s) compareItems = JSON.parse(s) || [];
    } catch(e){}
    renderCompareDrawer();
  }

  // ============================================================
  // Toast
  // ============================================================
  function toast(msg) {
    let t = document.createElement('div');
    t.style.cssText = `
      position:fixed;left:50%;bottom:110px;transform:translateX(-50%);
      background:#1A1A2E;color:#fff;padding:11px 18px;border-radius:10px;
      font-family:"DM Sans",sans-serif;font-size:13px;font-weight:600;
      box-shadow:0 8px 24px rgba(0,0,0,.22);z-index:200;
      animation:ta-pop 180ms cubic-bezier(.34,1.4,.6,1) both;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 2400);
  }

  // ============================================================
  // Cookie consent
  // ============================================================
  function maybeShowCookieBanner() {
    try { if (localStorage.getItem('ta-cookie-ok')) return; } catch(e){}
    const b = document.createElement('div');
    b.className = 'ta-cookie-banner';
    b.innerHTML = `
      <div class="ta-cookie-text">
        <strong>Cookies & analytics.</strong> CuttingToolsAI uses cookies for essential functionality and anonymous usage analytics. We don't sell data to manufacturers — we never have.
      </div>
      <div class="ta-cookie-actions">
        <button class="ta-btn ta-btn-text" onclick="TA.acceptCookies('reject')">Reject</button>
        <button class="ta-btn ta-btn-ghost" onclick="TA.acceptCookies('essential')">Essentials only</button>
        <button class="ta-btn ta-btn-primary" onclick="TA.acceptCookies('all')">Accept all</button>
      </div>`;
    document.body.appendChild(b);
    window.TA._cookieEl = b;
  }
  function acceptCookies(level) {
    try { localStorage.setItem('ta-cookie-ok', level); } catch(e){}
    if (window.TA._cookieEl) { window.TA._cookieEl.remove(); window.TA._cookieEl = null; }
    toast(level === 'all' ? 'Cookies accepted' : level === 'reject' ? 'Cookies rejected' : 'Essentials only');
  }

  // ============================================================
  // Search dropdown wiring
  // ============================================================
  const SAMPLE_TOOLS = [
    {brand:'Sandvik',    code:'CNMG 120408-PM',  iso:'P'},
    {brand:'Iscar',      code:'VCMT 160404-PM',  iso:'M'},
    {brand:'Kennametal', code:'WCMX 06T308',     iso:'K'},
    {brand:'Mitsubishi', code:'SCGT 120408-AL',  iso:'N'},
    {brand:'Walter',     code:'WPP20S Drill',    iso:'P'},
  ];
  const SAMPLE_GUIDES = [
    'Reading an insert code',
    'ISO P vs M vs K — when to switch',
    'PM vs MF chipbreaker — finishing trade-offs',
  ];

  function attachSearchDropdowns() {
    document.querySelectorAll('input[type="text"], input[type="search"]').forEach(input => {
      const ph = (input.placeholder || '').toLowerCase();
      if (!/search|tool|material/.test(ph)) return;
      if (input.dataset.taSearch) return;
      input.dataset.taSearch = '1';

      const dd = document.createElement('div');
      dd.className = 'ta-search-dropdown';
      document.body.appendChild(dd);

      const renderDD = (q='') => {
        const Q = q.trim().toLowerCase();
        const tools = SAMPLE_TOOLS.filter(t => !Q || t.code.toLowerCase().includes(Q) || t.brand.toLowerCase().includes(Q));
        const guides = SAMPLE_GUIDES.filter(g => !Q || g.toLowerCase().includes(Q));
        dd.innerHTML = `
          ${Q ? '' : `
            <div class="ta-search-section">
              <h4>Recent</h4>
              <a class="ta-search-item" href="#"><span class="material-symbols-outlined">history</span><div><div class="ta-si-title">316L finishing turn</div><div class="ta-si-meta">advisor run · 2d ago</div></div></a>
              <a class="ta-search-item" href="#"><span class="material-symbols-outlined">history</span><div><div class="ta-si-title">VCMT 160404</div><div class="ta-si-meta">tool · 4d ago</div></div></a>
            </div>`}
          <div class="ta-search-section">
            <h4>Tools (${tools.length})</h4>
            ${tools.slice(0,5).map(t => `
              <a class="ta-search-item" href="tools-directory.html"><span class="material-symbols-outlined">precision_manufacturing</span>
                <div style="flex:1;"><div class="ta-si-title">${t.code}</div><div class="ta-si-meta">${t.brand} · ISO ${t.iso}</div></div>
                <span class="ta-iso-badge ta-iso-${t.iso}">ISO ${t.iso}</span>
              </a>`).join('') || '<p style="font-size:13px;color:var(--ta-text-muted);padding:8px;margin:0;">No tools match.</p>'}
          </div>
          <div class="ta-search-section">
            <h4>Knowledge (${guides.length})</h4>
            ${guides.map(g => `<a class="ta-search-item" href="knowledge.html"><span class="material-symbols-outlined">menu_book</span><div><div class="ta-si-title">${g}</div></div></a>`).join('') || '<p style="font-size:13px;color:var(--ta-text-muted);padding:8px;margin:0;">No guides match.</p>'}
          </div>
          ${Q ? `<div class="ta-search-section"><a class="ta-search-item" href="tools-directory.html"><span class="material-symbols-outlined">arrow_forward</span><div class="ta-si-title">See all results for "${q}"</div></a></div>` : ''}`;
      };

      const position = () => {
        const r = input.getBoundingClientRect();
        dd.style.top = (r.bottom + window.scrollY + 6) + 'px';
        dd.style.left = (r.left + window.scrollX) + 'px';
        dd.style.width = Math.max(r.width, 360) + 'px';
      };

      input.addEventListener('focus', () => { renderDD(input.value); position(); dd.classList.add('is-open'); });
      input.addEventListener('input', () => { renderDD(input.value); position(); });
      input.addEventListener('blur', () => setTimeout(() => dd.classList.remove('is-open'), 180));
      window.addEventListener('resize', position);
      window.addEventListener('scroll', position, true);
    });
  }

  // ============================================================
  // Auto-wiring: data-modal-open triggers
  // ============================================================
  function wireTriggers() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-modal-open]');
      if (trigger) {
        e.preventDefault();
        const id = trigger.dataset.modalOpen;
        const optsAttr = trigger.dataset.modalOpts;
        let opts = {};
        if (optsAttr) { try { opts = JSON.parse(optsAttr); } catch(e){} }
        openModal(id, opts);
        return;
      }
    });

    // ESC closes top modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && openHosts.size > 0) {
        const last = Array.from(openHosts.keys()).pop();
        closeModal(last);
      }
    });
  }

  // ============================================================
  // Public API
  // ============================================================
  window.TA = window.TA || {};
  Object.assign(window.TA, {
    openModal, closeModal, toast,
    addToCompare, removeFromCompare, clearCompare,
    acceptCookies,
    attachSearchDropdowns, // exposed so page-switcher can re-scan after injecting chrome
  });

  // ============================================================
  // Auto-wire common page buttons by their visible text
  // ============================================================
  // Strip Material Symbols ligature text (it ends up in textContent)
  // so regex can match the actual visible label.
  function visibleText(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.material-symbols-outlined, .material-icons, .material-symbols-rounded, .material-symbols-sharp')
         .forEach(n => n.remove());
    return (clone.textContent || '').trim().replace(/\s+/g, ' ');
  }

  function autoWireButtons() {
    const map = [
      // [regex matching visible text, modal id]
      [/^(run\s+the\s+advisor|start\s+advisor|see\s+sample(\s+output)?|run\s+advisor)\b/i, 'advisor-wizard'],
      [/^view\s+details\b/i,                                                    'tool-detail'],
      [/^(advanced\s+filters?|refine\s+results)\b/i,                           'filter'],
      [/^(upgrade\s+to\s+pro|start\s+\d+-?day\s+pro\s+trial|see\s+pricing|go\s+premium|start\s+trial)\b/i, 'pro-upgrade'],
      [/^(find\s+alternatives|cross-?reference\s+(all|an\s+insert)|cross-?reference)\b/i, 'cross-reference'],
      [/^(launch\s+comparison\s+matrix|open\s+compare)\b/i,                    null], // leave compare matrix to its own page
    ];

    document.querySelectorAll('a, button').forEach(el => {
      if (el.hasAttribute('data-modal-open')) return;
      if (el.closest('.ta-top-nav') || el.closest('.ta-sidebar')) return; // chrome already wired
      if (el.closest('.ta-modal-host')) return;
      const txt = visibleText(el);
      if (!txt || txt.length > 60) return;
      for (const [rx, id] of map) {
        if (rx.test(txt) && id) {
          el.dataset.modalOpen = id;
          // For anchor tags, prevent navigation
          if (el.tagName === 'A') el.addEventListener('click', e => e.preventDefault());
          break;
        }
      }
    });

    // Compare buttons (small, secondary, inside tool cards) → addToCompare
    document.querySelectorAll('a, button').forEach(el => {
      if (el.hasAttribute('data-modal-open')) return;
      if (el.closest('.ta-top-nav') || el.closest('.ta-sidebar') || el.closest('.ta-modal-host')) return;
      const txt = visibleText(el);
      if (!/^compare$/i.test(txt) && !/\bcompare\b/i.test(txt)) return;
      // Skip if it's a primary nav-like compare (long, full-width)
      if (txt.length > 12) return;
      // Try to find brand + code from sibling content
      const card = el.closest('div[class*="rounded"]') || el.closest('article') || el.parentElement;
      let brand = 'Tool', code = 'Insert';
      if (card) {
        const brandEl = card.querySelector('p, span');
        const codeEl  = card.querySelector('h3, h4');
        if (brandEl) brand = (brandEl.textContent || '').trim().split(' · ')[0] || brand;
        if (codeEl)  code  = (codeEl.textContent || '').trim();
      }
      el.addEventListener('click', (e) => {
        e.preventDefault();
        addToCompare(brand, code);
        toast(`${code} added to compare`);
      });
    });
  }

  // ============================================================
  // Boot
  // ============================================================
  function run() {
    wireTriggers();
    loadCompare();
    attachSearchDropdowns();
    autoWireButtons();
    setTimeout(maybeShowCookieBanner, 600);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
