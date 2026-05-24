import re

with open('/Users/muratonder/Desktop/ToolAdvisor/directory-app.jsx', 'r') as f:
    content = f.read()

events_effect = """
  // Sync filters from AI Chat
  useEffect(() => {
    const handleIso = (e) => setIso(e.detail.iso);
    const handleFamily = (e) => setFamily(e.detail.family);
    window.addEventListener('ta:iso-filter', handleIso);
    window.addEventListener('ta:family-filter', handleFamily);
    return () => {
      window.removeEventListener('ta:iso-filter', handleIso);
      window.removeEventListener('ta:family-filter', handleFamily);
    };
  }, []);
"""

content = content.replace("  // selection\n  const [compare, setCompare] = useState(() => new Set(LS.get('ta:compare', [])));", events_effect + "\n  // selection\n  const [compare, setCompare] = useState(() => new Set(LS.get('ta:compare', [])));")

with open('/Users/muratonder/Desktop/ToolAdvisor/directory-app.jsx', 'w') as f:
    f.write(content)
