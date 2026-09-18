import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const md = new MarkdownIt({ html: true, breaks: true, linkify: false });
export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const tagSlug = tag => tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const assetPath = (path, base) => /^https?:\/\//.test(path) ? path : `${base}${path.replace(/^\//, '')}`;
export const pagePath = (slug, base) => `${base}${slug ? `${slug}/` : ''}`;

function richText(text, base) {
  return sanitizeHtml(md.render(text || ''), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'small'],
    allowedAttributes: { a: ['href', 'title', 'rel'], '*': [] },
    transformTags: { a: (tagName, attrs) => ({ tagName, attribs: { ...attrs, href: attrs.href?.startsWith('/') ? assetPath(attrs.href, base) : attrs.href } }) }
  });
}

export function thumbnails(projects, base) {
  return `<div class="thumbnails" aria-label="Projects">${projects.map((p, index) => `
    <a class="thumbnail${p.thumbnailLogo ? ` thumbnail--branded${p.thumbnailLogoTone === 'light' ? ' thumbnail--light-logo' : ''}` : ''}" href="${pagePath(p.slug, base)}" aria-label="${escapeHtml(p.title)}">
      <div class="thumb-image"><img src="${assetPath(p.thumbnail, base)}" alt="" width="1136" height="640" ${index < 6 ? 'loading="eager"' : 'loading="lazy"'} decoding="async">${p.thumbnailLogo ? `<img class="thumb-logo" src="${escapeHtml(assetPath(p.thumbnailLogo, base))}" alt="" ${index < 6 ? 'loading="eager"' : 'loading="lazy"'} decoding="async">` : ''}</div>
      <span class="thumb-title"><span>${escapeHtml(p.title)}</span></span>
    </a>`).join('')}</div>`;
}

function gallery(project, base) {
  const images = project.images || [];
  const image = (item, index) => `<a class="gallery-image" href="${assetPath(item.image, base)}" data-pswp-width="${item.width}" data-pswp-height="${item.height}" data-index="${index}" data-caption="${escapeHtml(item.caption)}" aria-label="${escapeHtml(item.alt || `${project.title}, image ${index + 1}`)}" style="--ratio:${item.width / item.height}">
    <img src="${assetPath(item.preview || item.image, base)}" width="${item.width}" height="${item.height}" alt="${escapeHtml(item.alt)}" ${index < 3 ? 'loading="eager"' : 'loading="lazy"'} decoding="async">${item.caption ? `<span class="gallery-caption">${escapeHtml(item.caption)}</span>` : ''}</a>`;
  const key = project.galleryLayout === 'columns' ? 'column' : 'row';
  const groups = new Map();
  images.forEach((item, index) => {
    const group = Number(item[key]) || (key === 'column' ? 1 : index + 1);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ item, index });
  });
  const columns = project.galleryLayout === 'columns';
  return `<div class="project-gallery ${columns ? 'gallery-columns' : 'gallery-rows'}" id="project-gallery" style="--gallery-gap:${project.galleryGap}rem;--gallery-columns:${project.galleryColumns}">
    ${[...groups].sort(([a], [b]) => a - b).map(([, items]) => `<div class="${columns ? 'gallery-column' : 'gallery-row'}" ${columns ? '' : `style="grid-template-columns:${items.map(({ item }) => `${item.width / item.height}fr`).join(' ')}"`}>${items.map(({ item, index }) => image(item, index)).join('')}</div>`).join('')}
  </div>`;
}

// Cargo's root unit varies with the viewport. Keeping this small calculation
// preserves the original spacing and type scale at different browser zooms.
const scaleScript = `(()=>{const scale=()=>{const w=document.documentElement.clientWidth,h=innerHeight,t=Math.min(1,Math.max(0,(h/w-1)/.777777778));document.documentElement.style.fontSize=Math.max(20,Math.min(w,h)*(9+4*t)/100)+'%'};scale();addEventListener('resize',scale)})();`;

export function documentHtml({ site, projects, project, filter, notFound = false, base = '/', siteUrl = site.url }) {
  let content;
  if (notFound) content = `<div class="not-found"><h2>Page not found</h2><p><a href="${base}">Return to projects</a></p></div>`;
  else if (project) {
    content = `<article class="project${project.trailingBreak ? ' has-trailing-break' : ''}" style="--media-columns:${project.mediaColumns};--column-gap:${project.columnGap}rem" aria-label="${escapeHtml(project.title)}">
      <div class="project-media">${gallery(project, base)}${project.galleryNote ? `<div class="gallery-note">${richText(project.galleryNote, base)}</div>` : ''}</div>
      <div class="project-details">${richText(project.body, base)}</div>
    </article>${project.relatedProjects ? `<div class="related-projects">${thumbnails(projects.filter(p => p.slug !== project.slug && /\]\(\/ZEBRADOG\/\)/.test(p.body)), base)}</div>` : ''}`;
  } else content = thumbnails(filter ? projects.filter(p => (p.tags || []).some(t => tagSlug(t) === filter)) : projects, base);
  const title = project ? `${project.title} - ${site.title}` : site.title;
  const route = project?.slug || filter || '';
  const canonical = `${siteUrl.replace(/\/$/, '')}/${route ? `${route}/` : ''}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(project ? project.body.replace(/[*\[\]]/g, '').split('\n').slice(0, 3).join(' ').slice(0, 190) : site.description)}">
  ${notFound ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${escapeHtml(canonical)}">`}
  <link rel="icon" href="${base}favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
  <script>${scaleScript}</script>
  <link rel="stylesheet" href="/src/styles.css">
  <script type="module" src="/src/main.js"></script>
</head>
<body class="${project ? 'page-project' : 'page-grid'}">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><h1><a href="${base}">${escapeHtml(site.heading)}</a></h1></header>
  <main id="main">${content}</main>
  <footer class="site-footer" aria-label="Contact"><a class="icon-link" href="mailto:${escapeHtml(site.email)}" aria-label="Email ${escapeHtml(site.title)}">&#xE000;&#xFE0E;</a><a class="icon-link" href="${escapeHtml(site.github)}" aria-label="${escapeHtml(site.title)} on GitHub">&#xE035;&#xFE0E;</a></footer>
</body>
</html>`;
}
