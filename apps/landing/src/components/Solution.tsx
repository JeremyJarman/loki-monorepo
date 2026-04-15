import React from 'react';
import { motion } from 'framer-motion';
import { List, Share2, FileText } from 'lucide-react';

export const Solution: React.FC = () => {
  const features = [
  //  {
  //   icon: Sparkles,
  //   title: 'AI-Powered Search',
  //    description: 'Find venues using natural language ("cozy spots for a first date")',
  //  },
    {
      icon: List,
      title: 'Shareable lists',
      description: 'Save shows to your own lists or build shared lists with friends, so nothing good gets lost in the group chat.',
    },
    {
      icon: Share2,
      title: 'Plan together',
      description: 'Comment on events, coordinate with your crew, and share links without a dozen screenshots.',
    },
    {
      icon: FileText,
      title: 'Artist Profiles',
      description: 'Rich profiles with photo galleries, social media links, plus see what the community is saying about upcoming and past shows.',
    },
  //  {
  //    icon: Eye,
  //    title: 'Persistent Visibility',
  //    description: 'Specials, updates, and events aren’t buried by algorithms. If a venue shares something, it’s visible. 100% of the time',
   // },
   
    
  ];

  return (
    <section id="solution" className="py-20 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="mb-4 font-normal">One place for discovery & planning</h2>
          <p className="text-xl max-w-3xl mx-auto">
            Discovery Artist, DJ's and all thier local performances.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-gradient-to-br from-white to-neutral-light rounded-xl p-6 border border-neutral-light hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="text-primary" size={28} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
