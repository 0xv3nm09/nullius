import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'tailwindcss';
import './tokens.css';
import './app.css';
import { App } from './App';

// Theme: system preference by default; ?theme=light|dark pins it (used by
// the design pass and available to users). Set before first paint.
const forced = new URLSearchParams(location.search).get('theme');
const dark = forced ? forced === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.dataset['scheme'] = dark ? 'dark' : 'light';

const el = document.getElementById('root');
if (!el) throw new Error('no #root element');
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
