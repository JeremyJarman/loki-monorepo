import type { UserRef } from '@loki/shared';
import type { EventCardItem } from '@/components/EventCard';
import {
  addEventListItem,
  findListItemIdsByInstanceIds,
  getEventRsvp,
  removeListItem,
  setEventRsvp,
} from './lists';
import { ensureDefaultInterestedList, getDefaultInterestedListId } from './defaultInterestedList';
import { eventCardItemToListItemEvent } from './eventListItemFromCard';

/**
 * Sync the user's default Interested list and RSVP from discover (or any full event card).
 * Removes the list item when both flags are cleared.
 */
export async function syncDefaultInterestedListAttendance(
  userId: string,
  userRef: UserRef,
  item: EventCardItem,
  next: { interested: boolean; going: boolean }
): Promise<void> {
  const listId = await ensureDefaultInterestedList(userId, userRef);
  const existingMap = await findListItemIdsByInstanceIds(listId, [item.instanceId]);
  const existingItemId = existingMap.get(item.instanceId) ?? null;

  if (!next.interested && !next.going) {
    if (existingItemId) {
      await setEventRsvp(listId, existingItemId, userRef, next, item.instanceId);
      await removeListItem(listId, existingItemId);
    }
    return;
  }

  if (!existingItemId) {
    const listEvent = eventCardItemToListItemEvent(item);
    const newItemId = await addEventListItem(
      listId,
      item.instanceId,
      item.experienceId,
      userRef,
      listEvent
    );
    await setEventRsvp(listId, newItemId, userRef, next, item.instanceId);
    return;
  }

  await setEventRsvp(listId, existingItemId, userRef, next, item.instanceId);
}

/**
 * Load attendance for many events on the default Interested list (instanceId → state).
 */
export async function loadDefaultInterestedAttendanceMap(
  userId: string,
  instanceIds: string[]
): Promise<Record<string, { interested: boolean; going: boolean }>> {
  const listId = await getDefaultInterestedListId(userId);
  const out: Record<string, { interested: boolean; going: boolean }> = {};
  if (!listId || instanceIds.length === 0) return out;

  const itemByInstance = await findListItemIdsByInstanceIds(listId, instanceIds);
  await Promise.all(
    instanceIds.map(async (instanceId) => {
      const itemDocId = itemByInstance.get(instanceId);
      if (!itemDocId) return;
      const rsvp = await getEventRsvp(listId, itemDocId, userId);
      if (rsvp && (rsvp.interested || rsvp.going)) {
        out[instanceId] = rsvp;
      }
    })
  );
  return out;
}
