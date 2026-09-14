import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, '.generated-routes.json'), 'utf8'));
const dist = path.join(root, 'dist');
const failures = [];
for (const file of [...manifest.files, 'admin/index.html']) {
  const absolute = path.join(dist, file);
  if (!existsSync(absolute)) { failures.push(`Missing HTML: ${file}`); continue; }
  const html = readFileSync(absolute, 'utf8');
  if (html.includes('freight.cargo.site')) failures.push(`An image still depends on Cargo: ${file}`);
  for (const [, value] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(?:https?:|mailto:|data:|#)/.test(value)) continue;
    let url = value.split(/[?#]/)[0];
    if (!url) continue;
    let target;
    if (url.startsWith('/')) {
      if (!url.startsWith(manifest.base)) { failures.push(`Incorrect base path in ${file}: ${value}`); continue; }
      target = path.join(dist, url.slice(manifest.base.length));
    } else target = path.resolve(path.dirname(absolute), url);
    if (url.endsWith('/')) target = path.join(target, 'index.html');
    if (!existsSync(target)) failures.push(`Broken local link in ${file}: ${value}`);
  }
}
for (const file of ['.nojekyll', 'sitemap.xml', 'admin/config.yml', 'admin/vendor/decap-cms.js']) if (!existsSync(path.join(dist, file))) failures.push(`Missing deployment asset: ${file}`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Verified ${manifest.files.length} static pages, ${manifest.projects} projects, ${manifest.images} gallery images, local links, CMS assets, and base ${manifest.base}.`);
