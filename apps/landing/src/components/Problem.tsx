import React from 'react';
import { motion } from 'framer-motion';
import { Instagram, MapPin, Users } from 'lucide-react';

export const Problem: React.FC = () => {
  const problems = [
    {
      icon: Instagram,
      title: 'Algorithm Burying',
      description: 'Social algorithms decide what shows up. Even when you follow an artist or venue, there’s only a small chance you’ll see gig posts when it matters.',
    },
    {
      icon: MapPin,
      title: 'Fragmented Information',
      description: 'The details you need to make a decision are scattered. Finding the right place means jumping between apps, tabs, and screenshots.',
    },
    {
      icon: Users,
      title: 'No Central Hub',
      description: 'There is no centralized place to discover AND share plans with friends, it’s often just group chats, screenshots and links.',
    },
  ];

  return (
    <section id="problem" className="py-20 px-4 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="mb-4 font-normal">The 'What Now?' Dilemma</h2>
          <p className="text-xl max-w-3xl mx-auto">
            Every night, great events are happening around you, but they're either buried in feeds or scattered across different sites.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <problem.icon className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{problem.title}</h3>
              <p>{problem.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
