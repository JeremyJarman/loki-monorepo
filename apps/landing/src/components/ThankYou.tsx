import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './common/Button';
import { COMPANY_INFO } from '../utils/constants';

export const ThankYou: React.FC = () => {
  const handleBackToHome = () => {
    window.location.hash = '';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white py-20 px-4">
      <div className="container mx-auto max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div className="flex justify-center mb-6">
            <a href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt={COMPANY_INFO.name} className="h-10 w-auto" />
              <span className="text-2xl font-heading font-bold text-neutral">{COMPANY_INFO.name}</span>
            </a>
          </div>

          <h1 className="font-normal text-4xl sm:text-5xl md:text-6xl text-primary">
            Thank You!
          </h1>

          <p className="text-xl text-text-paragraph max-w-lg mx-auto">
            You're on the list. We'll notify you when LOKI launches so you can start discovering what's happening around you.
          </p>

          <div className="pt-6">
            <Button variant="primary" size="lg" onClick={handleBackToHome}>
              Back to Home
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
