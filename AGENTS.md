# Springstack (Project Memory)

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

- Releases are handled by GitHub Actions using semantic-release.
- CI runs `npm test` and then publishes `springstack` if tests pass.
- Requires `NPM_TOKEN` secret.

Notes:
- The demo app is a reference implementation of the default Springstack behavior (no custom routing overrides).
- SPA routing is handled by CloudFront error responses.
