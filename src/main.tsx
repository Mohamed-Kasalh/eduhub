import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_USE_MOCK !== 'true') {
    return;
  }

  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledFrame: 'bypass',
  });
}

void enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
