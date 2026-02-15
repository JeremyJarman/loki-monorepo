LOKI Landing Page - Cursor Development Prompt

Project Overview

You are building a professional, modern landing page for LOKI, a mobile-first experience sharing platform that helps users discover and share local venues, events, and specials in their area. The landing page should communicate LOKI's core value proposition, differentiation, and call-to-action to potential users and investors.

Project Name: LOKI Landing Page
Tech Stack: React + TypeScript + TailwindCSS + Vite
Target Audience: Young professionals (25-40), social diners, local venue enthusiasts, and investors
Primary Goal: Drive app downloads and investor interest
Secondary Goals: Build email list for early access, establish brand credibility




Core Brand Positioning

LOKI is the world's first Experience Sharing network. Just as Instagram is for images and Spotify is for music, LOKI is for where you're going next. The platform answers the question: "What's happening around me tonight?" and enables users to discover venues, share plans with friends, and make social decisions together.

Key Differentiators:

•
Mobile-first social discovery (not a directory or booking platform)

•
Real-time visibility for venues (no algorithm burying posts)

•
AI-powered natural language search ("Find cozy jazz bars with outdoor seating")

•
User-curated lists and influencer partnerships

•
Built for social planning with friends




Landing Page Structure & Content

1. Hero Section

Purpose: Immediate impact and value proposition clarity.

Content:

•
Headline: "Discover what's happening tonight" or "Experience Sharing Starts Here"

•
Subheadline: "Find local venues, events, and specials. Share with friends. Make plans together."

•
CTA Buttons:

•
Primary: "Download App" (links to App Store / Google Play)

•
Secondary: "Join Waitlist" (email capture)



•
Visual: High-quality hero image showing friends dining/socializing, or a phone mockup of the app interface

•
Background: Modern, clean, possibly with subtle gradient or video background

2. Problem Section

Purpose: Establish relatability and urgency.

Content:

•
Headline: "The 'What Now?' Dilemma"

•
Problem Statement: "Every night, amazing events and specials are happening around you. But they're buried in feeds, scattered across websites, and impossible to find."

•
Supporting Points:

•
Instagram only shows 5-15% of business posts to followers

•
Venue specials are fragmented across multiple platforms

•
No centralized place to discover AND share plans with friends



•
Visual: Illustration or screenshot showing fragmented platforms (Instagram, Google Maps, etc.)

3. Solution Section

Purpose: Introduce LOKI as the answer.

Content:

•
Headline: "One Platform for Discovery & Social Planning"

•
Key Features (with icons):

1.
AI-Powered Search - Find venues using natural language ("cozy spots for a first date")

2.
Curated Lists - Users and influencers create shareable lists of favorite venues

3.
Real-Time Visibility - Venues get 100% reach for their specials and events

4.
Social Sharing - Share lists with friends via WhatsApp, Instagram, email

5.
Rich Venue Profiles - AI-generated summaries, satisfaction scores, public opinion



•
Visual: Feature cards with icons, or an interactive carousel showing app screenshots

4. How It Works Section

Purpose: Demonstrate the user journey.

Content:

•
Step 1: "Search or Browse" - Find venues by vibe, location, or category

•
Step 2: "Discover Details" - View AI-generated summaries, menus, events, and public opinion

•
Step 3: "Create Lists" - Curate your favorite spots into shareable lists

•
Step 4: "Share with Friends" - Send lists to friends and make plans together

•
Visual: Numbered steps with illustrations or app screenshots showing each stage

5. Business Value Section (Optional - for B2B/Investor Focus)

Purpose: Show why venues should use LOKI.

Content:

•
Headline: "For Venues: Visibility That Matters"

•
Key Benefits:

•
100% reach for specials and events (no algorithm)

•
Integrated digital menu hosting (replaces expensive services)

•
Real-time analytics on customer intent

•
Influencer collaboration tracking



•
Visual: Dashboard mockup or benefit icons

6. Testimonials / Social Proof Section (Optional)

Purpose: Build credibility.

Content:

•
User testimonials (if available from beta testing)

•
Venue testimonials (if available from pilots)

•
Press mentions or awards (if applicable)

•
User metrics (e.g., "10,000+ venues discovered", "50,000+ users")

7. Call-to-Action Section

Purpose: Drive conversions.

Content:

•
Primary CTA: "Download LOKI Today" (App Store / Google Play links)

•
Secondary CTA: "Join Our Waitlist" (email capture form)

•
Tertiary CTA: "Learn More" (link to blog or detailed features page)

•
Social Links: Instagram, Twitter, LinkedIn

8. Footer

Content:

•
Company info and links

•
Privacy policy, Terms of Service

•
Contact information

•
Social media links

•
Newsletter signup (optional)




Design Requirements

Visual Style

•
Aesthetic: Modern, clean, minimalist with bold accent colors

•
Color Palette:

•
Primary: Electric Blue (#3D5AFE) or a vibrant accent color that feels energetic

•
Secondary: Deep Orange (#FF3D00) or complementary accent

•
Neutral: White (#FFFFFF), Light Gray (#F5F5F5), Dark Gray (#333333)

•
Text: Dark Gray or Black for readability



•
Typography:

•
Headings: Bold, modern sans-serif (e.g., Montserrat, Inter, Poppins)

•
Body: Clean sans-serif (e.g., Inter, Open Sans, Roboto)

•
Font sizes: Responsive (larger on desktop, optimized for mobile)



Layout & Responsiveness

•
Mobile-First Design: Optimize for mobile devices first, then scale up

•
Responsive Breakpoints: Mobile (320px), Tablet (768px), Desktop (1024px+)

•
Spacing: Generous whitespace, clear visual hierarchy

•
Navigation: Sticky header with mobile hamburger menu

•
Sections: Full-width sections with padding, clear section breaks

Interactive Elements

•
Hover Effects: Subtle transitions on buttons and links (no jarring animations)

•
CTA Buttons: Large, prominent, with hover/active states

•
Forms: Clean, minimal form design with clear labels and validation

•
Smooth Scrolling: Smooth page transitions and scroll behavior

•
Loading States: Skeleton screens or spinners for async operations (if applicable)

Accessibility

•
WCAG 2.1 AA Compliance: Ensure sufficient color contrast, keyboard navigation, screen reader support

•
Alt Text: All images must have descriptive alt text

•
Semantic HTML: Use proper heading hierarchy, semantic tags

•
Focus States: Clear focus indicators for keyboard navigation




Technical Specifications

Tech Stack

•
Framework: React 18+ with TypeScript

•
Styling: TailwindCSS for utility-first styling

•
Build Tool: Vite for fast development and optimized builds

•
Icons: Lucide React or Heroicons for consistent iconography

•
Forms: React Hook Form for form management

•
Animations: Framer Motion for smooth, performant animations (optional, use sparingly)

•
Email Capture: Integrate with Mailchimp, ConvertKit, or similar for waitlist signup

Performance Requirements

•
Lighthouse Score: Aim for 90+ on all metrics (Performance, Accessibility, Best Practices, SEO)

•
Page Load Time: < 3 seconds on 4G

•
Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

•
Image Optimization: Use WebP format, lazy loading, responsive images

•
Code Splitting: Lazy load non-critical sections

SEO Requirements

•
Meta Tags: Proper title, description, and Open Graph tags

•
Structured Data: Schema.org markup for organization/app

•
Sitemap & Robots.txt: Include for search engine crawling

•
Mobile-Friendly: Ensure mobile responsiveness for Google Mobile-Friendly Test

File Structure

Plain Text


src/
├── components/
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── Problem.tsx
│   ├── Solution.tsx
│   ├── HowItWorks.tsx
│   ├── BusinessValue.tsx (optional)
│   ├── Testimonials.tsx (optional)
│   ├── CTA.tsx
│   ├── Footer.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Form.tsx
│       └── ...
├── pages/
│   ├── Home.tsx
│   └── ...
├── styles/
│   ├── globals.css
│   └── tailwind.config.js
├── utils/
│   ├── constants.ts
│   └── ...
├── App.tsx
└── main.tsx






Content Guidelines

Tone & Voice

•
Professional yet Approachable: Use conversational language, avoid corporate jargon

•
Benefit-Focused: Always explain the "why" behind features, not just the "what"

•
Action-Oriented: Use strong verbs and clear CTAs

•
Inclusive: Speak to both users and venue owners

Copywriting Tips

•
Keep headlines short and punchy (5-10 words)

•
Use active voice and present tense

•
Emphasize user benefits over technical features

•
Include social proof and credibility signals

•
Use numbers and data where available (e.g., "100+ venues", "50,000+ users")

Imagery & Media

•
Use high-quality, authentic images of real venues and social dining

•
Include app screenshots or mockups to show the product

•
Consider video: A 15-30 second explainer video in the hero section can significantly boost engagement

•
Ensure all images are optimized for web (compressed, responsive)




Conversion Optimization

Email Capture Form

•
Placement: Hero section and footer (at minimum)

•
Fields: Email only (minimize friction)

•
CTA Text: "Join Waitlist", "Get Early Access", "Notify Me"

•
Post-Submission: Thank you message, confirmation email

App Download Links

•
iOS: Link to Apple App Store

•
Android: Link to Google Play Store

•
Fallback: If app not yet live, link to waitlist signup

Analytics & Tracking

•
Google Analytics 4: Track page views, button clicks, form submissions

•
Conversion Tracking: Set up goals for email signups and app downloads

•
Heatmaps: Use Hotjar or similar to understand user behavior




Additional Features (Optional)

Blog Section

•
Link to blog posts about local dining, venue discovery, or LOKI features

•
SEO benefit: Long-tail keyword targeting

FAQ Section

•
Address common questions about the app, features, and business model

•
Improve SEO and reduce support inquiries

Pricing Page (if applicable)

•
If LOKI has a freemium or premium model, include pricing details

Contact Page

•
Simple contact form for inquiries, partnerships, or feedback




Deployment & Hosting

•
Hosting: Vercel, Netlify, or AWS Amplify (recommended for React)

•
Domain: Secure a domain (e.g., loki.app, lokidiscovery.com)

•
SSL Certificate: Enable HTTPS

•
CDN: Use a CDN for fast global delivery

•
Monitoring: Set up uptime monitoring and error tracking (e.g., Sentry)




Success Metrics

Track these KPIs to measure landing page effectiveness:

•
Traffic: Unique visitors, page views, bounce rate

•
Engagement: Average session duration, scroll depth

•
Conversions: Email signups, app downloads, click-through rates

•
SEO: Organic traffic, keyword rankings, backlinks

•
Performance: Page load time, Core Web Vitals scores




Next Steps for Cursor

1.
Create the project structure with React + TypeScript + TailwindCSS

2.
Build component files for each section (Hero, Problem, Solution, etc.)

3.
Implement responsive design with mobile-first approach

4.
Add smooth scrolling and subtle animations

5.
Integrate email capture form with your email service

6.
Optimize images and implement lazy loading

7.
Add SEO meta tags and structured data

8.
Test on multiple devices and browsers

9.
Run Lighthouse audit and optimize for performance

10.
Deploy to production




Questions for Clarification

Before starting, consider answering these questions to refine the prompt:

1.
Do you have app store links ready, or should the landing page direct to a waitlist?

2.
Do you want a blog section, or just a single landing page?

3.
What is your primary call-to-action: app downloads or email signups?

4.
Do you have testimonials or user metrics to include?

5.
Should the landing page include a business/investor section, or focus purely on user acquisition?

6.
What is your brand color palette preference?

7.
Do you want video content (explainer video, demo video)?

8.
Should the landing page include a pricing section?




Final Notes

This prompt is comprehensive but flexible. Feel free to adjust sections, add or remove features, and customize the tone and design to match your brand. The goal is to create a landing page that clearly communicates LOKI's value, builds credibility, and drives conversions (whether that's app downloads, email signups, or investor interest).

Good luck with the build!

