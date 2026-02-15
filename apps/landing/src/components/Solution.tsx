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
      title: 'Shareable Lists',
      description: 'Save specials to your own lists, or collaborate on shared lists with friends and family',
    },
    {
      icon: Share2,
      title: 'Social Interactions',
      description: 'List collaborators can add specials, react to them and add comments, all in one place, making planning easier',
    },
    {
      icon: FileText,
      title: 'Rich Venue Profiles',
      description: 'Smart summaries covering public opinion, digital menus, upcoming events, specials and more',
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
          <h2 className="mb-4 font-normal">One Platform for Discovery & Social Planning</h2>
          <p className="text-xl max-w-3xl mx-auto">
            LOKI brings everything together in one place.
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
