# Springstack

Springstack is a UI framework for **stack-based navigation** with animated breadcrumb morphing. You manage a logical stack of nodes (root → corpus → item → detail), and Springstack renders the UI and orchestrates the transitions.

## Install

```bash
npm install springstack
```

## Prerequisites

- Node.js 20+
- React 18+ (peer dependency)
- GSAP 3.12+ (peer dependency)
- Tailwind CSS configured in your project
- Radix UI color tokens (or equivalent CSS variables)

## Quickstart (Minimal App)

The smallest useful setup renders a single panel and enables push/pop transitions.

```tsx
import { Springstack, type SpringstackNode } from 'springstack';

const root: SpringstackNode = {
  id: 'root',
  kind: 'root',
  title: 'App'
};

export function App() {
  return (
    <Springstack
      initialStack={[root]}
      renderPanels={helpers => (
        <div className="basis-full shrink-0">Root panel</div>
      )}
    />
  );
}
```

## Repository Structure

```
apps/demo/            - Reference implementation
packages/springstack/ - Core library (published to npm)
infra/                - AWS CDK for demo deployment
features/             - BDD test specifications
```

## Mental Model / Invariants

- **One node per depth**: each stack entry corresponds to one horizontal panel.
- **Panels are full width**: each panel must be `basis-full shrink-0` (or equivalent) or the track animation will show multiple panels.
- **Animation identity**: morphing is keyed by `{kind}:{id}`.
- **Card morphing**: use `getCardProps` on list items, and ensure `data-card-shell` and `data-card-content` exist in the card markup.

## API Reference

### `SpringstackProps<TData>`

| Prop | Type | Required | Purpose | Default / Behavior |
|------|------|----------|---------|--------------------|
| `initialStack` | `SpringstackNode<TData>[]` | yes | Initial stack path. | No default. |
| `renderPanels` | `(helpers: SpringstackHelpers<TData>) => ReactNode` | yes | Render the horizontal panel track. | No default. |
| `renderHeader` | `(helpers) => ReactNode` | no | Optional header above breadcrumbs. | None. |
| `renderFooter` | `(helpers) => ReactNode` | no | Optional footer below panels. | None. |
| `renderOverlay` | `(helpers) => ReactNode` | no | Optional overlay layer (e.g., settings). | None. |
| `renderers` | `SpringstackRenderers<TData>` | no | Slot renderers by node kind. | None. |
| `enterAnimation` | `SpringstackEnterAnimationConfig` | no | Configure list enter animation. | `{ selector: '[data-enter-item]' }` + timing preset. |
| `timingMode` | `SpringstackTimingMode` | no | Preset timing mode. | `normal`. |
| `timingConfig` | `Partial<SpringstackTimingConfig>` | no | Override timing values. | Preset values. |
| `routing` | `SpringstackRoutingConfig` | no | Built-in URL sync. | Enabled by default in browser. |
| `overlayPortal` | `boolean` | no | Render overlay in `document.body`. | `true`. |
| `className` | `string` | no | Root container class. | None. |
| `onStackChange` | `(stack) => void` | no | Observe stack changes. | None. |

### `SpringstackHelpers<TData>`

| Helper | Type | Purpose | Behavior |
|--------|------|---------|----------|
| `push` | `(node, sourceEl?) => Promise<void>` | Push node and animate. | Morphs from `sourceEl` if provided. |
| `pop` | `() => Promise<void>` | Pop last node and animate back. | No-op if stack length is 1. |
| `popTo` | `(index: number) => Promise<void>` | Pop to breadcrumb index. | Runs full pop animation for each level. |
| `drillTo` | `(path: SpringstackNode[]) => Promise<void>` | Animate deep link by pushing path. | Renders root first, then pushes each level. |
| `setStack` | `(stack: SpringstackNode[]) => void` | Replace stack without animations. | Also resets hidden morph state. |
| `getCardProps` | `(node, options?) => { ... }` | Attach required data attributes + click handler. | Use on list cards for morphing. |
| `getPanelProps` | `(panelKey) => { ... }` | Attach panel key + ref for enter animations. | Use on each panel container. |
| `notifyPanelReady` | `(panelKey) => void` | Trigger enter animation for a panel. | Call after panel content loads. |
| `stack` | `SpringstackNode[]` | Current stack. | Read only. |
| `activeDepth` | `number` | Current active depth. | Read only. |
| `isTransitioning` | `boolean` | Whether an animation is running. | Read only. |

### `SpringstackNode<TData>`

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `id` | `string` | yes | Stable identifier for morphing. |
| `kind` | `string` | yes | Node type (e.g., `root`, `corpus`, `item`). |
| `title` | `string` | no | Optional display title. |
| `data` | `TData` | no | Arbitrary payload. |
| `slots` | `SpringstackSlots<TData>` | no | Per-node render overrides. |

### `SpringstackRenderers<TData>`

| Slot | Type | Purpose |
|------|------|---------|
| `list` | `Record<kind, SpringstackSlotRenderer>` | Render list cards by kind. |
| `crumb` | `Record<kind, SpringstackSlotRenderer>` | Render breadcrumb items by kind. |
| `panel` | `Record<kind, SpringstackSlotRenderer>` | Optional panel rendering by kind. |

### `SpringstackTimingMode`

`'normal' | 'reduced' | 'gratuitous' | 'slow' | 'off'`

- **normal**: everyday UX
- **reduced**: shorter durations
- **gratuitous**: more elastic motion
- **slow**: 4x slower for debugging
- **off**: snap transitions

### `SpringstackTimingConfig`

| Field | Type | Purpose |
|-------|------|---------|
| `beatMs` | `number` | Base cadence between stages. |
| `trackDurationMs` | `number` | Panel slide duration. |
| `morphDurationMs` | `number` | Breadcrumb morph duration. |
| `fadeDurationMs` | `number` | Crossfade duration. |
| `crumbHeightDurationMs` | `number` | Breadcrumb row height animation. |
| `pushPauseBeats` | `number` | Pause beats between pushes. |
| `popPauseBeats` | `number` | Pause beats between pops. |
| `trackEase` | `string` | GSAP ease for track slide. |
| `morphEase` | `string` | GSAP ease for morph. |
| `fadeEase` | `string` | GSAP ease for fades. |
| `crumbHeightEase` | `string` | GSAP ease for breadcrumb height. |
| `enterEase` | `string` | GSAP ease for list enter. |

### `SpringstackRoutingConfig`

| Field | Type | Purpose | Default / Behavior |
|-------|------|---------|--------------------|
| `enabled` | `boolean` | Turn URL sync on/off. | `true` in browser. |
| `useHash` | `boolean` | Use hash routing. | `false`. |
| `parse` | `(path) => SpringstackNode[]` | Custom path → stack. | Default `/<kind>/<id>/...` |
| `serialize` | `(stack) => string` | Custom stack → path. | Default `/<kind>/<id>/...` |
| `basePath` | `string` | Prefix to strip/add. | None. |

## Recipes

### Push with Morph (List → Breadcrumb)

```tsx
<button
  {...helpers.getCardProps(node, {
    onSelect: (selected, el) => helpers.push(selected, el)
  })}
>
  <div data-card-shell="true">
    <div data-card-content="true">{node.title}</div>
  </div>
</button>
```

### Pop to Breadcrumb

```tsx
helpers.popTo(0); // return to root
```

### Deep Link Drill

```tsx
helpers.drillTo([
  { id: 'root', kind: 'root' },
  { id: 'c-1', kind: 'corpus' },
  { id: 'i-55', kind: 'item' }
]);
```

### Set Stack Directly

```tsx
helpers.setStack([{ id: 'root', kind: 'root' }]);
```

## Rendering Contract

- Each panel **must** be full width: `basis-full shrink-0`.
- Use `getPanelProps(panelKey)` on each panel container.
- List cards **must** include:
  - `data-card-shell="true"`
  - `data-card-content="true"`
- Use `getCardProps` on list item wrappers to wire morphing.

## Enter Animations

- Set `enterAnimation.selector` to match list items (default: `[data-enter-item]`).
- Use `notifyPanelReady(panelKey)` after data loads to trigger the enter animation.
- Enter animations are intended for panels that appear from the right on push.

## URL Routing (Built-In)

By default Springstack syncs the stack to the URL and supports back/forward:

- Default scheme: `/<kind>/<id>/<kind>/<id>...`
- Deep-linking animates through each level on load.
- Back/forward updates the stack via `drillTo`.

Disable or customize via `routing`.

## Styling & Tokens

Springstack expects Tailwind + Radix tokens (see `apps/demo/src/index.css`):

- `--background`, `--card`, `--muted`, `--selected`
- theme classes: `.theme-cool`, `.theme-warm`, `.theme-neutral`

You can replace the tokens with your own design system as long as these variables exist.

## Troubleshooting

- **Panels show side-by-side:** panel containers are not full width.
- **Morph animation fails:** missing `data-card-shell` / `data-card-content`.
- **Wrong item morphs:** unstable `id` or mismatched `kind`.
- **No list enter animation:** missing `notifyPanelReady` call.

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

The deploy outputs the S3 website URL. Note: S3 websites are HTTP only.

## Publish

```bash
npm run build --workspace packages/springstack
npm publish --access public
```
