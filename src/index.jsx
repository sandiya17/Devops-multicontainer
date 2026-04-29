import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Make sure this path is correct

const rootElement = document.getElementById('root');

if (rootElement) {
  // Use ReactDOM.createRoot for modern React 18+ concurrent mode
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
