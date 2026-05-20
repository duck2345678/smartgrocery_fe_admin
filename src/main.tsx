import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDeviceFingerprint } from './utils/deviceFingerprint';
import './i18n';
import './index.css';
import App from './App';

const initialTheme = (() => {
  const v = localStorage.getItem('SG_ADMIN_THEME');
  return v === 'light' ? 'light' : 'dark';
})();

document.documentElement.dataset.theme = initialTheme;

// Ensure device fingerprint exists before any API request
getDeviceFingerprint();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
