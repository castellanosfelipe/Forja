import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerServiceWorker } from './pwa/register-service-worker';
import { canonicalAppUrl } from './utils/canonical-origin';
import './styles.css';

const canonicalUrl = canonicalAppUrl(window.location.href);

if (canonicalUrl) {
  window.location.replace(canonicalUrl);
} else {
  void registerServiceWorker();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
