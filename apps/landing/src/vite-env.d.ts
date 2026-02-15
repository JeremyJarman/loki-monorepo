/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAILCHIMP_FORM_ACTION: string;
  readonly VITE_MAILCHIMP_HIDDEN_FIELD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
