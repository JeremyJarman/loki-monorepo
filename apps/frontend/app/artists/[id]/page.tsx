'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getArtistById, getArtistGigsForProfile, type ArtistGigItem } from '@/lib/artists';
import { getListsOwnedByUserForProfileView, getGlobalEventAttendanceCounts } from '@/lib/lists';
import { ArtistGigCard } from '@/components/ArtistGigCard';
import { getUserProfile } from '@/lib/userProfile';
import { getFollowersCount, getFollowingCount, followUser, unfollowUser, isFollowing } from '@/lib/following';
import { FollowersFollowingModal } from '@/components/FollowersFollowingModal';
import { useSetArtistPageChrome } from '@/components/ArtistPageChromeContext';
import type { Artist, UserRef } from '@loki/shared';
import { normalizeArtistGenres, normalizeArtistDescriptors } from '@loki/shared';
import { Calendar, Pencil } from 'lucide-react';

type TabId = 'about' | 'gallery' | 'gigs' | 'lists';

export default function ArtistProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user: currentUser } = useAuth();
  const artistId = params.id as string;
  const [artist, setArtist] = useState<Artist | null>(null);
  const [userProfile, setUserProfile] = useState<{
    displayName?: string;
    about?: string;
    instagramUrl?: string;
    websiteUrl?: string;
    username?: string;
    profileImageUrl?: string | null;
  } | null>(null);
  const [upcomingGigs, setUpcomingGigs] = useState<ArtistGigItem[]>([]);
  const [pastGigs, setPastGigs] = useState<ArtistGigItem[]>([]);
  const [gigAttendanceByInstance, setGigAttendanceByInstance] = useState<
    Record<string, { interested: number; going: number }>
  >({});
  const [lists, setLists] = useState<{ id: string; name: string; itemCount: number }[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [listsCount, setListsCount] = useState(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const heroSwipeRef = useRef<{ x: number; y: number } | null>(null);
  const [isFollowingArtist, setIsFollowingArtist] = useState<boolean | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const setArtistPageChrome = useSetArtistPageChrome();
  const returnToParam = searchParams.get('returnTo')?.trim();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'about' || tab === 'gallery' || tab === 'gigs' || tab === 'lists') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const galleryImages = artist?.imageUrl ?? [];

  useEffect(() => {
    setHeroImageIndex(0);
  }, [artistId, galleryImages.join('|')]);

  useEffect(() => {
    if (heroImageIndex >= galleryImages.length && galleryImages.length > 0) {
      setHeroImageIndex(galleryImages.length - 1);
    }
  }, [galleryImages.length, heroImageIndex]);

  // When artist has linked userId, use user profile for display name, about, instagram, website
  const displayName = userProfile?.displayName?.trim() || artist?.name || 'Artist';
  const handleDisplay = artist?.handle || userProfile?.username;
  const headerAbout = (userProfile?.about?.trim() || artist?.about?.trim() || artist?.details?.trim()) ?? '';
  const headerAboutShort = headerAbout
    ? headerAbout.length > 120
      ? headerAbout.slice(0, 120).trim() + '…'
      : headerAbout
    : 'No about text yet.';
  const aboutTabText = artist?.details?.trim() || 'No details yet.';
  const websiteUrl = userProfile?.websiteUrl?.trim() || artist?.websiteUrl?.trim();
  const instagramUrl = userProfile?.instagramUrl?.trim() || artist?.instagramUrl?.trim();

  const loadArtistAndGigs = useCallback(async () => {
    if (!artistId) {
      setLoading(false);
      setError('Missing artist ID');
      return;
    }
    try {
      const [artistData, gigsBundle] = await Promise.all([
        getArtistById(artistId),
        getArtistGigsForProfile(artistId),
      ]);
      setArtist(artistData);
      setUpcomingGigs(gigsBundle.upcoming);
      setPastGigs(gigsBundle.past);

      const isArtOwner = Boolean(
        artistData?.userId &&
          currentUser?.uid &&
          artistData.userId === currentUser.uid
      );
      const allInstanceIds = [...gigsBundle.upcoming, ...gigsBundle.past].map((g) => g.instanceId);
      if (isArtOwner && allInstanceIds.length > 0) {
        try {
          const counts = await getGlobalEventAttendanceCounts(allInstanceIds);
          setGigAttendanceByInstance(counts);
        } catch (e) {
          console.error(e);
          setGigAttendanceByInstance({});
        }
      } else {
        setGigAttendanceByInstance({});
      }

      if (artistData?.userId) {
        if (currentUser?.uid) {
          const [profile, followers, following, listsData] = await Promise.all([
            getUserProfile(artistData.userId),
            getFollowersCount(artistData.userId),
            getFollowingCount(artistData.userId),
            getListsOwnedByUserForProfileView(artistData.userId, currentUser.uid),
          ]);
          setUserProfile(
            profile
              ? {
                  displayName: profile.displayName,
                  about: profile.about,
                  instagramUrl: profile.instagramUrl,
                  websiteUrl: profile.websiteUrl,
                  username: profile.username,
                  profileImageUrl: profile.profileImageUrl ?? null,
                }
              : null
          );
          setFollowersCount(followers);
          setFollowingCount(following);
          setListsCount(listsData.length);
        } else {
          setUserProfile(null);
          setFollowersCount(0);
          setFollowingCount(0);
          setListsCount(0);
        }
      } else {
        setUserProfile(null);
        setFollowersCount(0);
        setFollowingCount(0);
        setListsCount(0);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load artist');
    } finally {
      setLoading(false);
    }
  }, [artistId, currentUser?.uid]);

  useEffect(() => {
    loadArtistAndGigs();
  }, [loadArtistAndGigs]);

  const loadLists = useCallback(async () => {
    if (!artist?.userId || !currentUser?.uid) {
      setLists([]);
      return;
    }
    try {
      const listsData = await getListsOwnedByUserForProfileView(artist.userId, currentUser.uid);
      setLists(
        listsData.map((l) => ({
          id: l.id,
          name: l.name,
          itemCount: l.stats?.itemsCount ?? 0,
        }))
      );
    } catch (err) {
      console.error(err);
    }
  }, [artist?.userId, currentUser?.uid]);

  useEffect(() => {
    if (activeTab === 'lists' && artist?.userId) {
      loadLists();
    }
  }, [activeTab, artist?.userId, loadLists]);

  const isOwner = Boolean(
    currentUser?.uid && artist?.userId && currentUser.uid === artist.userId
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!artist?.userId || !currentUser?.uid || isOwner) {
        if (!cancelled) setIsFollowingArtist(null);
        return;
      }
      try {
        const v = await isFollowing(currentUser.uid, artist.userId);
        if (!cancelled) setIsFollowingArtist(v);
      } catch {
        if (!cancelled) setIsFollowingArtist(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artist?.userId, currentUser?.uid, isOwner]);

  useEffect(() => {
    if (!setArtistPageChrome) return;
    if (!artist?.id) {
      setArtistPageChrome(null);
      return;
    }
    const title = userProfile?.displayName?.trim() || artist.name || 'Artist';
    const backHref =
      returnToParam && returnToParam.startsWith('/') ? returnToParam : '/discover';
    setArtistPageChrome({ backHref, title });
    return () => setArtistPageChrome(null);
  }, [
    artist?.id,
    artist?.name,
    userProfile?.displayName,
    returnToParam,
    setArtistPageChrome,
  ]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading profile…</p>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
        <p className="font-body text-text-paragraph">{error ?? 'Artist not found'}</p>
        <Link href="/discover" className="text-primary hover:underline font-body font-semibold">
          Back to discover
        </Link>
      </div>
    );
  }

  const loginReturnTo = pathname ? `/login?returnTo=${encodeURIComponent(pathname)}` : '/login';
  const profileGenres = normalizeArtistGenres(artist.genres);
  const profileDescriptors = normalizeArtistDescriptors(artist.descriptors);

  const handleFollowArtist = async () => {
    if (!currentUser?.uid || !artist?.userId || followBusy || isOwner) return;
    setFollowBusy(true);
    try {
      const myProfile = await getUserProfile(currentUser.uid);
      const myRef: UserRef = {
        userId: currentUser.uid,
        displayName: myProfile?.displayName ?? myProfile?.username ?? '',
        profileImageUrl: myProfile?.profileImageUrl ?? undefined,
      };
      await followUser(
        currentUser.uid,
        artist.userId,
        myRef,
        userProfile?.displayName ?? artist.name,
        userProfile?.profileImageUrl ?? undefined
      );
      setIsFollowingArtist(true);
      setFollowersCount((c) => c + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setFollowBusy(false);
    }
  };

  const handleUnfollowArtist = async () => {
    if (!currentUser?.uid || !artist?.userId || followBusy || isOwner) return;
    setFollowBusy(true);
    try {
      await unfollowUser(currentUser.uid, artist.userId);
      setIsFollowingArtist(false);
      setFollowersCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    } finally {
      setFollowBusy(false);
    }
  };

  const SWIPE_MIN_PX = 48;

  const goHeroPrev = () => {
    setHeroImageIndex((i) => (i === 0 ? galleryImages.length - 1 : i - 1));
  };
  const goHeroNext = () => {
    setHeroImageIndex((i) => (i >= galleryImages.length - 1 ? 0 : i + 1));
  };

  const applyHeroSwipeDelta = (dx: number, dy: number) => {
    if (galleryImages.length <= 1) return;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx > 0) goHeroPrev();
    else goHeroNext();
  };

  return (
    <div className="space-y-6">
      {isOwner && (
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            href="/profile/artist"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark"
          >
            <Pencil className="w-4 h-4" aria-hidden />
            Manage artist profile
          </Link>
          <Link
            href="/profile?account=1"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            Edit user profile
          </Link>
        </div>
      )}

      <section>
        <div className="rounded-xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden mb-6">
          <div className="relative w-full aspect-square bg-neutral-100 dark:bg-neutral-800">
            {upcomingGigs.length > 0 && (
              <div className="absolute top-2 right-2 z-20" aria-label={`${upcomingGigs.length} upcoming ${upcomingGigs.length === 1 ? 'gig' : 'gigs'}`}>
                <span className="inline-flex items-center gap-1 text-xs font-body font-semibold px-2 py-1 rounded-md bg-black/85 text-white shadow-sm backdrop-blur-[2px]">
                  <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  {upcomingGigs.length} {upcomingGigs.length === 1 ? 'gig' : 'gigs'}
                </span>
              </div>
            )}
            {galleryImages.length > 0 ? (
              <>
                <img
                  src={galleryImages[heroImageIndex]}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
                {galleryImages.length > 1 && (
                  <>
                    <div
                      className="absolute inset-0 z-[5] touch-pan-y select-none"
                      aria-hidden
                      onTouchStart={(e) => {
                        const t = e.targetTouches[0];
                        if (!t) return;
                        heroSwipeRef.current = { x: t.clientX, y: t.clientY };
                      }}
                      onTouchEnd={(e) => {
                        const start = heroSwipeRef.current;
                        heroSwipeRef.current = null;
                        const t = e.changedTouches[0];
                        if (!start || !t) return;
                        applyHeroSwipeDelta(t.clientX - start.x, t.clientY - start.y);
                      }}
                      onPointerDown={(e) => {
                        if (e.pointerType === 'touch') return;
                        heroSwipeRef.current = { x: e.clientX, y: e.clientY };
                      }}
                      onPointerUp={(e) => {
                        if (e.pointerType === 'touch') return;
                        const start = heroSwipeRef.current;
                        heroSwipeRef.current = null;
                        if (!start) return;
                        applyHeroSwipeDelta(e.clientX - start.x, e.clientY - start.y);
                      }}
                      onPointerCancel={() => {
                        heroSwipeRef.current = null;
                      }}
                    />
                    <div
                      className="absolute bottom-3 right-3 z-20 flex justify-end gap-1.5 rounded-full bg-black/35 px-3 py-2 backdrop-blur-sm"
                      role="tablist"
                      aria-label="Gallery images"
                    >
                      {galleryImages.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          role="tab"
                          aria-selected={i === heroImageIndex}
                          aria-label={`Show image ${i + 1} of ${galleryImages.length}`}
                          className={`h-1.5 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                            i === heroImageIndex
                              ? 'w-5 bg-white'
                              : 'w-1.5 bg-white/45 hover:bg-white/70'
                          }`}
                          onClick={() => setHeroImageIndex(i)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800">
                <span className="text-6xl sm:text-7xl text-neutral-500 dark:text-neutral-400 font-heading font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div
              className="absolute inset-x-0 bottom-0 h-[48%] pointer-events-none bg-gradient-to-t from-black/85 via-black/50 to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5 pt-12 sm:pt-14 pointer-events-none">
              <span className="font-heading font-bold text-xl sm:text-2xl tracking-tight !text-white block leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.65),0_2px_12px_rgba(0,0,0,0.45)]">
                {displayName}
              </span>
              {handleDisplay ? (
                <span className="font-body text-sm block leading-tight mt-0.5 !text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_0_8px_rgba(0,0,0,0.75)]">
                  @{handleDisplay}
                </span>
              ) : null}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {artist?.userId && (
              <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 mb-3">
                <button
                  type="button"
                  onClick={() => setShowFollowersModal(true)}
                  className="font-body text-sm sm:text-base font-semibold text-neutral dark:text-neutral-200 hover:text-primary dark:hover:text-primary py-1 text-left"
                >
                  <span className="font-bold tabular-nums">{followersCount}</span>{' '}
                  <span className="font-semibold">Followers</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFollowingModal(true)}
                  className="font-body text-sm sm:text-base font-semibold text-neutral dark:text-neutral-200 hover:text-primary dark:hover:text-primary py-1 text-left"
                >
                  <span className="font-bold tabular-nums">{followingCount}</span>{' '}
                  <span className="font-semibold">Following</span>
                </button>
                <Link
                  href={`/profile/${artist.userId}/lists`}
                  className="font-body text-sm sm:text-base font-semibold text-neutral dark:text-neutral-200 hover:text-primary dark:hover:text-primary py-1"
                >
                  <span className="font-bold tabular-nums">{listsCount}</span>{' '}
                  <span className="font-semibold">Lists</span>
                </Link>
              </div>
            )}
            <p className="font-body text-sm text-text-paragraph whitespace-pre-wrap mb-3">
              {headerAboutShort}
            </p>
            {(profileDescriptors.length > 0 || profileGenres.length > 0) && (
              <div className="flex flex-wrap gap-2" aria-label="Style and genres">
                {profileDescriptors.map((d) => (
                  <span
                    key={`d:${d}`}
                    className="inline-flex px-2.5 py-1 rounded-full text-xs font-body font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-600"
                  >
                    {d}
                  </span>
                ))}
                {profileGenres.map((g) => (
                  <span
                    key={`g:${g}`}
                    className="inline-flex px-2.5 py-1 rounded-full text-xs font-body font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-600"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
            {(websiteUrl ||
              instagramUrl ||
              (!isOwner && artist.userId)) && (
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3 mt-3 flex flex-wrap items-center gap-x-5 sm:gap-x-6 gap-y-2">
                {websiteUrl ? (
                  <a
                    href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-body text-sm font-semibold"
                  >
                    Website
                  </a>
                ) : null}
                {instagramUrl ? (
                  <a
                    href={instagramUrl.startsWith('http') ? instagramUrl : `https://instagram.com/${instagramUrl.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-body text-sm font-semibold"
                  >
                    Instagram
                  </a>
                ) : null}
                {!isOwner && artist.userId ? (
                  currentUser ? (
                    isFollowingArtist === null ? (
                      <span className="inline-flex min-w-[5.5rem] justify-center px-3 py-2 text-sm font-body text-text-paragraph" aria-hidden>
                        …
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={followBusy}
                        onClick={() => (isFollowingArtist ? handleUnfollowArtist() : handleFollowArtist())}
                        className={`px-3 py-2 rounded-full font-body text-sm font-semibold border transition-colors disabled:opacity-50 whitespace-nowrap ${
                          isFollowingArtist
                            ? 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                            : 'bg-primary text-on-primary border-primary hover:bg-primary-dark'
                        }`}
                      >
                        {followBusy ? '…' : isFollowingArtist ? 'Following' : 'Follow'}
                      </button>
                    )
                  ) : (
                    <Link
                      href={loginReturnTo}
                      className="inline-flex px-3 py-2 rounded-full font-body text-sm font-semibold bg-primary text-on-primary border border-primary hover:bg-primary-dark whitespace-nowrap"
                    >
                      Follow
                    </Link>
                  )
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="flex gap-2 mb-4 border-b border-neutral-200 dark:border-neutral-700">
          {(['about', 'gallery', 'gigs', 'lists'] as TabId[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-body font-semibold capitalize border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'text-primary border-primary dark:border-primary'
                  : 'text-text-paragraph border-transparent hover:text-neutral dark:hover:text-neutral-200'
              }`}
            >
              {tab === 'gigs' ? 'Events' : tab}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
          {activeTab === 'about' && (
            <div className="p-6 font-body">
              <p className="text-sm text-text-paragraph whitespace-pre-wrap">
                {aboutTabText}
              </p>
            </div>
          )}

          {activeTab === 'gallery' && (
            <div className="p-6">
              {galleryImages.length === 0 ? (
                <p className="font-body text-sm text-text-paragraph">No gallery images yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {galleryImages.map((url, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'gigs' && (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {upcomingGigs.length === 0 && pastGigs.length === 0 ? (
                <p className="p-6 font-body text-sm text-text-paragraph">No events yet.</p>
              ) : (
                <>
                  {upcomingGigs.length > 0 && (
                    <div>
                      <h3 className="px-4 sm:px-5 pt-4 pb-2 font-heading font-bold text-sm text-neutral dark:text-neutral-200">
                        Upcoming
                      </h3>
                      <div>
                        {upcomingGigs.map((gig) => (
                          <ArtistGigCard
                            key={gig.instanceId}
                            gig={gig}
                            appearance="row"
                            eventHref={`/events/${gig.instanceId}?returnTo=${encodeURIComponent(`/artists/${artistId}`)}&artistId=${encodeURIComponent(artistId)}`}
                            rsvpTotals={
                              isOwner
                                ? gigAttendanceByInstance[gig.instanceId] ?? {
                                    interested: 0,
                                    going: 0,
                                  }
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {pastGigs.length > 0 && (
                    <div>
                      <h3 className="px-4 sm:px-5 pt-4 pb-2 font-heading font-bold text-sm text-neutral dark:text-neutral-200">
                        Past
                      </h3>
                      <p className="px-4 sm:px-5 pb-3 text-xs font-body text-text-paragraph">
                        Past events stay here so fans can open the card and leave comments.
                      </p>
                      <div>
                        {pastGigs.map((gig) => (
                          <ArtistGigCard
                            key={gig.instanceId}
                            gig={gig}
                            appearance="row"
                            eventHref={`/events/${gig.instanceId}?returnTo=${encodeURIComponent(`/artists/${artistId}`)}&artistId=${encodeURIComponent(artistId)}`}
                            rsvpTotals={
                              isOwner
                                ? gigAttendanceByInstance[gig.instanceId] ?? {
                                    interested: 0,
                                    going: 0,
                                  }
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'lists' && (
            <div className="p-6">
              {!artist.userId ? (
                <p className="font-body text-sm text-text-paragraph">No lists yet.</p>
              ) : lists.length === 0 ? (
                <p className="font-body text-sm text-text-paragraph">No lists yet.</p>
              ) : (
                <ul className="space-y-3">
                  {lists.map((list) => (
                    <li key={list.id}>
                      <Link
                        href={`/lists/${list.id}`}
                        className="block rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 hover:border-primary/30 transition-colors"
                      >
                        <span className="font-body font-semibold text-neutral dark:text-neutral-100 block">{list.name}</span>
                        <p className="font-body text-xs text-text-paragraph mt-0.5">{list.itemCount} items</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      {showFollowersModal && artist?.userId && (
        <FollowersFollowingModal
          type="followers"
          profileUserId={artist.userId}
          currentUserId={currentUser?.uid ?? null}
          onClose={() => setShowFollowersModal(false)}
          onCountChange={loadArtistAndGigs}
        />
      )}
      {showFollowingModal && artist?.userId && (
        <FollowersFollowingModal
          type="following"
          profileUserId={artist.userId}
          currentUserId={currentUser?.uid ?? null}
          onClose={() => setShowFollowingModal(false)}
          onCountChange={loadArtistAndGigs}
        />
      )}
    </div>
  );
}
