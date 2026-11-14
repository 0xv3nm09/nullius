import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'tailwindcss';
import './tokens.css';
import './app.css';
import { App } from './App';

const el = document.getElementById('root');
if (!el) throw new Error('no #root element');
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
