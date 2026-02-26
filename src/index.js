import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { ErrorProvider } from './contexts/ErrorContext';
import GlobalErrorBanner from './components/GlobalErrorBanner';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>

      <AuthProvider>
        <ErrorProvider>
          <GlobalErrorBanner />
          <App />
        </ErrorProvider>
      </AuthProvider>

    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
