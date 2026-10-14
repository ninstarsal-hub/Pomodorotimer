import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StoreProvider } from './store';
import './styles.css';
import { registerServiceWorker } from './lib/pwa';
import { startSync } from './lib/sync';
import { Analytics } from '@vercel/analytics/react';
import { ErrorBoundary } from './components/ErrorBoundary';

registerServiceWorker();
void startSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <StoreProvider>
        <App />
      </StoreProvider>
    </ErrorBoundary>
    <Analytics />
  </StrictMode>,
);
