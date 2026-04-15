import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './common/Button';
import { COMPANY_INFO } from '../utils/constants';

export const CTA: React.FC = () => {
  return (
    <section id="cta" className="py-20 px-4 bg-gradient-to-br from-primary to-magenta/90 text-white">
      <div className="container mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <h2 className="text-white mb-4">Ready to join?</h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-2">
            We’re launching soon. Join the waitlist for early access and help shape LOKI for artists and fans.
          </p>
          <Button
            variant="outline"
            size="lg"
            onClick={() => { window.location.hash = 'join-waitlist'; }}
            className="!bg-white !text-primary hover:!bg-neutral-light border-white"
          >
            Join Waitlist
          </Button>
          <p className="text-white/80">
            Or contact us directly:{' '}
            <a
              href={`mailto:${COMPANY_INFO.email}`}
              className="underline hover:text-white"
            >
              {COMPANY_INFO.email}
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};
