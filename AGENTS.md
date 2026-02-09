# Springstack (Project Memory)

**What:** React library for animated, stack-based navigation with breadcrumb morphing (React 18 + GSAP + TypeScript)

**Repo:** Monorepo with `apps/demo` (reference impl), `packages/springstack` (npm library), `infra` (CDK), `features` (BDD tests)

**Prerequisites:** Node 20+, AWS creds for deploy (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`), CI needs `NPM_TOKEN` + `GITHUB_TOKEN`

**Deploy:** CloudFront + S3 in us-east-1. SPA routing via error responses (403/404 → index.html)

**Tests:** Cucumber.js (`npm test`). Step defs in `features/step_definitions/`, support in `features/support/`. Tag `@skip` excludes scenarios. Config: `cucumber.js`

**Important:** Do not commit changes without explicit user permission.

---

## Development

```bash
npm install
npm run dev --workspace apps/demo
```

## Build Demo

```bash
npm run build --workspace apps/demo
```

## Deploy Demo (CloudFront + S3)

```bash
npm run cdk:deploy --workspace infra -- --require-approval never
```

## Destroy Demo

```bash
npm run cdk:destroy --workspace infra
```

## Tests (BDD)

```bash
npm test
```

## Release (CI)

- Releases are handled by GitHub Actions using **semantic-release**.
- Uses **conventional commits** for versioning (fix: patch, feat: minor, BREAKING CHANGE: major).
- CI runs `npm test` and then publishes `springstack` if tests pass.
- Requires `NPM_TOKEN` secret.

Notes:
- The demo app is a reference implementation of the default Springstack behavior (no custom routing overrides).
- SPA routing is handled by CloudFront error responses.
