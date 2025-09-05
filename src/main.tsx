import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { SchedulerProvider } from './context/SchedulerContext';
import { MobileProvider } from './context/MobileContext';
import { DragProvider } from './context/DragContext';
import { ModalProvider } from './context/ModalContext';
import { KeyboardShortcutsProvider } from './context/KeyboardShortcutsContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { validateEnvironmentOrThrow } from './utils/envValidation';
import { createHealthEndpoint } from './utils/healthCheck';
import './index.css';

// Validate environment variables before app starts
try {
  validateEnvironmentOrThrow();
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  
  // Show user-friendly error page
  document.body.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 2rem;
    ">
      <div style="
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 2rem;
        max-width: 600px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      ">
        <h1 style="margin: 0 0 1rem 0; font-size: 2rem; font-weight: 600;">
          🔧 Configuration Required
        </h1>
        <p style="margin: 0 0 1.5rem 0; font-size: 1.1rem; opacity: 0.9;">
          BoardOS requires proper environment configuration to start.
        </p>
        <div style="
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          margin: 1rem 0;
          text-align: left;
          font-family: Monaco, 'Cascadia Code', monospace;
          font-size: 0.9rem;
          white-space: pre-wrap;
        ">${error instanceof Error ? error.message : 'Unknown error'}</div>
        <p style="margin: 1rem 0 0 0; font-size: 0.9rem; opacity: 0.8;">
          Please check your .env file and ensure all required variables are set.
        </p>
      </div>
    </div>
  `;
  throw error; // Stop execution
}

// Initialize health check endpoint
createHealthEndpoint();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <MobileProvider>
        <DragProvider>
          <ModalProvider>
            <SchedulerProvider>
              <KeyboardShortcutsProvider>
                <App />
              </KeyboardShortcutsProvider>
            </SchedulerProvider>
          </ModalProvider>
        </DragProvider>
      </MobileProvider>
    </ErrorBoundary>
  </StrictMode>
);
