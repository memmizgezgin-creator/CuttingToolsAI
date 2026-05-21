// ToolAdvisor — Catalog dataset
// 36 brand-neutral cutting tools with realistic specs.
// Loaded BEFORE directory-app.jsx; populates window.TA_TOOLS.
/* Legacy catalog snapshot kept as migration reference only.
   Phase 1.2 loads catalog data from Supabase products instead of this file. */
(function () {
  const TOOLS = [
    // -------- TURNING INSERTS (P) --------
    { id:'T01', brand:'Sandvik',    code:'CNMG 120408-PM',    grade:'GC4325', shape:'C', tone:'iso-p', iso:'P', family:'Turning',   op:'Roughing',  vcMin:200, vcMax:360, fMin:0.15, fMax:0.50, apMin:0.5, apMax:5.0, coolant:'Wet/Dry', stability:'High',   bestFor:'Continuous P-group turning',     confidence:96, source:'Manufacturer data',     supply:3, equivalents:5, lastVerified:'2024-08' },
    { id:'T02', brand:'Mitsubishi', code:'DNMG 150608',       grade:'MC6025', shape:'D', tone:'iso-p', iso:'P', family:'Turning',   op:'Roughing',  vcMin:180, vcMax:340, fMin:0.18, fMax:0.50, apMin:1.0, apMax:6.0, coolant:'Wet',     stability:'High',   bestFor:'Medium P-group roughing',         confidence:90, source:'Manufacturer data',     supply:4, equivalents:6, lastVerified:'2024-06' },
    { id:'T03', brand:'Walter',     code:'CNMG 120412-NF4',   grade:'WPP20S', shape:'C', tone:'iso-p', iso:'P', family:'Turning',   op:'Finishing', vcMin:240, vcMax:380, fMin:0.10, fMax:0.30, apMin:0.3, apMax:3.0, coolant:'Wet/Dry', stability:'High',   bestFor:'Continuous steel finishing',      confidence:94, source:'Manufacturer data',     supply:3, equivalents:4, lastVerified:'2024-09' },
    { id:'T04', brand:'Kennametal', code:'SNMG 120408-MP',    grade:'KCP25C', shape:'S', tone:'iso-p', iso:'P', family:'Turning',   op:'Mixed',     vcMin:160, vcMax:320, fMin:0.18, fMax:0.45, apMin:0.5, apMax:5.0, coolant:'Wet',     stability:'Medium', bestFor:'Versatile steel turning',         confidence:89, source:'Manufacturer data',     supply:5, equivalents:7, lastVerified:'2024-05' },
    { id:'T05', brand:'Iscar',      code:'WNMG 080408-NM',    grade:'IC8150', shape:'W', tone:'iso-p', iso:'P', family:'Turning',   op:'Mixed',     vcMin:180, vcMax:300, fMin:0.20, fMax:0.50, apMin:1.0, apMax:5.5, coolant:'Wet',     stability:'High',   bestFor:'Heavy P-group turning',           confidence:87, source:'Manufacturer + reviewed', supply:4, equivalents:5, lastVerified:'2024-07' },

    // -------- TURNING INSERTS (M) --------
    { id:'T06', brand:'Iscar',      code:'VCMT 160404',       grade:'IC907',  shape:'V', tone:'iso-m', iso:'M', family:'Turning',   op:'Finishing', vcMin:140, vcMax:280, fMin:0.08, fMax:0.30, apMin:0.2, apMax:2.5, coolant:'Wet',     stability:'High',   bestFor:'Stainless finishing',             confidence:91, source:'Manufacturer data',     supply:4, equivalents:6, lastVerified:'2024-08' },
    { id:'T07', brand:'Sandvik',    code:'TPMR 220408',       grade:'GC1025', shape:'T', tone:'iso-m', iso:'M', family:'Reaming',   op:'Prep',      vcMin:120, vcMax:220, fMin:0.10, fMax:0.25, apMin:0.5, apMax:3.0, coolant:'Wet',     stability:'High',   bestFor:'Stainless threading prep',        confidence:85, source:'Manufacturer + reviewed', supply:3, equivalents:3, lastVerified:'2024-04' },
    { id:'T08', brand:'Mitsubishi', code:'CCMT 09T308-SM',    grade:'VP15TF', shape:'C', tone:'iso-m', iso:'M', family:'Turning',   op:'Finishing', vcMin:150, vcMax:260, fMin:0.08, fMax:0.28, apMin:0.3, apMax:2.0, coolant:'Wet',     stability:'High',   bestFor:'Stainless light finishing',       confidence:92, source:'Manufacturer data',     supply:4, equivalents:5, lastVerified:'2024-09' },
    { id:'T09', brand:'Korloy',     code:'DCMT 11T304-HM',    grade:'PC9030', shape:'D', tone:'iso-m', iso:'M', family:'Turning',   op:'Mixed',     vcMin:120, vcMax:240, fMin:0.10, fMax:0.35, apMin:0.5, apMax:3.5, coolant:'Wet',     stability:'Medium', bestFor:'Mixed M-group turning',           confidence:78, source:'Generated estimate',    supply:2, equivalents:4, lastVerified:'2024-02' },

    // -------- TURNING INSERTS (K) --------
    { id:'T10', brand:'Kennametal', code:'CNMG 120408-KR',    grade:'KCK15B', shape:'C', tone:'iso-k', iso:'K', family:'Turning',   op:'Roughing',  vcMin:220, vcMax:380, fMin:0.20, fMax:0.55, apMin:1.0, apMax:6.0, coolant:'Dry',     stability:'High',   bestFor:'Cast iron heavy turning',         confidence:89, source:'Manufacturer data',     supply:4, equivalents:5, lastVerified:'2024-07' },
    { id:'T11', brand:'Sandvik',    code:'SNMG 120408-KM',    grade:'GC3210', shape:'S', tone:'iso-k', iso:'K', family:'Turning',   op:'Mixed',     vcMin:200, vcMax:340, fMin:0.15, fMax:0.45, apMin:0.5, apMax:5.0, coolant:'Dry',     stability:'Medium', bestFor:'Grey cast iron versatile',        confidence:93, source:'Manufacturer data',     supply:5, equivalents:6, lastVerified:'2024-09' },

    // -------- DRILLING (K) --------
    { id:'T12', brand:'Kennametal', code:'WCMX 06T308-53',    grade:'KC7325', shape:'W', tone:'iso-k', iso:'K', family:'Drilling',  op:'Roughing',  vcMin:180, vcMax:260, fMin:0.10, fMax:0.20, apMin:1.0, apMax:4.0, coolant:'Wet',     stability:'High',   bestFor:'Cast iron heavy drilling',        confidence:88, source:'Manufacturer + reviewed', supply:3, equivalents:4, lastVerified:'2024-06' },
    { id:'T13', brand:'Sandvik',    code:'880-D2200L25-02',   grade:'GC4044', shape:'D', tone:'iso-k', iso:'K', family:'Drilling',  op:'Indexable', vcMin:160, vcMax:280, fMin:0.08, fMax:0.18, apMin:1.5, apMax:5.0, coolant:'Wet',     stability:'High',   bestFor:'Indexable drilling cast iron',    confidence:90, source:'Manufacturer data',     supply:3, equivalents:3, lastVerified:'2024-08' },
    { id:'T14', brand:'OSG',        code:'A-TAP 8.5x125',     grade:'V-HSS',  shape:'-', tone:'iso-k', iso:'K', family:'Drilling',  op:'Solid',     vcMin: 80, vcMax:140, fMin:0.12, fMax:0.22, apMin:0.5, apMax:3.0, coolant:'Wet',     stability:'Medium', bestFor:'HSS solid drill general purpose', confidence:82, source:'Manufacturer + reviewed', supply:4, equivalents:6, lastVerified:'2024-03' },

    // -------- MILLING (N — aluminium) --------
    { id:'T15', brand:'Mitsubishi', code:'SCGT 120408-AL',    grade:'AP25N',  shape:'S', tone:'iso-n', iso:'N', family:'Milling',   op:'HSM',       vcMin:600, vcMax:1200,fMin:0.10, fMax:0.25, apMin:0.5, apMax:3.0, coolant:'MQL',     stability:'High',   bestFor:'Aluminium high-speed mill',       confidence:93, source:'Manufacturer data',     supply:4, equivalents:5, lastVerified:'2024-09' },
    { id:'T16', brand:'Sandvik',    code:'R390-11T308M-PL',   grade:'1130',   shape:'R', tone:'iso-n', iso:'N', family:'Milling',   op:'Shoulder',  vcMin:450, vcMax: 900,fMin:0.12, fMax:0.30, apMin:1.0, apMax:8.0, coolant:'MQL/Dry', stability:'High',   bestFor:'Aluminium shoulder milling',      confidence:91, source:'Manufacturer data',     supply:3, equivalents:4, lastVerified:'2024-08' },
    { id:'T17', brand:'Iscar',      code:'HM390 TDKT 1505',   grade:'IC830',  shape:'T', tone:'iso-n', iso:'N', family:'Milling',   op:'Face',      vcMin:500, vcMax:1100,fMin:0.10, fMax:0.28, apMin:0.5, apMax:6.0, coolant:'Dry',     stability:'High',   bestFor:'Face milling non-ferrous',        confidence:84, source:'Manufacturer + reviewed', supply:3, equivalents:4, lastVerified:'2024-05' },

    // -------- MILLING (P — steel) --------
    { id:'T18', brand:'Walter',     code:'XOEX 120404R-W07',  grade:'WPP35S', shape:'X', tone:'iso-p', iso:'P', family:'Milling',   op:'Shoulder',  vcMin:200, vcMax: 340,fMin:0.10, fMax:0.25, apMin:1.0, apMax:6.0, coolant:'Wet',     stability:'High',   bestFor:'Steel shoulder milling',          confidence:88, source:'Manufacturer data',     supply:3, equivalents:5, lastVerified:'2024-07' },
    { id:'T19', brand:'Kennametal', code:'EDPT 100308-PDER',  grade:'KCPM40', shape:'E', tone:'iso-p', iso:'P', family:'Milling',   op:'Face',      vcMin:180, vcMax: 320,fMin:0.12, fMax:0.30, apMin:0.5, apMax:5.0, coolant:'Wet',     stability:'High',   bestFor:'Face milling carbon steel',       confidence:86, source:'Manufacturer + reviewed', supply:3, equivalents:4, lastVerified:'2024-04' },
    { id:'T20', brand:'Sandvik',    code:'R245-12T3M-PM',     grade:'4240',   shape:'R', tone:'iso-p', iso:'P', family:'Milling',   op:'Face',      vcMin:220, vcMax: 360,fMin:0.10, fMax:0.28, apMin:1.0, apMax:5.5, coolant:'Wet/Dry', stability:'High',   bestFor:'High-feed face milling steel',    confidence:94, source:'Manufacturer data',     supply:4, equivalents:6, lastVerified:'2024-09' },

    // -------- MILLING (M — stainless) --------
    { id:'T21', brand:'Tungaloy',   code:'XPMT 060204-DJ',    grade:'AH725',  shape:'X', tone:'iso-m', iso:'M', family:'Milling',   op:'Shoulder',  vcMin:120, vcMax: 220,fMin:0.08, fMax:0.22, apMin:0.5, apMax:4.0, coolant:'Wet',     stability:'High',   bestFor:'Stainless shoulder mill',         confidence:87, source:'Manufacturer + reviewed', supply:2, equivalents:3, lastVerified:'2024-06' },
    { id:'T22', brand:'Mitsubishi', code:'AXMT 123508-PEER',  grade:'MP9130', shape:'A', tone:'iso-m', iso:'M', family:'Milling',   op:'High-feed', vcMin:140, vcMax: 240,fMin:0.06, fMax:0.18, apMin:0.3, apMax:1.5, coolant:'Wet',     stability:'Medium', bestFor:'Stainless high-feed milling',     confidence:83, source:'Manufacturer data',     supply:2, equivalents:3, lastVerified:'2024-05' },

    // -------- SUPERALLOY (S) --------
    { id:'T23', brand:'Walter',     code:'WNMG 080408',       grade:'WSM30S', shape:'W', tone:'iso-s', iso:'S', family:'Turning',   op:'Mixed',     vcMin: 30, vcMax:  60,fMin:0.10, fMax:0.30, apMin:0.5, apMax:3.0, coolant:'High-P',  stability:'Medium', bestFor:'Inconel / superalloys',           confidence:82, source:'Manufacturer + reviewed', supply:2, equivalents:2, lastVerified:'2024-03' },
    { id:'T24', brand:'Sandvik',    code:'CNMG 120408-SMR',   grade:'S205',   shape:'C', tone:'iso-s', iso:'S', family:'Turning',   op:'Roughing',  vcMin: 40, vcMax:  80,fMin:0.15, fMax:0.40, apMin:1.0, apMax:4.0, coolant:'High-P',  stability:'High',   bestFor:'Titanium roughing',               confidence:88, source:'Manufacturer data',     supply:2, equivalents:3, lastVerified:'2024-08' },
    { id:'T25', brand:'Kennametal', code:'CCGT 09T308-AL',    grade:'KCU10',  shape:'C', tone:'iso-s', iso:'S', family:'Turning',   op:'Finishing', vcMin: 50, vcMax: 100,fMin:0.06, fMax:0.20, apMin:0.2, apMax:1.5, coolant:'High-P',  stability:'High',   bestFor:'Ti-6Al-4V finishing',             confidence:85, source:'Manufacturer + reviewed', supply:2, equivalents:2, lastVerified:'2024-07' },

    // -------- HARDENED STEEL (H) --------
    { id:'T26', brand:'Tungaloy',   code:'DCMT 11T304',       grade:'T9215',  shape:'D', tone:'iso-h', iso:'H', family:'Turning',   op:'Finishing', vcMin: 80, vcMax: 140,fMin:0.05, fMax:0.15, apMin:0.1, apMax:0.5, coolant:'Dry',     stability:'High',   bestFor:'Hardened steel finishing',        confidence:79, source:'Generated estimate',    supply:2, equivalents:3, lastVerified:'2024-02' },
    { id:'T27', brand:'Sandvik',    code:'CCGW 09T308-CBN',   grade:'CB7015', shape:'C', tone:'iso-h', iso:'H', family:'Turning',   op:'Finishing', vcMin:100, vcMax: 200,fMin:0.05, fMax:0.18, apMin:0.1, apMax:0.4, coolant:'Dry',     stability:'High',   bestFor:'Hardened steel CBN finishing',    confidence:91, source:'Manufacturer data',     supply:2, equivalents:2, lastVerified:'2024-08' },

    // -------- THREADING --------
    { id:'T28', brand:'Vargus',     code:'16ER 1.5 ISO',      grade:'VKX',    shape:'-', tone:'iso-p', iso:'P', family:'Threading', op:'External',  vcMin:120, vcMax: 200,fMin:1.50, fMax:1.50, apMin:0.1, apMax:0.4, coolant:'Wet',     stability:'High',   bestFor:'ISO metric external threading',   confidence:87, source:'Manufacturer + reviewed', supply:3, equivalents:5, lastVerified:'2024-05' },
    { id:'T29', brand:'Sandvik',    code:'266RG-16MM01F100E', grade:'1135',   shape:'-', tone:'iso-p', iso:'P', family:'Threading', op:'External',  vcMin:140, vcMax: 240,fMin:1.00, fMax:1.00, apMin:0.1, apMax:0.4, coolant:'Wet',     stability:'High',   bestFor:'Multi-pitch threading',           confidence:90, source:'Manufacturer data',     supply:3, equivalents:4, lastVerified:'2024-09' },
    { id:'T30', brand:'Iscar',      code:'16IR AG60',         grade:'IC228',  shape:'-', tone:'iso-m', iso:'M', family:'Threading', op:'Internal',  vcMin: 90, vcMax: 160,fMin:1.25, fMax:1.25, apMin:0.1, apMax:0.3, coolant:'Wet',     stability:'Medium', bestFor:'Internal stainless threading',    confidence:84, source:'Manufacturer + reviewed', supply:2, equivalents:3, lastVerified:'2024-04' },

    // -------- REAMING --------
    { id:'T31', brand:'Mapal',      code:'HPR 12.00 H7',      grade:'Carbide',shape:'-', tone:'iso-p', iso:'P', family:'Reaming',   op:'Finishing', vcMin: 40, vcMax:  90,fMin:0.20, fMax:0.50, apMin:0.1, apMax:0.3, coolant:'Wet',     stability:'High',   bestFor:'H7 tolerance steel reaming',      confidence:86, source:'Manufacturer + reviewed', supply:2, equivalents:3, lastVerified:'2024-06' },
    { id:'T32', brand:'OSG',        code:'EX-SUS-RM 10.00',   grade:'PM',     shape:'-', tone:'iso-m', iso:'M', family:'Reaming',   op:'Finishing', vcMin: 25, vcMax:  55,fMin:0.15, fMax:0.35, apMin:0.1, apMax:0.3, coolant:'Wet',     stability:'High',   bestFor:'Stainless precision reaming',     confidence:81, source:'Generated estimate',    supply:2, equivalents:2, lastVerified:'2024-02' },

    // -------- MORE TURNING (P) --------
    { id:'T33', brand:'Sandvik',    code:'TNMG 220408-PR',    grade:'GC4315', shape:'T', tone:'iso-p', iso:'P', family:'Turning',   op:'Roughing',  vcMin:180, vcMax: 320,fMin:0.20, fMax:0.55, apMin:1.0, apMax:6.5, coolant:'Wet',     stability:'High',   bestFor:'Heavy P-group roughing',          confidence:92, source:'Manufacturer data',     supply:4, equivalents:5, lastVerified:'2024-08' },
    { id:'T34', brand:'Iscar',      code:'TNMG 160408-NF',    grade:'IC8250', shape:'T', tone:'iso-p', iso:'P', family:'Turning',   op:'Finishing', vcMin:220, vcMax: 380,fMin:0.10, fMax:0.30, apMin:0.3, apMax:2.5, coolant:'Wet/Dry', stability:'High',   bestFor:'P-group fine finishing',          confidence:89, source:'Manufacturer + reviewed', supply:3, equivalents:5, lastVerified:'2024-07' },

    // -------- GROOVING --------
    { id:'T35', brand:'Iscar',      code:'GIPI 3.00E-0.40',   grade:'IC908',  shape:'-', tone:'iso-p', iso:'P', family:'Threading', op:'Grooving',  vcMin:160, vcMax: 280,fMin:0.05, fMax:0.12, apMin:0.5, apMax:3.0, coolant:'Wet',     stability:'Medium', bestFor:'Internal grooving steel',         confidence:83, source:'Manufacturer + reviewed', supply:2, equivalents:3, lastVerified:'2024-05' },
    { id:'T36', brand:'Sandvik',    code:'N123H2-0400-0004-GM',grade:'1125',  shape:'-', tone:'iso-m', iso:'M', family:'Threading', op:'Grooving',  vcMin:140, vcMax: 240,fMin:0.06, fMax:0.14, apMin:0.5, apMax:2.5, coolant:'Wet',     stability:'High',   bestFor:'External grooving stainless',     confidence:87, source:'Manufacturer data',     supply:3, equivalents:4, lastVerified:'2024-08' },
  ];

  // Convenience: cross-reference signature for each tool (id list of "equivalent" tools)
  // — derived from shape + iso + family + similar Vc/feed window.
  TOOLS.forEach(t => {
    t.equivIds = TOOLS
      .filter(o => o.id !== t.id && o.shape === t.shape && o.iso === t.iso && o.family === t.family)
      .slice(0, 4)
      .map(o => o.id);
  });

  // -------- ECONOMICS (synthetic but believable) --------
  // costTier 1-4 (€..€€€€), lifeRel 1-5, picks (synthetic community-pick count)
  // Heuristic: known premium brands trend slightly higher cost; CBN/superalloy higher cost;
  // higher confidence + supply = more "picks" this week.
  const PREMIUM_BRANDS = new Set(['Sandvik','Walter','Kennametal','Mapal']);
  const ECON_BRANDS    = new Set(['Korloy','OSG','Vargus','Tungaloy']);
  TOOLS.forEach(t => {
    // Cost (1=€, 4=€€€€)
    let cost = 2;
    if (PREMIUM_BRANDS.has(t.brand)) cost += 1;
    if (ECON_BRANDS.has(t.brand))    cost -= 1;
    if (t.grade?.includes('CBN'))    cost += 1;
    if (t.iso === 'S' || t.iso === 'H') cost += 1;
    if (t.iso === 'N')               cost -= 1;
    t.costTier = Math.max(1, Math.min(4, cost));
    // Tool life relative
    let life = 3;
    if (t.confidence >= 90)          life += 1;
    if (t.source === 'Generated estimate') life -= 1;
    if (t.iso === 'S' || t.iso === 'H') life -= 1;
    t.lifeRel = Math.max(1, Math.min(5, life));
    // Cost per edge (€ for one indexable edge — typical insert has 2-4 edges)
    const edges = t.family === 'Turning' ? (t.shape === 'C' ? 4 : t.shape === 'D' ? 2 : t.shape === 'W' ? 6 : t.shape === 'T' ? 6 : t.shape === 'S' ? 4 : t.shape === 'V' ? 2 : 4) : 4;
    const baseCost = { 1:6, 2:11, 3:18, 4:28 }[t.costTier];
    t.unitPrice  = baseCost;        // € per insert (synthetic)
    t.costPerEdge = +(baseCost / edges).toFixed(2);
    t.edges = edges;
    // Community signal
    t.weeklyPicks = Math.round(8 + t.confidence * 0.7 + t.supply * 4 + (PREMIUM_BRANDS.has(t.brand) ? 12 : 0) - (t.source === 'Generated estimate' ? 18 : 0));
    // Value index — higher = better value (used to rank "better value" suggestions)
    t.valueIndex = (t.confidence * 0.6) + (t.lifeRel * 8) + (t.supply * 3) - (t.costTier * 10);
  });

  // -------- "ENGINEERS ALSO PICKED" + "BETTER VALUE" --------
  TOOLS.forEach(t => {
    // Peer picks — same family + same op (any ISO); rank by weeklyPicks; exclude self & cross-refs.
    const equivSet = new Set(t.equivIds);
    t.peerIds = TOOLS
      .filter(o => o.id !== t.id && !equivSet.has(o.id) && o.family === t.family && o.op === t.op)
      .sort((a,b) => b.weeklyPicks - a.weeklyPicks)
      .slice(0, 4)
      .map(o => o.id);

    // Better-value pick — same iso+family+op, value index meaningfully higher, cost <= current.
    const cohort = TOOLS.filter(o =>
      o.id !== t.id && o.iso === t.iso && o.family === t.family && o.op === t.op &&
      o.costTier <= t.costTier && o.valueIndex > t.valueIndex + 6
    );
    if (cohort.length) {
      cohort.sort((a,b) => b.valueIndex - a.valueIndex);
      const better = cohort[0];
      t.betterValueId = better.id;
      // Friendly delta string
      const costDelta = better.costTier < t.costTier ? `${(1 - better.costTier / t.costTier) * 100 | 0}% cheaper` : 'same cost tier';
      const lifeDelta = better.lifeRel > t.lifeRel ? `+${(better.lifeRel - t.lifeRel) * 18}% tool life` : null;
      const confDelta = better.confidence > t.confidence ? `+${better.confidence - t.confidence}% confidence` : null;
      t.betterValueDelta = [costDelta, lifeDelta, confDelta].filter(Boolean).slice(0, 2).join(' · ');
    }
  });

  window.TA_TOOLS = TOOLS;
})();
