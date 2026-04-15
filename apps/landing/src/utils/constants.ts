export const APP_STORE_LINK = 'https://apps.apple.com/app/loki'; // Update with actual link
export const GOOGLE_PLAY_LINK = 'https://play.google.com/store/apps/details?id=com.loki'; // Update with actual link

export const SOCIAL_LINKS = {
  instagram: 'https://instagram.com/lokiguides',
  twitter: 'https://twitter.com/loki',
  linkedin: 'https://linkedin.com/company/loki',
};

export const COMPANY_INFO = {
  name: 'LOKI',
  tagline: 'For artists — and those that love them',
  email: 'support@loki-app.com',
};

/** Mailchimp signup form - from Audience → Signup forms → Embedded forms. Set in .env.local */
export const MAILCHIMP = {
  formAction: import.meta.env.VITE_MAILCHIMP_FORM_ACTION ?? '',
  /** Honeypot field name - required to prevent bot signups */
  hiddenFieldName: import.meta.env.VITE_MAILCHIMP_HIDDEN_FIELD ?? '',
  /** Merge field tags - get from Mailchimp form source (View Page Source on your signup form URL). Default: FNAME, LNAME, CREATOR */
  mergeFields: {
    firstName: import.meta.env.VITE_MAILCHIMP_FNAME ?? 'FNAME',
    lastName: import.meta.env.VITE_MAILCHIMP_LNAME ?? 'LNAME',
    creator: import.meta.env.VITE_MAILCHIMP_CREATOR ?? 'CREATOR',
  },
};
