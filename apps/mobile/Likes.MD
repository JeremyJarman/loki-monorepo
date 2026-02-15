LOKI – AI Search & Vibe-Based Ranking System
Purpose
This document describes how LOKI’s recommendation and AI search system works without using traditional star ratings. Instead, it relies on preference signals, vibe modeling, and contextual intent to rank venues in a personalized, discovery-first way.
The goal is to answer: > “Which places fit me, my mood, and this moment?”
—not simply which places are most popular.
________________________________________
Core Philosophy
Traditional platforms (Google Maps, Yelp, TripAdvisor) rank venues based on perceived objective quality using star ratings.
LOKI ranks venues based on subjective fit.
Key distinction
•	❌ “Is this place good?”
•	✅ “Is this place right for me right now?”
This makes LOKI suitable for: - mood-based discovery - niche venues - locals and tourists - curated experiences
________________________________________
Why Not Star Ratings
Star systems fail for discovery because: - users interpret stars differently - ratings inflate toward 4–5 - niche or polarizing venues get buried - they encourage judgment, not exploration
They collapse complex taste into a single number.
LOKI avoids this entirely.
________________________________________
Preference Signal System (Netflix-Inspired)
LOKI uses preference strength signals, similar to Netflix and Spotify.
Explicit user signals
•	❤️ Love (strong positive)
•	👍 Like (medium positive)
•	🙅 Not my vibe (strong negative, private)
Implicit signals
•	saving a venue
•	adding to a list
•	following a curator
•	time spent viewing
•	opening menus or photos
•	sharing a venue
Users are never asked to write reviews.
________________________________________
Vibe Modeling
Each venue is represented by a vibe vector instead of a star rating.
Example venue representation
Venue: Bar XYZ

vibes:
- cozy: 0.82
- low_light: 0.91
- romantic: 0.76
- loud: 0.12
- cocktail_focus: 0.88
- touristy: 0.14
How vibes are generated
•	curator list themes (e.g. “date night bars”)
•	venue descriptions
•	tags and metadata
•	user interaction patterns
•	AI extraction from text
•	photo and content style
Vibes are probabilistic, not binary.
________________________________________
User Taste Profiles
Each user develops a taste embedding over time.
Example
User prefers:
- cozy
- intimate
- cocktails
- low light

User avoids:
- loud
- clubby
- touristy
This profile is inferred automatically from behavior.
Users never need to manually configure preferences.
________________________________________
AI Search Flow
When a user enters a natural-language query, the system runs multiple steps.
Example query
“Chill bar for a second date, not too loud”
________________________________________
Step 1 — Intent Extraction
The AI extracts semantic meaning:
•	venue type: bar
•	mood: chill, intimate
•	constraint: not loud
•	context: second date
This is converted into weighted vibe targets.
________________________________________
Step 2 — Vibe Matching
Each venue is scored by similarity between: - query vibe vector - venue vibe vector
Venues with strong alignment rank higher, regardless of popularity.
________________________________________
Step 3 — Personal Taste Adjustment
Results are personalized using the user’s taste profile.
Two users entering the same query may receive different rankings.
________________________________________
Step 4 — Soft Popularity Overlay
Light modifiers prevent empty or unstable results: - trending this week - popular among similar users - locally active venues
Popularity never dominates vibe matching.
________________________________________
Ranking Formula (Conceptual)
final_score =
  vibe_match_score
  × user_taste_alignment
  × light_popularity_modifier
No star ratings are involved at any stage.
________________________________________
What Users See (UX Layer)
Instead of stars, users see: - “Loved by people who enjoy cozy cocktail bars” - “Often saved for date nights” - “Popular with locals” - “Matches your vibe”
This builds trust without judgment.
________________________________________
Feedback Loop
Every interaction improves: - venue vibe accuracy - user taste understanding - search relevance - recommendation quality
The system becomes smarter passively.
________________________________________
Strategic Advantages
This system enables: - discovery over directories - surfacing hidden gems - mood-based exploration - highly personalized feeds - scalable AI search
It also unlocks future features: - “Tonight mode” - “Surprise me” - mood presets - weather-based suggestions - social-context discovery
________________________________________
Summary
LOKI does not rank venues by how good they are.
It ranks them by how well they fit the user, their mood, and their moment.
This approach: - avoids review fatigue - respects subjectivity - enables real personalization - differentiates LOKI from maps-based competitors
________________________________________
Design principle: > Taste is personal. Discovery should be too.
