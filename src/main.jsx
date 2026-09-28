import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// Automatically determine the router basename:
// Use '/study_tracker' if running under GitHub Pages path or configured base.
// Otherwise (Cloudflare Workers/Pages, custom domain, localhost), use root '/'.
const getBasename = () => {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/study_tracker')) {
    return '/study_tracker';
  }
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') && base !== '/' ? base.slice(0, -1) : base;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={getBasename()}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
