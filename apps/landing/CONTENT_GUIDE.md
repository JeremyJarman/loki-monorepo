# Legal Pages (Privacy Policy & Terms of Service)

The landing page has **landing-specific** Privacy Policy and Terms of Service in:
- `src/content/privacyPolicy.ts`
- `src/content/termsOfService.ts`

These cover only the waitlist signup (email, optional name, Mailchimp). The full LOKI app has separate, more comprehensive policies.

## Customizing

Edit the content strings in those files. Use Markdown:
- `#` for main heading, `##` for section headings
- `**text**` for bold
- `[link text](url)` for links

Update the "Last updated" date when you make changes.

## Mailchimp setup

1. **First Name & Last Name**: Mailchimp includes FNAME and LNAME by default. If not, add them under Audience → Settings → Audience fields and merge tags.

2. **Content Creator tag**: To segment content creators in Mailchimp:
   - Audience → Settings → Audience fields and *|MERGE|* tags → Add a field
   - **Name:** Content Creator (or similar)
   - **Tag:** `CREATOR` (must match exactly)
   - **Type:** Text
   - Save. Subscribers who check "I'm a content creator" will have CREATOR = "Content creator". You can then create segments or automations based on this field.

### If names or creator tag still don't save

Mailchimp ignores fields that don't exist in your audience or use the wrong merge tag. To fix:

1. **Confirm fields exist in Mailchimp**
   - Audience → Settings → Audience fields and merge tags
   - Ensure First Name (FNAME), Last Name (LNAME), and Content Creator (CREATOR) exist. Add any that are missing.

2. **Get exact field names from your Mailchimp form**
   - Mailchimp → Audience → Signup forms → Embedded forms
   - Copy the "Share form" URL and open it in a browser
   - Right-click → View Page Source
   - Search for `name="` near the first name, last name, and any checkbox inputs
   - Some audiences use `MERGE1`, `MERGE2` instead of `FNAME`, `LNAME`

3. **Override in .env.local** (if your audience uses different tags)
   ```
   VITE_MAILCHIMP_FNAME=MERGE1
   VITE_MAILCHIMP_LNAME=MERGE2
   VITE_MAILCHIMP_CREATOR=MERGE3
   ```
   Rebuild and redeploy after changing env vars.
