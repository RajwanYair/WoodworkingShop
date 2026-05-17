import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { useCabinetStore } from './store/cabinet-store.ts';

// Sprint 124 — sync live OS dark-mode changes to the store when the user
// has NOT explicitly saved a preference (savedPref === null means "use OS").
const PREFS_KEY = 'woodworkingshop:prefs';
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => {
    const saved = window.localStorage.getItem(PREFS_KEY);
    if (!saved || JSON.parse(saved).darkMode === undefined) {
      useCabinetStore.setState({ darkMode: e.matches });
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
