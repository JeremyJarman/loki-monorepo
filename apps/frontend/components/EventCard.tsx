'use client';

import { useState, useRef, useEffect, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import { Bookmark, Share2, MapPin, Calendar, Music2, Star, CheckCircle2, ChevronDown, X, Check, ExternalLink, MessageCircle, UserCheck } from 'lucide-react';
import type { UserRef } from '@loki/shared';
import { EventCommentsBottomSheet } from '@/components/EventCommentsBottomSheet';
import { getEventInstanceCommentCount } from '@/lib/eventComments';

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CZK: 'Kč',
  HUF: 'Ft',
};

function getCurrencySymbol(currencyCode?: string): string {
  return (currencyCode && CURRENCY_SYMBOLS[currencyCode]) || '€';
}

export interface EventCardItem {
  id: string;
  instanceId: string;
  experienceId: string;
  title: string;
  artistName?: string;
  /** When set, artist name links to /artists/{artistId} */
  artistId?: string;
  description?: string;
  imageUrl: string | null;
  venueId: string;
  venueName: string;
  venueAddress?: string;
  venueTimezone?: string;
  startAt: Date;
  endAt: Date;
  genre?: string;
  cost: number | null;
  currency: string;
  capacityStatus?: 'sold_out' | 'limited' | 'open';
  /** Tickets or RSVP must be completed via external booking. */
  bookingRequired?: boolean;
  /** External URL to book or RSVP (if provided, shown as primary booking action). */
  bookingLink?: string | null;
}

function formatEventDateTime(startAt: Date, timezone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  if (timezone) {
    return startAt.toLocaleString(undefined, { ...opts, timeZone: timezone });
  }
  return startAt.toLocaleString(undefined, opts);
}

function capacityStatusLabel(status?: EventCardItem['capacityStatus']): string {
  switch (status) {
    case 'sold_out': return 'Sold out';
    case 'limited': return 'Limited spots';
    case 'open': return 'Open';
    default: return '';
  }
}

function toGoogleCalendarDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export type EventAttendanceState = {
  interested: boolean;
  going: boolean;
};

/** Global totals for an experience instance (all users). */
export type EventAttendanceCounts = {
  interested: number;
  going: number;
};

export function EventCard({
  item,
  onSave,
  detailHref,
  returnTo,
  attendance,
  onAttendanceChange,
  attendanceBusy,
  attendanceCounts,
  commentsAuthorRef,
  commentsCurrentUserId,
  commentsLoginReturnTo,
  defaultDescriptionExpanded = false,
}: {
  item: EventCardItem;
  onSave?: (item: EventCardItem) => void;
  detailHref?: string;
  returnTo?: string;
  /** When set with onAttendanceChange, shows Interested / Going toggles. Pass null while loading. */
  attendance?: EventAttendanceState | null;
  onAttendanceChange?: (next: EventAttendanceState) => void | Promise<void>;
  attendanceBusy?: boolean;
  /** When set, shows aggregate interested / going counts for this event instance. */
  attendanceCounts?: EventAttendanceCounts | null;
  /** Profile for posting event comments; null when logged out (sheet is read-only + sign-in). */
  commentsAuthorRef?: UserRef | null;
  commentsCurrentUserId?: string | null;
  /** Path for login returnTo when adding comments (defaults to returnTo or /discover). */
  commentsLoginReturnTo?: string;
  /** Render description expanded initially (useful on detail pages). */
  defaultDescriptionExpanded?: boolean;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [expanded, setExpanded] = useState(defaultDescriptionExpanded);
  const [isClamped, setIsClamped] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const id = item.instanceId?.trim();
    if (!id) {
      setCommentCount(null);
      return;
    }
    let cancelled = false;
    setCommentCount(null);
    getEventInstanceCommentCount(id)
      .then((n) => {
        if (!cancelled) setCommentCount(n);
      })
      .catch(() => {
        if (!cancelled) setCommentCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [item.instanceId]);

  const onVisibleCommentCountChange = useCallback((n: number) => {
    setCommentCount(n);
  }, []);

  useEffect(() => {
    if (!item.description || expanded) {
      setIsClamped(false);
      return;
    }
    const el = descriptionRef.current;
    if (!el) return;
    setIsClamped(el.scrollHeight > el.clientHeight);
  }, [item.description, expanded]);

  const symbol = getCurrencySymbol(item.currency);
  const costDisplay =
    item.cost != null && item.cost > 0
      ? (Number.isInteger(item.cost) ? `${symbol}${item.cost}` : `${symbol}${item.cost.toFixed(2)}`)
      : 'Free';

  const showAttendance = attendance != null && onAttendanceChange;
  const interestedActive = attendance?.interested === true;
  const goingActive = attendance?.going === true;
  const hasAttendance = interestedActive || goingActive;

  const [attendanceMenuOpen, setAttendanceMenuOpen] = useState(false);
  const attendanceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!attendanceMenuOpen) return;
    const close = (e: Event) => {
      if (attendanceMenuRef.current && !attendanceMenuRef.current.contains(e.target as Node)) {
        setAttendanceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [attendanceMenuOpen]);

  const applyAttendanceChoice = (mode: 'interested' | 'going' | 'clear') => {
    if (!onAttendanceChange || attendanceBusy || !attendance) return;
    if (mode === 'clear') void onAttendanceChange({ interested: false, going: false });
    if (mode === 'interested') void onAttendanceChange({ interested: true, going: false });
    if (mode === 'going') void onAttendanceChange({ interested: false, going: true });
    setAttendanceMenuOpen(false);
  };

  const mapsQueryUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([item.venueName, item.venueAddress].filter(Boolean).join(', '))}`;
  const calendarText = [item.title, item.artistName].filter(Boolean).join(' · ');
  const calendarDetails = [item.description, item.venueName, item.venueAddress].filter(Boolean).join('\n');
  const calendarDates = `${toGoogleCalendarDate(item.startAt)}/${toGoogleCalendarDate(item.endAt)}`;
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calendarText)}&dates=${encodeURIComponent(calendarDates)}&details=${encodeURIComponent(calendarDetails)}&location=${encodeURIComponent([item.venueName, item.venueAddress].filter(Boolean).join(', '))}`;
  const eventCommentsLoginPath =
    (commentsLoginReturnTo?.trim() || returnTo?.trim() || '/discover').replace(/^(?!\/)/, '/');
  const canCommentOnInstance = Boolean(item.instanceId?.trim());

  const artistIdTrimmed = item.artistId?.trim();
  const artistProfileHref =
    artistIdTrimmed != null && artistIdTrimmed !== ''
      ? returnTo
        ? `/artists/${artistIdTrimmed}?returnTo=${encodeURIComponent(returnTo)}`
        : `/artists/${artistIdTrimmed}`
      : null;

  const artistNameClassName =
    'font-heading font-bold text-xl sm:text-2xl leading-tight tracking-tight !text-white min-w-0 flex-1 [text-shadow:0_1px_2px_rgba(0,0,0,0.65),0_2px_12px_rgba(0,0,0,0.45)] line-clamp-2';

  const buildPublicEventUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    const id = item.instanceId?.trim();
    if (!id) return '';
    const u = new URL(`/events/${id}`, window.location.origin);
    const aid = item.artistId?.trim();
    if (aid) u.searchParams.set('artistId', aid);
    return u.toString();
  }, [item.instanceId, item.artistId]);

  const handleShareClick = useCallback(
    async (e: ReactMouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const url = buildPublicEventUrl();
      if (!url) return;
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          try {
            await navigator.share({
              title: item.title,
              text: item.artistName ? `${item.title} · ${item.artistName}` : item.title,
              url,
            });
            return;
          } catch (shareErr: unknown) {
            if (shareErr instanceof Error && shareErr.name === 'AbortError') return;
          }
        }
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 2000);
      } catch {
        setShareCopied(false);
      }
    },
    [buildPublicEventUrl, item.title, item.artistName]
  );

  const shareButtonClass =
    'p-1 sm:p-1.5 rounded shrink-0 transition-colors ' +
    (shareCopied
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-neutral-500 dark:text-neutral-400 hover:text-primary');

  const cardContent = (
    <>
      <div className="aspect-[4/3] w-full bg-neutral-100 dark:bg-neutral-800 relative rounded-t-xl overflow-hidden">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
            <Music2 className="w-16 h-16" />
          </div>
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-[48%] pointer-events-none bg-gradient-to-t from-black/85 via-black/50 to-transparent z-[1]"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end gap-2 p-3 sm:p-4 pt-8 sm:pt-10 pointer-events-none">
          {item.artistName ? (
            artistProfileHref ? (
              <Link
                href={artistProfileHref}
                className={`${artistNameClassName} pointer-events-auto hover:underline underline-offset-2 decoration-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-sm`}
                onClick={(e) => e.stopPropagation()}
              >
                {item.artistName}
              </Link>
            ) : (
              <p className={artistNameClassName}>{item.artistName}</p>
            )
          ) : null}
        </div>
        <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1.5 pointer-events-none">
          <span className="text-xs sm:text-sm font-body font-semibold px-2 py-1 rounded-md bg-black/55 text-white shadow backdrop-blur-[2px] tabular-nums">
            {costDisplay}
          </span>
          {item.capacityStatus && (
            <span
              className={`text-xs font-body font-semibold px-2 py-1 rounded ${
                item.capacityStatus === 'sold_out'
                  ? 'bg-red-600/90 text-white'
                  : item.capacityStatus === 'limited'
                    ? 'bg-amber-500/90 text-white'
                    : 'bg-emerald-600/90 text-white'
              }`}
            >
              {capacityStatusLabel(item.capacityStatus)}
            </span>
          )}
        </div>
      </div>
      <div className="p-4 min-w-0">
        <h2 className="font-heading font-bold text-lg leading-tight min-w-0 text-neutral dark:text-neutral-100">
          {item.title}
        </h2>
        <div className="flex items-center gap-2 mt-2 text-sm text-text-paragraph">
          <Calendar className="w-4 h-4 shrink-0 opacity-90" />
          <span>{formatEventDateTime(item.startAt, item.venueTimezone)}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-sm text-text-paragraph">
          <MapPin className="w-4 h-4 shrink-0 opacity-90" />
          {item.venueId ? (
            <Link
              href={returnTo ? `/venues/${item.venueId}?returnTo=${encodeURIComponent(returnTo)}` : `/venues/${item.venueId}`}
              className="hover:underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              {item.venueName}
            </Link>
          ) : (
            <a
              href={mapsQueryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              {item.venueName}
            </a>
          )}
        </div>
        {item.venueAddress && (
          <p className="mt-1 text-sm font-body text-text-paragraph">
            {item.venueAddress}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs sm:text-sm font-body text-text-paragraph">
          {item.genre && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              <Music2 className="w-3 h-3" />
              {item.genre}
            </span>
          )}
          {attendanceCounts != null && (
            <>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden />
                <span>{attendanceCounts.interested} interested</span>
              </span>
              <span className="text-text-paragraph opacity-80 select-none" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden />
                <span>{attendanceCounts.going} going</span>
              </span>
            </>
          )}
        </div>
        {item.bookingRequired && item.bookingLink?.trim() ? (
          <a
            href={item.bookingLink.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-body font-semibold bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-200/95 dark:text-amber-950 dark:hover:bg-amber-300/95 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Book here
          </a>
        ) : item.bookingRequired ? (
          <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-body font-medium bg-amber-100 text-amber-900 dark:bg-amber-200/95 dark:text-amber-950">
            Booking required
          </span>
        ) : null}
        {item.bookingLink?.trim() && !item.bookingRequired && (
          <a
            href={item.bookingLink.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-body font-semibold text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
            Book or RSVP
          </a>
        )}
        {item.description && (
          <div className="font-body text-sm text-text-paragraph mt-2">
            <p ref={descriptionRef} className={expanded ? '' : 'line-clamp-2'}>
              {item.description}
            </p>
            {isClamped && !expanded && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(true); }}
                className="text-primary font-medium hover:underline mt-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"
                aria-label="Expand full description"
              >
                … more
              </button>
            )}
            {expanded && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(false); }}
                className="text-primary font-medium hover:underline mt-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"
                aria-label="Collapse description"
              >
                less
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <article className="min-w-0 w-full max-w-full rounded-xl shadow overflow-visible bg-white dark:bg-neutral-900 border border-neutral-light dark:border-neutral-700">
      {detailHref ? <Link href={detailHref} className="block">{cardContent}</Link> : cardContent}
      <div className="px-3 sm:px-4 pb-4 min-w-0">
        <div className="mt-2 mb-2 border-t border-neutral-light dark:border-neutral-700" />
        {showAttendance ? (
          <div className="flex w-full min-w-0 items-center pb-0.5 sm:pb-0">
            <div className="w-1/2 grid grid-cols-4 items-center">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => onSave?.(item)}
                  className="p-1 sm:p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-primary shrink-0"
                  aria-label="Save to list"
                >
                  <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleShareClick}
                  className={shareButtonClass}
                  aria-label={shareCopied ? 'Event link copied' : 'Copy link to this event'}
                >
                  {shareCopied ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
                  ) : (
                    <Share2 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
                  )}
                </button>
              </div>
              <div className="flex justify-center">
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 sm:p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-primary shrink-0"
                  aria-label="Add to calendar"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" />
                </a>
              </div>
              <div className="flex justify-center">
                {canCommentOnInstance ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCommentsOpen(true);
                    }}
                    className="p-1 sm:p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-primary shrink-0 inline-flex items-center justify-center gap-0.5 sm:gap-1 tabular-nums"
                    aria-label={
                      commentCount != null && commentCount > 0
                        ? `View ${commentCount} comments`
                        : 'View comments'
                    }
                  >
                    <MessageCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" />
                    {commentCount != null && commentCount > 0 ? (
                      <span className="text-[11px] sm:text-xs font-bold leading-none">{commentCount}</span>
                    ) : null}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="w-1/2 flex justify-start pl-1">
              <div
                className="relative min-w-0 shrink"
                ref={attendanceMenuRef}
              >
                  <button
                    type="button"
                    disabled={attendanceBusy}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAttendanceMenuOpen((o) => !o);
                    }}
                    className={`inline-flex min-w-0 items-center gap-0.5 sm:gap-1 px-1.5 py-1.5 sm:px-2.5 sm:py-2 rounded-full font-body text-xs sm:text-sm font-semibold border transition-colors disabled:opacity-50 ${
                      goingActive
                        ? 'border-emerald-600/70 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200'
                        : interestedActive
                          ? 'border-amber-500/70 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100'
                          : 'border-primary bg-primary text-on-primary hover:bg-primary-dark'
                    }`}
                    aria-expanded={attendanceMenuOpen}
                    aria-haspopup="menu"
                    title={
                      goingActive ? 'Going' : interestedActive ? 'Interested' : 'Set attendance'
                    }
                  >
                    {goingActive ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-left">Going</span>
                      </>
                    ) : interestedActive ? (
                      <>
                        <Star className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-left">Interested</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" aria-hidden />
                        <span className="min-w-0 text-left">Attendance</span>
                      </>
                    )}
                    <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 shrink-0 opacity-70 transition-transform ${attendanceMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                {attendanceMenuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 bottom-full mb-1 z-[100] min-w-[12.5rem] py-1 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-body text-neutral dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700/80"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        applyAttendanceChoice('interested');
                      }}
                    >
                      <Star className={`w-4 h-4 shrink-0 ${interestedActive && !goingActive ? 'text-amber-600' : 'text-neutral-400'}`} />
                      Interested
                      {interestedActive && !goingActive && <Check className="w-4 h-4 ml-auto text-primary shrink-0" aria-hidden />}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-body text-neutral dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700/80"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        applyAttendanceChoice('going');
                      }}
                    >
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${goingActive ? 'text-emerald-600' : 'text-neutral-400'}`} />
                      Going
                      {goingActive && <Check className="w-4 h-4 ml-auto text-primary shrink-0" aria-hidden />}
                    </button>
                    {hasAttendance && (
                      <>
                        <div className="my-1 border-t border-neutral-200 dark:border-neutral-600" />
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-body text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            applyAttendanceChoice('clear');
                          }}
                        >
                          <X className="w-4 h-4 shrink-0" />
                          Remove attendance
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid w-full min-w-0 grid-cols-4 items-center pb-0.5 sm:pb-0">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => onSave?.(item)}
                className="p-1 sm:p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-primary shrink-0"
                aria-label="Save to list"
              >
                <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleShareClick}
                className={shareButtonClass}
                aria-label={shareCopied ? 'Event link copied' : 'Copy link to this event'}
              >
                {shareCopied ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
                ) : (
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
                )}
              </button>
            </div>
            <div className="flex justify-center">
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 sm:p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-primary shrink-0"
                aria-label="Add to calendar"
                onClick={(e) => e.stopPropagation()}
              >
                <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" />
              </a>
            </div>
            <div className="flex justify-center min-w-0">
              {canCommentOnInstance ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCommentsOpen(true);
                  }}
                  className="p-1 sm:p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-primary shrink-0 inline-flex items-center justify-center gap-0.5 sm:gap-1 tabular-nums"
                  aria-label={
                    commentCount != null && commentCount > 0
                      ? `View ${commentCount} comments`
                      : 'View comments'
                  }
                >
                  <MessageCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" />
                  {commentCount != null && commentCount > 0 ? (
                    <span className="text-[11px] sm:text-xs font-bold leading-none">{commentCount}</span>
                  ) : null}
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>
        )}
      </div>
      <EventCommentsBottomSheet
        open={commentsOpen && canCommentOnInstance}
        onClose={() => setCommentsOpen(false)}
        instanceId={item.instanceId}
        eventTitle={item.title}
        authorRef={commentsAuthorRef ?? null}
        currentUserId={commentsCurrentUserId ?? null}
        loginReturnTo={eventCommentsLoginPath}
        onVisibleCommentCountChange={onVisibleCommentCountChange}
      />
    </article>
  );
}
