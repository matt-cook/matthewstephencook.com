# Matthew Cook portfolio

A JavaScript npm project reproducing [matthewstephencook.com](https://matthewstephencook.com/), using the supplied screenshots as the visual reference. It includes the 20 original projects, 89 gallery images, original thumbnails, project copy, contact links, and responsibility filters.

Vite serves development and bundles production assets. A small JavaScript generator produces complete HTML pages from JSON content. Decap CMS edits that content, and PhotoSwipe provides the image pop-up. The production website is static and runs on GitHub Pages.

## Run locally

Use Node.js 24 (also recorded in `.nvmrc`). From this directory:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5173/>. Changes to content and media regenerate the pages; Vite handles styles and JavaScript updates. The first run also generates smaller display images from the originals.

To run the website and local CMS together instead:

```sh
npm run dev:cms
```

Open <http://127.0.0.1:5173/admin/> and select the local repository login. The local CMS proxy runs on port 8081. Edits save into this project on disk, and Vite refreshes the website. Local editing does not require GitHub OAuth. Stop both services with Ctrl+C. You can also run `npm run cms` in a separate terminal alongside `npm run dev`.

See Decap's [local backend documentation](https://decapcms.org/docs/decap-proxy/).

## Build and preview

```sh
npm run build
npm run preview
```

Open <http://127.0.0.1:4173/>. Upload the contents of `dist/` when deploying manually. The build checks every generated page for missing local links and assets, and checks that the CMS and Pages support files are present. `npm run check` repeats those checks on an existing build.

The original content generates 29 HTML files inside the ignored `build/` directory: the homepage, 20 project pages, seven filter pages, and a 404 page. Vite serves `build/` during development and bundles it into the ignored `dist/` directory for deployment. Source code stays in `src/`, editable content stays in `content/`, and static assets stay in `public/`. Both `npm run dev:cms` and `npm run build` generate routes automatically; no generated HTML needs to be committed. Every project still deploys at `Slug/index.html`, so existing URLs and direct links work without a client-side router. Content and image links remain usable without JavaScript; JavaScript enables the lightbox and the exact viewport-based type scale.

## Deploy to GitHub Pages

1. Create a GitHub repository and commit this project's source files to its `main` branch. Include `public/media/` and `package-lock.json`; do not commit `node_modules/`, `build/`, or `dist/`.
2. Under **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. Push to `main`, or run **Build and deploy GitHub Pages** from the Actions tab.

The included `.github/workflows/pages.yml` installs dependencies, builds, verifies, and deploys `dist/`. It obtains the repository URL and Pages path from GitHub, so both `username.github.io/repository/` and a domain root are supported. Each CMS commit to `main` triggers another build.

For a custom domain, configure the domain and DNS in GitHub Pages, then add a repository Actions variable named `CUSTOM_DOMAIN`, such as `matthewstephencook.com`. The build writes `CNAME` and uses `/` for asset and page paths. This project does not change DNS or the existing live website.

See Vite's [GitHub Pages deployment documentation](https://vite.dev/guide/static-deploy#github-pages).

## Enable the hosted CMS

The editor is available at `/admin/`, or `/repository/admin/` on a project Pages site. Its GitHub backend must know which repository to edit and how to authenticate. The workflow supplies the repository automatically.

GitHub Pages cannot host the server-side OAuth exchange. Configure a **Decap-compatible GitHub OAuth service** using one of the implementations in Decap's [external OAuth clients documentation](https://decapcms.org/docs/external-oauth-clients/), then:

1. Register a GitHub OAuth application with the homepage and callback URLs required by that service.
2. Configure its client ID and client secret in the OAuth service, and allow the deployed website's origin.
3. Add the repository Actions variable `CMS_AUTH_BASE_URL` with the service origin, for example `https://your-cms-auth.example.com`.
4. If the service uses a different authorization path, set `CMS_AUTH_ENDPOINT`. Its default is `auth`.
5. Run the Pages workflow again, visit the deployed `/admin/`, and sign in with a GitHub account that can write to the repository.

The OAuth service is not included or deployed. Client secrets and access tokens must stay in that service, never in the website, CMS configuration, or repository Actions variables listed above. The portfolio itself works before CMS authentication is configured. See Decap's [GitHub backend documentation](https://decapcms.org/docs/github-backend/).

For local configuration or a manual deployment, copy `.env.example` to `.env.local` and fill in the relevant values. `CMS_REPOSITORY` is `owner/repository`; `CMS_BRANCH` defaults to `main`. `BASE_PATH` is `/` or `/repository/`, and `SITE_URL` is the full public URL, including the repository path when applicable. A nonempty `CUSTOM_DOMAIN` overrides both URL and base path.

## Edit the portfolio

- **Site settings:** header, title, description, email, and GitHub link live in `content/site.json`.
- **Projects:** one JSON file per project in `content/projects/`. Lower display-order numbers appear first. Preserve existing URL slugs to keep incoming links working.
- **Project details:** Markdown supports the original italic labels, bold names, links, and line breaks. Internal links should start at `/`, such as `/ZEBRADOG/`; the build adds the configured Pages base path.
- **Images:** choose a thumbnail and add or reorder gallery images in Decap. Uploads go into `public/media/uploads/`. Dimensions are read automatically during generation.
- **Aligned rows:** images with the same row number share a row, sized in proportion to their original dimensions. Increment the number for a new row.
- **Independent columns:** select the number of columns, then assign each image a column. This preserves the Kiosk Application gallery layout. Lightbox navigation follows the image list order.
- **Gallery width:** the media column uses the original 12-column proportions; project details stack below it on mobile.

The original grayscale thumbnail filter, color-on-hover treatment, black title overlays, header bar, Inter and Inter Tight fonts, project spacing, and footer icons are preserved. `src/styles.css` controls appearance, `src/render.js` controls HTML, and `src/main.js` configures PhotoSwipe. The lightbox uses a 90% black backdrop, the original arrow and close-button styling, keyboard navigation, touch navigation, and Escape dismissal.

Original gallery files remain local and are used by the lightbox. The build creates cached WebP display images under `public/previews/`; these are generated files. One original Aramco JPEG contains truncated data: it is retained unchanged and served directly because browsers display it, while the image optimizer rejects it. A build warning for that file is expected.

`cms/config.yml` is the editable CMS schema. The admin configuration, CMS bundle, preview styles, HTML routes, sitemap, and optimized images are generated; edit their sources instead. `docs/original-assets.json` records the source URLs for the migrated media. The supplied Google Fonts links are retained; gallery media and CMS scripts are served locally.

## Verification

Desktop and mobile layouts were compared with the original website and supplied screenshots. PhotoSwipe opening, image order, next navigation, Escape dismissal, and focus return were checked in a browser. The local Decap backend was checked against all 20 project entries and site settings.

The production build was checked at both `/` and `/portfolio/`. Hosted GitHub login and an actual Pages deployment require your repository and OAuth configuration and have not been exercised. The browser used for verification blocked the `/admin/` route, so the complete editor UI was not visually tested.

PhotoSwipe and Decap license notices are included under `public/`. Portfolio copy and media are carried over from the original website; the dependency licenses do not relicense those assets.
