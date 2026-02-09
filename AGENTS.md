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

## Deploy Demo (S3 website)

```bash
npm run cdk:deploy --workspace infra
```

## Destroy Demo

```bash
npm run cdk:destroy --workspace infra
```

Notes:
- The demo is hosted as a public S3 website (HTTP only).
- SPA routing uses index.html as the error document.
