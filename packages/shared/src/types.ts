// Core data types for the LOKI system (shared across admin, web, mobile)

import { Timestamp } from 'firebase/firestore';

// Time range for opening hours
export interface TimeRange {
  open: string;  // HH:mm format
  close: string; // HH:mm format (can be < open for overnight)
  kitchenClose?: string; // HH:mm format - when kitchen closes (optional)
}

// Venue structure
export interface Venue {
  id: string;
  name: string;
  timezone: string; // e.g., "Europe/Dublin"

  location: {
    lat: number;
    lng: number;
  };

  openingHours: {
    monday: TimeRange[];
    tuesday: TimeRange[];
    wednesday: TimeRange[];
    thursday: TimeRange[];
    friday: TimeRange[];
    saturday: TimeRange[];
    sunday: TimeRange[];
  };

  hasActiveExperience: boolean;
  nextExperienceAt: Timestamp | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Additional optional fields for display/management
  description?: string;
  introduction?: string;
  offeringsAndMenu?: string;
  designAndAtmosphere?: string;
  publicOpinionHighlights?: string;
  satisfactionScore?: number;
  address?: string;
  atmosphere?: string;
  phone?: string;
  email?: string;
  imageUrl?: string[];
  foodImageUrl?: string[];
  menuImageUrl?: string[];
  /** Focus position for 1:1 crop per image: 'center' | 'top' | 'bottom' | 'left' | 'right'. Same order as imageUrl. */
  imageFocus?: string[];
  foodImageFocus?: string[];
  menuImageFocus?: string[];
  /** URL of uploaded menu PDF (optional) */
  menuPdfUrl?: string;
  establishmentType?: string;
  currency?: string; // Currency code (e.g., 'EUR', 'USD', 'GBP')
  handle?: string; // URL-safe unique handle (3-40 chars, a-z 0-9 -)
  websiteUrl?: string;
  instagramUrl?: string;
  /** Venue's current booking/reservation link (e.g. Resy, OpenTable, or custom). */
  bookingUrl?: string;
  ownerId?: string | null;
  claimed?: boolean;
  visibility?: boolean; // default true - hide from feed when false
  menuSections?: MenuSection[];
  experiences?: VenueExperience[];
  tags?: string[]; // Array of selected tag strings
}

// Venue Experience Reference
export interface VenueExperience {
  experienceId: string;
  /** Visibility in feed (default true). Same meaning as venue visibility. */
  visibility?: boolean;
  /** @deprecated Use visibility. Kept for backward compatibility when reading Firestore. */
  isActive?: boolean;
}

// Experience (the definition/idea)
export interface Experience {
  id: string;
  venueId: string;
  type: 'event' | 'special';

  title: string;
  description: string;
  imageUrl: string | null;
  cost: number | null; // in euros (e.g., 15 or 15.50)
  /** When true, cost is shown as "£10 pp" (per person) on specials. Specials only. */
  costPerPerson?: boolean;
  tags?: string[]; // Array of special/event tags (e.g., "Happy Hour", "Meal Deal")
  genre?: string; // Music genre - shown when "Live Music" or "DJ Night" tags are selected

  isRecurring: boolean;

  recurrenceRule: null | {
    daySchedules: { [day: number]: { startTime: string; endTime: string } }; // 0 = Sunday, 6 = Saturday
    startDate?: Timestamp;
    endDate?: Timestamp;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Experience Instance (time-indexed)
export interface ExperienceInstance {
  id: string;
  experienceId: string;
  venueId: string;

  type: 'event' | 'special';
  title: string;

  startAt: Timestamp; // UTC
  endAt: Timestamp;   // UTC

  createdAt: Timestamp;
}

// Menu types
export interface MenuItemMacros {
  protein?: number; // grams
  carbs?: number;   // grams
  fat?: number;     // grams
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  allergens?: string[]; // e.g. ['Gluten', 'Dairy', 'Nuts']
  /** Dietary: item is suitable for vegan diet */
  vegan?: boolean;
  /** Dietary: item is suitable for vegetarian diet */
  vegetarian?: boolean;
  /** Dietary: item is gluten free */
  glutenFree?: boolean;
  /** Calories per serving (optional) */
  calories?: number;
  /** Macros in grams (optional, shown when calories are set) */
  macros?: MenuItemMacros;
  /** Spice level 0–3 (0 = none, 3 = hottest); shown as chilli icons */
  spiceLevel?: number;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
  order?: number; // Order index for sorting sections
}

// ─── Phase 1: Social (lists, reactions, comments, notifications) ───
// Naming follows current codebase: profileImageUrl (not avatar_url), displayName, imageUrl.
// Specials are referenced by experienceId (experiences collection, type 'special').

/** User reference for display in lists, reactions, comments, activity. */
export interface UserRef {
  userId: string;
  displayName?: string;
  profileImageUrl?: string;
}

/** List metadata document at lists/{listId}. */
export interface ListMetadata {
  listId: string;
  name: string;
  description?: string;
  ownerId: string;
  /** Collaborators (denormalized for quick access). */
  collaborators: CollaboratorRef[];
  isPublic: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  stats: {
    itemsCount: number;
    totalReactions: number;
    totalComments: number;
    lastActivityAt: Timestamp | null;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActivityAt: Timestamp | null;
}

export interface CollaboratorRef {
  userId: string;
  displayName?: string;
  profileImageUrl?: string;
  role: 'owner' | 'collaborator';
  addedAt: Timestamp;
}

/** Denormalised special/venue info for display on a list item (from experiences + venues). */
export interface ListItemSpecial {
  venueId: string;
  venueName: string;
  specialTitle: string;
  /** Display price e.g. "£25" */
  price?: string;
  /** Numeric cost for sorting/display when available */
  cost?: number | null;
  costPerPerson?: boolean;
  currency?: string;
  availability?: string;
  imageUrl: string | null;
  cuisine?: string;
}

/** List item document at lists/{listId}/items/{itemId}. References experience (type 'special') by experienceId. */
export interface ListItemDoc {
  itemId: string;
  listId: string;
  experienceId: string;
  special: ListItemSpecial;
  addedBy: UserRef;
  stats: {
    reactionsCount: number;
    commentsCount: number;
    reactionTypes: Record<string, number>;
  };
  addedAt: Timestamp;
  updatedAt: Timestamp;
  isArchived: boolean;
}

/** Reaction document at lists/{listId}/items/{itemId}/reactions/{reactionId}. */
export interface ListItemReactionDoc {
  reactionId: string;
  userId: string;
  displayName?: string;
  profileImageUrl?: string;
  emoji: string;
  createdAt: Timestamp;
}

/** Comment document at lists/{listId}/items/{itemId}/comments/{commentId}. */
export interface ListItemCommentDoc {
  commentId: string;
  itemId: string;
  listId: string;
  text: string;
  author: UserRef;
  parentCommentId: string | null;
  replyCount: number;
  mentions: string[];
  reactionsCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isEdited: boolean;
  isDeleted: boolean;
}

/** Activity log at lists/{listId}/activity/{activityId}. */
export interface ListActivityDoc {
  activityId: string;
  type: 'item_added' | 'item_removed' | 'reaction_added' | 'comment_added';
  actorId: string;
  actorDisplayName?: string;
  actorProfileImageUrl?: string;
  targetType: 'item' | 'reaction' | 'comment';
  targetId: string;
  itemData?: { specialTitle: string; venueName: string };
  createdAt: Timestamp;
}

/** User's saved list reference at users/{userId}/saved_lists/{listId}. */
export interface SavedListRefDoc {
  listId: string;
  listName: string;
  ownerId: string;
  savedAt: Timestamp;
  isOwner: boolean;
}

/** Follower reference at users/{userId}/followers/{followerId}. */
export interface FollowerRefDoc {
  followerId: string;
  displayName?: string;
  profileImageUrl?: string;
  followedAt: Timestamp;
}

/** Following reference at users/{userId}/following/{followingId}. */
export interface FollowingRefDoc {
  followingId: string;
  displayName?: string;
  profileImageUrl?: string;
  followedAt: Timestamp;
}

/** Notification at users/{userId}/notifications/{notificationId}. */
export interface NotificationDoc {
  notificationId: string;
  type: 'item_added' | 'reaction_added' | 'comment_added' | 'friend_joined_list';
  actorId: string;
  actorDisplayName?: string;
  actorProfileImageUrl?: string;
  listId?: string;
  listName?: string;
  itemId?: string;
  specialTitle?: string;
  message: string;
  actionType: 'view_list' | 'view_item' | 'view_comment';
  actionTarget: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: Timestamp;
  readAt: Timestamp | null;
}

/** Activity feed entry at users/{userId}/activity_feed/{feedId}. */
export interface ActivityFeedDoc {
  feedId: string;
  type: 'friend_added_to_list' | 'friend_reacted' | 'friend_commented';
  actorId: string;
  actorDisplayName?: string;
  actorProfileImageUrl?: string;
  action: string;
  listId?: string;
  listName?: string;
  itemId?: string;
  specialTitle?: string;
  venueName?: string;
  createdAt: Timestamp;
}
