# Springstack

Springstack is a UI framework for stack-based navigation with breadcrumb morph animations.

## Install

```bash
npm install springstack
```

## Basic Usage

```tsx
import { Springstack, type SpringstackNode } from 'springstack';

const root: SpringstackNode = { id: 'root', kind: 'root', title: 'App' };

<Springstack
  initialStack={[root]}
  renderPanels={helpers => (
    <div className="basis-full shrink-0">...</div>
  )}
/>
```

## Demo

```bash
npm install
npm run dev --workspace apps/demo
```

## Build + Deploy Demo (S3 Website)

```bash
npm run build --workspace apps/demo
npm run cdk:deploy --workspace infra
```

The deploy outputs the S3 website URL.

## Publish

```bash
npm run build --workspace packages/springstack
npm publish --access public
```
