# LOKI Firebase Firestore Architecture

## Overview

This document provides a comprehensive Firebase Firestore architecture for LOKI, covering collections, document schemas, indexing strategies, and query optimization. The architecture is designed to support lists, items, reactions, comments, notifications, and analytics while maintaining performance and scalability.

**Key Design Principles:**

1. **Denormalization for Performance** - Store frequently accessed data together to minimize reads
2. **Subcollections for Scalability** - Use subcollections for one-to-many relationships to avoid document size limits
3. **Activity Tracking** - Maintain activity logs for notifications and feed generation
4. **Real-time Updates** - Structure data to support real-time listeners efficiently
5. **Cost Optimization** - Minimize read/write operations through smart data modeling

---

## Effective data structure (Phase 1) — reference for implementation

This section documents the **actual** data structures used in Phase 1 so the codebase and future work can stay aligned. We keep **current naming** (e.g. profile image, not avatar) and reference specials via **experienceId** (no separate `specials` collection yet).

### Naming conventions (Phase 1)

| Concept | Our field name | Notes |
|--------|-----------------|-------|
| User profile image | `profileImageUrl` | Not `avatar_url` |
| User display name | `displayName` | From Firebase Auth or users doc |
| Special/venue image | `imageUrl` | Same as existing experiences/venues |
| Special reference in list item | `experienceId` | Points to `experiences/{id}` where `type === 'special'` |

### Phase 1 collection layout (what exists in Firestore)

```
firestore/
├── users/
│   └── {userId}/                    # Document: role, email, about, profileImageUrl, updatedAt (existing)
│       ├── followers (subcollection)   # Phase 1: FollowerRefDoc
│       ├── following (subcollection)  # Phase 1: FollowingRefDoc
│       ├── saved_lists (subcollection)# Phase 1: SavedListRefDoc
│       ├── notifications (subcollection) # Phase 1: NotificationDoc
│       └── activity_feed (subcollection) # Phase 1: ActivityFeedDoc
│
├── lists/
│   └── {listId}/                    # Document: ListMetadata (name, ownerId, collaborators, stats, …)
│       ├── items (subcollection)
│       │   └── {itemId}/            # Document: ListItemDoc (experienceId, special, addedBy, stats, …)
│       │       ├── reactions (subcollection)  # ListItemReactionDoc (userId, displayName, profileImageUrl, emoji)
│       │       └── comments (subcollection)
│       │           └── {commentId}/ # ListItemCommentDoc + reactions subcollection
│       ├── activity (subcollection) # ListActivityDoc
│       └── collaborators (subcollection) # Optional; list doc also has denormalised collaborators[]
│
├── venues/                          # Unchanged (existing)
├── experiences/                     # Unchanged. Specials = documents with type === 'special'
└── experienceInstances/             # Unchanged
```

### Key Phase 1 types (see `@loki/shared` types.ts)

- **UserRef**: `userId`, `displayName?`, `profileImageUrl?`
- **ListMetadata**: `listId`, `name`, `description?`, `ownerId`, `collaborators[]`, `isPublic`, `allowComments`, `allowReactions`, `stats`, `createdAt`, `updatedAt`, `lastActivityAt`
- **ListItemDoc**: `itemId`, `listId`, **`experienceId`** (references `experiences/{id}`), `special` (denormalised ListItemSpecial), `addedBy` (UserRef), `stats`, `addedAt`, `updatedAt`, `isArchived`
- **ListItemSpecial**: `venueId`, `venueName`, `specialTitle`, `price?`, `cost?`, `costPerPerson?`, `currency?`, `availability?`, `imageUrl`, `cuisine?`
- **ListItemReactionDoc**: `reactionId`, `userId`, `displayName?`, `profileImageUrl?`, `emoji`, `createdAt`
- **ListItemCommentDoc**: `commentId`, `text`, `author` (UserRef), `parentCommentId`, `replyCount`, `mentions`, `reactionsCount`, `createdAt`, `updatedAt`, `isEdited`, `isDeleted`
- **NotificationDoc**, **ActivityFeedDoc**, **SavedListRefDoc**, **FollowerRefDoc**, **FollowingRefDoc**: see types in `packages/shared/src/types.ts`

### Path constants

Use `packages/shared/src/firestorePaths.ts`: `COLLECTION_LISTS`, `COLLECTION_USERS`, `SUBCOLLECTION_ITEMS`, `SUBCOLLECTION_REACTIONS`, `SUBCOLLECTION_COMMENTS`, `SUBCOLLECTION_ACTIVITY`, `SUBCOLLECTION_NOTIFICATIONS`, `SUBCOLLECTION_ACTIVITY_FEED`, `SUBCOLLECTION_FOLLOWERS`, `SUBCOLLECTION_FOLLOWING`, `SUBCOLLECTION_SAVED_LISTS`.

### Indexes (Phase 1)

- **lists**: query by `ownerId` + `orderBy('updatedAt', 'desc')` for "my lists".
- **lists/{listId}/items**: `orderBy('addedAt', 'desc')` for item list (archived filtered in memory to avoid composite index for now).

### Security rules (Phase 1)

Add rules for `lists` and subcollections so that authenticated users can read/write as required (e.g. list visible if `isPublic` or user in `collaborators`; items/reactions/comments per list access). See Part 10 for patterns; adjust to use `request.auth.uid` and the Phase 1 field names above.

---

## Part 1: Collection Structure Overview

```
firestore/
├── users/
│   └── {userId}/
│       ├── profile (document)
│       ├── settings (document)
│       ├── followers (subcollection)
│       ├── following (subcollection)
│       ├── saved_lists (subcollection)
│       └── notifications (subcollection)
│
├── lists/
│   └── {listId}/
│       ├── metadata (document)
│       ├── items (subcollection)
│       │   └── {itemId}/
│       │       ├── item_data (document)
│       │       ├── reactions (subcollection)
│       │       └── comments (subcollection)
│       │           └── {commentId}/
│       │               ├── comment_data (document)
│       │               └── reactions (subcollection)
│       ├── activity (subcollection)
│       └── collaborators (subcollection)
│
├── specials/
│   └── {specialId}/
│       ├── special_data (document)
│       └── analytics (subcollection)
│
├── venues/
│   └── {venueId}/
│       └── venue_data (document)
│
├── activity_feed/
│   └── {userId}/
│       └── {activityId}/ (subcollection)
│
└── notifications/
    └── {userId}/
        └── {notificationId}/ (subcollection)
```

---

## Part 2: Core Collections & Schemas

### 1. Users Collection

**Path:** `/users/{userId}`

**Document: profile**

```javascript
{
  userId: "user_123",
  username: "sarah_smith",
  email: "sarah@example.com",
  avatar_url: "https://...",
  bio: "Food enthusiast",
  created_date: Timestamp,
  updated_date: Timestamp,
  
  // Denormalized stats for quick display
  stats: {
    followers_count: 42,
    following_count: 15,
    lists_count: 8,
    saved_specials_count: 23
  },
  
  // Privacy settings
  is_public: true,
  allow_notifications: true
}
```

**Subcollection: followers**

```javascript
// Path: /users/{userId}/followers/{followerId}
{
  followerId: "user_456",
  username: "corrie_jones",
  avatar_url: "https://...",
  followed_date: Timestamp
}
```

**Subcollection: following**

```javascript
// Path: /users/{userId}/following/{followingId}
{
  followingId: "user_789",
  username: "james_brown",
  avatar_url: "https://...",
  followed_date: Timestamp
}
```

**Subcollection: saved_lists**

```javascript
// Path: /users/{userId}/saved_lists/{listId}
{
  listId: "list_123",
  list_name: "We Need to Try This",
  owner_id: "user_456",
  saved_date: Timestamp,
  is_owner: false
}
```

**Subcollection: notifications**

Covered in Part 3 below.

---

### 2. Lists Collection (Main)

**Path:** `/lists/{listId}`

**Document: metadata**

```javascript
{
  listId: "list_123",
  name: "We Need to Try This",
  description: "Best specials for York Restaurant Week",
  owner_id: "user_123",
  
  // Collaborators (denormalized for quick access)
  collaborators: [
    {
      userId: "user_123",
      username: "sarah_smith",
      avatar_url: "https://...",
      role: "owner",
      added_date: Timestamp
    },
    {
      userId: "user_456",
      username: "corrie_jones",
      avatar_url: "https://...",
      role: "collaborator",
      added_date: Timestamp
    }
  ],
  
  // Settings
  is_public: false,
  allow_comments: true,
  allow_reactions: true,
  
  // Stats (denormalized for quick display)
  stats: {
    items_count: 5,
    total_reactions: 12,
    total_comments: 8,
    last_activity: Timestamp
  },
  
  // Metadata
  created_date: Timestamp,
  updated_date: Timestamp,
  last_activity_date: Timestamp
}
```

**Why This Structure:**

- **Collaborators denormalized** - Stored in the list document for quick access without subcollection query
- **Stats denormalized** - Updated when items are added/removed for fast display
- **Last activity tracked** - Used for sorting lists by recency

---

### 3. List Items Subcollection

**Path:** `/lists/{listId}/items/{itemId}`

**Document: item_data**

```javascript
{
  itemId: "item_456",
  list_id: "list_123",
  special_id: "special_789",
  
  // Denormalized special data for quick display
  special: {
    venue_id: "venue_123",
    venue_name: "Kapadokya",
    special_title: "3 Course Set Menu",
    price: "£25",
    availability: "Mon-Fri 12-5pm",
    image_url: "https://...",
    cuisine: "Turkish"
  },
  
  // Who added it
  added_by: {
    userId: "user_123",
    username: "sarah_smith",
    avatar_url: "https://..."
  },
  
  // Stats (denormalized for quick display)
  stats: {
    reactions_count: 5,
    comments_count: 2,
    reaction_types: {
      "👍": 3,
      "🔥": 2,
      "❤️": 0,
      "😋": 0,
      "🤔": 0
    }
  },
  
  // Metadata
  added_date: Timestamp,
  updated_date: Timestamp,
  is_archived: false
}
```

**Why This Structure:**

- **Special data denormalized** - Stored with item for quick display without joining tables
- **Stats denormalized** - Reaction counts stored here for fast display
- **Reaction types tracked** - Breakdown of which emojis were used

---

### 4. Reactions Subcollection

**Path:** `/lists/{listId}/items/{itemId}/reactions/{reactionId}`

```javascript
{
  reactionId: "reaction_001",
  user_id: "user_456",
  username: "corrie_jones",
  avatar_url: "https://...",
  emoji: "🔥",
  created_date: Timestamp
}
```

**Why Subcollection:**

- Reactions can be numerous (100+ per item)
- Subcollection avoids document size limits
- Can query all reactions for an item efficiently
- Can query user's reactions efficiently

---

### 5. Comments Subcollection

**Path:** `/lists/{listId}/items/{itemId}/comments/{commentId}`

**Document: comment_data**

```javascript
{
  commentId: "comment_123",
  item_id: "item_456",
  list_id: "list_123",
  
  // Comment content
  text: "I've heard amazing things about their tapas. Let's go Friday?",
  author: {
    userId: "user_123",
    username: "sarah_smith",
    avatar_url: "https://..."
  },
  
  // Threading
  parent_comment_id: null, // null if top-level, otherwise parent's ID
  reply_count: 2,
  
  // Mentions
  mentions: ["user_456", "user_789"], // Array of mentioned user IDs
  
  // Stats
  reactions_count: 1,
  
  // Metadata
  created_date: Timestamp,
  updated_date: Timestamp,
  is_edited: false,
  is_deleted: false
}
```

**Why This Structure:**

- **Parent comment ID** - Enables threading without separate subcollection
- **Reply count denormalized** - Shows how many replies without querying subcollection
- **Mentions tracked** - For notification purposes
- **Edit tracking** - For transparency

---

### 6. Comment Reactions Subcollection

**Path:** `/lists/{listId}/items/{itemId}/comments/{commentId}/reactions/{reactionId}`

```javascript
{
  reactionId: "reaction_002",
  user_id: "user_789",
  username: "james_brown",
  avatar_url: "https://...",
  emoji: "👍",
  created_date: Timestamp
}
```

---

### 7. Activity Subcollection (for List)

**Path:** `/lists/{listId}/activity/{activityId}`

```javascript
{
  activityId: "activity_001",
  type: "item_added", // or "item_removed", "reaction_added", "comment_added"
  actor_id: "user_123",
  actor_name: "sarah_smith",
  actor_avatar: "https://...",
  
  // What happened
  target_type: "item", // or "reaction", "comment"
  target_id: "item_456",
  
  // Context
  item_data: {
    special_title: "3 Course Set Menu",
    venue_name: "Kapadokya"
  },
  
  // Metadata
  created_date: Timestamp
}
```

**Why This Collection:**

- Enables activity feed display without querying all items
- Supports notifications
- Enables "X added Y to list" posts in home feed

---

### 8. Specials Collection

**Path:** `/specials/{specialId}`

**Document: special_data**

```javascript
{
  specialId: "special_789",
  venue_id: "venue_123",
  venue_name: "Kapadokya",
  special_title: "3 Course Set Menu",
  description: "Enjoy a starter, main course and dessert for just £25",
  price: "£25",
  availability: "Mon-Fri 12-5pm",
  image_url: "https://...",
  cuisine: "Turkish",
  
  // YRW specific
  is_yrw_special: true,
  yrw_booking_url: "https://yorkrestaurantweek.co.uk/...",
  
  // Metadata
  created_date: Timestamp,
  updated_date: Timestamp,
  is_active: true
}
```

**Subcollection: analytics**

```javascript
// Path: /specials/{specialId}/analytics/{analyticsId}
{
  analyticsId: "analytics_001",
  date: "2026-02-08",
  
  // Daily stats
  views: 150,
  saves: 45,
  bookings: 12,
  shares: 8,
  
  // Engagement
  avg_reaction_count: 2.4,
  avg_comment_count: 0.8,
  
  // Breakdown by reaction type
  reaction_breakdown: {
    "👍": 35,
    "🔥": 25,
    "❤️": 10,
    "😋": 5,
    "🤔": 2
  }
}
```

---

### 9. Venues Collection

**Path:** `/venues/{venueId}`

```javascript
{
  venueId: "venue_123",
  name: "Kapadokya",
  address: "59-63 Walmgate, York YO1 9TY",
  phone: "+44 1904 XXX XXX",
  website: "https://...",
  email: "info@kapadokya.com",
  
  // Location
  latitude: 53.9588,
  longitude: -1.0829,
  
  // Details
  cuisine: "Turkish",
  description: "Authentic Turkish restaurant...",
  image_url: "https://...",
  
  // Public opinion (AI-extracted)
  public_opinion: {
    positive_themes: [
      "Praise for quality and presentation of dishes",
      "Welcoming service",
      "Authentic atmosphere"
    ],
    negative_themes: [
      "Can be busy during peak times",
      "Limited vegetarian options"
    ],
    satisfaction_score: 8.2
  },
  
  // Menu
  menu_url: "https://...", // Link to digital menu
  
  // Metadata
  created_date: Timestamp,
  updated_date: Timestamp,
  is_active: true
}
```

---

## Part 3: Notifications & Activity Feed

### Notifications Subcollection

**Path:** `/users/{userId}/notifications/{notificationId}`

```javascript
{
  notificationId: "notif_001",
  type: "item_added", // or "reaction_added", "comment_added", "friend_joined_list"
  
  // Who triggered it
  actor_id: "user_456",
  actor_name: "corrie_jones",
  actor_avatar: "https://...",
  
  // What it's about
  list_id: "list_123",
  list_name: "We Need to Try This",
  item_id: "item_456",
  special_title: "3 Course Set Menu",
  
  // Message
  message: "Corrie added 3 Course Set Menu to 'We Need to Try This'",
  
  // Action
  action_type: "view_list", // or "view_item", "view_comment"
  action_target: "list_123",
  
  // State
  is_read: false,
  is_archived: false,
  
  // Metadata
  created_date: Timestamp,
  read_date: Timestamp (if read)
}
```

**Why Subcollection:**

- Users can have hundreds of notifications
- Subcollection avoids document size limits
- Can query user's notifications efficiently
- Can sort by date and filter by read status

---

### Activity Feed Subcollection

**Path:** `/users/{userId}/activity_feed/{feedId}`

```javascript
{
  feedId: "feed_001",
  type: "friend_added_to_list", // or "friend_reacted", "friend_commented"
  
  // Who did it
  actor_id: "user_456",
  actor_name: "corrie_jones",
  actor_avatar: "https://...",
  
  // What they did
  action: "added",
  
  // Context
  list_id: "list_123",
  list_name: "We Need to Try This",
  item_id: "item_456",
  special_title: "3 Course Set Menu",
  venue_name: "Kapadokya",
  
  // Metadata
  created_date: Timestamp
}
```

**Why Separate from Notifications:**

- Activity feed is for social discovery (what friends are doing)
- Notifications are for personal alerts (things that need your attention)
- Different retention policies (keep activity feed longer)
- Different query patterns

---

## Part 4: Indexing Strategy

### Composite Indexes Required

```
1. Collection: /lists/{listId}/items
   Fields: added_date (Descending), is_archived (Ascending)
   Purpose: Query items by date, excluding archived

2. Collection: /lists/{listId}/items/{itemId}/reactions
   Fields: created_date (Descending)
   Purpose: Get recent reactions

3. Collection: /lists/{listId}/items/{itemId}/comments
   Fields: created_date (Descending), parent_comment_id (Ascending)
   Purpose: Get comments in order, filter by top-level vs replies

4. Collection: /users/{userId}/notifications
   Fields: is_read (Ascending), created_date (Descending)
   Purpose: Get unread notifications first

5. Collection: /users/{userId}/activity_feed
   Fields: created_date (Descending)
   Purpose: Get recent activity

6. Collection: /specials
   Fields: is_active (Ascending), created_date (Descending)
   Purpose: Get active specials, newest first

7. Collection: /specials/{specialId}/analytics
   Fields: date (Descending)
   Purpose: Get analytics by date
```

**Firestore will auto-create single-field indexes. Only composite indexes above need manual creation.**

---

## Part 5: Query Patterns & Optimization

### Query 1: Get List with Items

```javascript
// Get list metadata
const listDoc = await db.collection('lists').doc(listId).get();

// Get items (paginated)
const itemsSnapshot = await db
  .collection('lists')
  .doc(listId)
  .collection('items')
  .where('is_archived', '==', false)
  .orderBy('added_date', 'desc')
  .limit(10)
  .get();

// Cost: 1 read + 1 read = 2 reads per page
```

### Query 2: Get Item with Reactions & Comments

```javascript
// Get item
const itemDoc = await db
  .collection('lists')
  .doc(listId)
  .collection('items')
  .doc(itemId)
  .get();

// Get reactions (paginated)
const reactionsSnapshot = await db
  .collection('lists')
  .doc(listId)
  .collection('items')
  .doc(itemId)
  .collection('reactions')
  .orderBy('created_date', 'desc')
  .limit(100)
  .get();

// Get comments (top-level only, paginated)
const commentsSnapshot = await db
  .collection('lists')
  .doc(listId)
  .collection('items')
  .doc(itemId)
  .collection('comments')
  .where('parent_comment_id', '==', null)
  .orderBy('created_date', 'desc')
  .limit(5)
  .get();

// Cost: 1 read + 1 read + 1 read = 3 reads
```

### Query 3: Get User's Notifications (Unread First)

```javascript
const notificationsSnapshot = await db
  .collection('users')
  .doc(userId)
  .collection('notifications')
  .where('is_read', '==', false)
  .orderBy('created_date', 'desc')
  .limit(20)
  .get();

// Cost: 1 read per notification (20 reads for 20 notifications)
```

### Query 4: Get User's Activity Feed

```javascript
const feedSnapshot = await db
  .collection('users')
  .doc(userId)
  .collection('activity_feed')
  .orderBy('created_date', 'desc')
  .limit(20)
  .get();

// Cost: 1 read per activity (20 reads for 20 activities)
```

### Query 5: Get Special Analytics

```javascript
const analyticsSnapshot = await db
  .collection('specials')
  .doc(specialId)
  .collection('analytics')
  .orderBy('date', 'desc')
  .limit(30) // Last 30 days
  .get();

// Cost: 1 read per day (30 reads for 30 days)
```

---

## Part 6: Real-time Listeners

### Listen to List Items (for Live Updates)

```javascript
db.collection('lists')
  .doc(listId)
  .collection('items')
  .where('is_archived', '==', false)
  .orderBy('added_date', 'desc')
  .onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        // New item added
      } else if (change.type === 'modified') {
        // Item modified (reactions/comments updated)
      } else if (change.type === 'removed') {
        // Item removed
      }
    });
  });
```

### Listen to Comments on Item (for Live Updates)

```javascript
db.collection('lists')
  .doc(listId)
  .collection('items')
  .doc(itemId)
  .collection('comments')
  .where('parent_comment_id', '==', null)
  .orderBy('created_date', 'desc')
  .onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        // New comment added
      }
    });
  });
```

---

## Part 7: Write Operations & Transactions

### Add Item to List

```javascript
const batch = db.batch();

// 1. Add item to items subcollection
const itemRef = db
  .collection('lists')
  .doc(listId)
  .collection('items')
  .doc();

batch.set(itemRef, {
  itemId: itemRef.id,
  list_id: listId,
  special_id: specialId,
  special: specialData,
  added_by: currentUser,
  stats: {
    reactions_count: 0,
    comments_count: 0,
    reaction_types: { "👍": 0, "🔥": 0, "❤️": 0, "😋": 0, "🤔": 0 }
  },
  added_date: FieldValue.serverTimestamp(),
  updated_date: FieldValue.serverTimestamp(),
  is_archived: false
});

// 2. Update list stats
const listRef = db.collection('lists').doc(listId);
batch.update(listRef, {
  'stats.items_count': FieldValue.increment(1),
  'stats.last_activity': FieldValue.serverTimestamp(),
  updated_date: FieldValue.serverTimestamp()
});

// 3. Add activity log
const activityRef = db
  .collection('lists')
  .doc(listId)
  .collection('activity')
  .doc();

batch.set(activityRef, {
  activityId: activityRef.id,
  type: 'item_added',
  actor_id: currentUser.userId,
  actor_name: currentUser.username,
  actor_avatar: currentUser.avatar_url,
  target_type: 'item',
  target_id: itemRef.id,
  item_data: {
    special_title: specialData.special_title,
    venue_name: specialData.venue_name
  },
  created_date: FieldValue.serverTimestamp()
});

// 4. Add to user's activity feed (for friends to see)
const feedRef = db
  .collection('users')
  .doc(currentUser.userId)
  .collection('activity_feed')
  .doc();

batch.set(feedRef, {
  feedId: feedRef.id,
  type: 'friend_added_to_list',
  actor_id: currentUser.userId,
  actor_name: currentUser.username,
  actor_avatar: currentUser.avatar_url,
  action: 'added',
  list_id: listId,
  list_name: listData.name,
  item_id: itemRef.id,
  special_title: specialData.special_title,
  venue_name: specialData.venue_name,
  created_date: FieldValue.serverTimestamp()
});

// 5. Send notifications to collaborators
// (This would be done via Cloud Function, not in transaction)

await batch.commit();
```

**Cost:** 4 writes (item + list update + activity + feed)

---

### Add Reaction to Item

```javascript
const batch = db.batch();

// 1. Add reaction
const reactionRef = db
  .collection('lists')
  .doc(listId)
  .collection('items')
  .doc(itemId)
  .collection('reactions')
  .doc();

batch.set(reactionRef, {
  reactionId: reactionRef.id,
  user_id: currentUser.userId,
  username: currentUser.username,
  avatar_url: currentUser.avatar_url,
  emoji: emoji,
  created_date: FieldValue.serverTimestamp()
});

// 2. Update item stats
const itemRef = db
  .collection('lists')
  .doc(listId)
  .collection('items')
  .doc(itemId);

batch.update(itemRef, {
  'stats.reactions_count': FieldValue.increment(1),
  [`stats.reaction_types.${emoji}`]: FieldValue.increment(1),
  updated_date: FieldValue.serverTimestamp()
});

// 3. Update list stats
const listRef = db.collection('lists').doc(listId);
batch.update(listRef, {
  'stats.last_activity': FieldValue.serverTimestamp(),
  updated_date: FieldValue.serverTimestamp()
});

// 4. Add activity log
const activityRef = db
  .collection('lists')
  .doc(listId)
  .collection('activity')
  .doc();

batch.set(activityRef, {
  activityId: activityRef.id,
  type: 'reaction_added',
  actor_id: currentUser.userId,
  actor_name: currentUser.username,
  actor_avatar: currentUser.avatar_url,
  target_type: 'item',
  target_id: itemId,
  item_data: {
    special_title: itemData.special.special_title,
    venue_name: itemData.special.venue_name
  },
  created_date: FieldValue.serverTimestamp()
});

await batch.commit();
```

**Cost:** 4 writes (reaction + item update + list update + activity)

---

### Add Comment to Item

```javascript
const batch = db.batch();

// 1. Add comment
const commentRef = db
  .collection('lists')
  .doc(listId)
  .collection('items')
  .doc(itemId)
  .collection('comments')
  .doc();

batch.set(commentRef, {
  commentId: commentRef.id,
  item_id: itemId,
  list_id: listId,
  text: commentText,
  author: {
    userId: currentUser.userId,
    username: currentUser.username,
    avatar_url: currentUser.avatar_url
  },
  parent_comment_id: parentCommentId || null,
  reply_count: 0,
  mentions: extractMentions(commentText),
  reactions_count: 0,
  created_date: FieldValue.serverTimestamp(),
  updated_date: FieldValue.serverTimestamp(),
  is_edited: false,
  is_deleted: false
});

// 2. Update item stats
const itemRef = db
  .collection('lists')
  .doc(listId)
  .collection('items')
  .doc(itemId);

batch.update(itemRef, {
  'stats.comments_count': FieldValue.increment(1),
  updated_date: FieldValue.serverTimestamp()
});

// 3. Update parent comment reply count (if reply)
if (parentCommentId) {
  const parentRef = db
    .collection('lists')
    .doc(listId)
    .collection('items')
    .doc(itemId)
    .collection('comments')
    .doc(parentCommentId);

  batch.update(parentRef, {
    reply_count: FieldValue.increment(1)
  });
}

// 4. Update list stats
const listRef = db.collection('lists').doc(listId);
batch.update(listRef, {
  'stats.last_activity': FieldValue.serverTimestamp(),
  updated_date: FieldValue.serverTimestamp()
});

// 5. Add activity log
const activityRef = db
  .collection('lists')
  .doc(listId)
  .collection('activity')
  .doc();

batch.set(activityRef, {
  activityId: activityRef.id,
  type: 'comment_added',
  actor_id: currentUser.userId,
  actor_name: currentUser.username,
  actor_avatar: currentUser.avatar_url,
  target_type: 'comment',
  target_id: commentRef.id,
  item_data: {
    special_title: itemData.special.special_title,
    venue_name: itemData.special.venue_name
  },
  created_date: FieldValue.serverTimestamp()
});

await batch.commit();
```

**Cost:** 5 writes (comment + item update + parent comment update + list update + activity)

---

## Part 8: Cloud Functions for Notifications

### Function 1: Notify Collaborators When Item Added

```javascript
exports.notifyCollaboratorsItemAdded = functions.firestore
  .document('lists/{listId}/items/{itemId}')
  .onCreate(async (snap, context) => {
    const { listId } = context.params;
    const itemData = snap.data();

    // Get list metadata to find collaborators
    const listDoc = await admin
      .firestore()
      .collection('lists')
      .doc(listId)
      .get();

    const listData = listDoc.data();
    const collaborators = listData.collaborators;

    // Send notification to each collaborator (except the one who added it)
    const batch = admin.firestore().batch();

    collaborators.forEach((collaborator) => {
      if (collaborator.userId !== itemData.added_by.userId) {
        const notifRef = admin
          .firestore()
          .collection('users')
          .doc(collaborator.userId)
          .collection('notifications')
          .doc();

        batch.set(notifRef, {
          notificationId: notifRef.id,
          type: 'item_added',
          actor_id: itemData.added_by.userId,
          actor_name: itemData.added_by.username,
          actor_avatar: itemData.added_by.avatar_url,
          list_id: listId,
          list_name: listData.name,
          item_id: snap.id,
          special_title: itemData.special.special_title,
          message: `${itemData.added_by.username} added ${itemData.special.special_title} to '${listData.name}'`,
          action_type: 'view_list',
          action_target: listId,
          is_read: false,
          is_archived: false,
          created_date: admin.firestore.FieldValue.serverTimestamp(),
          read_date: null
        });
      }
    });

    await batch.commit();
  });
```

### Function 2: Notify User When Someone Reacts

```javascript
exports.notifyUserReactionAdded = functions.firestore
  .document('lists/{listId}/items/{itemId}/reactions/{reactionId}')
  .onCreate(async (snap, context) => {
    const { listId, itemId } = context.params;
    const reactionData = snap.data();

    // Get item to find who added it
    const itemDoc = await admin
      .firestore()
      .collection('lists')
      .doc(listId)
      .collection('items')
      .doc(itemId)
      .get();

    const itemData = itemDoc.data();

    // Don't notify if reacting to own item
    if (itemData.added_by.userId === reactionData.user_id) {
      return;
    }

    // Send notification
    const notifRef = admin
      .firestore()
      .collection('users')
      .doc(itemData.added_by.userId)
      .collection('notifications')
      .doc();

    await notifRef.set({
      notificationId: notifRef.id,
      type: 'reaction_added',
      actor_id: reactionData.user_id,
      actor_name: reactionData.username,
      actor_avatar: reactionData.avatar_url,
      list_id: listId,
      list_name: listData.name,
      item_id: itemId,
      special_title: itemData.special.special_title,
      message: `${reactionData.username} reacted ${reactionData.emoji} to your special`,
      action_type: 'view_item',
      action_target: itemId,
      is_read: false,
      is_archived: false,
      created_date: admin.firestore.FieldValue.serverTimestamp(),
      read_date: null
    });
  });
```

---

## Part 9: Cost Optimization

### Estimated Monthly Costs (for 1000 active users)

**Assumptions:**
- 100 lists active
- 5 items per list on average
- 3 reactions per item on average
- 2 comments per item on average
- 10 notifications per user per day

**Read Operations:**
- Loading lists: 100 lists × 30 days = 3,000 reads
- Loading items: 500 items × 30 days = 15,000 reads
- Loading reactions: 1,500 reactions × 30 days = 45,000 reads
- Loading comments: 1,000 comments × 30 days = 30,000 reads
- Loading notifications: 1,000 users × 10 notifs × 30 days = 300,000 reads
- **Total reads: ~393,000/month**

**Write Operations:**
- Adding items: 500 items × 4 writes = 2,000 writes
- Adding reactions: 1,500 reactions × 4 writes = 6,000 writes
- Adding comments: 1,000 comments × 5 writes = 5,000 writes
- **Total writes: ~13,000/month**

**Cost Breakdown (at $0.06 per 100K reads, $0.18 per 100K writes):**
- Reads: 393,000 / 100,000 × $0.06 = ~$2.36
- Writes: 13,000 / 100,000 × $0.18 = ~$0.02
- **Total: ~$2.38/month** (very cheap!)

**Optimization Tips:**
1. Use pagination (limit results to 10-20 items)
2. Cache frequently accessed data locally
3. Batch notifications (don't send immediately)
4. Archive old lists to reduce active data
5. Use Cloud Functions to clean up old notifications

---

## Part 10: Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth.uid == userId || resource.data.is_public == true;
      allow write: if request.auth.uid == userId;
      
      match /followers/{followerId} {
        allow read: if true;
        allow write: if request.auth.uid == userId;
      }
      
      match /following/{followingId} {
        allow read: if true;
        allow write: if request.auth.uid == userId;
      }
      
      match /saved_lists/{listId} {
        allow read: if request.auth.uid == userId;
        allow write: if request.auth.uid == userId;
      }
      
      match /notifications/{notificationId} {
        allow read: if request.auth.uid == userId;
        allow write: if request.auth.uid == userId;
      }
    }
    
    // Lists collection
    match /lists/{listId} {
      allow read: if resource.data.is_public == true || 
                     request.auth.uid in resource.data.collaborators[*].userId;
      allow create: if request.auth.uid != null;
      allow update: if request.auth.uid == resource.data.owner_id;
      allow delete: if request.auth.uid == resource.data.owner_id;
      
      match /items/{itemId} {
        allow read: if get(/databases/$(database)/documents/lists/$(listId)).data.is_public == true ||
                       request.auth.uid in get(/databases/$(database)/documents/lists/$(listId)).data.collaborators[*].userId;
        allow create: if request.auth.uid in get(/databases/$(database)/documents/lists/$(listId)).data.collaborators[*].userId;
        allow update: if request.auth.uid == resource.data.added_by.userId;
        allow delete: if request.auth.uid == resource.data.added_by.userId;
        
        match /reactions/{reactionId} {
          allow read: if true;
          allow create: if request.auth.uid != null;
          allow delete: if request.auth.uid == resource.data.user_id;
        }
        
        match /comments/{commentId} {
          allow read: if true;
          allow create: if request.auth.uid != null;
          allow update: if request.auth.uid == resource.data.author.userId;
          allow delete: if request.auth.uid == resource.data.author.userId;
          
          match /reactions/{reactionId} {
            allow read: if true;
            allow create: if request.auth.uid != null;
            allow delete: if request.auth.uid == resource.data.user_id;
          }
        }
      }
      
      match /activity/{activityId} {
        allow read: if get(/databases/$(database)/documents/lists/$(listId)).data.is_public == true ||
                       request.auth.uid in get(/databases/$(database)/documents/lists/$(listId)).data.collaborators[*].userId;
      }
    }
    
    // Specials collection
    match /specials/{specialId} {
      allow read: if true;
      allow write: if request.auth.uid != null; // Only admins in practice
      
      match /analytics/{analyticsId} {
        allow read: if true;
      }
    }
    
    // Venues collection
    match /venues/{venueId} {
      allow read: if true;
      allow write: if request.auth.uid != null; // Only admins in practice
    }
  }
}
```

---

## Summary

This Firebase architecture is designed to support LOKI's collaborative planning features while maintaining performance and cost efficiency. Key design decisions include:

1. **Denormalization** - Store frequently accessed data together (special info with items, collaborators with lists)
2. **Subcollections** - Use for one-to-many relationships that can grow large (reactions, comments, notifications)
3. **Activity Tracking** - Maintain separate activity logs for notifications and feed generation
4. **Real-time Updates** - Structure data to support efficient real-time listeners
5. **Cost Optimization** - Minimize read/write operations through smart data modeling

The estimated monthly cost is very low (~$2-3 for 1000 active users), making this architecture highly scalable and cost-effective for your launch.
