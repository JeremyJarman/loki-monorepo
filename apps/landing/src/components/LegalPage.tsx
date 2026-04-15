import React from 'react';
import { motion } from 'framer-motion';
import { marked } from 'marked';
import { COMPANY_INFO } from '../utils/constants';

interface LegalPageProps {
  title: string;
  content: string;
}

export const LegalPage: React.FC<LegalPageProps> = ({ content }) => {
  const handleBackToHome = () => {
    window.location.hash = '';
    window.location.pathname = '/';
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-light">
        <div className="container mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt={COMPANY_INFO.name} className="h-8 w-auto" />
            <span className="text-xl font-heading font-bold text-neutral">{COMPANY_INFO.name}</span>
          </a>
          <button
            onClick={handleBackToHome}
            className="text-primary font-medium hover:underline"
          >
            Back to Home
          </button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12">
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="[&_h1]:text-3xl [&_h1]:font-heading [&_h1]:text-primary [&_h1]:mb-6 [&_h2]:text-2xl [&_h2]:font-heading [&_h2]:text-primary [&_h2]:mt-8 [&_h2]:mb-4 [&_p]:text-text-paragraph [&_p]:mb-4 [&_a]:text-primary [&_a]:underline [&_a:hover]:opacity-80 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_li]:text-text-paragraph [&_li]:mb-1"
          dangerouslySetInnerHTML={{ __html: marked(content) }}
        />
      </main>
    </div>
  );
};
