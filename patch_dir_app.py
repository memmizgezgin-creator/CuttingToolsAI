import re

with open('/Users/muratonder/Desktop/ToolAdvisor/directory-app.jsx', 'r') as f:
    content = f.read()

# 1. Replace the ask function
ask_pattern = re.compile(r"const ask = async \(rawPrompt\) => \{.*?\n  \};\n\n  const submit = \(e\) =>", re.DOTALL)

new_ask = """const ask = async (rawPrompt) => {
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
      prompt = `From this shortlist, recommend the best single pick and explain why in 3 short bullets. If a runner-up is close, mention it.\\n\\nShortlist:\\n${shortlistTools.map(t => `- ${t.brand} ${t.code} (ISO ${t.iso}, ${t.family}, Vc ${t.vcMin}-${t.vcMax} m/min, confidence ${t.confidence}%) — ${t.bestFor}`).join('\\n')}`;
    }

    const newMsgs = [...messages, { role:'user', text: rawPrompt === 'CTX_SHORTLIST' ? 'Pick best from my shortlist' : prompt }];
    setMessages(newMsgs);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('https://tooladvisor-ai-proxy.memmizgezgin.workers.dev/api/advisor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs.map(m => ({ role: m.role, content: m.text })),
          context: { filters, shortlistTools, compareTools }
        })
      });
      
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach(act => {
          if (act.type === 'filter' && act.payload) {
             if (act.payload.iso) window.dispatchEvent(new CustomEvent('ta:iso-filter', { detail: { iso: act.payload.iso } }));
             if (act.payload.family) window.dispatchEvent(new CustomEvent('ta:family-filter', { detail: { family: act.payload.family } }));
          }
        });
      }

      setMessages(m => [...m, { 
        role: 'ai', 
        text: data.message || '(no response)', 
        cards: data.structured_cards || [],
        grounded: data.grounded
      }]);
      setCount(incrFreeCounter());
    } catch (err) {
      setMessages(m => [...m, { role:'ai', text:`Sorry — I had trouble answering that. (${err?.message || 'error'})` }]);
    }
    setBusy(false);
  };

  const submit = (e) =>"""

content = ask_pattern.sub(new_ask, content)

# 2. Replace message rendering
render_pattern = re.compile(r"<div className={`max-w-\[80%\] p\.2\.5 rounded-xl text-\[13px\] leading-snug whitespace-pre-wrap \$\{m\.role === 'user' \? 'bg-primary text-white rounded-tr-sm' : 'bg-surface-container-low text-ink-text rounded-tl-sm'\}`}>\s*\{m\.text\}\s*</div>", re.DOTALL)

new_render = """<div className={`max-w-[80%] flex flex-col gap-2`}>
              <div className={`p-2.5 rounded-xl text-[13px] leading-snug whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary text-white rounded-tr-sm' : 'bg-surface-container-low text-ink-text rounded-tl-sm'}`}>
                {m.text}
              </div>
              {m.cards && m.cards.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {m.cards.map(c => {
                    const tool = window.TA_TOOLS?.find(t => t.code === c);
                    if (!tool) return null;
                    return (
                      <button key={c} onClick={() => onOpenTool(tool)} className="text-left bg-white border border-border-warm rounded-lg p-2 flex items-center gap-2 hover:border-primary transition-colors shadow-sm">
                        <div className="ta-insert3d shrink-0" data-shape={tool.shape} data-tone={tool.tone} data-size="xs"></div>
                        <div className="min-w-0 flex-1">
                          <p className="font-technical-data text-[9px] uppercase tracking-widest text-on-surface-variant truncate">{tool.brand}</p>
                          <p className="font-product-grade text-xs text-ink-text truncate">{tool.code}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>"""

content = render_pattern.sub(new_render, content)

with open('/Users/muratonder/Desktop/ToolAdvisor/directory-app.jsx', 'w') as f:
    f.write(content)
