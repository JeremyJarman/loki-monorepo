import React from 'react';
import { motion } from 'framer-motion';
import { MailchimpForm } from './common/MailchimpForm';
import { COMPANY_INFO } from '../utils/constants';

export const CTA: React.FC = () => {
  return (
    <section id="cta" className="py-20 px-4 bg-gradient-to-br from-primary to-secondary text-white">
      <div className="container mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <h2 className="text-white mb-4">Ready to Discover What's Happening Around You?</h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-2">
            We are launching soon, contact us to be part of the beta testing program.
          </p>
          <a 
            href={`mailto:${COMPANY_INFO.email}`}
            className="text-xl text-white/90 hover:text-white underline transition-colors"
          >
            {COMPANY_INFO.email}
          </a>

          {/* Download Buttons - Commented out for now */}
          {/* <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => window.open(APP_STORE_LINK, '_blank')}
              className="bg-white text-primary hover:bg-neutral-light flex items-center gap-2"
            >
              <Smartphone size={20} />
              Download for iOS
              <ArrowRight size={20} />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.open(GOOGLE_PLAY_LINK, '_blank')}
              className="border-2 border-white text-white hover:bg-white/10 flex items-center gap-2"
            >
              <Smartphone size={20} />
              Download for Android
              <ArrowRight size={20} />
            </Button>
          </div> */}

          <div className="pt-8 border-t border-white/20">
            <p className="text-white/80 mb-4">Or join our waitlist for early access:</p>
            <div className="flex justify-center">
              <MailchimpForm buttonText="Join Waitlist" variant="light" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
