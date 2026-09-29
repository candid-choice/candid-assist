---
description: Icon usage rules — Tabler Icons are the standard icon library for the harness app
---

# Icon Usage

All icons in the harness desktop app must use **Tabler Icons** (`@tabler/icons-react`).

**Do not write inline SVG icons.** Always import and use a Tabler icon component:

```tsx
import { IconSearch } from '@tabler/icons-react'

<IconSearch className="size-4 text-muted-foreground" />
```

- Prefer Tailwind `className` for sizing (`size-3`, `size-4`, `size-5`, `size-6`) over SVG attributes.
- Use `strokeWidth` prop when the design requires a non-default stroke weight.
- Decorative icons get `aria-hidden="true"`.
- If no Tabler icon matches the intended meaning, use a Unicode emoji fallback rather than an inline SVG path.
- Never add a second icon library — if something is missing from Tabler, choose the closest semantic match.
