
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from '@auth/AuthProvider';
import { BrowserRouter as Router } from 'react-router-dom';
import { ErrorBoundary } from '@components/ErrorBoundary';

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
