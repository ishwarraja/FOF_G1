import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global guard to safely absorb asset loading Event errors and prevent DOM Event rejection leaks
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (event.reason instanceof Event || (event.reason.isTrusted && !event.reason.message))) {
    event.preventDefault();
    console.warn('[FOF] Handled DOM event rejection safely:', event.reason);
  }
});

window.addEventListener('error', (event: any) => {
  // If a DOM element (img, script, link) fails to load an asset, it dispatches an Event on that element.
  if (event && !(event instanceof ErrorEvent)) {
    console.warn('[FOF] Handled asset element error safely:', (event.target as HTMLElement)?.tagName || event.type);
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
