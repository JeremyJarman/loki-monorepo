import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Problem } from './components/Problem';
import { Solution } from './components/Solution';
import { HowItWorks } from './components/HowItWorks';
import { BusinessValue } from './components/BusinessValue';
import { ForContentCreators } from './components/ForContentCreators';
import { CTA } from './components/CTA';
import { Footer } from './components/Footer';

function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <HowItWorks />
        <BusinessValue />
        <ForContentCreators />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export default App;
