import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { DriverAuthProvider } from './context/DriverAuthContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <DriverAuthProvider><App /></DriverAuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
