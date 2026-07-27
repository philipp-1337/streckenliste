
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from '@auth/AuthProvider';
import { BrowserRouter as Router } from 'react-router-dom';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { initErrorMonitoring } from '@/lib/monitoring';
import { initWebVitals } from '@utils/webVitals';

initErrorMonitoring();

// Initialize Web Vitals tracking
initWebVitals();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  </StrictMode>
);
