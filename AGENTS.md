# Springstack (Project Memory)

**What:** React library for animated, stack-based navigation with breadcrumb morphing (React 18 + GSAP + TypeScript)

**Repo:** Monorepo with `apps/demo` (reference impl), `packages/springstack` (npm library), `infra` (CDK), `features` (BDD tests)

**Prerequisites:** Node 20+, AWS creds for deploy (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`), CI needs `NPM_TOKEN` + `GITHUB_TOKEN`

**Deploy:** CloudFront + S3 in us-east-1. SPA routing via error responses (403/404 → index.html)

**Tests:** Cucumber.js (`npm test`). Step defs in `features/step_definitions/`, support in `features/support/`. Tag `@skip` excludes scenarios. Config: `cucumber.js`

**CRITICAL AGENT INSTRUCTION:** Never perform a `git commit` until the user explicitly tells you to do so. Changes are made to files only; commits are user-initiated only.

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

### Prerequisites
- AWS credentials configured (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- Verify credentials: `aws sts get-caller-identity`

### Deployment Steps

1. **Build the demo app:**
   ```bash
   npm run build --workspace apps/demo
   ```

2. **Deploy infrastructure:**
   ```bash
   npm run cdk:deploy --workspace infra -- --require-approval never
   ```

3. **Verify deployment:**
   - Check CloudFront distribution is created in us-east-1
   - Note the CloudFront URL from CDK output
   - Wait 2-5 minutes for CloudFront distribution to fully deploy

4. **Test the deployment:**
   - Open the CloudFront URL in a browser
   - Verify the demo loads correctly
   - Test navigation and settings

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

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
