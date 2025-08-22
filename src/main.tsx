import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { SchedulerProvider } from './context/SchedulerContext';
import { MobileProvider } from './context/MobileContext';
import { DragProvider } from './context/DragContext';
import { ModalProvider } from './context/ModalContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <MobileProvider>
        <DragProvider>
          <ModalProvider>
            <SchedulerProvider>
              <App />
            </SchedulerProvider>
          </ModalProvider>
        </DragProvider>
      </MobileProvider>
    </ErrorBoundary>
  </StrictMode>
);
