LOKI Venue Profile Screen - Detailed Breakdown
Overview
The venue profile screen is the single source of truth for all venue information. It consolidates what was previously spread across venue cards and profile screens, eliminating redundancy and creating a clear information hierarchy.

Key Principle: Show comprehensive information without overwhelming the user. Use tabs and progressive disclosure to organize content.



Screen Structure (Top to Bottom)
┌─────────────────────────────────────┐
│ [← Back] [Share] [More Options ⋯]  │  ← Header (Fixed)
├─────────────────────────────────────┤
│ [Image Carousel]                    │  ← Hero Section (Scrollable)
│ ◄ Venue Image 1 ►                   │
│ ◄ Food Image 1 ►                    │
│ ◄ Food Image 2 ►                    │
├─────────────────────────────────────┤
│ Venue Name                          │  ← Info Section (Scrollable)
│ Cuisine • Distance • Status         │
│ ★★★★☆ (4.5) • 120 reviews          │
├─────────────────────────────────────┤
│ [Follow] [Save] [Navigate]          │  ← Action Buttons
├─────────────────────────────────────┤
│ About | Menu | Specials | Events    │  ← Tab Navigation
├─────────────────────────────────────┤
│ [Tab Content - Scrolls Vertically]  │  ← Content Area
│                                     │
│                                     │
└─────────────────────────────────────┘



Section-by-Section Breakdown
1. Header (Fixed at Top)
Purpose: Navigation and quick actions

Elements:
•	Back Button (left) - Returns to previous screen
•	Share Button (center-right) - Share venue link
•	More Options (right) - Additional actions (report, block, etc.)

Styling:
•	Semi-transparent dark background (so it overlays hero image)
•	White icons/text for contrast
•	Height: 56px (standard mobile header)

Interactions:
•	Back: Pop screen from navigation stack
•	Share: Open share sheet (link, messaging, social)
•	More: Open action menu (report, block, add note, etc.)



2. Hero Section (Image Carousel)
Purpose: Visual showcase of venue and food

Elements:
•	Image Carousel (full width, 280px height)
◦	Venue exterior/interior images first
◦	Food/dish images second
◦	Swipe left/right to navigate
◦	Dot indicators at bottom (showing current position)
◦	Tap to expand to full-screen lightbox

Image Order:
1	Primary venue image (hero)
2	Additional venue images (2-3)
3	Food/dish images (3-5)
4	Menu images (if available)

Styling:
•	Full width, 280px height
•	Rounded corners at bottom (8px)
•	Dot indicators (white, semi-transparent)
•	Swipe gesture to navigate

Interactions:
•	Swipe left/right: Navigate between images
•	Tap image: Open full-screen lightbox
•	Tap dot: Jump to specific image



3. Info Section (Sticky Below Hero)
Purpose: Key venue information at a glance

Elements:

┌─────────────────────────────────────┐
│ Tabanco By Ambiente                 │  ← Venue Name (18px, bold)
│ Spanish Tapas & Sherry Bar          │  ← Cuisine (14px, gray)
├─────────────────────────────────────┤
│ 59 - 63 Walmgate, York YO1 9TY      │  ← Address (12px, gray)
│ 📍 1.3km away • 🕐 Closes 9:30pm    │  ← Distance & Status (12px)
├─────────────────────────────────────┤
│ ★★★★☆ 4.5 (120 reviews)            │  ← Rating & Review Count (12px)
│ 👥 234 followers                    │  ← Follower Count (12px)
├─────────────────────────────────────┤
│ 📞 (01904) 123456                   │  ← Phone (12px, clickable)
│ 🌐 www.tabanco.co.uk                │  ← Website (12px, clickable)
│ 📧 info@tabanco.co.uk               │  ← Email (12px, clickable)
└─────────────────────────────────────┘

Styling:
•	White background
•	Padding: 16px
•	Border-bottom: 1px light gray
•	Icons for visual clarity

Interactions:
•	Tap phone: Open phone dialer
•	Tap website: Open in browser
•	Tap email: Open email composer



4. Action Buttons (Below Info Section)
Purpose: Primary user actions

Layout (3 Buttons):

┌─────────────────────────────────────┐
│ [+ Follow] [ Save] [ Navigate] │
└─────────────────────────────────────┘

Button Specifications:

Button	State	Action
Follow	Not following	Follow venue, get updates
Follow	Following	Unfollow venue
Save	Not saved	Save to list (modal)
Save	Saved	Show "Saved to X list"
Navigate	Always	Open maps app (Google Maps, Apple Maps)
Styling:
•	Full width, 3 equal columns
•	44px height (touch-friendly)
•	Outlined style (not filled)
•	Primary color for active state

Interactions:
•	Tap Follow: Toggle follow state
•	Tap Save: Open list selection modal
•	Tap Navigate: Open maps app with venue address



5. Tab Navigation
Purpose: Organize content into digestible sections

Tabs (4 Total):

┌─────────────────────────────────────┐
│ About | Menu | Specials | Events    │
└─────────────────────────────────────┘

Tab Specifications:

Tab	Content	Priority	Show For
About	Description, public opinion, ratings	High	All venues
Menu	Menu images/PDF, items	High	All venues
Specials	Active specials during YRW	High	Venues with specials
Events	Upcoming events	Medium	Venues with events
Styling:
•	Sticky (stays at top when scrolling content)
•	Underline indicator for active tab
•	Smooth transition between tabs
•	Scrollable if many tabs (not applicable here)

Interactions:
•	Tap tab: Switch to that tab's content
•	Swipe left/right: Navigate between tabs (optional)



Tab Content Details
Tab 1: About
Purpose: Venue description, atmosphere, and public opinion

Layout:

┌─────────────────────────────────────┐
│ INTRODUCTION                        │  ← Section Header (14px, bold)
│ Tabanco By Ambiente is a restaurant │  ← Description (12px, 3-4 lines)
│ located at 59-63 Walmgate in York.  │
│ It specializes in offering a unique │
│ dining experience...                │
├─────────────────────────────────────┤
│ DESIGN & ATMOSPHERE                 │  ← Section Header
│ The venue features a warm and       │  ← Description (12px)
│ inviting interior, characterized by │
│ rustic wooden accents and a blend   │
│ of modern and traditional decor...  │
├─────────────────────────────────────┤
│ WHAT PEOPLE LOVE                    │  ← Section Header
│ ✓ Quality and presentation of food  │  ← Bullet points (12px)
│ ✓ Welcoming service                 │
│ ✓ Cozy atmosphere                   │
├─────────────────────────────────────┤
│ COMMON COMPLAINTS                   │  ← Section Header
│ ✗ Can be noisy during peak times    │  ← Bullet points (12px)
│ ✗ Limited vegetarian options        │
│ ✗ Pricey for portion sizes          │
├─────────────────────────────────────┤
│ SATISFACTION SCORE                  │  ← Section Header
│ ★★★★☆ 4.5/5.0                      │  ← Large rating (18px)
│ Based on 120 public reviews         │  ← Subtext (12px, gray)
└─────────────────────────────────────┘

Content Organization:
5	Introduction - Venue description (2-3 sentences)
6	Design & Atmosphere - Venue ambiance (2-3 sentences)
7	What People Love - Positive themes from reviews (3-5 bullet points)
8	Common Complaints - Negative themes from reviews (2-4 bullet points)
9	Satisfaction Score - Overall rating (star + number)

Styling:
•	Section headers: 14px, bold, primary color
•	Body text: 12px, dark gray
•	Bullet points: Green checkmark for positive, red X for negative
•	Padding: 16px
•	Section dividers: 1px light gray

Data Source:
•	Description: From venue profile (admin-provided)
•	Atmosphere: From venue profile
•	What People Love: Aggregated from reviews (AI-extracted themes)
•	Common Complaints: Aggregated from reviews (AI-extracted themes)
•	Satisfaction Score: Calculated from review ratings



Tab 2: Menu
Purpose: Display venue menu

Layout Options:

Option A: Menu Images (Recommended for Launch)

┌─────────────────────────────────────┐
│ [Menu Image 1 - Full Width]         │
│ [Pinch to zoom, swipe to navigate]  │
├─────────────────────────────────────┤
│ [Menu Image 2]                      │
├─────────────────────────────────────┤
│ [Menu Image 3]                      │
└─────────────────────────────────────┘

Option B: Structured Menu (Future Enhancement)

┌─────────────────────────────────────┐
│ STARTERS                            │  ← Category
│ Patatas Bravas - £6                 │  ← Item + Price
│ Jamón Ibérico - £12                 │
│ Queso Manchego - £5                 │
├─────────────────────────────────────┤
│ MAINS                               │
│ Rabo de Toro - £14                  │
│ Gambas al Ajillo - £11              │
├─────────────────────────────────────┤
│ DESSERTS                            │
│ Flan - £5                           │
│ Churros with Chocolate - £7         │
└─────────────────────────────────────┘

Recommendation:
•	Use Option A (Menu Images) for launch
•	Rationale: Venues already have menu images/PDFs; easier to implement
•	Plan Option B (Structured Menu) for Phase 2 (requires menu digitization)

Interactions:
•	Pinch to zoom (on images)
•	Swipe to navigate between menu images
•	Tap to open full-screen lightbox



Tab 3: Specials
Purpose: Show all active specials for this venue during YRW

Layout:

┌─────────────────────────────────────┐
│ [Medium List Item Card]             │  ← Special 1
│ 3 Course Set Menu - £25             │
│ Mon-Fri 12-5pm                      │
│ [Save] [Share] [→]                  │
├─────────────────────────────────────┤
│ [Medium List Item Card]             │  ← Special 2
│ Tapas & Sherry Pairing - £30        │
│ Tue-Thu 6-9pm                       │
│ [Save] [Share] [→]                  │
├─────────────────────────────────────┤
│ [Medium List Item Card]             │  ← Special 3
│ Brunch Menu - £15                   │
│ Sat-Sun 10am-2pm                    │
│ [Save] [Share] [→]                  │
└─────────────────────────────────────┘

Content:
•	Use the medium list item card design (from previous document)
•	Show all active specials for this venue
•	Each card includes: Image, title, price, availability, action buttons

Styling:
•	Padding: 16px
•	Card spacing: 12px between cards
•	No section headers (all items are specials)

Interactions:
•	Tap card/image: Expand to full special details (modal or new screen)
•	Tap Save: Save special to list
•	Tap Share: Share special via link or app
•	Tap →: Navigate to special details



Tab 4: Events (Defer for Launch)
Purpose: Show upcoming events at venue

Layout (Future):

┌─────────────────────────────────────┐
│ [Event Card]                        │  ← Event 1
│ Wine Tasting Night                  │
│ Friday, Feb 14 • 7:00 PM            │
│ £25 per person                      │
├─────────────────────────────────────┤
│ [Event Card]                        │  ← Event 2
│ Live Jazz Performance                │
│ Saturday, Feb 15 • 8:00 PM          │
│ Free entry                          │
└─────────────────────────────────────┘

Note: Defer this tab for launch. Focus on Specials tab first. Add Events tab in Phase 2 if venues start hosting events.



Scrolling Behavior
Vertical Scrolling (Primary)
The entire screen scrolls vertically:

10	Hero section scrolls out of view
11	Info section stays visible (or scrolls out)
12	Tab navigation becomes sticky (stays at top)
13	Tab content scrolls within its container

Implementation:
•	Use sticky positioning for tab navigation
•	Content area scrolls independently
•	Smooth scroll behavior

Horizontal Scrolling (Secondary)
•	Image carousel scrolls horizontally (swipe)
•	Tabs do NOT scroll horizontally (only 4 tabs, all fit on screen)



Mobile Responsiveness
Portrait Mode (Primary)
•	Full width layout
•	Hero image: 280px height
•	All elements stack vertically
•	Touch-friendly button sizes (44px minimum)

Landscape Mode (Secondary)
•	Hero image: 200px height (reduced)
•	Info section: 2-column layout (optional)
•	Buttons: Reduced to 40px height
•	Tab content: Adjusted for wider screen



Data Requirements
Venue Data Needed
Venue {
  id: string
  name: string
  cuisine: string
  address: string
  phone: string
  website: string
  email: string
  distance: number (km)
  status: "open" | "closed" | "closing_soon"
  rating: number (0-5)
  review_count: number
  follower_count: number
  description: string
  atmosphere: string
  images: [url] (carousel)
  menu_images: [url]
  what_people_love: [string] (3-5 themes)
  common_complaints: [string] (2-4 themes)
  satisfaction_score: number (0-5)
}
 
Special {
  id: string
  venue_id: string
  title: string
  price: number
  description: string
  availability: {
    days: [string] (Mon, Tue, etc.)
    start_time: string (12:00)
    end_time: string (17:00)
  }
  image: url
}



State Management
User Interactions to Track
•	Follow/Unfollow: Update follow state
•	Save Special: Show list selection modal
•	Navigate: Open maps app
•	Share: Open share sheet
•	Tab Switch: Track which tab user views
•	Image Swipe: Track which images user views

Analytics to Capture
•	Venue profile views
•	Time spent on each tab
•	Specials saved
•	Share clicks
•	Navigate clicks
•	Follow/unfollow actions



Accessibility Considerations
•	Color Contrast: Ensure text is readable on image overlays
•	Touch Targets: All buttons at least 44px x 44px
•	Labels: All icons have text labels or aria-labels
•	Keyboard Navigation: Tab through all interactive elements
•	Screen Reader: Proper semantic HTML and descriptions



Performance Optimization
•	Image Optimization: Compress images, use appropriate sizes
•	Lazy Loading: Load tab content only when tab is selected
•	Caching: Cache venue data and images locally
•	Pagination: If many specials, paginate or virtualize list



Edge Cases
What if venue has no specials?
•	Show empty state: "No active specials right now"
•	Show CTA: "Follow to get notified when new specials are added"

What if venue has no menu images?
•	Show empty state: "Menu not available yet"
•	Show CTA: "Check back soon" or link to website

What if venue has no reviews?
•	Show empty state: "No reviews yet"
•	Show CTA: "Be the first to review"

What if venue has no images?
•	Show placeholder image (venue icon or default image)
•	Encourage venue to upload images



Implementation Priority
Phase 1 (Launch)
✓ Hero section (image carousel)
✓ Info section (name, address, contact)
✓ Action buttons (Follow, Save, Navigate)
✓ Tab navigation
✓ About tab (description + public opinion)
✓ Menu tab (menu images)
✓ Specials tab (active specials)
✗ Events tab (defer)

Phase 2 (Post-Launch)
✓ Events tab
✓ Structured menu (if venues provide data)
✓ User reviews/ratings
✓ Venue analytics (for venues)
✓ Enhanced public opinion (more themes)



Visual Hierarchy Summary
Element	Size	Priority	Purpose
Venue Name	18px, bold	High	Identify venue
Cuisine	14px, gray	Medium	Categorize
Rating	18px, bold	High	Quick assessment
Description	12px	Medium	Learn about venue
Public Opinion	12px	High	Social proof
Specials	Medium cards	High	Primary action
Menu	Full width	High	Explore offerings
Contact Info	12px	Low	Reach out


Summary
The venue profile screen consolidates all venue information into a single, well-organized interface. By using tabs and progressive disclosure, users can quickly find what they need without feeling overwhelmed. The structure supports both discovery (About, Menu) and action (Save, Navigate) in a balanced way.

Key Principles:
14	Hero first - Visual showcase at top
15	Info quick - Key details immediately visible
16	Actions clear - Primary buttons prominent
17	Content organized - Tabs separate concerns
18	Scrollable - All information accessible without overwhelming

This design should provide a coherent, user-friendly experience that serves as the single source of truth for venue information.
