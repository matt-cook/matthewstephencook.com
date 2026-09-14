import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync, unlinkSync, renameSync, rmdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from 'image-size';
import { loadEnv } from 'vite';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import YAML from 'yaml';
import { documentHtml, tagSlug, escapeHtml } from '../src/render.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const buildRoot = path.join(root, 'build');
const readJson = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const write = (file, text) => { const target = path.join(root, file); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, text); };
export const normalizeBase = value => `/${String(value || '').split('/').filter(Boolean).join('/')}${String(value || '').split('/').filter(Boolean).length ? '/' : ''}`;

export function settings() {
  const env = { ...loadEnv('production', root, ''), ...process.env };
  const site = readJson('content/site.json');
  const domain = env.CUSTOM_DOMAIN?.trim();
  if (domain && !/^[a-z0-9.-]+$/i.test(domain)) throw new Error('CUSTOM_DOMAIN must be a hostname, without https:// or a path.');
  const base = domain ? '/' : normalizeBase(env.BASE_PATH);
  const siteUrl = domain ? `https://${domain}` : (env.SITE_URL || site.url).replace(/\/$/, '');
  return { env, site, domain, base, siteUrl };
}

function localImage(image) {
  if (!image.startsWith('/media/')) throw new Error(`Use a local image under /media/: ${image}`);
  const publicRoot = path.join(root, 'public');
  const absolute = path.resolve(publicRoot, `.${image}`);
  if (!absolute.startsWith(publicRoot + path.sep)) throw new Error(`Invalid media path: ${image}`);
  if (!existsSync(absolute)) throw new Error(`Missing image: ${image}`);
  return imageSize(readFileSync(absolute));
}

async function displayImage(image) {
  const input = readFileSync(path.join(root, 'public', image.image));
  const hash = createHash('sha256').update(input).digest('hex').slice(0, 24);
  const preview = `/previews/${hash}-1600.webp`;
  const output = path.join(root, 'public', preview);
  if (!existsSync(output)) {
    mkdirSync(path.dirname(output), { recursive: true });
    const temporary = `${output}.tmp`;
    try {
      await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 92 }).toFile(temporary);
      renameSync(temporary, output);
    } catch (error) {
      if (existsSync(temporary)) unlinkSync(temporary);
      // Some archived JPEGs decode in browsers but contain truncated metadata.
      // Retain and serve those originals instead of producing a damaged derivative.
      console.warn(`Using original display image for ${image.image}: ${error.message}`);
      image.preview = image.image;
      return;
    }
  }
  image.preview = preview;
}

export async function generate() {
  const { env, site, domain, base, siteUrl } = settings();
  const projects = readdirSync(path.join(root, 'content/projects')).filter(f => f.endsWith('.json')).map(file => readJson(`content/projects/${file}`)).sort((a, b) => a.order - b.order);
  const slugs = new Set();
  for (const project of projects) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(project.slug) || ['admin', 'src', 'public', 'content', 'scripts', 'dist', 'node_modules', 'docs'].includes(project.slug.toLowerCase()) || slugs.has(project.slug.toLowerCase())) throw new Error(`Invalid or duplicate project slug: ${project.slug}`);
    slugs.add(project.slug.toLowerCase());
    if (!project.title?.trim()) throw new Error(`A project title is required: ${project.slug}`);
    localImage(project.thumbnail);
    if (project.mediaColumns < 1 || project.mediaColumns > 11) throw new Error(`Media column width must be 1–11: ${project.slug}`);
    for (const image of project.images || []) {
      const size = localImage(image.image);
      image.width = size.width;
      image.height = size.height;
      if ([5, 6, 7, 8].includes(size.orientation)) [image.width, image.height] = [image.height, image.width];
    }
  }
  const images = projects.flatMap(project => project.images || []);
  // Bounded parallelism keeps large original photographs inexpensive to build.
  for (let i = 0; i < images.length; i += 4) await Promise.all(images.slice(i, i + 4).map(displayImage));
  const tags = [...new Set(projects.flatMap(p => (p.tags || []).map(tagSlug)))].filter(tag => tag && !slugs.has(tag.toLowerCase()));
  const routes = [
    { file: 'index.html', slug: '' },
    ...projects.map(project => ({ file: `${project.slug}/index.html`, slug: project.slug, project })),
    ...tags.map(filter => ({ file: `${filter}/index.html`, slug: filter, filter })),
    { file: '404.html', slug: null, notFound: true }
  ];
  // Remove only known generated HTML. All authored content stays in content/.
  if (existsSync(path.join(buildRoot, '.generated-routes.json'))) {
    for (const old of readJson('build/.generated-routes.json').files) {
      if (!routes.some(route => route.file === old) && /^(?:[a-zA-Z0-9-]+\/)?(?:index|404)\.html$/.test(old) && existsSync(path.join(buildRoot, old))) {
        unlinkSync(path.join(buildRoot, old));
        const directory = path.dirname(path.join(buildRoot, old));
        if (directory !== buildRoot && readdirSync(directory).length === 0) rmdirSync(directory);
      }
    }
  }
  for (const route of routes) write(`build/${route.file}`, documentHtml({ site, projects, base, siteUrl, ...route }));
  const config = YAML.parse(readFileSync(path.join(root, 'cms/config.yml'), 'utf8'));
  config.backend.repo = env.CMS_REPOSITORY || 'YOUR_GITHUB_USERNAME/YOUR_REPOSITORY';
  config.backend.branch = env.CMS_BRANCH || 'main';
  if (env.CMS_AUTH_BASE_URL) { config.backend.base_url = env.CMS_AUTH_BASE_URL; config.backend.auth_endpoint = env.CMS_AUTH_ENDPOINT || 'auth'; }
  config.site_url = siteUrl;
  config.display_url = siteUrl;
  write('public/admin/config.yml', YAML.stringify(config));
  const vendor = path.join(root, 'node_modules/decap-cms/dist');
  mkdirSync(path.join(root, 'public/admin/vendor'), { recursive: true });
  for (const file of readdirSync(vendor).filter(f => f.endsWith('.js') && (f === 'decap-cms.js' || f.endsWith('.decap-cms.js')))) copyFileSync(path.join(vendor, file), path.join(root, 'public/admin/vendor', file));
  write('public/admin/preview.css', readFileSync(path.join(root, 'src/styles.css'), 'utf8').replace("url('/fonts/", "url('../fonts/") + '\nhtml {font-size:10px;} body {padding:16px;} .project {display:block;} .project-details {margin-top:20px;}');
  if (domain) write('public/CNAME', `${domain}\n`);
  else if (existsSync(path.join(root, 'public/CNAME'))) unlinkSync(path.join(root, 'public/CNAME'));
  write('public/.nojekyll', '');
  write('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.filter(r => r.slug !== null).map(r => `<url><loc>${escapeHtml(siteUrl)}/${r.slug ? `${r.slug}/` : ''}</loc></url>`).join('')}</urlset>\n`);
  write('build/.generated-routes.json', JSON.stringify({ base, files: routes.map(r => r.file), projects: projects.length, images: projects.reduce((sum, p) => sum + p.images.length, 0) }, null, 2));
  return { base, files: routes.map(route => route.file), projects: projects.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await generate();
  console.log(`Generated ${result.files.length} HTML pages in build/ from ${result.projects} projects (base ${result.base}).`);
}
