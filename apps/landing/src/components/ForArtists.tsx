import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Mic, BarChart3, Users, Zap, Link2 } from 'lucide-react';

export const ForArtists: React.FC = () => {
  const benefits = [
    {
      icon: TrendingUp,
      title: 'Reach that counts',
      description:
        'Your gigs stay discoverable, fans can search and filter by genre, date, and price without fighting the feed.',
    },
    {
      icon: Mic,
      title: 'Your artist profile',
      description:
        'A real home for your story, links, and upcoming shows, so new listeners know who you are in one glance.',
    },
    {
      icon: BarChart3,
      title: 'Signals from your audience',
      description:
        'See interest, saves, and RSVPs so you know what to expect before you hit the stage.',
    },
    {
      icon: Users,
      title: 'Grow with partners',
      description:
        'Work with venues, promoters, and collaborators with clearer visibility into what drives turnout.',
    },
    {
      icon: Zap,
      title: 'Early access',
      description:
        'Get early access to LOKI and help shape the product, we want artists in the room while we build.',
    },
    {
      icon: Link2,
      title: 'One link in your bio',
      description:
        'Paste your LOKI artist URL on Instagram, Linktree, X, or your site, one place that always reflects your upcoming shows.',
    },
  ];

  return (
    <section id="for-artists" className="py-20 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="mb-4">For Artists</h2>
          <p className="text-xl max-w-3xl mx-auto">
            Reach fans who are actually looking for your music and give them a clear path from discovery to the door.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-8 md:gap-12 items-center mb-16 md:flex-row"
        >
          <div className="flex-1 w-full">
            <img
              src="/eventslist.png?v=2"
              alt="LOKI artist page with shareable link and upcoming events"
              className="w-full rounded-xl border border-neutral-light shadow-sm object-cover"
            />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-2xl md:text-3xl font-normal mb-4">
              All your shows, at one link
            </h3>
            <p className="text-lg text-neutral-600 mb-4">
              Every artist gets a unique, shareable URL that lists your upcoming events. Drop it in your bio,
              on posters, in newsletters, or in the group chat. Fans always see your current dates.
            </p>
            <p className="text-lg text-neutral-600">
              No more rebuilding the same graphic every week: one link follows you everywhere you promote, and it stays
              in sync as you add or change gigs.
            </p>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.05 }}
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
