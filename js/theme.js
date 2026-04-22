/**
 * theme.js — Theme toggle & font selector
 * Persistence via localStorage.
 */
(function ThemeAndFont() {
  const root = document.documentElement;

  const fontMap = {
    default: { display: "'Lora', Georgia, serif", body: "'Outfit', sans-serif", mono: "'DM Mono', monospace" },
    serif:   { display: "'Lora', Georgia, serif", body: "'Lora', Georgia, serif", mono: "'DM Mono', monospace" },
    sans:    { display: "'Lora', Georgia, serif", body: "'Outfit', sans-serif", mono: "'DM Mono', monospace" },
    mono:    { display: "'Lora', Georgia, serif", body: "'DM Mono', monospace", mono: "'DM Mono', monospace" }
  };

  function applyTheme(theme) {
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }

  function applyFont(choice) {
    const cfg = fontMap[choice] || fontMap.default;
    root.style.setProperty('--font-display', cfg.display);
    root.style.setProperty('--font-body', cfg.body);
    root.style.setProperty('--font-mono', cfg.mono);
    try { localStorage.setItem('fontChoice', choice); } catch (e) {}
  }

  function safeGet(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('theme-toggle');
    const select = document.getElementById('font-select');
    const savedTheme = safeGet('theme', 'light');
    const savedFont  = safeGet('fontChoice', 'default');

    applyTheme(savedTheme);
    applyFont(savedFont);

    if (toggle) { toggle.checked = savedTheme === 'dark'; toggle.addEventListener('change', e => applyTheme(e.target.checked ? 'dark' : 'light')); }
    if (select) { select.value = savedFont; select.addEventListener('change', e => applyFont(e.target.value)); }
  });
})();
