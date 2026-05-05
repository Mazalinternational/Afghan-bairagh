import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// Import i18n fallback (works without external packages)
import './i18n/fallback';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
