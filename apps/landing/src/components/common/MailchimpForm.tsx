import React from 'react';
import { Button } from './Button';
import { MAILCHIMP } from '../../utils/constants';

interface MailchimpFormProps {
  buttonText?: string;
  placeholder?: string;
  /** Use "light" for forms on dark backgrounds (e.g. CTA section) */
  variant?: 'default' | 'light';
  /** Show terms/privacy links below the form */
  showTermsLinks?: boolean;
  /** Stack all fields vertically (for dedicated signup page) */
  stacked?: boolean;
}

/**
 * Form that POSTs directly to Mailchimp. Submits cause a redirect to Mailchimp's
 * thank-you page (or your custom redirect URL set in Mailchimp form settings).
 */
export const MailchimpForm: React.FC<MailchimpFormProps> = ({
  buttonText = 'Join Waitlist',
  placeholder = 'Enter your email',
  variant = 'default',
  showTermsLinks = true,
  stacked = false,
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
      className="flex flex-col gap-3 max-w-md"
      noValidate
    >
      <input
        type="text"
        name={MAILCHIMP.mergeFields.firstName}
        placeholder="First name (optional)"
        aria-label="First name"
        className={inputClasses}
      />
      <input
        type="text"
        name={MAILCHIMP.mergeFields.lastName}
        placeholder="Surname (optional)"
        aria-label="Surname"
        className={inputClasses}
      />
      <div className={stacked ? 'flex flex-col gap-3' : 'flex flex-col sm:flex-row gap-3'}>
        <div className={stacked ? 'w-full' : 'flex-1'}>
          <input
            type="email"
            name="EMAIL"
            placeholder={placeholder}
            required
            aria-label="Email address"
            className={inputClasses}
          />
        </div>
        <Button
          type="submit"
          variant={buttonVariant}
          className={`whitespace-nowrap w-full sm:w-auto ${buttonClassName}`}
        >
          {buttonText}
        </Button>
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          name={MAILCHIMP.mergeFields.creator}
          value="Artist or creator"
          className="w-4 h-4 mt-0.5 rounded border-neutral-light text-primary focus:ring-primary flex-shrink-0"
        />
        <span className={`text-sm ${variant === 'light' ? 'text-white/90' : 'text-text-paragraph'}`}>
          I’m an artist or creator — help shape LOKI with early access and feature input
        </span>
      </label>
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
      {showTermsLinks && (
        <p className={`text-sm ${variant === 'light' ? 'text-white/70' : 'text-text-paragraph'}`}>
          By signing up, you agree to our{' '}
          <a href="/#privacy-policy" className="underline hover:opacity-80">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="/#terms-of-service" className="underline hover:opacity-80">
            Terms of Service
          </a>
          .
        </p>
      )}
    </form>
  );
};
