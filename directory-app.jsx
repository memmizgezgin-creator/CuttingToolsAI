// ToolAdvisor — Catalog interactive app
// Owns: search, sort, family filter, ISO material filter, view toggle,
//       compare drawer, favorites, recently viewed, CSV export, quick view.

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ---------- helpers ----------
const LS = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} },
};

const ISO_TONE = { P:'iso-p', M:'iso-m', K:'iso-k', N:'iso-n', S:'iso-s', H:'iso-h' };
const ISO_COLOR = { P:'#3B82F6', M:'#F59E0B', K:'#EF4444', N:'#10B981', S:'#F97316', H:'#64748B' };
const ISO_LABEL = { P:'Steel', M:'Stainless', K:'Cast iron', N:'Non-ferrous', S:'Superalloy', H:'Hardened' };

// All Tailwind class strings explicit per ISO group — CDN JIT can only see literal class tokens.
// Keep these literals: border-iso-p-blue border-iso-m-amber border-iso-k-red border-iso-n-green border-iso-s-orange border-iso-h-slate
// bg-iso-p-blue/10 text-iso-p-blue border-iso-p-blue/20 bg-iso-m-amber/10 text-iso-m-amber border-iso-m-amber/20
// bg-iso-k-red/10 text-iso-k-red border-iso-k-red/20 bg-iso-n-green/10 text-iso-n-green border-iso-n-green/20
// bg-iso-s-orange/10 text-iso-s-orange border-iso-s-orange/20 bg-iso-h-slate/10 text-iso-h-slate border-iso-h-slate/20
const ISO_CLASSES = {
  P: { border:'border-iso-p-blue',   chip:'bg-iso-p-blue/10 text-iso-p-blue border-iso-p-blue/20'     },
  M: { border:'border-iso-m-amber',  chip:'bg-iso-m-amber/10 text-iso-m-amber border-iso-m-amber/20'  },
  K: { border:'border-iso-k-red',    chip:'bg-iso-k-red/10 text-iso-k-red border-iso-k-red/20'        },
  N: { border:'border-iso-n-green',  chip:'bg-iso-n-green/10 text-iso-n-green border-iso-n-green/20'  },
  S: { border:'border-iso-s-orange', chip:'bg-iso-s-orange/10 text-iso-s-orange border-iso-s-orange/20' },
  H: { border:'border-iso-h-slate',  chip:'bg-iso-h-slate/10 text-iso-h-slate border-iso-h-slate/20'  },
};
const FAMILIES = ['All','Turning','Milling','Drilling','Threading','Reaming'];
const SORTS = [
  { id:'relevance',   label:'Relevance' },
  { id:'confidence',  label:'Data confidence ↓' },
  { id:'vcDesc',      label:'Cutting speed Vc ↓' },
  { id:'vcAsc',       label:'Cutting speed Vc ↑' },
  { id:'feedDesc',    label:'Feed rate ↓' },
  { id:'brandAsc',    label:'Brand A→Z' },
];

const PAGE_SIZE = 12;

// ---------- atoms ----------
function Icon({name, size=18, fill=false, weight, className=''}) {
  const props = {};
  if (fill) props['data-icon-fill'] = '';
  if (weight) props['data-icon-weight'] = String(weight);
  return <span className={`material-symbols-outlined ${className}`} style={{fontSize:size}} {...props}>{name}</span>;
}

function Confidence({pct, source}) {
  // literal classes: bg-iso-n-green bg-iso-m-amber bg-iso-k-red
  const toneCls = pct >= 90 ? 'bg-iso-n-green' : pct >= 80 ? 'bg-iso-m-amber' : 'bg-iso-k-red';
  return (
    <div className="group/conf relative inline-flex items-center gap-2">
      <div className="w-14 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
        <div className={`h-full ${toneCls}`} style={{width:`${pct}%`}}></div>
      </div>
      <span className="font-technical-data text-xs text-ink-text font-bold">{pct}%</span>
      <div role="tooltip" className="opacity-0 group-hover/conf:opacity-100 pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-ink-text text-white text-[11px] font-medium whitespace-nowrap shadow-xl z-20 transition-opacity">
        <div className="font-bold text-[10px] uppercase tracking-widest text-white/60 mb-0.5">Data source</div>
        {source}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-ink-text"></div>
      </div>
    </div>
  );
}

// ---------- trust / canonical helpers ----------
const TOOL_TYPE_LABEL = {
  turning_insert:         'T-Insert',
  milling_insert:         'M-Insert',
  threading_insert:       'Threading',
  reamer:                 'Reamer',
  tap:                    'Tap',
  solid_drill:            'Drill',
  indexable_drill_insert: 'IDI',
  end_mill:               'End mill',
};

const SOURCE_TIER_LABEL = {
  manufacturer:           'Manufacturer data',
  authorized_distributor: 'Authorized distributor',
  neutral_data_platform:  'Licensed data platform',
  public_catalog_pdf:     'Public catalogue PDF',
  manual_review:          'Manual review',
  estimated:              'Estimated',
  unknown:                'Unknown source',
};

const RISK_FLAG_LABEL = {
  economics_estimated:    'Economics estimated',
  stale_source:           'Source may be stale',
  distributor_only:       'Distributor source only',
  conflicting_sources:    'Conflicting sources',
  missing_dimensions:     'Dimensions incomplete',
  missing_grade:          'Grade/coating incomplete',
  operation_unclear:      'Operation scope unclear',
  material_unclear:       'Material fit unclear',
  manual_review_required: 'Manual review required',
};

// TrustBadge — replaces flat Confidence component.
// compact=false (default on cards): bar + % + status icon + hover tooltip
// expanded=true  (detail modal): full source chain + risk flags
function TrustBadge({tool, expanded=false}) {
  const trust = tool.trust || null;
  const score       = trust ? trust.confidence_score   : (tool.confidence  || 0);
  const status      = trust ? trust.validation_status  : null;
  const sourceTier  = trust ? (SOURCE_TIER_LABEL[trust.source_tier] || trust.source_tier) : null;
  const sourceName  = trust ? trust.source_name        : (tool.source      || null);
  const lastChecked = trust ? trust.last_checked       : (tool.lastVerified || null);
  const riskFlags   = trust ? (trust.risk_flags || []) : [];

  // literal Tailwind classes kept here so CDN JIT captures them:
  // bg-iso-n-green bg-iso-m-amber bg-iso-k-red
  // text-iso-n-green text-iso-m-amber text-on-surface-variant
  const isVerified = status === 'verified'           || (!status && score >= 90);
  const isPartial  = status === 'partially_verified' || (!status && score >= 80 && !isVerified);
  const barCls     = isVerified ? 'bg-iso-n-green' : isPartial ? 'bg-iso-m-amber' : 'bg-iso-k-red';
  const badgeCls   = isVerified ? 'text-iso-n-green' : isPartial ? 'text-iso-m-amber' : 'text-on-surface-variant';
  const statusIcon = isVerified ? 'verified' : isPartial ? 'info' : 'help';
  const statusLabel = status === 'verified'
    ? 'Verified'
    : status === 'partially_verified' ? 'Partial'
    : status === 'estimated'          ? 'Estimated'
    : `${score}%`;

  if (!expanded) {
    const tooltipLines = [sourceTier, sourceName, lastChecked ? `Checked: ${lastChecked}` : null]
      .filter(Boolean).join(' · ');
    return (
      <div className="group/trust relative inline-flex items-center gap-2">
        <div className="w-14 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
          <div className={`h-full ${barCls}`} style={{width:`${score}%`}}></div>
        </div>
        <span className="font-technical-data text-xs text-ink-text font-bold">{score}%</span>
        <Icon name={statusIcon} size={13} className={badgeCls}/>
        <div role="tooltip" className="opacity-0 group-hover/trust:opacity-100 pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-ink-text text-white text-[11px] font-medium whitespace-nowrap shadow-xl z-20 transition-opacity">
          <div className="font-bold text-[10px] uppercase tracking-widest text-white/60 mb-0.5">Data source</div>
          {tooltipLines || 'No source info'}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-ink-text"></div>
        </div>
      </div>
    );
  }

  // Expanded modal form
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-24 h-2 bg-surface-container-low rounded-full overflow-hidden">
          <div className={`h-full ${barCls}`} style={{width:`${score}%`}}></div>
        </div>
        <span className="font-technical-data text-sm text-ink-text font-bold">{score}%</span>
        <span className={`flex items-center gap-1 text-xs font-bold ${badgeCls}`}>
          <Icon name={statusIcon} size={14}/> {statusLabel}
        </span>
      </div>
      <div className="space-y-1.5 text-xs text-on-surface-variant">
        {sourceTier  && (
          <p>
            <span className="font-bold text-outline uppercase tracking-wider text-[10px]">Source tier</span>
            <span className="ml-2">{sourceTier}</span>
          </p>
        )}
        {sourceName  && (
          <p>
            <span className="font-bold text-outline uppercase tracking-wider text-[10px]">Source</span>
            <span className="ml-2">{sourceName}</span>
          </p>
        )}
        {lastChecked && (
          <p>
            <span className="font-bold text-outline uppercase tracking-wider text-[10px]">Checked</span>
            <span className="ml-2 font-technical-data">{lastChecked}</span>
          </p>
        )}
      </div>
      {riskFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {riskFlags.map(flag => (
            <span key={flag} className="flex items-center gap-1 text-[10px] font-bold bg-iso-m-amber/10 text-iso-m-amber border border-iso-m-amber/25 px-2 py-0.5 rounded-full">
              <Icon name="warning" size={11}/> {RISK_FLAG_LABEL[flag] || flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- tool card ----------
function ToolCard({tool, view, isCompared, onToggleCompare, isFav, onToggleFav, onOpen}) {
  const t = tool;
  const cls = ISO_CLASSES[t.iso];
  const borderClass = cls.border;
  const bgChip = cls.chip;

  if (view === 'list') {
    return (
      <article className={`bg-surface-card rounded-2xl card-shadow border-l-4 ${borderClass} p-4 flex items-center gap-4 hover:shadow-md transition-all`}>
        <div className="ta-insert3d shrink-0" data-shape={t.shape} data-tone={t.tone} data-size="xs"></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="font-technical-data text-[10px] uppercase tracking-widest text-on-surface-variant">{t.brand}</p>
            <h3 className="font-product-grade text-base text-ink-text leading-tight">{t.code}</h3>
            <span className={`font-technical-data text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${bgChip}`}>ISO {t.iso}</span>
            <span className="text-[11px] text-outline">· {t.family} · {t.op}</span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            <span className="font-technical-data text-ink-text">Vc {t.vcMin}–{t.vcMax} m/min</span>
            <span className="mx-2 text-outline">·</span>
            <span className="font-technical-data text-ink-text">f {t.fMin}–{t.fMax} mm/rev</span>
            <span className="mx-2 text-outline">·</span>
            <span>{t.bestFor}</span>
          </p>
        </div>
        <div className="hidden md:block shrink-0"><TrustBadge tool={t} /></div>
        <CardActions
          tool={t}
          isCompared={isCompared}
          onToggleCompare={onToggleCompare}
          isFav={isFav}
          onToggleFav={onToggleFav}
          onOpen={onOpen}
          compact
        />
      </article>
    );
  }

  return (
    <article className={`bg-surface-card rounded-[18px] card-shadow border-l-4 ${borderClass} p-card-padding flex flex-col h-full hover:-translate-y-1 transition-all duration-300 group relative`}>
      {/* Top-right action stack: fav + cross-ref hint */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">
        <button
          onClick={() => onToggleFav(t.id)}
          aria-pressed={isFav}
          aria-label={isFav ? 'Remove from shortlist' : 'Save to shortlist'}
          className="w-8 h-8 rounded-full bg-white border border-border-warm flex items-center justify-center hover:border-primary transition-colors"
        >
          <Icon name={isFav ? 'bookmark' : 'bookmark_border'} size={18} fill={isFav} className={isFav ? 'text-primary' : 'text-outline'} />
        </button>
      </div>

      <div className="flex justify-between items-start mb-4 pr-10">
        <div>
          <p className="font-technical-data text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">{t.brand}</p>
          <h3 className="font-product-grade text-ink-text leading-tight">{t.code}</h3>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="ta-insert3d" data-shape={t.shape} data-tone={t.tone} data-size="sm" aria-label={`${t.shape} shape insert`}></div>
          <span className={`font-technical-data text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border whitespace-nowrap ${bgChip}`}>ISO {t.iso}</span>
          {t.tool_type && (
            <span className="font-technical-data text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-border-warm bg-surface-container-low text-on-surface-variant whitespace-nowrap">
              {TOOL_TYPE_LABEL[t.tool_type] || t.tool_type}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-on-surface-variant mb-3">
        <span className="font-bold text-on-surface">{t.family} · {t.op}</span>
        <span className="mx-1">·</span>
        Grade <span className="font-technical-data">{t.grade}</span>
      </p>

      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-outline uppercase tracking-wider font-bold">Vc</span>
          <span className="font-technical-data text-ink-text">{t.vcMin}–{t.vcMax} m/min</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-outline uppercase tracking-wider font-bold">Feed</span>
          <span className="font-technical-data text-ink-text">{t.fMin}–{t.fMax} mm/rev</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-outline uppercase tracking-wider font-bold">aₚ</span>
          <span className="font-technical-data text-ink-text">{t.apMin}–{t.apMax} mm</span>
        </div>
      </div>

      {/* Structured best-for */}
      <div className="pt-2 mb-3 border-t border-border-warm">
        <p className="text-[10px] uppercase tracking-wider text-outline font-bold mb-1.5">Best for</p>
        <p className="text-sm text-ink-text font-medium leading-snug mb-2">{t.bestFor}</p>
        <div className="flex flex-wrap gap-1">
          <Tag>{t.op}</Tag>
          <Tag>{t.stability} stability</Tag>
          <Tag>{t.coolant}</Tag>
        </div>
      </div>

      {/* Economics row */}
      <div className="flex items-center text-[11px] mb-3 -mt-1">
        <span
          className="font-technical-data text-ink-text font-bold"
          title={t.economicsEstimated
            ? 'Cost tier (estimated from published data ranges — not commercial pricing)'
            : 'Cost tier (brand-neutral)'}
        >
          <span className="text-ink-text">{'\u20ac'.repeat(t.costTier)}</span><span className="text-outline">{'\u20ac'.repeat(4-t.costTier)}</span>
          <span className="text-on-surface-variant ml-1.5 font-normal">
            · ~€{t.costPerEdge}/edge{t.economicsEstimated && <span className="text-[9px] text-outline ml-1">(est.)</span>}
          </span>
        </span>
      </div>

      {/* Confidence row */}
      <div className="flex items-center justify-between mt-auto mb-3 pt-3 border-t border-border-warm">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-outline font-bold">Data confidence</p>
          <div className="mt-1"><TrustBadge tool={t} /></div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-outline font-bold">Supply</p>
          <p className="font-technical-data text-xs text-ink-text font-bold mt-1">{t.supply} suppliers</p>
        </div>
      </div>

      {/* Cross-ref hint */}
      {t.equivIds.length > 0 && (
        <a href="cross-reference.html" className="flex items-center justify-between text-xs text-primary hover:underline mb-3 -mt-1">
          <span className="flex items-center gap-1"><Icon name="compare_arrows" size={14}/> {t.equivIds.length} equivalents available</span>
          <Icon name="arrow_forward" size={14}/>
        </a>
      )}

      <CardActions
        tool={t}
        isCompared={isCompared}
        onToggleCompare={onToggleCompare}
        isFav={isFav}
        onToggleFav={onToggleFav}
        onOpen={onOpen}
      />

      {/* Better-value swap hint */}
      {t.betterValueId && (() => {
        const bv = window.TA_TOOLS.find(o => o.id === t.betterValueId);
        if (!bv) return null;
        return (
          <button
            onClick={() => onOpen(bv)}
            className="mt-3 w-full text-left p-2.5 rounded-lg bg-iso-n-green/8 border border-iso-n-green/25 hover:bg-iso-n-green/15 transition-colors group/bv"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon name="savings" size={14} className="text-iso-n-green"/>
              <span className="text-[10px] uppercase tracking-widest text-iso-n-green font-extrabold">Better-value alternative</span>
            </div>
            <p className="text-xs text-ink-text leading-snug">
              <span className="font-technical-data font-bold">{bv.code}</span>
              <span className="text-on-surface-variant"> · {t.betterValueDelta}</span>
            </p>
          </button>
        );
      })()}
    </article>
  );
}

function Tag({children}) {
  return <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant bg-surface-container-low border border-border-warm px-2 py-0.5 rounded">{children}</span>;
}

function CardActions({tool, isCompared, onToggleCompare, onOpen, compact}) {
  return (
    <div className={`flex gap-2 ${compact ? '' : 'mt-auto'}`}>
      <button
        onClick={() => onOpen(tool)}
        className="flex-1 bg-primary text-white font-bold py-2 rounded-lg text-xs hover:-translate-y-0.5 transition-all"
      >
        View Details
      </button>
      <button
        onClick={() => onToggleCompare(tool.id)}
        aria-pressed={isCompared}
        className={`flex-1 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all border ${
          isCompared
            ? 'bg-primary/10 border-primary text-primary'
            : 'bg-white border-border-warm text-primary hover:bg-surface-container-low'
        }`}
      >
        <Icon name={isCompared ? 'check_box' : 'fact_check'} size={14} fill={isCompared}/>
        {isCompared ? 'Selected' : 'Compare'}
      </button>
    </div>
  );
}

// ---------- compare drawer ----------
function CompareDrawer({tools, onRemove, onClear, onOpen, onExport, onCompare}) {
  if (!tools.length) return null;
  return (
    <div role="region" aria-label="Compare drawer" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(960px,calc(100%-32px))] bg-ink-text text-white rounded-2xl shadow-2xl border border-white/10 animate-slide-up">
      <div className="flex items-center gap-3 p-3">
        <div className="px-3 py-1.5 rounded-full bg-white/10 font-technical-data text-[10px] uppercase tracking-widest">
          {tools.length} / 4 selected
        </div>
        <div className="flex-1 flex gap-2 overflow-x-auto">
          {tools.map(t => (
            <div key={t.id} className="shrink-0 flex items-center gap-2 bg-white/8 rounded-lg pl-2 pr-1 py-1 border border-white/10">
              <span className="w-2 h-2 rounded-full" style={{background:ISO_COLOR[t.iso]}}></span>
              <span className="text-xs font-technical-data">{t.code}</span>
              <button onClick={() => onRemove(t.id)} aria-label={`Remove ${t.code}`} className="w-5 h-5 rounded hover:bg-white/15 flex items-center justify-center">
                <Icon name="close" size={14}/>
              </button>
            </div>
          ))}
        </div>
        <button onClick={onClear} className="text-xs text-white/60 hover:text-white px-2">Clear</button>
        <button
          onClick={onCompare}
          disabled={tools.length < 2}
          className="flex items-center gap-2 bg-secondary-fixed text-on-secondary-fixed px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all"
        >
          <Icon name="fact_check" size={16}/>
          Compare now
        </button>
      </div>
    </div>
  );
}

// ---------- detail modal ----------
function DetailModal({tool, onClose, onOpenTool, tools}) {
  if (!tool) return null;
  const equivs = tool.equivIds.map(id => tools.find(o => o.id === id)).filter(Boolean);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-glass-backdrop backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className={`p-6 border-b-4 ${ISO_CLASSES[tool.iso].border} flex items-start gap-6`}>
          <div className="ta-insert3d shrink-0" data-shape={tool.shape} data-tone={tool.tone} data-size="lg"></div>
          <div className="flex-1 min-w-0">
            <p className="font-technical-data text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
              {tool.brand} · {tool.family}{tool.tool_type ? ` · ${TOOL_TYPE_LABEL[tool.tool_type] || tool.tool_type}` : ''}
            </p>
            <h2 id="modal-title" className="font-section-heading text-display-hero text-ink-text leading-tight tracking-tight">{tool.code}</h2>
            <p className="text-on-surface-variant mt-1">{tool.bestFor}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`font-technical-data text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border ${ISO_CLASSES[tool.iso].chip}`}>ISO {tool.iso} · {ISO_LABEL[tool.iso]}</span>
              <Tag>Grade {tool.grade}</Tag>
              <Tag>{tool.op}</Tag>
              <Tag>{tool.stability} stability</Tag>
              <Tag>{tool.coolant}</Tag>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center shrink-0">
            <Icon name="close" size={20}/>
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-border-warm">
          <Spec label="Cutting speed Vc" value={`${tool.vcMin}–${tool.vcMax}`} unit="m/min"/>
          <Spec label="Feed rate" value={`${tool.fMin}–${tool.fMax}`} unit="mm/rev"/>
          <Spec label="Depth of cut aₚ" value={`${tool.apMin}–${tool.apMax}`} unit="mm"/>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Data confidence</p>
            <TrustBadge tool={tool} expanded />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-2">Supply &amp; availability</p>
            <p className="text-sm text-ink-text"><span className="font-technical-data font-bold">{tool.supply}</span> verified suppliers</p>
            <p className="text-xs text-on-surface-variant mt-1">Lead time typically 5–14 days. Pricing brand-neutral; request quote.</p>
            {tool.economicsEstimated && (
              <p className="text-[10px] text-outline italic mt-2">Cost figures are estimates from published data ranges — not commercial pricing.</p>
            )}
          </div>
        </div>

        {equivs.length > 0 && (
          <div className="p-6 border-t border-border-warm">
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-3">{equivs.length} cross-reference equivalents</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {equivs.map(e => (
                <a href="cross-reference.html" key={e.id} className="flex items-center gap-3 p-3 rounded-lg border border-border-warm hover:border-primary hover:bg-surface-container-low transition-colors">
                  <div className="ta-insert3d shrink-0" data-shape={e.shape} data-tone={e.tone} data-size="xs"></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-technical-data text-[10px] uppercase tracking-widest text-on-surface-variant">{e.brand}</p>
                    <p className="font-product-grade text-sm text-ink-text truncate">{e.code}</p>
                  </div>
                  <Icon name="arrow_forward" size={16} className="text-primary"/>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Engineers also picked */}
        {(() => {
          const peers = (tool.peerIds || []).map(id => tools.find(o => o.id === id)).filter(Boolean);
          if (!peers.length) return null;
          return (
            <div className="p-6 border-t border-border-warm bg-surface-container-low/40">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest text-outline font-bold">Engineers who picked this also considered</p>
                <p className="font-technical-data text-[10px] text-on-surface-variant">based on {tool.family} · {tool.op}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {peers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onOpenTool(p)}
                    className="text-left p-2.5 rounded-lg border border-border-warm bg-surface-card hover:border-primary hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="ta-insert3d" data-shape={p.shape} data-tone={p.tone} data-size="xs"></div>
                      <span className="w-2 h-2 rounded-full" style={{background:ISO_COLOR[p.iso]}}></span>
                    </div>
                    <p className="font-technical-data text-[10px] uppercase tracking-widest text-on-surface-variant truncate">{p.brand}</p>
                    <p className="font-product-grade text-xs text-ink-text leading-tight truncate">{p.code}</p>
                    <p className="text-[10px] text-on-surface-variant mt-1 flex items-center gap-1">
                      <Icon name="trending_up" size={11}/> {p.weeklyPicks} picks
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="p-6 border-t border-border-warm flex gap-3 justify-end sticky bottom-0 bg-surface-card">
          <a href="cross-reference.html" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-warm text-primary text-sm font-bold hover:bg-surface-container-low transition-colors">
            <Icon name="compare_arrows" size={16}/> Find equivalents
          </a>
          <a href="compare.html" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:-translate-y-0.5 transition-all">
            <Icon name="fact_check" size={16}/> Add to compare
          </a>
        </div>
      </div>
    </div>
  );
}

function Spec({label, value, unit}) {
  return (
    <div className="bg-surface-container-low rounded-lg p-3 border border-border-warm">
      <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">{label}</p>
      <p className="font-technical-data text-xl text-ink-text font-bold">{value} <span className="text-sm text-on-surface-variant">{unit}</span></p>
    </div>
  );
}

// ---------- smart swaps (value-seeker headline) ----------
function SmartSwaps({shortlist, tools, onOpen, onApplySwap}) {
  const [open, setOpen] = useState(true);

  const swaps = useMemo(() => {
    return shortlist
      .filter(t => t.betterValueId)
      .map(t => {
        const to = tools.find(o => o.id === t.betterValueId);
        if (!to) return null;
        const saving = Math.max(0, (t.unitPrice - to.unitPrice));
        const savingPct = t.unitPrice ? Math.round((saving / t.unitPrice) * 100) : 0;
        const lifeGain = to.lifeRel - t.lifeRel;
        return { from: t, to, saving, savingPct, lifeGain, delta: t.betterValueDelta };
      })
      .filter(Boolean);
  }, [shortlist, tools]);

  if (!shortlist.length || swaps.length === 0) return null;

  const totalSaving = swaps.reduce((s, x) => s + x.saving, 0);
  const avgPct = Math.round(swaps.reduce((s, x) => s + x.savingPct, 0) / swaps.length);

  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-br from-iso-n-green/8 via-white to-surface-card border border-iso-n-green/30 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-iso-n-green/5 transition-colors"
        aria-expanded={open}
      >
        <div className="w-10 h-10 rounded-xl bg-iso-n-green/15 flex items-center justify-center shrink-0">
          <Icon name="savings" size={22} className="text-iso-n-green"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-technical-data text-[10px] uppercase tracking-widest text-iso-n-green font-extrabold mb-0.5">Smart swaps on your shortlist</p>
          <p className="font-bold text-ink-text">
            {swaps.length} better-value swap{swaps.length > 1 ? 's' : ''} available
            <span className="text-on-surface-variant font-normal"> · est. €{totalSaving.toFixed(0)} saved per cycle ({avgPct}% avg)</span>
          </p>
        </div>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={22} className="text-on-surface-variant"/>
      </button>
      {open && (
        <div className="border-t border-iso-n-green/20 divide-y divide-iso-n-green/15">
          {swaps.map(s => (
            <div key={s.from.id} className="p-4 flex items-center gap-3 flex-wrap">
              {/* From */}
              <button onClick={() => onOpen(s.from)} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                <div className="ta-insert3d shrink-0" data-shape={s.from.shape} data-tone={s.from.tone} data-size="xs"></div>
                <div className="min-w-0 text-left">
                  <p className="font-technical-data text-[9px] uppercase tracking-widest text-on-surface-variant">{s.from.brand}</p>
                  <p className="font-product-grade text-sm text-ink-text leading-tight truncate">{s.from.code}</p>
                  <p className="text-[10px] font-technical-data text-on-surface-variant">€{s.from.unitPrice} · life {s.from.lifeRel}/5</p>
                </div>
              </button>

              <Icon name="arrow_forward" size={18} className="text-iso-n-green shrink-0"/>

              {/* To */}
              <button onClick={() => onOpen(s.to)} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                <div className="ta-insert3d shrink-0" data-shape={s.to.shape} data-tone={s.to.tone} data-size="xs"></div>
                <div className="min-w-0 text-left">
                  <p className="font-technical-data text-[9px] uppercase tracking-widest text-on-surface-variant">{s.to.brand}</p>
                  <p className="font-product-grade text-sm text-ink-text leading-tight truncate">{s.to.code}</p>
                  <p className="text-[10px] font-technical-data text-iso-n-green font-bold">€{s.to.unitPrice} · life {s.to.lifeRel}/5</p>
                </div>
              </button>

              {/* Delta + apply */}
              <div className="ml-auto flex items-center gap-3">
                <div className="text-right">
                  <p className="font-technical-data text-sm font-bold text-iso-n-green">
                    {s.saving > 0 ? `−€${s.saving.toFixed(0)} (${s.savingPct}%)` : 'same cost'}
                  </p>
                  <p className="text-[10px] text-on-surface-variant">{s.delta}</p>
                </div>
                <button
                  onClick={() => onApplySwap(s.from.id, s.to.id)}
                  className="px-3 py-1.5 rounded-lg bg-iso-n-green text-white text-xs font-bold hover:bg-iso-n-green/90 transition-colors flex items-center gap-1 shrink-0"
                >
                  <Icon name="swap_horiz" size={14}/> Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- main app ----------
function App() {
  const TOOLS = window.TA_TOOLS;

  // filters
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('All');
  const [iso, setIso] = useState(null);   // ISO letter or null
  const [op, setOp] = useState(null);
  const [confMin, setConfMin] = useState(0);
  const [sort, setSort] = useState('relevance');
  const [view, setView] = useState('grid');
  const [visible, setVisible] = useState(PAGE_SIZE);

  // selection
  const [compare, setCompare] = useState(() => new Set(LS.get('ta:compare', [])));
  const [favs, setFavs] = useState(() => new Set(LS.get('ta:favs', [])));
  const [recent, setRecent] = useState(() => LS.get('ta:recent', []));
  const [openTool, setOpenTool] = useState(null);

  useEffect(() => LS.set('ta:compare', [...compare]), [compare]);
  useEffect(() => LS.set('ta:favs',    [...favs]),    [favs]);
  useEffect(() => LS.set('ta:recent',  recent),       [recent]);

  // listen to sidebar filter events (bidirectional sync)
  useEffect(() => {
    const onIso = (e) => { setIso(e.detail?.iso ?? null); setVisible(PAGE_SIZE); };
    const onFam = (e) => {
      const f = e.detail?.family ?? null;
      setFamily(f || 'All');
      setOp(null);
      setVisible(PAGE_SIZE);
    };
    const onClear = () => {
      setQuery(''); setFamily('All'); setIso(null); setOp(null); setConfMin(0); setVisible(PAGE_SIZE);
    };
    window.addEventListener('ta:iso-filter', onIso);
    window.addEventListener('ta:family-filter', onFam);
    window.addEventListener('ta:clear-filters', onClear);
    return () => {
      window.removeEventListener('ta:iso-filter', onIso);
      window.removeEventListener('ta:family-filter', onFam);
      window.removeEventListener('ta:clear-filters', onClear);
    };
  }, []);

  // Broadcast state to sidebar so it can update active visuals
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ta:filter-state', {
      detail: { family: family === 'All' ? null : family, iso }
    }));
  }, [family, iso]);

  // listen for top-nav search (cmd-K-ish) → focus our local search instead
  const searchRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = TOOLS.filter(t => {
      if (family !== 'All' && t.family !== family) return false;
      if (iso && t.iso !== iso) return false;
      if (op && t.op !== op) return false;
      if (t.confidence < confMin) return false;
      if (q) {
        const hay = `${t.brand} ${t.code} ${t.grade} ${t.family} ${t.op} ${t.bestFor} ISO${t.iso}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const midVc = t => (t.vcMin + t.vcMax) / 2;
    const midF  = t => (t.fMin  + t.fMax)  / 2;
    switch (sort) {
      case 'confidence': out.sort((a,b) => b.confidence - a.confidence); break;
      case 'vcDesc':     out.sort((a,b) => midVc(b) - midVc(a)); break;
      case 'vcAsc':      out.sort((a,b) => midVc(a) - midVc(b)); break;
      case 'feedDesc':   out.sort((a,b) => midF(b) - midF(a)); break;
      case 'brandAsc':   out.sort((a,b) => a.brand.localeCompare(b.brand)); break;
      default: /* relevance — preserve insertion order */ break;
    }
    return out;
  }, [TOOLS, query, family, iso, op, confMin, sort]);

  const visibleTools = filtered.slice(0, visible);

  // operations cluster — show only those present in current family
  const ops = useMemo(() => {
    const set = new Set(TOOLS.filter(t => family === 'All' || t.family === family).map(t => t.op));
    return [...set].sort();
  }, [TOOLS, family]);

  // actions
  const toggleCompare = useCallback((id) => {
    setCompare(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { if (next.size >= 4) return prev; next.add(id); }
      return next;
    });
  }, []);
  const toggleFav = useCallback((id) => {
    setFavs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);
  const openDetail = useCallback((tool) => {
    setOpenTool(tool);
    setRecent(prev => {
      const next = [tool.id, ...prev.filter(x => x !== tool.id)].slice(0, 6);
      return next;
    });
  }, []);

  // hydrate inserts when DOM updates
  useEffect(() => {
    const h = () => {
      if (window.taInsert3DHydrate) window.taInsert3DHydrate(document.getElementById('catalog-root'));
    };
    h();
    const t = setTimeout(h, 80);
    return () => clearTimeout(t);
  }, [visibleTools, view, openTool]);

  const compareTools = [...compare].map(id => TOOLS.find(t => t.id === id)).filter(Boolean);
  const favTools     = [...favs].map(id => TOOLS.find(t => t.id === id)).filter(Boolean);
  const recentTools  = recent.map(id => TOOLS.find(t => t.id === id)).filter(Boolean);

  // active filter chips
  const activeChips = [];
  if (query)         activeChips.push({ key:'q',    label:`"${query}"`,                       onClear:() => setQuery('') });
  if (family!=='All')activeChips.push({ key:'fam',  label:`Family: ${family}`,                onClear:() => setFamily('All') });
  if (iso)           activeChips.push({ key:'iso',  label:`ISO ${iso} · ${ISO_LABEL[iso]}`,   onClear:() => setIso(null) });
  if (op)            activeChips.push({ key:'op',   label:`Op: ${op}`,                        onClear:() => setOp(null) });
  if (confMin>0)     activeChips.push({ key:'conf', label:`Confidence ≥ ${confMin}%`,         onClear:() => setConfMin(0) });

  // export CSV
  const exportCSV = useCallback((rows) => {
    const cols = ['brand','code','grade','iso','family','op','vcMin','vcMax','fMin','fMax','apMin','apMax','coolant','stability','confidence','source','supply'];
    const header = cols.join(',');
    const body = rows.map(r => cols.map(c => `"${String(r[c]).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `toolad-catalog-${rows.length}-tools.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <React.Fragment>
      <span data-app-ready hidden></span>
      <section className="p-container-margin">
        {/* Header */}
        <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
          <div>
            <nav className="flex items-center gap-2 text-xs text-outline mb-2" aria-label="Breadcrumb">
              <span>Catalog</span>
              <Icon name="chevron_right" size={14}/>
              <span className="text-primary font-semibold">Browse all tools</span>
            </nav>
            <h1 className="font-section-heading text-display-hero text-ink-text tracking-tight">Cutting Tool Catalog</h1>
            <p className="text-on-surface-variant mt-1 max-w-2xl">Brand-neutral tool index with technical data and source flags. Filter by tool family; refine by ISO material from the left.</p>
          </div>
        </div>

        {/* Pro ribbon — premium teaser */}
        <ProRibbon/>

        {/* Toolbar */}
        <div className="bg-surface-card rounded-2xl border border-border-warm p-3 mb-4 flex flex-wrap items-center gap-2 sticky top-[68px] z-20 backdrop-blur supports-[backdrop-filter]:bg-white/85">
          <div className="relative flex-1 min-w-[240px]">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none"/>
            <input
              ref={searchRef}
              type="search"
              placeholder="Search by code, brand, grade, material… (Ctrl/⌘K)"
              value={query}
              onChange={e => { setQuery(e.target.value); setVisible(PAGE_SIZE); }}
              aria-label="Search catalog"
              className="w-full h-10 pl-10 pr-3 rounded-lg bg-surface-container-low border border-transparent focus:bg-white focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 text-sm font-body-md"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="font-technical-data uppercase tracking-widest text-[10px]">Sort</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="h-10 rounded-lg bg-surface-container-low border border-border-warm px-3 text-sm font-body-md focus:bg-white focus:border-primary focus:outline-none"
            >
              {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="font-technical-data uppercase tracking-widest text-[10px]">Conf ≥</span>
            <select
              value={confMin}
              onChange={e => setConfMin(Number(e.target.value))}
              className="h-10 rounded-lg bg-surface-container-low border border-border-warm px-3 text-sm font-body-md focus:bg-white focus:border-primary focus:outline-none"
            >
              <option value={0}>Any</option>
              <option value={80}>80%</option>
              <option value={85}>85%</option>
              <option value={90}>90%</option>
            </select>
          </label>

          {/* Export */}
          <button
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
            className="h-10 px-3 rounded-lg bg-surface-container-low border border-border-warm text-primary text-xs font-bold flex items-center gap-2 hover:bg-surface-container-high disabled:opacity-40 transition-colors"
            aria-label="Export current results as CSV"
          >
            <Icon name="download" size={16}/> Export CSV
          </button>

          <SavedSearchesProButton/>

          {/* View toggle */}
          <div className="flex bg-surface-container-low border border-border-warm rounded-lg p-1 h-10" role="group" aria-label="View mode">
            <button
              onClick={() => setView('grid')}
              aria-pressed={view==='grid'}
              aria-label="Grid view"
              className={`px-3 rounded-md flex items-center ${view==='grid' ? 'bg-white shadow-sm' : 'hover:bg-surface-container-high'}`}
            >
              <Icon name="grid_view" size={18} className={view==='grid' ? 'text-primary' : 'text-outline'}/>
            </button>
            <button
              onClick={() => setView('list')}
              aria-pressed={view==='list'}
              aria-label="List view"
              className={`px-3 rounded-md flex items-center ${view==='list' ? 'bg-white shadow-sm' : 'hover:bg-surface-container-high'}`}
            >
              <Icon name="view_list" size={18} className={view==='list' ? 'text-primary' : 'text-outline'}/>
            </button>
          </div>
        </div>

        {/* Family chips */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="font-technical-data text-[10px] uppercase tracking-widest text-on-surface-variant mr-1">Tool family ·</span>
          {FAMILIES.map(f => (
            <button
              key={f}
              onClick={() => { setFamily(f); setOp(null); setVisible(PAGE_SIZE); }}
              aria-pressed={family === f}
              className={`px-4 py-2 rounded-full font-bold text-xs transition-all ${
                family === f
                  ? 'bg-primary text-white'
                  : 'bg-white border border-border-warm text-primary hover:bg-surface-container-low'
              }`}
            >{f}</button>
          ))}
          <span className="ml-3 text-[11px] text-on-surface-variant hidden lg:inline">ISO material is a refinement — use the left sidebar.</span>
        </div>

        {/* Operation sub-filter (only when a family is selected) */}
        {family !== 'All' && ops.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 -mt-1">
            <span className="font-technical-data text-[10px] uppercase tracking-widest text-on-surface-variant mr-1">Operation ·</span>
            <button
              onClick={() => setOp(null)}
              aria-pressed={!op}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${!op ? 'bg-ink-text text-white' : 'bg-white border border-border-warm text-on-surface-variant hover:bg-surface-container-low'}`}
            >Any</button>
            {ops.map(o => (
              <button
                key={o}
                onClick={() => setOp(op === o ? null : o)}
                aria-pressed={op === o}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${op === o ? 'bg-ink-text text-white' : 'bg-white border border-border-warm text-on-surface-variant hover:bg-surface-container-low'}`}
              >{o}</button>
            ))}
          </div>
        )}

        {/* Active filter chips + result counter */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {activeChips.length > 0 ? (
              <React.Fragment>
                <span className="font-technical-data text-[10px] uppercase tracking-widest text-on-surface-variant">Active ·</span>
                {activeChips.map(c => (
                  <button
                    key={c.key}
                    onClick={c.onClear}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 text-primary text-xs font-bold border border-primary/15 hover:bg-primary/15 transition-colors"
                  >
                    {c.label}
                    <Icon name="close" size={14}/>
                  </button>
                ))}
                <button
                  onClick={() => { setQuery(''); setFamily('All'); setOp(null); setConfMin(0); setIso(null); }}
                  className="text-xs text-on-surface-variant hover:text-primary underline-offset-2 hover:underline"
                >Clear all</button>
              </React.Fragment>
            ) : <span className="text-xs text-on-surface-variant">No filters · showing all</span>}
          </div>
          <p className="text-xs font-technical-data text-ink-text">
            {visible < filtered.length
              ? <React.Fragment><span className="font-bold">{visible}</span> shown <span className="text-on-surface-variant">of</span> <span className="font-bold">{filtered.length}</span> matching</React.Fragment>
              : <React.Fragment><span className="font-bold">{filtered.length}</span> {filtered.length === 1 ? 'result' : 'results'}</React.Fragment>
            }
          </p>
        </div>

        {/* Shortlist strip */}
        {favTools.length > 0 && (
          <div className="bg-secondary-fixed/30 border border-secondary-fixed-dim rounded-xl p-3 mb-4 flex items-center gap-3">
            <Icon name="bookmark" size={18} className="text-secondary" fill/>
            <span className="text-xs font-bold text-ink-text uppercase tracking-wider">My shortlist · {favTools.length}</span>
            <div className="flex-1 flex gap-2 overflow-x-auto">
              {favTools.map(t => (
                <button key={t.id} onClick={() => openDetail(t)} className="shrink-0 flex items-center gap-2 bg-white border border-border-warm rounded-lg px-2 py-1 text-xs hover:border-primary transition-colors">
                  <span className="w-2 h-2 rounded-full" style={{background:ISO_COLOR[t.iso]}}></span>
                  <span className="font-technical-data">{t.code}</span>
                </button>
              ))}
            </div>
            <button onClick={() => exportCSV(favTools)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <Icon name="download" size={14}/> Export
            </button>
          </div>
        )}

        {/* Smart Swaps — value-seeker headline feature */}
        <SmartSwaps shortlist={favTools} tools={TOOLS} onOpen={openDetail} onApplySwap={(fromId, toId) => {
          setFavs(prev => { const n = new Set(prev); n.delete(fromId); n.add(toId); return n; });
        }}/>

        {/* Recently viewed strip */}
        {recentTools.length > 0 && (
          <div className="bg-surface-container-low border border-border-warm rounded-xl p-3 mb-4 flex items-center gap-3">
            <Icon name="history" size={18} className="text-outline"/>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Recently viewed</span>
            <div className="flex-1 flex gap-2 overflow-x-auto">
              {recentTools.map(t => (
                <button key={t.id} onClick={() => openDetail(t)} className="shrink-0 flex items-center gap-2 bg-white border border-border-warm rounded-lg px-2 py-1 text-xs hover:border-primary transition-colors">
                  <span className="w-2 h-2 rounded-full" style={{background:ISO_COLOR[t.iso]}}></span>
                  <span className="font-technical-data">{t.code}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {visibleTools.length === 0 ? (
          <div className="bg-surface-card border border-border-warm rounded-2xl p-12 text-center">
            <Icon name="search_off" size={48} className="text-outline mb-3"/>
            <h3 className="font-product-grade text-ink-text mb-1">No tools match your filters</h3>
            <p className="text-sm text-on-surface-variant mb-4">Try clearing some filters or broadening your search.</p>
            <button
              onClick={() => { setQuery(''); setFamily('All'); setOp(null); setConfMin(0); setIso(null); }}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold"
            >Clear all filters</button>
          </div>
        ) : (
          <div className={view==='grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'flex flex-col gap-3'
          }>
            {visibleTools.map(t => (
              <ToolCard
                key={t.id}
                tool={t}
                view={view}
                isCompared={compare.has(t.id)}
                onToggleCompare={toggleCompare}
                isFav={favs.has(t.id)}
                onToggleFav={toggleFav}
                onOpen={openDetail}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {visible < filtered.length && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setVisible(v => v + PAGE_SIZE)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-border-warm text-primary font-bold text-sm hover:bg-surface-container-low transition-colors"
            >
              Load {Math.min(PAGE_SIZE, filtered.length - visible)} more
              <Icon name="expand_more" size={18}/>
            </button>
          </div>
        )}

        {/* Bottom bento — refocused on actual catalog actions */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="compare.html" className="md:col-span-2 bg-surface-container-high rounded-[24px] p-8 flex items-center justify-between overflow-hidden relative group hover:shadow-xl transition-all">
            <div className="relative z-10 max-w-md">
              <p className="font-technical-data text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">{compare.size} selected</p>
              <h4 className="font-section-heading text-primary mb-3">Side-by-side comparison</h4>
              <p className="text-on-surface-variant mb-6">Open the comparison matrix to put up to four tools head-to-head: Vc range, feed envelope, stability, cost tier, and engineering notes.</p>
              <span className="bg-primary text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 group-hover:bg-primary-container transition-colors">
                Launch comparison matrix
                <Icon name="trending_up" size={18}/>
              </span>
            </div>
            <div className="hidden lg:block relative -right-10 opacity-40">
              <Icon name="analytics" size={200} className="text-primary/20"/>
            </div>
          </a>
          <div className="bg-ink-text text-white rounded-[24px] p-8 flex flex-col justify-between">
            <div>
              <Icon name="bookmark" size={32} className="mb-4" fill/>
              <h4 className="text-xl font-bold mb-2">Shortlist &amp; export</h4>
              <p className="text-white/70 text-sm">Save tools you're considering. Export a clean CSV to share with procurement or your CAM team.</p>
            </div>
            <button
              onClick={() => exportCSV(favTools.length ? favTools : filtered)}
              className="w-full bg-white text-ink-text py-3 rounded-xl font-bold text-sm mt-8 flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all"
            >
              <Icon name="download" size={16}/>
              {favTools.length ? `Export ${favTools.length} saved` : `Export current view`}
            </button>
          </div>
        </div>
      </section>

      <DetailModal tool={openTool} onClose={() => setOpenTool(null)} onOpenTool={openDetail} tools={TOOLS}/>
      <CompareDrawer
        tools={compareTools}
        onRemove={toggleCompare}
        onClear={() => setCompare(new Set())}
        onOpen={openDetail}
        onCompare={() => { window.location.href = 'compare.html'; }}
        onExport={() => exportCSV(compareTools)}
      />
      <AIDock
        filters={{ query, family, iso, op }}
        shortlistTools={favTools}
        compareTools={compareTools}
        onOpenTool={openDetail}
      />
    </React.Fragment>
  );
}

// ============================================================
// AI DOCK + PREMIUM SURFACES
// ============================================================

// Quick actions shown above the chat. `pro:true` → locked → opens pro modal.
const AI_QUICK_ACTIONS = [
  { id:'explain-iso',  icon:'school',        label:'Explain ISO P vs M',         prompt:'In 4 short bullet points, explain when to use ISO P (steel) inserts vs ISO M (stainless) inserts. Focus on practical decision criteria for a CNC operator.', pro:false },
  { id:'pick-shortlist', icon:'auto_awesome',label:'Pick best from shortlist',   prompt:'CTX_SHORTLIST', pro:false },
  { id:'pdf-sheet',    icon:'picture_as_pdf',label:'CAM-ready spec PDF',         prompt:null, pro:true },
  { id:'cross-brand',  icon:'savings',       label:'Cheapest cross-brand swap',  prompt:null, pro:true },
];

const FREE_DAILY = 3;

function aiCtx(filters, shortlist, compare) {
  const parts = [];
  if (filters.family !== 'All') parts.push(`Family: ${filters.family}`);
  if (filters.iso) parts.push(`ISO ${filters.iso} (${ISO_LABEL[filters.iso]})`);
  if (filters.op) parts.push(`Operation: ${filters.op}`);
  if (filters.query) parts.push(`Search: "${filters.query}"`);
  const ctx = [];
  if (parts.length) ctx.push(`Active filters → ${parts.join(', ')}.`);
  if (shortlist.length) ctx.push(`User's shortlist: ${shortlist.map(t => `${t.brand} ${t.code} (ISO ${t.iso}, ${t.family})`).join('; ')}.`);
  if (compare.length) ctx.push(`In compare drawer: ${compare.map(t => `${t.brand} ${t.code}`).join('; ')}.`);
  return ctx.join('\n');
}

function freeCounter() {
  const today = new Date().toISOString().slice(0,10);
  const st = LS.get('ta:ai:count', { day:today, used:0 });
  if (st.day !== today) return { day:today, used:0 };
  return st;
}
function incrFreeCounter() {
  const c = freeCounter();
  c.used += 1;
  LS.set('ta:ai:count', c);
  return c;
}

function ProBadge() {
  return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[9px] font-extrabold uppercase tracking-widest shadow-sm">
    <Icon name="workspace_premium" size={10} fill/> Pro
  </span>;
}

function AIDock({filters, shortlistTools, compareTools, onOpenTool}) {
  const [open, setOpen] = useState(() => LS.get('ta:ai:open', false));
  const [messages, setMessages] = useState(() => LS.get('ta:ai:messages', []));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(() => freeCounter());
  const scrollRef = useRef(null);
  const lastShownAt = useRef(0);

  useEffect(() => LS.set('ta:ai:open', open), [open]);
  useEffect(() => LS.set('ta:ai:messages', messages.slice(-30)), [messages]);

  // Pulse: nudge the launcher 8 seconds after first load if the user hasn't opened it
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setPulse(true), 7000);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const remaining = Math.max(0, FREE_DAILY - count.used);

  const ask = async (rawPrompt) => {
    if (busy) return;
    if (remaining <= 0) {
      TA_openProModal();
      return;
    }
    let prompt = rawPrompt;
    // contextual prompt: "pick best from shortlist"
    if (prompt === 'CTX_SHORTLIST') {
      if (!shortlistTools.length) {
        setMessages(m => [...m, { role:'user', text:'Pick best from my shortlist' }, { role:'ai', text:"Your shortlist is empty. Tap the bookmark icon on any tool card to start a shortlist — then I'll recommend a pick based on your active filters." }]);
        return;
      }
      prompt = `From this shortlist, recommend the best single pick and explain why in 3 short bullets. If a runner-up is close, mention it.\n\nShortlist:\n${shortlistTools.map(t => `- ${t.brand} ${t.code} (ISO ${t.iso}, ${t.family}, Vc ${t.vcMin}-${t.vcMax} m/min, confidence ${t.confidence}%) — ${t.bestFor}`).join('\n')}`;
    }

    setMessages(m => [...m, { role:'user', text: rawPrompt === 'CTX_SHORTLIST' ? 'Pick best from my shortlist' : prompt }]);
    setInput('');
    setBusy(true);

    const sys = `You are ToolAdvisor's in-app metalworking AI assistant. You help machinists and engineers choose cutting tools. Be concise, technical, and direct — prefer bullet points and short sentences. Never invent specs; if user data isn't given, reason from ISO group conventions. Refer to specific tools in user's shortlist or compare drawer when relevant. Don't recommend external brands not in the catalog.\n\n${aiCtx(filters, shortlistTools, compareTools)}`;

    try {
      const reply = await window.claude.complete({
        messages: [
          { role:'user', content: `${sys}\n\nUser question: ${prompt}` }
        ]
      });
      setMessages(m => [...m, { role:'ai', text: reply || '(no response)' }]);
      setCount(incrFreeCounter());
    } catch (err) {
      setMessages(m => [...m, { role:'ai', text:`Sorry — I had trouble answering that. (${err?.message || 'error'})` }]);
    }
    setBusy(false);
  };

  const submit = (e) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    ask(v);
  };

  // Launcher (collapsed state)
  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setPulse(false); }}
        aria-label="Open Advisor AI chat"
        className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 pl-3 pr-5 py-3 rounded-full bg-gradient-to-br from-primary to-primary-container text-white shadow-2xl hover:-translate-y-0.5 transition-transform"
      >
        <span className={`relative flex items-center justify-center w-9 h-9 rounded-full bg-white/15 ${pulse ? 'ai-pulse' : ''}`}>
          <Icon name="auto_awesome" size={22} fill/>
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[10px] font-technical-data uppercase tracking-widest opacity-80">Advisor AI</span>
          <span className="block text-sm font-bold">Ask a question</span>
        </span>
        <span className="ml-2 px-1.5 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[9px] font-extrabold uppercase tracking-widest">
          {remaining}/{FREE_DAILY} free
        </span>
      </button>
    );
  }

  // Expanded
  return (
    <div role="dialog" aria-label="Advisor AI" className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-96px)] bg-surface-card border border-border-warm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up-r">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-br from-ink-text to-primary-container text-white flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
          <Icon name="auto_awesome" size={20} fill/>
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold leading-tight">Advisor AI</p>
          <p className="text-[11px] text-white/70 leading-tight">Trained on cutting-tool engineering</p>
        </div>
        <button onClick={TA_openProModal} className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-400 text-amber-950 text-[10px] font-extrabold uppercase tracking-widest hover:bg-amber-300 transition-colors">
          <Icon name="workspace_premium" size={12} fill/> Unlock Pro
        </button>
        <button onClick={() => setOpen(false)} aria-label="Minimize" className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center">
          <Icon name="minimize" size={18}/>
        </button>
      </div>

      {/* Quick actions */}
      <div className="p-3 border-b border-border-warm bg-surface-container-low/60">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2 flex items-center gap-2">Quick actions
          <span className="font-technical-data text-[10px] text-on-surface-variant normal-case tracking-normal ml-auto">{remaining}/{FREE_DAILY} free today</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {AI_QUICK_ACTIONS.map(a => (
            <button
              key={a.id}
              onClick={() => a.pro ? TA_openProModal() : ask(a.prompt)}
              disabled={busy}
              className={`relative text-left p-2.5 rounded-lg border text-xs font-bold leading-tight transition-all ${
                a.pro
                  ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                  : 'bg-white border-border-warm text-ink-text hover:border-primary hover:bg-primary/5'
              } ${busy ? 'opacity-50 cursor-wait' : ''}`}
            >
              <Icon name={a.icon} size={16} className={a.pro ? 'text-amber-700 mb-1' : 'text-primary mb-1'}/>
              <span className="block">{a.label}</span>
              {a.pro && (
                <span className="absolute top-1.5 right-1.5"><ProBadge/></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-surface-card">
        {messages.length === 0 && (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Icon name="auto_awesome" size={24} className="text-primary" fill/>
            </div>
            <p className="text-sm font-bold text-ink-text mb-1">How can I help?</p>
            <p className="text-xs text-on-surface-variant leading-relaxed">Try a quick action above, or ask anything — speeds, feeds, ISO groups, geometry, troubleshooting tool wear.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-surface-container-high' : 'bg-primary text-white'}`}>
              <Icon name={m.role === 'user' ? 'person' : 'auto_awesome'} size={14} fill={m.role === 'ai'}/>
            </div>
            <div className={`max-w-[80%] p-2.5 rounded-xl text-[13px] leading-snug whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-white rounded-tr-sm' : 'bg-surface-container-low text-ink-text rounded-tl-sm'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center"><Icon name="auto_awesome" size={14} fill/></div>
            <div className="p-2.5 rounded-xl bg-surface-container-low flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant ai-dot" style={{animationDelay:'0ms'}}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant ai-dot" style={{animationDelay:'150ms'}}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant ai-dot" style={{animationDelay:'300ms'}}></span>
            </div>
          </div>
        )}
      </div>

      {/* Out-of-credits banner */}
      {remaining <= 0 && (
        <div className="px-3 py-2 bg-amber-50 border-t border-amber-200 flex items-center gap-2">
          <Icon name="workspace_premium" size={16} className="text-amber-700" fill/>
          <span className="text-xs text-amber-900 flex-1">Free questions used. Unlock unlimited with Pro.</span>
          <button onClick={TA_openProModal} className="px-2 py-1 rounded-md bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition-colors">Upgrade</button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={submit} className="p-3 border-t border-border-warm flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={remaining > 0 ? 'Ask about tools, speeds, materials…' : 'Out of free questions — upgrade to continue'}
          disabled={busy || remaining <= 0}
          className="flex-1 h-10 px-3 rounded-lg bg-surface-container-low border border-transparent focus:bg-white focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim() || remaining <= 0}
          aria-label="Send"
          className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-transform"
        >
          <Icon name="send" size={18}/>
        </button>
      </form>
    </div>
  );
}

function TA_openProModal() {
  const btn = document.querySelector('[data-modal-open="pro-upgrade"]');
  if (btn) { btn.click(); return; }
  if (window.TA?.openModal) window.TA.openModal('pro-upgrade');
  else window.location.href = 'pro.html';
}

// Premium ribbon shown above results — discoverable, dismissible
function ProRibbon() {
  const [dismissed, setDismissed] = useState(() => LS.get('ta:pro-ribbon-dismissed', false));
  if (dismissed) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl mb-4 bg-gradient-to-r from-ink-text via-primary-container to-primary text-white">
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{background:'radial-gradient(circle at 90% 50%, rgba(245,158,11,.5), transparent 60%)'}}></div>
      <div className="relative flex items-center gap-4 p-4">
        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-white/10 items-center justify-center shrink-0">
          <Icon name="workspace_premium" size={28} className="text-amber-300" fill/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-technical-data text-[10px] uppercase tracking-widest text-amber-300/90 mb-0.5">Pro features in this catalog</p>
          <p className="font-bold leading-snug">AI tool picker · bulk PDF spec sheets · cross-brand cost analysis · saved searches</p>
        </div>
        <button onClick={TA_openProModal} className="hidden md:inline-flex items-center gap-2 bg-amber-400 text-amber-950 px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-widest hover:bg-amber-300 transition-colors shrink-0">
          Try Pro free
          <Icon name="arrow_forward" size={14}/>
        </button>
        <button onClick={() => { setDismissed(true); LS.set('ta:pro-ribbon-dismissed', true); }} aria-label="Dismiss" className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center shrink-0">
          <Icon name="close" size={16}/>
        </button>
      </div>
    </div>
  );
}

// "Saved searches" Pro button (in toolbar)
function SavedSearchesProButton() {
  return (
    <button
      onClick={TA_openProModal}
      className="h-10 px-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2 hover:bg-amber-100 transition-colors relative"
      aria-label="Saved searches — Pro feature"
    >
      <Icon name="bookmark_added" size={16} className="text-amber-700"/>
      Saved searches
      <ProBadge/>
    </button>
  );
}

// Expose pieces so they can be picked up by the App tree below
window.AIDock = AIDock;
window.ProRibbon = ProRibbon;
window.SavedSearchesProButton = SavedSearchesProButton;

// Mount
const root = ReactDOM.createRoot(document.getElementById('catalog-root'));
root.render(<App />);
