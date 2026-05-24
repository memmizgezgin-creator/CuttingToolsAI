import re

with open('/Users/muratonder/Desktop/ToolAdvisor/directory-app.jsx', 'r') as f:
    content = f.read()

open_effect = """  useEffect(() => LS.set('ta:ai:messages', messages.slice(-30)), [messages]);

  // Open from outside
  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('ta:open-advisor', handleOpen);
    return () => window.removeEventListener('ta:open-advisor', handleOpen);
  }, []);
"""

content = content.replace("  useEffect(() => LS.set('ta:ai:messages', messages.slice(-30)), [messages]);", open_effect)

with open('/Users/muratonder/Desktop/ToolAdvisor/directory-app.jsx', 'w') as f:
    f.write(content)
