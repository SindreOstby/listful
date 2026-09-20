---
name: deploy-listful
description: "How Listful is deployed: publishing a GitHub release runs .github/workflows/release.yml, which tests and builds the Angular app, pushes Supabase migrations, and deploys to GitHub Pages. Use when cutting a release, changing the workflow, debugging a failed deploy, applying production Supabase config, or working with the deploy access token and its permissions."
---

# Deploying Listful

Production:
- App: https://sindreostby.github.io/listful/ (GitHub Pages, repo `SindreOstby/listful`, public)
- Supabase project ref: `zuavucwsgcwbtbxnofir`

## Cutting a release

Deploys run on published GitHub releases, plus `workflow_dispatch` (see Gotchas — a manual run from
any branch deploys that branch's migrations to production).

```sh
gh release create v0.1.3 --generate-notes --target main
gh run watch <run-id>            # gh run list --workflow release.yml --limit 1
```

`.github/workflows/release.yml` runs three jobs in order, each stopping the next on failure:

1. **Test and build app** — `npm ci`, `npm test -- --watch=false`, then
   `ng build --output-mode static --base-href "/listful/"`. Angular is configured for SSR, but
   GitHub Pages only serves static files, so the build overrides `outputMode`. Every route is
   `RenderMode.Client`, so nothing is lost. The step renames `index.csr.html` to `index.html` and
   copies it to `404.html`, which is what makes deep links such as `/listful/login` load the app
   (GitHub still returns a 404 status for them — expected).
2. **Deploy Supabase migrations** — `supabase db push --project-ref "$SUPABASE_PROJECT_ID"`.
3. **Deploy app to GitHub Pages** — `actions/deploy-pages`.

Re-running a failed run reuses the workflow from that release's commit. After changing the
workflow, cut a new release instead of re-running.

## Secrets and token permissions

Repository secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`. Migrations are applied over a
direct Postgres connection with the password; the token is only used for looking up the project and
the connection pooler.

Access token permissions (https://supabase.com/dashboard/account/tokens), everything else `None`:

| Section | Permission | Level |
|---|---|---|
| Project | Project Settings | Read |
| Database | Database Config, Connection Pooling | Read |
| Application services | API Keys, Data API Config, Realtime Config | Read |
| Infrastructure and delivery | Add-ons | Read |

Do **not** run `supabase link` in CI: it fetches the API keys with `reveal: true`, which needs the
high-risk API Key Secrets permission and hands the workflow a `service_role` key it never needs.
`db push --project-ref` connects with `SUPABASE_DB_PASSWORD` and resolves the IPv4 pooler itself,
which is required because GitHub runners can't reach the IPv6-only direct database host.

## Production Supabase config (manual)

`supabase/config.toml` has a `[remotes.production]` section with the production overrides: the
GitHub Pages site URL and redirect URL, required email confirmation, an 8-character minimum
password with mixed case and a digit (the Create account button enforces the same length; Sign in
deliberately enforces no length rule, so accounts made under the old 6-character minimum can still
sign in), and the pooler sizes for the current compute size.

Applying it is **not** part of the workflow, because the deploy token cannot read
`GET /v2/projects/{ref}/config` (403: "your account does not have permission to view its
configuration"). Run it locally after changing auth settings:

```sh
supabase config diff --project-ref zuavucwsgcwbtbxnofir   # always review first
supabase config push --project-ref zuavucwsgcwbtbxnofir
```

`config push` sends every declared property, not only the ones under `[remotes.production]`. A
local-only value (for example `enable_confirmations = false`) will otherwise overwrite production,
so add a production override for anything that must differ. Twilio SMS cannot be disabled this way;
use the dashboard.

To move this into CI, find the token permission that lists `GET /v2/projects/{ref}/config`, grant it
plus write on Auth Config and Storage Config, then add `config diff` and `config push --yes` steps
after `db push`.

## Verifying a deploy

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://sindreostby.github.io/listful/
curl -s https://sindreostby.github.io/listful/ | grep -o '<base[^>]*>'   # /listful/
```

Rendering check without a browser:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --virtual-time-budget=8000 --dump-dom https://sindreostby.github.io/listful/ | grep -o '<app-root.\{0,200\}'
```

## Gotchas

- **Email rate limit.** Supabase's built-in email service sends only 2 auth emails per hour for the
  whole project, and production allows one per minute per address. Set up SMTP before real users.
- **Cached 404s.** GitHub Pages lets browsers cache 404 responses for ~10 minutes; test in a private
  window after a first deploy.
- **`workflow_dispatch` from any branch** deploys that branch's migrations to production. Only run it
  manually from `main`, or move the secrets into a `production` environment restricted to `main` and
  `v*` tags.
- **GitHub Pages environment** allows deployments from `main` and `v*` tags; a differently named tag
  is blocked after the migrations have already been applied.
- **Publishable key** is committed in `app/src/environments/environment.ts` on purpose. Never put the
  secret key in the app; RLS is what protects the data.
