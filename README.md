# Canvas — AI Website Builder

Canvas is a responsive website-building studio. Describe a site, generate a structured page with Gemini, edit its sections and palette, preview different device widths, then export a starter React + Tailwind project.

![Canvas dashboard screenshot placeholder](docs/screenshots/dashboard-placeholder.svg)

## Features

- Gemini-powered website schema generation, with JSON response validation.
- Prompt-driven section renderer for hero, about, features, services, products, categories, menus, team, stats, process, events, articles, locations, schedules, client logos, pricing, testimonials, FAQ, contact, and footer.
- Business-specific layouts and content for stores, restaurants, portfolios, agencies, SaaS products, venues, education, and other common website types, with relevant generated cards and visual categories.
- Card images are searched by generated item name in Wikimedia Commons, with visible creator/license attribution and curated Unsplash fallbacks when no matching image is available. The search uses Wikimedia's public API and does not require an additional API key.
- Editable section content, section insertion/removal, drag-and-drop ordering, and up/down controls.
- Live JSON editor, color controls, AI color palette generation, and light/dark preview.
- Desktop, tablet, and mobile preview widths.
- Downloadable ZIP containing a React + Tailwind starter project and JSON configuration.
- Supabase Auth login/signup and per-account cloud project history (up to 30 recent projects shown).
- API request validation, rate limiting, CORS allow-list, Helmet security headers, and explicit errors.

Generated sites are composed from the supported section templates and content schema; the preview does not execute arbitrary AI-written React or JavaScript.

## Requirements

- Node.js 20.19 or newer
- npm 9 or newer
- A Google Gemini API key for AI generation
- A Supabase project for authentication and project storage

## Setup

From the repository root:

```powershell
npm install
if (!(Test-Path backend\.env)) { Copy-Item .env.example backend\.env }
```

Add your Gemini key to `backend/.env`. Keep the key server-side; do not add it to a `VITE_*` variable. Local guest mode requires only the Gemini key. Do not copy `frontend/.env.example` unless you have real Supabase credentials.

```dotenv
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
```

To enable accounts, install dependencies (the Supabase CLI is included as a local development tool), create a Supabase project in your Supabase account, then authenticate and link it:

```powershell
npm ci
npx supabase login
npx supabase projects list
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

The CLI login requires your own Supabase access token; enter it only in the CLI prompt, never in chat or a committed file. If you have not created a project yet, create one from the Supabase Dashboard first and then link it. `db push` applies the checked-in [`supabase/migrations/20261031200000_projects.sql`](./supabase/migrations/20261031200000_projects.sql), which creates the per-user projects table and row-level-security policies.

Set that project's URL and **service-role key** in `backend/.env`. Create `frontend/.env.local` from `frontend/.env.example` and set the same project URL plus its **publishable/anon key**. For localhost, both files are required: the public frontend settings enable the sign-in form, while the backend settings verify sessions and save account projects. Restart the API and Vite dev server after changing environment variables. Never put the service-role key in a frontend variable or commit either `.env` file. Until both sides are configured, localhost intentionally offers guest mode and real account sign-in is unavailable.

The same Supabase project must be configured locally and on the deployed server: localhost uses `frontend/.env.local` plus `backend/.env`; production uses the frontend build variables plus server-side hosting secrets. Enable email/password sign-in in Supabase Auth and configure its site URL and allowed redirect URLs for `http://localhost:5173`, any LAN frontend origin you use, and the deployed HTTPS origin. Email/password signup does not require Google OAuth or an SMS provider. A phone number is optional; when supplied, it must be in international E.164 format (e.g. `+14155552671`) and is verified by SMS before enabling phone-number sign-in. Configure an SMS provider under Auth → Providers → Phone only if you want to offer phone verification. Email confirmation follows the Supabase project's Auth settings. If email confirmation is enabled, users first confirm their email and then sign in.

Password reset emails return directly to `/reset-password`. Supabase's `PASSWORD_RECOVERY` event opens the app's password update screen; users can choose and confirm a new password there. Add the exact production and local `/reset-password` URLs to Supabase Auth's allowed redirect URLs, for example `https://your-domain.example/reset-password` and `http://localhost:5173/reset-password`.

The local Supabase credentials are not bundled with this source. If the frontend shows the guest-workspace notice or a deployment setup error, configure the two env files above with credentials from your own Supabase project; do not use placeholder values. Account creation, password login, email confirmation, and cloud project history require valid frontend and backend settings pointing to the same project. SMS phone verification additionally requires an SMS provider.

Email/password is the ready-to-use sign-in method. Google sign-in is shown as unavailable until the frontend build has `VITE_GOOGLE_AUTH_ENABLED=true`; set this only after enabling the Google provider in Supabase Dashboard → Authentication → Sign In / Providers, entering both OAuth credentials, adding Supabase's displayed callback URL to the Google OAuth client's authorized redirect URIs, and testing sign-in end to end. The OAuth client secret belongs only in Supabase, never in frontend variables. Without real Supabase values, development safely uses the guest workspace and browser-local project history; cloud account sign-in and project history require the shared Supabase configuration.

Start the frontend and API together:

```powershell
npm run dev
```

Open <http://localhost:5173>. The API listens on <http://localhost:4000>; in development, Vite proxies `/api` requests to it.

### Open the development app from another device on your Wi-Fi

The development server listens on the network. Find this computer's local IPv4 address with `ipconfig`, then open `http://<computer-ip>:5173` on a device connected to the same network (for example, `http://192.168.1.25:5173`). Keep `npm run dev` running. The Vite proxy forwards `/api` requests back to `127.0.0.1:4000` on this computer; client devices should not call their own `localhost` or need direct access to port 4000.

If the page loads but generation fails, verify `/api/health` from the same device using `http://<computer-ip>:5173/api/health`; it should return `{"status":"ok"}`. On the other device, test the host with `Test-NetConnection <computer-ip> -Port 5173` (Windows). On the host, check `Get-NetConnectionProfile`. Only for a trusted home/office Wi-Fi, set its Windows network profile to **Private** in Settings, then if needed allow the Vite port through the Private firewall profile from an elevated PowerShell: `New-NetFirewallRule -DisplayName "Canvas Vite development server" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Private -RemoteAddress LocalSubnet`. Do not expose backend port 4000 to the public internet. Verify the host IPv4 address again after changing Wi-Fi networks.

To configure another API URL for a separately deployed frontend, set `VITE_API_URL` (for example `https://api.example.com/api`) in `frontend/.env.local`. The server's `FRONTEND_ORIGIN` must match the deployed frontend origin.
When building that separate frontend for production, also provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time. The anon key is public; never provide `SUPABASE_SERVICE_ROLE_KEY` to the frontend build.

## Authentication and persistence

Login/signup uses Supabase Auth; in production all website generation and project API requests require a verified bearer token. The backend verifies tokens against Supabase and uses its server-only service-role key to access projects. Project rows are scoped to their owner and protected by Postgres row-level security. When Supabase frontend configuration is absent in development, the editor and generation remain available as a local guest workspace; guest history is browser-local and is not available in production.

## Production deployment

### Free Vercel deployment

The included [`vercel.json`](./vercel.json) builds the Vite frontend as static assets and routes `/api/*` to the Express API as a Vercel Function. To deploy:

1. Import `chico-tech528/canvas-ai-website-builder` from GitHub into your Vercel Hobby account and keep the project root set to `.`.
2. Add the environment variables below in Vercel project settings for **Production**, **Preview**, and **Development** as needed. Keep all private values in Vercel's environment-variable settings; never put the service-role key in a `VITE_` variable.
3. Before the first deployment, apply `supabase/migrations/20261031200000_projects.sql` to your Supabase project and configure the Auth site URL/allowed redirects for the eventual Vercel domain.
4. Deploy from the Vercel dashboard. Verify the app loads and `https://<your-vercel-domain>/api/health` returns `{"status":"ok"}`.

Required Vercel environment variables:

- `VITE_SUPABASE_URL` and `SUPABASE_URL`: the same Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: the public Supabase publishable/anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: the server-only Supabase service-role key.
- `GEMINI_API_KEY`: the Gemini API key.
- `TRUST_PROXY=1`: trust the Vercel proxy for client IP-based request limits.

Vercel supplies `NODE_ENV` and `VERCEL` automatically. The frontend and API share an origin, so leave `VITE_API_URL` unset. Readiness requires working Supabase credentials and the projects table.

Vercel Hobby is free for personal, non-commercial projects and has usage and function-duration limits; it is not an uptime guarantee. This configuration caps the API function at 150 seconds and Gemini requests at 50 seconds per attempt so retries and image enrichment fit within the browser's request timeout. Gemini usage and other third-party services have separate quotas and may have separate charges. Review [Vercel Hobby plan limits](https://vercel.com/docs/plans/hobby) before deploying; the free Hobby plan is for personal, non-commercial use only.

### Deploying to Render

The included [`render.yaml`](./render.yaml) configures a single free Node web service for initial testing. Its build explicitly installs development dependencies because Vite and TypeScript are required at build time even when the running service uses `NODE_ENV=production`; it then serves the built frontend from the Express server. Free services can spin down and are not a production availability target. Create a Render Blueprint from the GitHub repository, then provide the requested environment values in Render's dashboard:

- `VITE_SUPABASE_URL` and `SUPABASE_URL`: the same Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: the Supabase publishable/anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: the server-only Supabase service-role key.
- `GEMINI_API_KEY`: the Gemini API key.

Rotate any credentials that may have been exposed before entering production secrets. Do not commit `.env` files or put the service-role key in a `VITE_` variable. Configure the deployed HTTPS origin in Supabase Auth's site URL and redirect allowlist, then verify `GET /api/health` reports `{"status":"ok"}`. Select a paid persistent Render plan for production use; the free plan may spin down and is not a production availability target.

For the included Docker image, build with the public Supabase frontend configuration and inject private backend keys at runtime through your hosting provider's secret manager:

```powershell
docker build -t canvas-ai-website-builder `
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co `
  --build-arg VITE_SUPABASE_ANON_KEY=your_publishable_or_anon_key .
docker run --rm -p 4000:4000 --env-file backend\.env -e NODE_ENV=production canvas-ai-website-builder
```

For local Docker testing, put the backend variables in the gitignored `backend/.env`. In hosted deployments, define them as provider-managed secrets instead of copying `.env` into the image. Configure a persistent HTTPS-capable host, its exact public URL in Supabase Auth redirect settings, secret rotation, logs/alerts, backups, and provider quotas. The API image's `/api/health` endpoint checks database readiness. Set `TRUST_PROXY` to the exact trusted proxy hop count required by your host so IP-based quotas use client addresses correctly. The built-in request limiter is process-local and IP-based; configure a shared store or gateway-level quota before horizontal scaling. Never deploy the Vite development server as the public production frontend.

The Docker CLI alone is not enough to build or run the image: confirm `docker info` succeeds and the Docker Engine/Desktop service is running first. If your deployment provider builds from a Dockerfile, its build logs are the authoritative check for that provider's build environment.

### Pre-deployment verification

Run the repository checks from its root before building a release:

```powershell
npm ci
npm test
npm run lint
npm run build
npm audit
```

The GitHub Actions workflow at [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs the backend tests, frontend lint and build, production container build, and a production-dependency audit on pushes and pull requests. Its public Supabase build arguments are CI-only placeholders and must never be used for deployment. A green CI run verifies the code checks and image packaging, but does not confirm access to external Supabase, Gemini, or SMS services.

Before deploying, also verify the environment-specific pieces that local checks cannot prove:

1. Apply `supabase/migrations/20261031200000_projects.sql` to the intended Supabase project and configure its URL and server-only service-role key, plus `GEMINI_API_KEY`, as hosting secrets.
2. Provide the Supabase URL and public publishable/anon key at frontend build time. For a separately hosted API, set `VITE_API_URL` and configure `FRONTEND_ORIGIN` to the exact frontend origin.
3. Build and start the production image using the Docker commands above, then confirm `GET /api/health` returns `{"status":"ok"}` over the deployed HTTPS origin.
4. In the deployed app, verify sign-up/sign-in, generate a website, edit and export it, and confirm the project appears in account history after a reload. Test an authenticated user cannot access another user's projects.
5. Configure the provider's HTTPS, persistent secrets, backups, monitoring, trusted proxy hops, and shared rate limiting before scaling beyond one API instance.

The production frontend build can warn that the lazy-loaded Monaco JSON editor chunks are large; the editor is loaded only when the code panel is opened. Treat this as a performance consideration to monitor, not as a successful Docker or hosted-deployment check. A local build, passing automated checks, and an API health response do not verify third-party uptime, Supabase account configuration, or behavior on a specific hosting provider.

The store preview includes product search and an interactive sample bag; it is a preview, not a real payment, inventory, or order-processing integration. Canvas retries transient Gemini 500/503/504, timeout, and network failures once. Repeated slow requests report a timeout; provider overload, quota/rate limits, invalid credentials, and persistent network errors still require provider recovery or configuration changes; no application can guarantee Google's service availability. The API logs safe upstream error type/status/code diagnostics without logging credentials. The API proxy allows up to 130 seconds for a request; the browser waits up to 135 seconds for a website.

Relevant card images are obtained from Wikimedia Commons at generation time, and the preview displays a link to the source file with its creator and license when available. Up to 8 images are searched per website; image-search request failures are logged, and missing matches use the existing curated Unsplash fallback. If a Commons image fails to load, the preview tries its curated fallback. Preview images require internet access. Check each source file's linked license before reusing images outside the generated preview.

## Project layout

```text
frontend/
  src/
    components/       Preview and authentication views
    services/         API and local project persistence
    App.tsx           Studio, editor, preview controls, and export
    styles.css        Responsive application and generated-site preview styles
    types.ts          Website schema and project types
backend/
  controllers/        Request handlers
  routes/             Validated API routes
  services/           Gemini integration
  middleware/         Authentication and request controls
  migrations/         Supabase database schema and RLS policies
  utils/              Shared schema validation
  server.js           Express app, security middleware, and error handling
docs/
  API.md              API request/response documentation
  screenshots/        Screenshot placeholder
```

## Checks

```powershell
npm run lint
npm test
npm run build
```

## Screenshots

Replace `docs/screenshots/dashboard-placeholder.svg` with a product screenshot when one is available.
