import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const deploymentVersion = process.env.VITE_DEPLOY_VERSION || randomUUID();
if (!/^[a-zA-Z0-9._-]{1,128}$/.test(deploymentVersion)) throw new Error('Invalid deployment version');
const deploymentCache: Plugin = {
  name: 'deployment-cache',
  apply: 'build',
  transformIndexHtml() {
    return [{ tag: 'script', attrs: { 'data-deployment-gate': '' }, injectTo: 'head-prepend', children:
      readFileSync(new URL('./scripts/templates/deployment-gate.js', import.meta.url), 'utf8')
        .replace('__DEPLOYMENT_VERSION__', JSON.stringify(deploymentVersion)) }];
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'deployment.json', source: JSON.stringify({ version: deploymentVersion }) });
    this.emitFile({ type: 'asset', fileName: 'deployment-worker.js', source:
      `self.deploymentVersion = ${JSON.stringify(deploymentVersion)};\n` +
      `self.deploymentAssetFolders = ${JSON.stringify(['assets/', ...readdirSync(new URL('./public/', import.meta.url), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name + '/')])};\n` +
      `self.deploymentAssetFiles = ${JSON.stringify(readdirSync(new URL('./public/', import.meta.url), { withFileTypes: true }).filter(entry => entry.isFile()).map(entry => entry.name))};\n` +
      readFileSync(new URL('./src/deployment-worker.js', import.meta.url), 'utf8') });
  },
};

export default defineConfig({
  base: './',
  define: { __DEPLOYMENT_VERSION__: JSON.stringify(deploymentVersion) },
  plugins: [react(), deploymentCache],
});
