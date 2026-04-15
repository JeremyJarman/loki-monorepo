/**
 * Firestore collection and subcollection path constants for Phase 1 social features.
 * Use these so admin and frontend stay in sync. Document IDs are not included.
 */

// Top-level collections
export const COLLECTION_USERS = 'users';
export const COLLECTION_LISTS = 'lists';
export const COLLECTION_VENUES = 'venues';
export const COLLECTION_ARTISTS = 'artists';
export const COLLECTION_EXPERIENCES = 'experiences';
export const COLLECTION_EXPERIENCE_INSTANCES = 'experienceInstances';
/** Subcollection: experienceInstances/{instanceId}/comments — see EventInstanceCommentDoc */

// users/{userId} subcollections
export const SUBCOLLECTION_FOLLOWERS = 'followers';
export const SUBCOLLECTION_FOLLOWING = 'following';
export const SUBCOLLECTION_SAVED_LISTS = 'saved_lists';
export const SUBCOLLECTION_NOTIFICATIONS = 'notifications';
export const SUBCOLLECTION_ACTIVITY_FEED = 'activity_feed';

// lists/{listId} subcollections
export const SUBCOLLECTION_ITEMS = 'items';
export const SUBCOLLECTION_ACTIVITY = 'activity';
export const SUBCOLLECTION_COLLABORATORS = 'collaborators';

// lists/{listId}/items/{itemId} subcollections
export const SUBCOLLECTION_REACTIONS = 'reactions';
export const SUBCOLLECTION_COMMENTS = 'comments';
/** Per-user event intent: interested / going (doc id = userId). */
export const SUBCOLLECTION_EVENT_RSVP = 'event_rsvp';

// lists/{listId}/items/{itemId}/comments/{commentId} subcollections (comment reactions)
// Same name as item reactions; path distinguishes them.
export const SUBCOLLECTION_COMMENT_REACTIONS = 'reactions';
