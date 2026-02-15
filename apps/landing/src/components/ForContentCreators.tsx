import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Link2 } from 'lucide-react';

export const ForContentCreators: React.FC = () => {
  const cards = [
    {
      icon: Zap,
      title: 'Early Access',
      description: 'Get early access to LOKI and help shape the platform. Be among the first creators to share your favorite spots with your audience.',
    },
    {
      icon: Link2,
      title: 'Link to Your Content',
      description: 'Connect your lists and recommendations to your content. Your audience can discover venues directly from your reviews and guides.',
    },
  ];

  return (
    <section id="for-creators" className="py-20 px-4 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="mb-4">For Content Creators: Early Access</h2>
          <p className="text-xl max-w-3xl mx-auto">
            We know you enjoy helping people discover great places and we'd love to make Loki a platform that helps you do that.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {cards.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 border border-primary/10 hover:border-primary/30 hover:shadow-lg transition-all h-full"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <item.icon className="text-primary" size={28} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p>{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
