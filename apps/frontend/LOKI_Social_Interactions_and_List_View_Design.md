# LOKI Social Interactions & List View Design - Comprehensive Specification

## Overview

This document provides a complete specification for LOKI's social layer and collaborative list view. It covers all user interactions, the hybrid list view layout, data models, notifications, analytics, and implementation priorities.

The social layer transforms LOKI from a discovery app into a **collaborative planning platform**. Users don't just save specials individually—they save them together, comment on them, react to them, and make group decisions. This creates engagement loops and makes the app more valuable the more friends you have on it.

**Core Principle:** Every interaction in a shared list should be visible to collaborators and create social signals that drive engagement.

---

## Part 1: User Interaction Patterns

### 1. Adding a Special to a Shared List

**Scenario:** User finds a special in the feed and wants to add it to a shared list with friends.

**Current Flow (Basic):**
1. User taps "Save" on special card
2. Modal opens: "Save to list"
3. User selects shared list (e.g., "We Need to Try This")
4. Special is added to list

**Enhanced Flow (Social):**
1. User taps "Save" on special card
2. Modal opens: "Save to list"
3. User selects shared list
4. **Social signal created:** "Sarah added Kapadokya - 3 Course Set to 'We Need to Try This'"
5. **Notification sent** to all collaborators: "Sarah added a special to your shared list"
6. **Activity appears in feed** (if list is public or shared with user)
7. **Collaborators can react** to the addition (thumbs up, fire emoji, etc.)

**UI for Adding:**

```
┌─────────────────────────────────────┐
│ Save to List                        │  ← Modal Title
├─────────────────────────────────────┤
│ [Search lists...]                   │  ← Search field
├─────────────────────────────────────┤
│ ✓ We Need to Try This (3 items)     │  ← Shared list (checked)
│   Shared with: Corrie, Sarah        │
├─────────────────────────────────────┤
│ ○ My Favorites (5 items)            │  ← Personal list
├─────────────────────────────────────┤
│ ○ Vegan Options (2 items)           │  ← Personal list
├─────────────────────────────────────┤
│ [+ Create New List]                 │  ← Option to create
├─────────────────────────────────────┤
│ [Cancel] [Save]                     │  ← Actions
└─────────────────────────────────────┘
```

**Data Captured:**
- Who added it (user_id)
- What was added (special_id)
- When it was added (timestamp)
- Which list it was added to (list_id)
- Optional: Why they added it (comment/note)

---

### 2. Reacting to Items in Shared Lists

**Scenario:** User sees that a friend added a special to a shared list and wants to express their opinion.

**Reactions Available:**
- 👍 **Thumbs Up** - "I'm interested"
- 🔥 **Fire** - "This looks amazing"
- ❤️ **Heart** - "I love this place"
- 😋 **Yum** - "Looks delicious"
- 🤔 **Thinking** - "Not sure about this"

**Interaction Flow:**
1. User taps a reaction emoji
2. Reaction is added to the special (if not already reacted)
3. Reaction count updates
4. **Social signal created:** "Sarah reacted 🔥 to Kapadokya - 3 Course Set"
5. **Notification sent** to the person who added the item: "Sarah reacted 🔥 to your special"
6. **Activity appears in list view** showing who reacted

**Why This Works:**
- Quick way to express opinion without typing
- Creates visual consensus (more reactions = more interest)
- Encourages engagement from quiet users
- Builds anticipation for group dining

---

### 3. Commenting on Items in Shared Lists

**Scenario:** User wants to add context or ask a question about a special.

**Comment Features:**
- **Text comments** - Full message
- **Replies** - Reply to specific comments (threading)
- **Reactions to comments** - React with emojis to comments
- **Mentions** - Tag friends with @username
- **Timestamps** - Show when comment was posted

**Data Captured:**
- Comment text
- Author (user_id)
- Timestamp
- Parent comment (if reply)
- Mentions (tagged users)

**Why This Works:**
- Turns list into a discussion thread
- Allows group decision-making ("What time?", "Can we do Friday?")
- Creates context for why items were added
- Encourages planning and coordination

---

### 4. Removing or Archiving Items

**Scenario:** Group decides an item isn't happening or wants to remove it.

**Options:**
- **Remove** - Delete from list (only collaborators can do this)
- **Archive** - Hide but keep (for reference)
- **Report** - Flag inappropriate content

**Social Signal:**
- "Sarah removed Kapadokya from 'We Need to Try This'"
- Notification sent to collaborators

---

## Part 2: List View Layout (Hybrid Approach)

### Overview

The list view is where users spend most of their time when collaborating. The **hybrid approach** balances three competing needs:

1. **Seeing all items** (what are we planning to do?)
2. **Understanding context** (who added what, when, and why?)
3. **Facilitating discussion** (reactions, comments, decisions)

The hybrid layout keeps items as the primary focus while making social context visible. Users can quickly scan the list, see reactions and comment counts, and expand items they want to discuss further.

### List Header (Fixed)

```
┌─────────────────────────────────────┐
│ ← "We Need to Try This"             │  ← Back button + title
│ Shared with: Corrie, Sarah, James   │  ← Collaborators
│ 5 items • Last updated 2 hours ago  │  ← Stats
├─────────────────────────────────────┤
│ [Edit] [Share Link] [Sort ▼]        │  ← Actions
└─────────────────────────────────────┘
```

**Sticky:** Stays at top when scrolling

**Elements:**
- **Back Button** - Returns to previous screen
- **List Title** - Name of the shared list
- **Collaborators** - Who's in the list
- **Stats** - Number of items, last updated time
- **Edit** - Manage list settings (name, description, collaborators)
- **Share Link** - Get shareable link to invite others
- **Sort** - Change item order (Newest, Most Reacted, Most Commented, Price, Distance)

---

### List Item Card (Collapsed State)

```
┌─────────────────────────────────────┐
│ [Medium List Item Card]             │  ← Item (140px height)
│ Kapadokya - 3 Course - £25          │
│ Mon-Fri 12-5pm                      │
│ [Save] [Share] [→]                  │
├─────────────────────────────────────┤
│ Added by Sarah • 2 hours ago        │  ← Activity metadata (12px, gray)
│ 👍 3  🔥 2  ❤️ 1  💬 2              │  ← Reactions + comment count (12px)
│ [▼ View Discussion]                 │  ← Expandable trigger (12px, blue)
└─────────────────────────────────────┘
```

**Collapsed State Includes:**
- Medium list item card (image, title, price, availability)
- Who added it and when
- Reaction counts (emoji + number)
- Comment count
- Expandable trigger

**Spacing:**
- Card height: 140px
- Activity metadata: 24px
- Reactions row: 24px
- Spacing between items: 12px

---

### List Item Card (Expanded State)

```
┌─────────────────────────────────────┐
│ [Medium List Item Card]             │
│ Kapadokya - 3 Course - £25          │
│ Mon-Fri 12-5pm                      │
│ [Save] [Share] [→]                  │
├─────────────────────────────────────┤
│ Added by Sarah • 2 hours ago        │
│ 👍 3  🔥 2  ❤️ 1  💬 2              │
│ [▲ Hide Discussion]                 │  ← Collapse trigger
├─────────────────────────────────────┤
│ DISCUSSION                          │  ← Section header
├─────────────────────────────────────┤
│ Sarah (Added this)                  │  ← Comment 1
│ "I've heard amazing things about    │
│ their tapas. Let's go Friday?"      │
│ 2 hours ago                         │
│ [👍] [❤️] [Reply]                  │
├─────────────────────────────────────┤
│ Corrie                              │  ← Comment 2
│ "I'm in! What time?"                │
│ 1 hour ago                          │
│ [👍] [Reply]                        │
├─────────────────────────────────────┤
│ [Write a comment...]                │  ← Comment input
│ [Send]                              │
└─────────────────────────────────────┘
```

**Expanded State Includes:**
- All comments in thread
- Reactions to comments
- Reply capability
- Comment input field
- Smooth expand/collapse animation (200-300ms)

---

### Complete List View Example

```
┌─────────────────────────────────────┐
│ ← "We Need to Try This"             │  ← Fixed Header
│ Shared with: Corrie, Sarah, James   │
│ 5 items • Last updated 2 hours ago  │
├─────────────────────────────────────┤
│ [Edit] [Share Link] [Sort ▼]        │
├─────────────────────────────────────┤
│ [Medium List Item Card]             │  ← Item 1 (Collapsed)
│ Kapadokya - 3 Course - £25          │
│ Mon-Fri 12-5pm                      │
│ [Save] [Share] [→]                  │
├─────────────────────────────────────┤
│ Added by Sarah • 2 hours ago        │
│ 👍 3  🔥 2  ❤️ 1  💬 2              │
│ [▼ View Discussion]                 │
├─────────────────────────────────────┤
│ [Medium List Item Card]             │  ← Item 2 (Expanded)
│ Tabanco - Tapas - £15               │
│ Tue-Thu 6-9pm                       │
│ [Save] [Share] [→]                  │
├─────────────────────────────────────┤
│ Added by Corrie • 1 hour ago        │
│ 👍 2  🔥 1  💬 1                    │
│ [▲ Hide Discussion]                 │
├─────────────────────────────────────┤
│ DISCUSSION                          │
├─────────────────────────────────────┤
│ Corrie (Added this)                 │
│ "Just discovered this place! The    │
│ sherry selection is incredible"     │
│ 1 hour ago                          │
│ [👍] [❤️] [Reply]                  │
├─────────────────────────────────────┤
│ James                               │
│ "Sherry + Tapas? I'm so in!"        │
│ 45 minutes ago                      │
│ [👍] [🔥] [Reply]                  │
├─────────────────────────────────────┤
│ [Write a comment...]                │
│ [Send]                              │
├─────────────────────────────────────┤
│ [Medium List Item Card]             │  ← Item 3 (Collapsed)
│ The Ramp - Brunch - £12             │
│ Sat-Sun 10am-2pm                    │
│ [Save] [Share] [→]                  │
├─────────────────────────────────────┤
│ Added by James • 30 minutes ago     │
│ 👍 1  💬 0                          │
│ [▼ View Discussion]                 │
├─────────────────────────────────────┤
│ [+ Add Special]                     │  ← CTA
└─────────────────────────────────────┘
```

---

### Interaction Details

**Expand/Collapse:**
- Tap "▼ View Discussion" to expand
- Tap "▲ Hide Discussion" to collapse
- Smooth animation (200-300ms)
- Expanded state persists while scrolling (until user collapses)
- Recommend: Only one item expanded at a time (cleaner UX)

**Reactions:**
- Tap reaction emoji to add/remove your reaction
- Tap reaction count to see who reacted
- Reactions update in real-time
- Show "You and 47 others" for large reaction counts

**Comments:**
- Tap "Reply" to reply to specific comment
- Tap comment to expand thread
- Mentions work with @ symbol
- Comments update in real-time
- Show first 5 comments, "Load More" for additional

**Sorting:**
- Tap "Sort ▼" in header to change order
- Options: Newest, Most Reacted, Most Commented, Price (Low-High), Distance
- Default: Newest (reverse chronological)

---

### Filtering (Phase 2)

```
┌─────────────────────────────────────┐
│ [Filter ▼]                          │
│ ☐ All Cuisines                      │
│ ☐ Vegan                             │
│ ☐ Vegetarian                        │
│ ☐ Meat                              │
│ ☐ Seafood                           │
├─────────────────────────────────────┤
│ ☐ All Prices                        │
│ ☐ £5-10                             │
│ ☐ £10-15                            │
│ ☐ £15-20                            │
│ ☐ £20+                              │
├─────────────────────────────────────┤
│ ☐ All Days                          │
│ ☐ Monday-Friday                     │
│ ☐ Weekend                           │
│ ☐ Specific Day [Select]             │
├─────────────────────────────────────┤
│ [Apply Filters]                     │
└─────────────────────────────────────┘
```

---

### Visual Hierarchy in Hybrid Layout

| Element | Priority | Size | Purpose |
| :--- | :--- | :--- | :--- |
| Item Card | High | 140px | What are we eating? |
| Activity Metadata | Medium | 24px | Who added it? |
| Reactions | Medium | 24px | Group excitement |
| Comment Count | Medium | 12px | Discussion indicator |
| Expand Trigger | Low | 12px | Optional detail |
| Comments (Expanded) | Medium | Variable | Group discussion |

---

### Why Hybrid Is Best for LOKI

**1. Balances Discovery and Collaboration**
- Items are the primary focus (what are we eating?)
- Activity is secondary but visible (who's excited about what?)

**2. Scales Well**
- Works for small lists (3 items) and large lists (20+ items)
- Doesn't become overwhelming

**3. Encourages Engagement**
- Reactions/comments visible inline (social proof)
- Users can expand to see full discussion
- Doesn't require tab switching

**4. Supports Your Use Case**
- During YRW, users want to quickly see what's on the list
- But they also want to see group excitement and make decisions together
- Hybrid lets them do both without friction

**5. Mobile-Friendly**
- Vertical scrolling is natural on mobile
- Expandable sections work well with touch
- No tab switching needed

---

## Part 3: Home Feed Social Posts

When a friend adds an item to a shared list, a post appears in your home feed.

**Social Post in Feed:**

```
┌─────────────────────────────────────┐
│ Sarah                               │  ← User name
│ added Kapadokya to "We Need to      │  ← Action
│ Try This"                           │
│ 2 hours ago                         │
├─────────────────────────────────────┤
│ [Special Image]                     │  ← Item preview
│ Kapadokya                           │
│ 3 Course Set Menu - £25             │
│ Mon-Fri 12-5pm                      │
├─────────────────────────────────────┤
│ [👍] [🔥] [❤️] [😋] [🤔]           │  ← Quick reactions
│ 3    2   1   0   0                  │
│ 💬 2 comments                       │
│ [View List] [Save] [Share]          │  ← Actions
└─────────────────────────────────────┘
```

**Post Actions:**
- **View List** - Navigate to the shared list
- **Save** - Save the special to own list
- **Share** - Share with other friends
- **React** - Add emoji reaction
- **Comment** - Add comment to the special

**Why This Works:**
- Brings social planning into the main feed
- Friends see what others are planning
- Creates FOMO (fear of missing out) - "Everyone's going to this place!"
- Drives engagement and virality

---

## Part 4: Notifications & Engagement Loops

### Notification Types

**1. Item Added to Shared List**
- **Trigger:** Friend adds item to list you're a collaborator on
- **Message:** "Sarah added Kapadokya to 'We Need to Try This'"
- **Action:** Tap to view list
- **Frequency:** Immediate

**2. Reaction to Your Item**
- **Trigger:** Someone reacts to an item you added
- **Message:** "Corrie reacted 🔥 to your special"
- **Action:** Tap to view reactions/comments
- **Frequency:** Batched (every 1-2 hours)

**3. Comment on Your Item**
- **Trigger:** Someone comments on an item you added
- **Message:** "Corrie commented: 'I'm in! What time?'"
- **Action:** Tap to view comment thread
- **Frequency:** Immediate (or batched if many)

**4. List Activity Summary**
- **Trigger:** Daily or when list becomes inactive
- **Message:** "Your group added 3 new specials to 'We Need to Try This' today"
- **Action:** Tap to view list
- **Frequency:** Daily digest

**5. Friend Joined List**
- **Trigger:** New collaborator added to shared list
- **Message:** "James joined 'We Need to Try This'"
- **Action:** Tap to view list
- **Frequency:** Immediate

### Engagement Loop Example

```
1. Sarah discovers a special in the feed
   ↓
2. Sarah adds it to "We Need to Try This" list
   ↓
3. Notification sent to Corrie & James: "Sarah added Kapadokya"
   ↓
4. Corrie opens notification → views list
   ↓
5. Corrie reacts 🔥 to the special
   ↓
6. Notification sent to Sarah: "Corrie reacted 🔥"
   ↓
7. Sarah opens notification → sees Corrie's reaction
   ↓
8. Sarah comments: "Let's go Friday?"
   ↓
9. Notification sent to Corrie & James: "Sarah commented"
   ↓
10. Corrie & James reply → discussion thread forms
    ↓
11. Group decides to book → clicks through to YRW booking link
    ↓
12. LOKI tracks the booking (analytics for venues)
```

---

## Part 5: Collaborative Decision-Making Features

### Shared List Header (Enhanced)

```
┌─────────────────────────────────────┐
│ "We Need to Try This"               │  ← List title
│ Shared with: Corrie, Sarah, James   │  ← Collaborators
│ 5 items • Last updated 2 hours ago  │  ← Stats
├─────────────────────────────────────┤
│ [Edit List] [Share Link] [Settings] │  ← Actions
├─────────────────────────────────────┤
│ Collaborators' Avatars:             │  ← Visual indicator
│ [S] [C] [J]                         │
│ Sarah  Corrie  James                │
└─────────────────────────────────────┘
```

**Collaborator Features:**
- See who's in the list
- See their avatars
- See when they last added something
- Ability to add/remove collaborators (for owner)

---

## Part 6: User Roles in Shared Lists

### List Owner

- Create the list
- Add/remove collaborators
- Delete the list
- Edit list name/description
- Pin important items
- Archive old items

### Collaborator

- Add items to list
- React to items
- Comment on items
- Remove their own items
- View all activity
- Share list with others (optional)

### Viewer (Public List)

- View items (read-only)
- React to items (optional)
- Comment on items (optional)
- Save items to own list
- Share list with others

---

## Part 7: Data Model for Social Interactions

```
ListItem {
  id: string
  list_id: string
  special_id: string
  added_by: user_id
  added_date: timestamp
  reactions: {
    👍: [user_id],
    🔥: [user_id],
    ❤️: [user_id],
    😋: [user_id],
    🤔: [user_id]
  }
  comments: [
    {
      id: string
      author_id: user_id
      text: string
      created_date: timestamp
      parent_comment_id: string (if reply)
      mentions: [user_id]
      reactions: { emoji: [user_id] }
    }
  ]
  archived: boolean
  archived_date: timestamp (if archived)
}

Activity {
  id: string
  type: "item_added" | "item_removed" | "reaction_added" | "comment_added"
  actor_id: user_id
  list_id: string
  item_id: string
  created_date: timestamp
  metadata: {
    reaction?: emoji
    comment?: string
  }
}

List {
  id: string
  name: string
  description: string
  owner_id: user_id
  collaborators: [user_id]
  items: [ListItem]
  created_date: timestamp
  updated_date: timestamp
  is_public: boolean
  is_archived: boolean
}
```

---

## Part 8: Performance Optimization

### Lazy Loading

- Load first 10 items immediately
- Load next 10 when user scrolls to bottom
- Load comments only when expanded

### Caching

- Cache list data locally
- Cache reactions and comments
- Update in real-time via websockets

### Animations

- Use GPU-accelerated animations for expand/collapse
- Keep animations under 300ms
- Disable animations on low-end devices

### Virtual Scrolling

- For lists with 50+ items, implement virtual scrolling
- Only render visible items
- Improves performance significantly

---

## Part 9: Analytics to Capture

For venues and your own product insights, track:

- **Item additions:** Who added what, when, to which list
- **Reactions:** Which items get most reactions, which emojis are used most
- **Comments:** Sentiment analysis, topics discussed
- **Shares:** How often lists/items are shared
- **Conversions:** Track when users click through to YRW booking link
- **Engagement:** Time spent in lists, number of interactions per session
- **List growth:** How many items added per day, collaborator growth
- **User retention:** How often users return to lists

---

## Part 10: Accessibility Considerations

- **Keyboard Navigation:** Tab through items, Enter to expand
- **Screen Readers:** Announce item details, reaction counts, comment counts
- **Color Contrast:** Ensure metadata text is readable
- **Touch Targets:** Expand trigger at least 44px tall
- **Focus Indicators:** Clear focus states for keyboard navigation

---

## Part 11: Edge Cases & Considerations

### What if item has 50+ comments?

- Show first 5 comments
- Add "Load More Comments" button
- Paginate comments in sets of 10

### What if item has 100+ reactions?

- Show top 3 reactions (by count)
- Add "See All Reactions" button
- Show reaction summary: "You and 47 others reacted 👍"

### What if list is very long (50+ items)?

- Implement virtual scrolling (only render visible items)
- Add search/filter to narrow down
- Consider pagination or "Load More" button

### What if user is not a collaborator (viewing public list)?

- Hide comment input field
- Show reactions as read-only
- Show "Request to Join" button

### What if someone adds an offensive item?

- Allow reporting
- Moderators review and remove if necessary
- Notify list owner

### What if someone leaves the group?

- Remove them from collaborators
- Keep their items in the list (for context)
- Mark their items as "Added by [removed user]"

### What if list becomes inactive?

- Send reminder notification: "Your group hasn't added to this list in a week"
- Suggest archiving if no activity for 30 days

### What if someone disagrees with an item?

- Allow comments to discuss
- Allow removal (with notification to who added it)
- Could add "disagree" reaction (future feature)

---

## Part 12: Implementation Priority

### Phase 1 (Launch)

✓ List header with title and collaborators
✓ Medium list item cards
✓ Activity metadata (who added, when)
✓ Inline reaction counts
✓ Expandable comments section
✓ Comment display with threading
✓ Sorting (Newest, Most Reacted, Most Commented)
✓ Add special button
✓ Reactions (5 emoji types)
✓ Comments with replies
✓ Notifications for items added
✓ Notifications for reactions/comments
✓ Social posts in home feed
✓ Collaborators list

### Phase 2 (Post-Launch)

✓ Filtering (cuisine, price, day)
✓ Virtual scrolling (for large lists)
✓ Pagination for comments
✓ Reaction summary ("You and 47 others")
✓ List templates
✓ Pinned items
✓ Archived items
✓ Advanced permissions
✓ List analytics
✓ Polling/voting on items

---

## Summary

Social interactions in shared lists transform LOKI from a discovery tool into a **collaborative planning platform**. By enabling reactions, comments, and an intuitive hybrid list view, users can make group decisions together, build anticipation, and create a shared experience around dining.

The hybrid list view layout is the key to this experience. It keeps items as the primary focus while making social context visible. Users can quickly scan what's being planned, see group excitement through reactions, and expand items to discuss details and make decisions together.

**Key Features:**
- **Reactions** - Quick way to express opinion
- **Comments** - Discuss and plan together
- **Hybrid List View** - Items + activity in one coherent interface
- **Social Posts** - Bring planning into main feed
- **Notifications** - Keep users engaged and informed
- **Collaborative Decision-Making** - Make group decisions together

**Engagement Loop:**
Discover → Save → React → Comment → Discuss → Decide → Book → Share Experience

This creates a virtuous cycle where the more friends you have on LOKI, the more valuable it becomes.

---

## Visual Summary: The Hybrid List View

The hybrid approach balances three competing needs:

1. **Seeing all items** ✓ (clean, scannable list)
2. **Understanding context** ✓ (who added what, reactions visible)
3. **Facilitating discussion** ✓ (expandable comments section)

**Default View:** Clean, scannable list of items with reactions and comment counts visible
**Expanded View:** Full discussion thread with all comments and replies
**Result:** Coherent, engaging collaborative planning experience

This is how you turn a list into a conversation.
