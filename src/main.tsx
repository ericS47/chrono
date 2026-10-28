import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import './styles.css';
import { App } from './App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';
import { getSession } from './engine/session';

// Nouvelle version disponible : on recharge l'app seulement quand aucune séance
// n'est en cours (sinon le rechargement ferait perdre la séance).
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    const apply = () => {
      if (getSession()) return false;
      void updateSW(true);
      return true;
    };
    if (!apply()) {
      const t = window.setInterval(() => {
        if (apply()) clearInterval(t);
      }, 5000);
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
