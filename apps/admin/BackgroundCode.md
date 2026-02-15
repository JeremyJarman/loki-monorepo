# Pink Hue Gradient Background — LOKI Admin Page

Use this to match the **Problem section** background on the LOKI landing page: a soft gradient from primary (green) to secondary (orange) that reads as a light pink/peach hue.

---

## 1. Tailwind class

On the **section** or **page** wrapper:

```txt
bg-gradient-to-br from-primary/5 to-secondary/5
```

- `bg-gradient-to-br` — gradient from top-left to bottom-right.
- `from-primary/5` — start color = primary at 5% opacity.
- `to-secondary/5` — end color = secondary at 5% opacity.

Result: very light green → light orange, which reads as a soft pink/peach tint on white.

---

## 2. Full section example (from Problem)

So the full section wrapper looks like this:

```txt
className="py-20 px-4 bg-gradient-to-br from-primary/5 to-secondary/5"
```

- `py-20` — vertical padding.
- `px-4` — horizontal padding.
- `bg-gradient-to-br from-primary/5 to-secondary/5` — the pink hue gradient.

Use the same gradient class on any admin page or block where you want the same background.

---

## 3. Color tokens (must match landing)

The gradient uses Tailwind theme colors:

| Token     | Hex       | Usage in gradient |
|----------|-----------|--------------------|
| primary  | `#122220` | `from-primary/5`  |
| secondary| `#FF3D00` | `to-secondary/5`  |

In `tailwind.config.js` (or equivalent):

```js
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#122220',
        dark: '#0E1A18',
        light: '#1A2E2C',
      },
      secondary: {
        DEFAULT: '#FF3D00',
        dark: '#CC2F00',
        light: '#FF6B33',
      },
      // ... rest of palette
    },
  },
}
```

Without these, `primary/5` and `secondary/5` won’t match the landing page.

---

## 4. Optional: card on top of the gradient

On the landing, content cards sit on top of this background and stay white:

- Section: `bg-gradient-to-br from-primary/5 to-secondary/5`
- Card: `bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow`

So for an admin page with the same feel:

- Page/section: `bg-gradient-to-br from-primary/5 to-secondary/5` (+ padding).
- Content areas: `bg-white rounded-xl ...` (and your padding/shadow).

---

## 5. Summary

- **Class**: `bg-gradient-to-br from-primary/5 to-secondary/5`
- **Where**: Section or full-page wrapper.
- **Tokens**: `primary` #122220, `secondary` #FF3D00 in Tailwind.
- **Cards**: Keep `bg-white` so the gradient shows only in the background.
