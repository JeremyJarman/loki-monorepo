import React from 'react';
import { Button } from './Button';
import { MAILCHIMP } from '../../utils/constants';

interface MailchimpFormProps {
  buttonText?: string;
  placeholder?: string;
  /** Use "light" for forms on dark backgrounds (e.g. CTA section) */
  variant?: 'default' | 'light';
}

/**
 * Form that POSTs directly to Mailchimp. Submits cause a redirect to Mailchimp's
 * thank-you page (or your custom redirect URL set in Mailchimp form settings).
 */
export const MailchimpForm: React.FC<MailchimpFormProps> = ({
  buttonText = 'Join Waitlist',
  placeholder = 'Enter your email',
  variant = 'default',
}) => {
  const inputClasses =
    variant === 'light'
      ? 'w-full px-4 py-3 rounded-lg border-2 border-white/30 bg-white/10 text-white placeholder-white/60 focus:border-white focus:outline-none'
      : 'w-full px-4 py-3 rounded-lg border-2 border-neutral-light focus:border-primary focus:outline-none transition-colors';

  const buttonVariant = variant === 'light' ? 'outline' : 'primary';
  const buttonClassName =
    variant === 'light'
      ? 'border-2 border-white text-white hover:bg-white hover:text-primary'
      : '';

  return (
    <form
      action={MAILCHIMP.formAction}
      method="post"
      target="_self"
      className="flex flex-col sm:flex-row gap-3 max-w-md"
      noValidate
    >
      <div className="flex-1">
        <input
          type="email"
          name="EMAIL"
          placeholder={placeholder}
          required
          aria-label="Email address"
          className={inputClasses}
        />
      </div>
      {/* Honeypot - Mailchimp requires this to prevent bot signups */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-5000px' }}>
        <input
          type="text"
          name={MAILCHIMP.hiddenFieldName}
          tabIndex={-1}
          autoComplete="off"
          readOnly
          defaultValue=""
        />
      </div>
      <Button
        type="submit"
        variant={buttonVariant}
        className={`whitespace-nowrap ${buttonClassName}`}
      >
        {buttonText}
      </Button>
    </form>
  );
};
