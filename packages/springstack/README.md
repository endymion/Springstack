# springstack

Springstack is a stack-navigation UI component with breadcrumb morph animations.

## Usage

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

## Notes

- Tailwind classes and Radix color tokens are expected in the host app.
- The component manages push/pop animations and breadcrumb morphing.
