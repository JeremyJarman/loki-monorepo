import React from 'react';
import { motion } from 'framer-motion';
import { Search, MessageCircle, Bookmark, UserPlus, ArrowRight } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      icon: Search,
      title: 'Browse events',
      description: 'Browse events by genre, date, and cost. Filter until you find the right night out.',
    },
    {
      number: '02',
      icon: MessageCircle,
      title: 'Dig deeper',
      description:
        'Check artist profiles and see what others are saying about the event before you buy a ticket or head out.',
    },
    {
      number: '03',
      icon: Bookmark,
      title: 'Save or RSVP',
      description: 'Save it to a list for later, or let the artist know you’ll be coming.',
    },
    {
      number: '04',
      icon: UserPlus,
      title: 'Share with friends',
      description: 'Tag friends or send them the event link so everyone’s on the same page.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="mb-4 font-normal">How It Works</h2>
          <p className="text-xl max-w-3xl mx-auto">
            LOKI is built for live music — from discovery to the door. Here’s how to get started.
          </p>
        </motion.div>

        {[
          {
            title: 'Browse upcomming shows',
            description:
              'Explore by genre, date, and cost. Less scrolling through feeds, more time finding the gigs you actually want.',
            image: '/eventcards.png',
            imageFirst: true,
          },
          {
            title: 'Engage with the artist and the community',
            description:
              'Open artist profiles, read the event details, and see what others are saying or let the artist know you’ll will be coming.',
            image: '/Comments.png',
            imageFirst: false,
          },
        ].map((block, index) => (
          <motion.div
            key={block.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className={`flex flex-col gap-8 md:gap-12 items-center mb-16 ${
              block.imageFirst ? 'md:flex-row' : 'md:flex-row-reverse'
            }`}
          >
            <div className="flex-1 w-full">
              <img
                src={block.image}
                alt=""
                className="w-full rounded-xl border border-neutral-light shadow-sm object-cover"
              />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <h3 className="text-2xl md:text-3xl font-normal mb-4">{block.title}</h3>
              <p className="text-lg text-neutral-600">{block.description}</p>
            </div>
          </motion.div>
        ))}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative"
            >
              <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                    <step.icon className="text-primary" size={32} />
                  </div>
                  <span className="text-4xl font-heading font-bold text-primary/20">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p>{step.description}</p>
              </div>

              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="text-primary/30" size={24} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
