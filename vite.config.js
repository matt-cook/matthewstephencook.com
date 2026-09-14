import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { generate, root, buildRoot, settings } from './scripts/generate.mjs';

export default defineConfig(async ({ command }) => {
  const { base } = settings();
  // Vite restarts when its imported renderer changes; rebuild the HTML then too.
  const { files } = command === 'serve' ? await generate() : JSON.parse(readFileSync(path.join(buildRoot, '.generated-routes.json'), 'utf8'));
  return {
    root: buildRoot,
    envDir: root,
    publicDir: path.join(root, 'public'),
    resolve: { alias: { '/src': path.join(root, 'src') } },
    base,
    appType: 'mpa',
    server: { port: 5173, strictPort: true, allowedHosts: ['terminal.local'], fs: { allow: [root] } },
    preview: { port: 4173, strictPort: true },
    build: {
      outDir: path.join(root, 'dist'),
      emptyOutDir: true,
      rolldownOptions: { input: Object.fromEntries(files.map(file => [file.replace(/\.html$/, ''), path.join(buildRoot, file)])) }
    },
    plugins: [{
      name: 'portfolio-content',
      configureServer(server) {
        // Vite serves public files by exact path, without directory indexes.
        // Match the configured base before Vite's own middleware strips it.
        server.middlewares.use((req, res, next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') return next();
          const [pathname, query = ''] = (req.url || '').split(/\?(.*)/s);
          const suffix = query ? `?${query}` : '';
          if (pathname === `${base}admin`) {
            res.writeHead(302, { Location: `${base}admin/${suffix}` });
            return res.end();
          }
          if (pathname === `${base}admin/`) req.url = `${base}admin/index.html${suffix}`;
          next();
        });
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
