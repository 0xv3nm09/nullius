import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'tailwindcss';
import './tokens.css';
import './app.css';
import { App } from './App';
import { applyScheme, initialScheme } from './theme';

// Theme: saved manual choice > ?theme=light|dark > system preference.
// Applied before first paint; the masthead toggle flips it.
applyScheme(initialScheme());

const el = document.getElementById('root');
if (!el) throw new Error('no #root element');
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
