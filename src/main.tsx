import React from 'react';
import ReactDOM from 'react-dom/client';
import { prepareDeployment } from './utils/deploymentCache';
import './index.css';
import './cursor.css';
import './components/documents/InfoPanels.css';

async function start() {
  if (!await prepareDeployment()) return;
  const { default: App } = await import('./App');
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><App /></React.StrictMode>,
  );
}
void start();
