import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Problem } from './components/Problem';
import { Solution } from './components/Solution';
import { HowItWorks } from './components/HowItWorks';
import { ForArtists } from './components/ForArtists';
import { CTA } from './components/CTA';
import { Footer } from './components/Footer';
import { ThankYou } from './components/ThankYou';
import { WaitlistSignup } from './components/WaitlistSignup';
import { LegalPage } from './components/LegalPage';
import { privacyPolicyContent } from './content/privacyPolicy';
import { termsOfServiceContent } from './content/termsOfService';

function App() {
  const [hashView, setHashView] = useState<string | null>(null);

  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'thank-you') setHashView('thank-you');
      else if (hash === 'join-waitlist') setHashView('join-waitlist');
      else if (hash === 'privacy-policy') setHashView('privacy-policy');
      else if (hash === 'terms-of-service') setHashView('terms-of-service');
      else setHashView(null);
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  if (hashView === 'thank-you') return <ThankYou />;
  if (hashView === 'join-waitlist') return <WaitlistSignup />;
  if (hashView === 'privacy-policy') return <LegalPage title="Privacy Policy" content={privacyPolicyContent} />;
  if (hashView === 'terms-of-service') return <LegalPage title="Terms of Service" content={termsOfServiceContent} />;

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <HowItWorks />
        <ForArtists />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export default App;
