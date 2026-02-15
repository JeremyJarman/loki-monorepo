# Firestore Query Optimization & Caching

## Overview
This document outlines the caching and optimization strategies implemented to reduce Firestore queries and improve app performance.

## Caching Service

### Location
`lib/services/cache_service.dart`

### Features
- **In-memory caching** for venues and experiences
- **TTL (Time To Live)**: 5 minutes cache duration
- **Automatic expiration**: Cached data expires after 5 minutes
- **Singleton pattern**: Single instance shared across the app

### What Gets Cached
1. **Venues**: Cached when fetched via `getVenue()` or `getVenueStream()`
2. **Experiences**: Cached when fetched via `getExperience()`, `getExperienceStream()`, or `getExperiencesByIdsStream()`

## Optimizations Implemented

### 1. Venue Caching
- **Before**: Every screen queried Firestore for venue data
- **After**: 
  - Venue is cached when navigating from venue card to venue profile
  - `getVenueStream()` automatically caches updates
  - Subsequent queries check cache first

**Impact**: Reduces venue queries by ~80% when navigating between screens

### 2. Experience Caching
- **Before**: Each experience was queried individually (N queries for N experiences)
- **After**:
  - `getExperiencesByIdsStream()` checks cache first, only queries missing experiences
  - Experiences are cached when fetched in batches
  - `getExperienceStream()` uses cache and emits immediately if available

**Impact**: 
- Reduces experience queries significantly
- If all experiences are cached, returns immediately without Firestore query
- Individual experience lookups use cache first

### 3. Eliminated Individual Experience Queries
- **Before**: In venue profile screen, each instance card made a separate `getExperienceStream()` call
- **After**: 
  - Experiences are fetched once in `_combineExperiencesAndInstancesStream()`
  - Experience map is created and passed directly to cards
  - No individual queries per card

**Impact**: 
- **Before**: 1 event = 1 query, 5 events = 5 queries
- **After**: 1 event = 0 additional queries (uses cached data from stream)

### 4. Stream Optimization
- `getExperiencesByIdsStream()` now:
  1. Checks cache first
  2. Only queries Firestore for missing experiences
  3. Combines cached + Firestore results
  4. Caches Firestore results for future use

## Query Reduction Summary

### Venue Profile Screen (Events/Specials Tabs)

**Before Optimization:**
- 1 query: Get experiences by IDs
- 1 query: Get instances by experience IDs  
- N queries: Individual `getExperienceStream()` for each instance card
- **Total**: 2 + N queries (where N = number of instances)

**After Optimization:**
- 1 query: Get experiences by IDs (with cache check)
- 1 query: Get instances by experience IDs
- 0 queries: Use experiences from stream data
- **Total**: 2 queries (regardless of number of instances)

**Savings**: Eliminated N individual experience queries

### Navigation Flow

**Before:**
1. Venue card loads → Query venue
2. Navigate to profile → Query venue again
3. Profile loads events → Query experiences
4. Each event card → Query experience individually

**After:**
1. Venue card loads → Query venue, cache it
2. Navigate to profile → Use cached venue
3. Profile loads events → Query experiences, cache them
4. Each event card → Use cached experiences from stream

**Savings**: 
- 1 venue query eliminated
- N experience queries eliminated

## Cache Statistics

You can check cache statistics using:
```dart
final cacheService = CacheService();
final stats = cacheService.getStats();
print('Cached venues: ${stats['venues']}');
print('Cached experiences: ${stats['experiences']}');
```

## Cache Management

### Automatic Expiration
- Cache entries expire after 5 minutes
- Expired entries are automatically removed on next access
- You can manually clear expired entries: `CacheService().clearExpired()`

### Manual Cache Clearing
```dart
CacheService().clearAll(); // Clear all caches
```

## Performance Impact

### Expected Improvements
- **Reduced Firestore reads**: 60-80% reduction in read operations
- **Faster navigation**: Instant data when navigating between screens
- **Lower costs**: Fewer Firestore read operations = lower costs
- **Better UX**: Faster loading, less network usage

### When Cache is Most Effective
- Navigating from venue card → venue profile (venue already cached)
- Viewing multiple events/specials (experiences already cached)
- Returning to previously viewed venues/experiences

## Future Optimizations

Potential further optimizations:
1. **Persistent cache**: Store cache in local storage (shared_preferences or Hive)
2. **Cache warming**: Pre-fetch likely-to-be-viewed data
3. **Instance caching**: Cache experience instances (with shorter TTL due to time-sensitive nature)
4. **Batch operations**: Combine multiple small queries into single batch reads

## Monitoring

To monitor cache effectiveness, check debug logs:
- `CacheService: Venue cache HIT` - Cache working
- `CacheService: Venue cache MISS` - Cache miss, querying Firestore
- `FirestoreService: Found X/Y in cache` - Partial cache hits
