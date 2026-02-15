import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Menu, BarChart3, Users } from 'lucide-react';

export const BusinessValue: React.FC = () => {
  const benefits = [
    {
      icon: TrendingUp,
      title: 'Reach that counts',
      description: 'Your promotions are always visible, and our search engine ensures people find them',
    },
    {
      icon: Menu,
      title: 'Digital Menu Hosting',
      description: 'Integrated digital menu hosting, with QR codes and URL for you to use anywhere',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Real-time analytics on customer intent, so you can see what’s working and what’s not',
    },
    {
      icon: Users,
      title: 'Influencer Collaboration',
      description: 'Influencer collaboration tracking, so you can see your partnerships and their impact',
    },
  ];

  return (
    <section id="business-value" className="py-20 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="mb-4">For Venues: Visibility That Matters</h2>
          <p className="text-xl max-w-3xl mx-auto">
            LOKI helps venues reach their audience directly, without algorithms getting in the way.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-6 border border-primary/10 hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <benefit.icon className="text-primary" size={28} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
              <p>{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
