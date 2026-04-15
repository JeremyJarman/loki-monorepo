import { Timestamp } from 'firebase/firestore';
import type { ListItemEvent } from '@loki/shared';
import type { EventCardItem } from '@/components/EventCard';

export function eventCardItemToListItemEvent(item: EventCardItem): ListItemEvent {
  return {
    instanceId: item.instanceId,
    experienceId: item.experienceId,
    venueId: item.venueId,
    venueName: item.venueName,
    eventTitle: item.title,
    artistName: item.artistName,
    artistId: item.artistId,
    startAt: Timestamp.fromDate(item.startAt),
    genre: item.genre,
    cost: item.cost ?? null,
    currency: item.currency,
    imageUrl: item.imageUrl,
    capacityStatus: item.capacityStatus,
    bookingRequired: item.bookingRequired === true ? true : undefined,
    bookingLink: item.bookingLink?.trim() ? item.bookingLink.trim() : null,
  };
}
