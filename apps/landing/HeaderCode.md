# Header Section — LOKI Admin Page

Use this to build the **same header** as the LOKI landing page in the admin app: logo + name on the left, nav links centered, mobile hamburger on the right.

---

## 1. Layout and structure

- **Sticky header**, full width, white background.
- **Three-column grid**: logo left, nav center, right slot (e.g. mobile menu button or user menu).
- **Mobile**: center nav is hidden; show a hamburger that opens a vertical list of the same links.

---

## 2. Tailwind classes to use

### Header wrapper
- `sticky top-0 z-50 bg-white`

### Nav container
- `container mx-auto px-4 py-4`

### Grid (logo | nav | right)
- `grid grid-cols-3 items-center`

### Logo block (left)
- Wrapper: `flex items-center`
- Link: `flex items-center gap-3`
- Logo image: `h-8 w-auto` (and `src` to your logo path, e.g. `/logo.png`)
- Brand name: `text-xl font-heading font-bold text-neutral`

### Desktop nav (center)
- Wrapper: `hidden md:flex items-center justify-center space-x-6 lg:space-x-8`
- Each link: `text-neutral text-sm font-bold hover:text-neutral/80 transition-colors whitespace-nowrap`

### Right slot (e.g. mobile menu button)
- Wrapper: `flex items-center justify-end`
- Button: `md:hidden p-2 text-neutral`, plus `aria-label="Toggle menu"`

### Mobile nav (when open)
- Wrapper: `md:hidden mt-4 pb-4 space-y-4`
- Each link: `block text-neutral text-sm font-bold hover:text-neutral/80 transition-colors`

---

## 3. Design tokens (must match landing)

- **Background**: `bg-white`
- **Text**: `text-neutral` (#333333), hover `text-neutral/80`
- **Font**: `font-heading` for the brand name, `font-body` implied for nav (or same as body)
- **Logo height**: `h-8` (32px)

Ensure Tailwind has:
- `primary`, `secondary`, `accent`, `neutral` (see DESIGN_BRIEF or tailwind.config).
- `font-heading` (e.g. Crimson Text) and `font-body` (e.g. DM Sans).

---

## 4. Assets

- **Logo**: use the same `logo.png` as the landing (e.g. in `public/` so it’s at `/logo.png`), or point `src` to your admin’s logo path.
- **Icons**: landing uses `Menu` and `X` from `lucide-react` for the mobile toggle.

---

## 5. Example React structure (adapt to your router)

Replace `#problem`, `#solution`, etc. with your admin routes (e.g. `/`, `/mailing-list`, `/settings`). Use your router’s `Link` + `useNavigate` (or equivalent) instead of `href` + `scrollToSection` if you’re not using in-page anchors.

```tsx
<header className="sticky top-0 z-50 bg-white">
  <nav className="container mx-auto px-4 py-4">
    <div className="grid grid-cols-3 items-center">
      {/* Logo - Left */}
      <div className="flex items-center">
        <a href="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="LOKI" className="h-8 w-auto" />
          <span className="text-xl font-heading font-bold text-neutral">LOKI</span>
        </a>
      </div>

      {/* Nav - Center (desktop) */}
      <div className="hidden md:flex items-center justify-center space-x-6 lg:space-x-8">
        <a href="/dashboard" className="text-neutral text-sm font-bold hover:text-neutral/80 transition-colors whitespace-nowrap">Dashboard</a>
        <a href="/mailing-list" className="text-neutral text-sm font-bold hover:text-neutral/80 transition-colors whitespace-nowrap">Mailing List</a>
        {/* Add more nav items */}
      </div>

      {/* Right - Mobile menu button or user menu */}
      <div className="flex items-center justify-end">
        <button className="md:hidden p-2 text-neutral" onClick={toggleMenu} aria-label="Toggle menu">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </div>

    {/* Mobile nav */}
    {isMenuOpen && (
      <div className="md:hidden mt-4 pb-4 space-y-4">
        <a href="/dashboard" className="block text-neutral text-sm font-bold hover:text-neutral/80 transition-colors">Dashboard</a>
        <a href="/mailing-list" className="block text-neutral text-sm font-bold hover:text-neutral/80 transition-colors">Mailing List</a>
      </div>
    )}
  </nav>
</header>
```

---

## 6. Constants (optional)

If you centralize copy like the landing:

- `COMPANY_INFO.name` → e.g. `"LOKI"` for the text next to the logo.
- Logo `alt` can use the same value.

---

## 7. Summary checklist

- [ ] Sticky header: `sticky top-0 z-50 bg-white`
- [ ] Grid: `grid grid-cols-3 items-center` (logo | nav | right)
- [ ] Logo: `h-8`, brand name: `text-xl font-heading font-bold text-neutral`
- [ ] Nav links: `text-neutral text-sm font-bold hover:text-neutral/80 whitespace-nowrap`
- [ ] Desktop nav: `hidden md:flex ... space-x-6 lg:space-x-8`
- [ ] Mobile: hamburger + `md:hidden` dropdown with same links
- [ ] Same design tokens and fonts as landing (see DESIGN_BRIEF.md)
