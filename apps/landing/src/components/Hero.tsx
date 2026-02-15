import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './common/Button';
import { MailchimpForm } from './common/MailchimpForm';
// import { APP_STORE_LINK } from '../utils/constants';
// import { Smartphone, ArrowRight } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section id="home" className="min-h-screen flex flex-col items-center justify-center bg-white py-20 px-4">
      <div className="container mx-auto max-w-4xl flex flex-col items-center">
        {/* Centered Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 w-full"
        >
          <h1 className="font-normal text-center text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-tight whitespace-nowrap">
            Experience Sharing.
          </h1>
          
          <p className="text-xl leading-relaxed max-w-2xl mx-auto mt-6 mb-12">
            Plan together, decide together, experience together.
          </p>
        </motion.div>

        {/* Call to Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          {/* <Button
            variant="primary"
            size="lg"
            onClick={() => window.open(APP_STORE_LINK, '_blank')}
            className="flex items-center justify-center gap-2"
          >
            <Smartphone size={20} />
            Download App
            <ArrowRight size={20} />
          </Button> */}
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              const howItWorksSection = document.getElementById('how-it-works');
              howItWorksSection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Learn More
          </Button>
        </motion.div>

        {/* Email Waitlist Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <p className="text-sm mb-3 text-center">Or join our waitlist for early access:</p>
          <MailchimpForm />
        </motion.div>
      </div>
    </section>
  );
};
