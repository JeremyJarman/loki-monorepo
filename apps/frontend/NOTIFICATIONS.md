# Notifications – data structure and setup

## Where notifications live

Each user has their own notifications subcollection:

- **Path:** `users/{userId}/notifications/{notificationId}`
- **Who gets notified:** Only that user (the recipient) can read/update/delete. Creates are restricted so only the **actor** (the user who performed the action) can create a notification doc.

## Notification document shape

Defined in `@loki/shared` as `NotificationDoc`:

| Field | Purpose |
|-------|--------|
| `notificationId` | Same as doc id |
| `type` | `'item_added' \| 'reaction_added' \| 'comment_added' \| 'friend_joined_list'` |
| `actorId`, `actorDisplayName`, `actorProfileImageUrl` | Who did the action |
| `listId`, `listName` | List context |
| `itemId`, `specialTitle` | Item context (for item_added) |
| `message` | Human-readable text, e.g. "Alice added Sunday roast to Weekend ideas" |
| `actionType` | `'view_list' \| 'view_item' \| 'view_comment'` |
| `actionTarget` | Target for the app (e.g. `listId#itemId` for deep link) |
| `isRead`, `readAt`, `isArchived`, `createdAt` | Read state and timestamp |

## When notifications are created

- **Item added to a list** – When `addListItem` runs, `notifyListCollaborators` is called. Every list collaborator **except** the person who added the item gets a notification (type `item_added`).
- **Comment added** – When `addComment` runs, every list collaborator **except** the comment author gets a notification (type `comment_added`).

Recipients are taken from the list’s `collaboratorIds` (or `collaborators` if that’s missing). The list doc is read once to get recipient ids and list name; then one notification doc is written per recipient under `users/{recipientId}/notifications/`.

## Firestore rules

Under `users/{userId}` add:

- **notifications/{notificationId}**
  - `read`, `update`, `delete`: only if `request.auth.uid == userId` (the recipient).
  - `create`: only if `request.auth.uid == request.resource.data.actorId` (only the actor can create notifications, to avoid spam).

See `apps/admin/FIRESTORE_RULES_CHECKLIST.md` for the full rules block.

## Frontend usage

- **Writing:** `lib/notifications.ts` – `createNotification`, `notifyListCollaborators`. Called from `lib/lists.ts` in `addListItem` and `addComment` (fire-and-forget; failures are logged and do not block the main action).
- **Reading:** Not implemented yet. To show a notification list or badge you would:
  - Query `users/{currentUserId}/notifications` with `orderBy('createdAt', 'desc')` and optionally `where('isRead', '==', false)`.
  - Use `actionTarget` to link to the list/item/comment (e.g. `/lists/{listId}` or `#itemId`).
  - Mark as read with `updateDoc(notificationRef, { isRead: true, readAt: serverTimestamp() })`.
