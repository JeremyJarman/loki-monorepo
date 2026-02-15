# LOKI Design System Brief

> Design system and guidelines for maintaining visual consistency across LOKI products, including the landing page and admin panel.

## 🎨 Color Palette

### Primary Colors
The primary brand color is a deep forest green, used for main actions, navigation, and brand elements.

- **Primary**: `#122220` - Main brand color
- **Primary Dark**: `#0E1A18` - Hover states, darker variants
- **Primary Light**: `#1A2E2C` - Lighter variants, subtle backgrounds

**Usage**: Primary buttons, links, navigation, brand elements, focus states

### Secondary Colors
Vibrant orange used for calls-to-action and important highlights.

- **Secondary**: `#FF3D00` - CTA buttons, important actions
- **Secondary Dark**: `#CC2F00` - Hover states
- **Secondary Light**: `#FF6B33` - Lighter variants

**Usage**: Primary CTAs, alerts, important notifications, action buttons

### Accent Colors
Olive green used as a secondary accent for variety and depth.

- **Accent**: `#485C11` - Secondary accent
- **Accent Dark**: `#3A4A0E` - Hover states
- **Accent Light**: `#5A6E15` - Lighter variants

**Usage**: Secondary actions, badges, status indicators, subtle highlights

### Neutral Colors
Used for text, backgrounds, and UI elements.

- **Neutral Light**: `#F5F5F5` - Light backgrounds, borders
- **Neutral Default**: `#333333` - Primary text, dark elements
- **Text Paragraph**: `#6F6F6F` - Body text, secondary text

**Usage**: 
- Neutral Light: Card backgrounds, input backgrounds, dividers
- Neutral Default: Headings, primary text, icons
- Text Paragraph: Body text, descriptions, secondary information

### Background Colors
- **White**: `#FFFFFF` - Primary background
- **Black**: `#000000` - Headings (when using heading font)

## 📝 Typography

### Font Families

#### Headings: Crimson Text
- **Google Fonts**: [Crimson Text](https://fonts.google.com/specimen/Crimson+Text)
- **Weights**: 400 (Regular), 600 (Semi-Bold), 700 (Bold)
- **Usage**: All headings (h1-h6), hero text, prominent display text
- **Style**: Serif, elegant, sophisticated

#### Body: DM Sans
- **Google Fonts**: [DM Sans](https://fonts.google.com/specimen/DM+Sans)
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold)
- **Usage**: Body text, paragraphs, buttons, UI elements, forms
- **Style**: Sans-serif, clean, modern, highly readable

#### Mono: Roboto Mono
- **Google Fonts**: [Roboto Mono](https://fonts.google.com/specimen/Roboto+Mono)
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semi-Bold)
- **Usage**: Code snippets, technical data, IDs, timestamps
- **Style**: Monospace, technical

### Typography Scale

#### Headings
- **H1**: `text-4xl md:text-5xl lg:text-6xl` (24px / 30px / 36px)
- **H2**: `text-3xl md:text-4xl lg:text-5xl` (18px / 24px / 30px)
- **H3**: `text-2xl md:text-3xl lg:text-4xl` (16px / 20px / 24px)
- **H4**: `text-xl md:text-2xl lg:text-3xl` (14px / 18px / 20px)
- **H5**: `text-lg md:text-xl lg:text-2xl` (12px / 16px / 18px)
- **H6**: `text-base md:text-lg lg:text-xl` (12px / 14px / 16px)

**All headings**: `font-heading font-bold text-black`

#### Body Text
- **Paragraph**: `font-body text-text-paragraph` (default size)
- **Small**: `text-sm` (14px)
- **Base**: `text-base` (16px)
- **Large**: `text-lg` (18px)
- **XL**: `text-xl` (20px)

### Font Loading
Include in HTML `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

## 🧩 Component Patterns

### Buttons

#### Variants
1. **Primary** (`variant="primary"`)
   - Background: `bg-primary` (#122220)
   - Text: White
   - Hover: `bg-primary-dark` (#0E1A18)
   - Focus: Ring with `ring-primary`

2. **Secondary** (`variant="secondary"`)
   - Background: `bg-secondary` (#FF3D00)
   - Text: White
   - Hover: `bg-secondary-dark` (#CC2F00)
   - Focus: Ring with `ring-secondary`

3. **Outline** (`variant="outline"`)
   - Border: `border-2 border-primary`
   - Text: `text-primary`
   - Hover: `bg-primary hover:text-white`
   - Focus: Ring with `ring-primary`

#### Sizes
- **Small**: `px-4 py-2 text-sm`
- **Medium**: `px-6 py-3 text-base` (default)
- **Large**: `px-8 py-4 text-lg`

#### Base Styles
- `font-semibold rounded-lg transition-all duration-200`
- `focus:outline-none focus:ring-2 focus:ring-offset-2`
- Subtle hover scale animation (1.02) and tap scale (0.98)

### Cards

#### Standard Card
- Background: White
- Border Radius: `rounded-xl`
- Shadow: `shadow-lg`
- Padding: `p-6 md:p-8`

#### Usage
```tsx
<div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
  {/* Card content */}
</div>
```

### Forms

#### Input Fields
- Background: White
- Border: `border-2 border-neutral-light` (#F5F5F5)
- Focus Border: `border-primary`
- Padding: `px-4 py-3`
- Border Radius: `rounded-lg`
- Text: `font-body`
- Transition: `transition-colors`

#### Example
```tsx
<input
  className="w-full px-4 py-3 rounded-lg border-2 border-neutral-light focus:border-primary focus:outline-none transition-colors"
/>
```

#### Form Labels
- Font: `font-body font-semibold`
- Color: `text-neutral` (#333333)
- Spacing: `mb-2`

#### Error States
- Text Color: `text-secondary` (#FF3D00)
- Border Color: `border-secondary` (on error)

## 📐 Spacing & Layout

### Spacing Scale
Use Tailwind's default spacing scale:
- `p-4` = 16px
- `p-6` = 24px
- `p-8` = 32px
- `p-12` = 48px
- `p-20` = 80px

### Container Widths
- **Mobile**: Full width with padding (`px-4`)
- **Tablet**: `max-w-4xl mx-auto`
- **Desktop**: `max-w-6xl mx-auto`
- **Large Desktop**: `max-w-7xl mx-auto`

### Section Spacing
- **Section Padding**: `py-20 px-4` (vertical: 80px, horizontal: 16px)
- **Element Spacing**: `mb-8` or `mb-12` for major elements
- **Grid Gaps**: `gap-8` for card grids

### Border Radius
- **Small**: `rounded-lg` (8px) - Buttons, inputs
- **Medium**: `rounded-xl` (12px) - Cards, containers
- **Large**: `rounded-2xl` (16px) - Large containers

## 🎭 Design Principles

### 1. Mobile-First
- Design for mobile first, then scale up
- Use responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Touch-friendly targets (minimum 44x44px)

### 2. Clean & Spacious
- Generous white space
- Clear visual hierarchy
- Content-first approach

### 3. Professional Yet Approachable
- Modern, clean design
- Warm, inviting color palette
- Accessible and inclusive

### 4. Consistency
- Use design tokens consistently
- Reusable component patterns
- Standardized spacing and typography

## ✨ Animations & Interactions

### Animation Library
Use **Framer Motion** for animations (if available) or CSS transitions.

### Standard Animations
- **Hover Scale**: `scale: 1.02` on hover, `scale: 0.98` on tap
- **Fade In**: `opacity: 0` to `opacity: 1` with `y: 20` to `y: 0`
- **Transition Duration**: `200ms` for quick interactions, `600ms` for page transitions

### Scroll Animations
- Elements fade in as they enter viewport
- Use `whileInView` with `viewport={{ once: true }}`
- Stagger animations for lists (delay: `index * 0.1`)

### Transitions
- All interactive elements: `transition-all duration-200`
- Color changes: `transition-colors`
- Transform: `transition-transform`

## ♿ Accessibility

### Focus States
- All interactive elements must have visible focus states
- Use: `focus:outline-2 outline-offset-2 outline-primary`
- Remove default outline: `focus:outline-none`

### Color Contrast
- Text on white: Minimum 4.5:1 ratio
- Primary text (#333333 on white): ✅ Passes
- Paragraph text (#6F6F6F on white): ✅ Passes
- Primary button (#122220 with white text): ✅ Passes

### Semantic HTML
- Use proper heading hierarchy (h1 → h2 → h3)
- Semantic elements: `<nav>`, `<header>`, `<main>`, `<section>`, `<footer>`
- Form labels properly associated with inputs
- ARIA labels for icon-only buttons

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Logical tab order
- Skip links for main content

## 🎯 Admin Panel Specific Guidelines

### Layout Structure
- **Header**: Sticky navigation with logo and user menu
- **Sidebar**: Collapsible navigation (if applicable)
- **Main Content**: White background with cards for content sections
- **Footer**: Minimal, with essential links

### Data Tables
- Use cards or bordered containers
- Alternating row colors: `bg-neutral-light/50` for even rows
- Hover states: `hover:bg-neutral-light`
- Clear typography hierarchy

### Forms (Admin)
- Group related fields in cards
- Use consistent input styling (see Forms section)
- Clear error messaging in `text-secondary`
- Success states in `text-accent` or `text-primary`

### Status Indicators
- **Success**: Use accent color (#485C11) or primary
- **Error**: Use secondary color (#FF3D00)
- **Warning**: Use secondary light (#FF6B33)
- **Info**: Use primary light (#1A2E2C)

### Dashboard Cards
- Use standard card pattern
- Consistent padding and spacing
- Clear data visualization
- Hover effects for interactivity

### Navigation
- Active state: `text-primary` or `bg-primary/10`
- Hover: `hover:bg-neutral-light`
- Icons: Use Lucide React icons (consistent with landing page)

## 📱 Responsive Breakpoints

- **Mobile**: Default (< 640px)
- **Tablet**: `md:` (640px+)
- **Desktop**: `lg:` (1024px+)
- **Large Desktop**: `xl:` (1280px+)

## 🔧 Implementation Notes

### TailwindCSS Configuration
If using TailwindCSS, extend the theme with:

```javascript
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
      accent: {
        DEFAULT: '#485C11',
        dark: '#3A4A0E',
        light: '#5A6E15',
      },
      neutral: {
        light: '#F5F5F5',
        DEFAULT: '#333333',
      },
      text: {
        paragraph: '#6F6F6F',
      },
    },
    fontFamily: {
      heading: ['Crimson Text', 'serif'],
      body: ['DM Sans', 'sans-serif'],
      mono: ['Roboto Mono', 'monospace'],
    },
  },
}
```

### Global Styles
- Body: `bg-white font-body antialiased`
- Headings: `font-heading font-bold text-black`
- Paragraphs: `font-body text-text-paragraph`
- Smooth scrolling: `scroll-behavior: smooth`

## 📋 Checklist for Admin Panel

When implementing the admin panel, ensure:

- [ ] Color palette matches exactly
- [ ] Typography uses correct font families and sizes
- [ ] Buttons follow the three variants (primary, secondary, outline)
- [ ] Cards use standard styling (white, rounded-xl, shadow-lg)
- [ ] Forms use consistent input styling
- [ ] Spacing follows the scale (p-4, p-6, p-8, etc.)
- [ ] Focus states are visible and use primary color
- [ ] Animations are subtle and consistent
- [ ] Mobile-first responsive design
- [ ] Accessibility standards met (WCAG 2.1 AA)

## 🎨 Visual Reference

### Color Swatches
- Primary: Deep forest green - Main brand identity
- Secondary: Vibrant orange - Calls to action
- Accent: Olive green - Secondary highlights
- Neutral: Grays - Text and UI elements

### Typography Hierarchy
1. **H1**: Large, bold, Crimson Text - Hero text
2. **H2**: Medium-large, bold, Crimson Text - Section headers
3. **H3**: Medium, bold, Crimson Text - Subsection headers
4. **Body**: Regular, DM Sans - All body text
5. **Small**: Small, DM Sans - Captions, metadata

---

**Last Updated**: January 2026
**Version**: 1.0
**Maintained By**: LOKI Design Team
