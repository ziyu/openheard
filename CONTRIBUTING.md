# Contributing

## Run it locally

```bash
bun install
bun run db:push:local   # creates apps/web/local.db
bun run dev:local       # http://localhost:3001
```

Set `SSO_AUTHORIZE_URL=http://127.0.0.1:7001/api/sso/authorize`,
`SSO_TOKEN_URL=http://127.0.0.1:7001/api/sso/token`, `SSO_PROVIDER_ID=webox`,
and `SSO_ADMIN_USER_ID=<your Webox user ID>` in `apps/web/.env`, then configure
Webox's fixed callback as `http://localhost:3001/api/sso/callback`. Sign in
and run `bun run db:seed` for demo posts. Other identity providers can use the
same OpenHeard SSO contract described in the root README.

## Before you open a PR

- `bun run --filter web check-types` passes.
- Follow `DESIGN.md`. Geist, Phosphor, one button component, three radii.
- One change per PR, described in one line.
- No AI attribution in commits or PR descriptions.

## Where things live

- `apps/web/src/routes` pages, `admin/` is the dashboard
- `apps/web/src/functions` server functions
- `packages/db/src/schema` tables, `migrations/` generated with `bun run db:generate`
- `packages/ui/src/components` shadcn-style components on Base UI
