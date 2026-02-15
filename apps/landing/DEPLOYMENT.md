# Hostinger Deployment Guide

## Mailchimp Waitlist

The site uses Mailchimp for waitlist signups. Forms POST directly to your Mailchimp signup URL.

**Setup:** Copy `.env.example` to `.env.local` and fill in your Mailchimp values (from Audience → Signup forms → Embedded forms). These are baked into the build at build time.

```bash
cp .env.example .env.local
# Edit .env.local with your form action URL and honeypot field name
```

**Hostinger:** Build locally with `.env.local` set, then upload the `dist` folder. Env vars are injected at build time.

**Custom thank-you page:** In Mailchimp, go to Form builder → Confirmation thank you page → set "Instead of showing this thank you page, send subscribers to another URL" to your desired URL (e.g. `https://yoursite.com/#thank-you`).

---

## Step 1: Build the Project

First, build the project for production:

```bash
npm run build
```

This creates a `dist` folder with all the optimized files ready for deployment.

## Step 2: What to Upload

Upload **ALL contents** of the `dist` folder to Hostinger.

### Files/Folders in `dist`:
- `index.html` - Main HTML file
- `assets/` - Folder containing:
  - JavaScript files (`.js`)
  - CSS files (`.css`)
  - Other bundled assets
- `favicon.png` - Site favicon
- `logo.png` - LOKI logo
- `robots.txt` - SEO robots file

## Step 3: Upload to Hostinger

### Option A: Using File Manager (cPanel)

1. Log into your Hostinger control panel
2. Go to **File Manager**
3. Navigate to your domain's root folder (usually `public_html` or `www`)
4. **Delete any existing files** in the root folder (or backup first)
5. Upload **all files and folders** from the `dist` folder
6. Make sure `index.html` is in the root directory

### Option B: Using FTP

1. Use an FTP client (FileZilla, WinSCP, etc.)
2. Connect to your Hostinger FTP server
3. Navigate to `public_html` (or your domain root)
4. Upload **all contents** of the `dist` folder
5. Ensure `index.html` is in the root

## Step 4: Verify

1. Visit your domain in a browser
2. Check that the site loads correctly
3. Test navigation and forms
4. Check browser console for any errors

## Important Notes

- ✅ Upload the **contents** of `dist`, not the `dist` folder itself
- ✅ `index.html` must be in the root directory
- ✅ Keep the `assets` folder structure intact
- ✅ Don't upload the `src` folder or `node_modules`
- ✅ Don't upload `package.json` or other config files

## Troubleshooting

### Site shows blank page
- Check that `index.html` is in the root directory
- Verify all files uploaded correctly
- Check browser console for errors

### Images not loading
- Ensure `favicon.png` and `logo.png` are in the root
- Check file paths in browser console

### Styles not working
- Verify the `assets` folder uploaded correctly
- Check that CSS files are in the `assets` folder

## Updating the Site

When you make changes:

1. Make your changes to the code
2. Run `npm run build` again
3. Upload the new `dist` folder contents (overwrite existing files)
4. Clear browser cache if needed

---

**Quick Checklist:**
- [ ] Run `npm run build`
- [ ] Open the `dist` folder
- [ ] Upload all contents to Hostinger `public_html`
- [ ] Verify `index.html` is in root
- [ ] Test the site in browser
