/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAILCHIMP_FORM_ACTION: string;
  readonly VITE_MAILCHIMP_HIDDEN_FIELD: string;
  readonly VITE_MAILCHIMP_FNAME?: string;
  readonly VITE_MAILCHIMP_LNAME?: string;
  readonly VITE_MAILCHIMP_CREATOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
