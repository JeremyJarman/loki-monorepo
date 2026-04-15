import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './common/Button';

export const Hero: React.FC = () => {
  return (
    <section id="home" className="min-h-screen flex flex-col items-center justify-center bg-white py-20 px-4">
      <div className="container mx-auto max-w-4xl flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 w-full"
        >
          <h1 className="font-normal text-center text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl leading-tight">
            For Artists
          </h1>

          <p className="text-xl sm:text-2xl leading-relaxed max-w-2xl mx-auto mt-6 mb-12 text-neutral-600">
            ... and those that love them
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col items-center gap-4"
        >
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
          <p className="text-text-paragraph text-sm">Or join our waitlist for early access:</p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => { window.location.hash = 'join-waitlist'; }}
          >
            Join Waitlist
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
