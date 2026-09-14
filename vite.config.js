import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { generate, root, settings } from './scripts/generate.mjs';

export default defineConfig(async ({ command }) => {
  const { base } = settings();
  // Vite restarts when its imported renderer changes; rebuild the HTML then too.
  const { files } = command === 'serve' ? await generate() : JSON.parse(readFileSync(path.join(root, '.generated-routes.json'), 'utf8'));
  return {
    base,
    appType: 'mpa',
    server: { port: 5173, strictPort: true, allowedHosts: ['terminal.local'] },
    preview: { port: 4173, strictPort: true },
    build: { rolldownOptions: { input: Object.fromEntries(files.map(file => [file.replace(/\.html$/, ''), path.join(root, file)])) } },
    plugins: [{
      name: 'portfolio-content',
      configureServer(server) {
        const contentDirectory = path.join(root, 'content');
        server.watcher.add([contentDirectory, path.join(root, 'cms/config.yml'), path.join(root, 'public/media')]);
        let timer;
        const refresh = file => {
          if (!(file.startsWith(contentDirectory) || file.endsWith('cms/config.yml') || file.startsWith(path.join(root, 'public/media')))) return;
          clearTimeout(timer);
          timer = setTimeout(async () => {
            try { await generate(); server.ws.send({ type: 'full-reload' }); }
            catch (error) { server.config.logger.error(error.message); server.ws.send({ type: 'error', err: { message: error.message, stack: error.stack } }); }
          }, 150);
        };
        server.watcher.on('add', refresh).on('change', refresh).on('unlink', refresh);
        server.httpServer?.once('close', () => clearTimeout(timer));
      }
    }]
  };
});
