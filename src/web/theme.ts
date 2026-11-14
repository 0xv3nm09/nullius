// src/web/theme.ts — theme scheme handling. The scheme is applied via
// data-scheme on <html> (tokens.css keys off it). Precedence: a saved manual
// choice wins, then the ?theme= URL parameter, then the system preference.

export type Scheme = 'light' | 'dark';

const KEY = 'nullius-theme';

export function initialScheme(): Scheme {
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  const forced = new URLSearchParams(location.search).get('theme');
  if (forced === 'light' || forced === 'dark') return forced;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyScheme(s: Scheme): void {
  document.documentElement.dataset['scheme'] = s;
}

export function setScheme(s: Scheme): void {
  localStorage.setItem(KEY, s);
  applyScheme(s);
}
