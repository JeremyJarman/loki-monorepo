import React from 'react';
import { motion } from 'framer-motion';
import { MailchimpForm } from './common/MailchimpForm';
import { COMPANY_INFO } from '../utils/constants';

export const WaitlistSignup: React.FC = () => {
  const handleBackToHome = () => {
    window.location.hash = '';
    window.location.pathname = '/';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white py-20 px-4">
      <div className="container mx-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="flex justify-center">
            <a href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt={COMPANY_INFO.name} className="h-10 w-auto" />
              <span className="text-2xl font-heading font-bold text-neutral">{COMPANY_INFO.name}</span>
            </a>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-heading font-normal text-primary mb-2">
              Join the Waitlist
            </h1>
            <p className="text-text-paragraph">
              Be the first to know when LOKI launches.
            </p>
          </div>

          <MailchimpForm
            buttonText="Join Waitlist"
            placeholder="Enter your email"
            showTermsLinks={false}
            stacked
          />

          <div className="space-y-4 text-sm text-text-paragraph border-t border-neutral-light pt-6">
            <p>
              By signing up, you agree to our{' '}
              <a href="/#privacy-policy" className="text-primary underline hover:opacity-80">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/#terms-of-service" className="text-primary underline hover:opacity-80">
                Terms of Service
              </a>
              .
            </p>
            <p className="text-xs">
              We respect your inbox. No spam — only launch updates and occasional news. Unsubscribe anytime.
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={handleBackToHome}
              className="text-primary font-medium hover:underline"
            >
              ← Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
