# Firebase Storage Cleanup Guide

## 🗂️ Current Situation

You have old folders that are no longer used by the new structure:
- `event_images/` (old)
- `food/` (old - flat structure)
- `menu/` (old - flat structure)
- `venue/` (old - flat structure)
- `venue_images/` (old)
- `venues/` (new structure - KEEP)

## ✅ New Clean Structure

The new structure uses:
- `venues/{venueId}/venue/` - Venue images
- `venues/{venueId}/food/` - Food images
- `venues/{venueId}/menu/` - Menu images
- `events/{eventId}/` - Event images

## 🧹 Cleanup Strategy

### Option 1: Safe Approach (Recommended)

**Keep old folders temporarily** - They won't hurt anything:
- Old images will still work (URLs remain valid)
- New uploads go to the new structure
- You can clean up later when convenient

### Option 2: Clean Up Now

**Before deleting, check:**

1. **Check if old folders have images:**
   - Open Firebase Console → Storage
   - Check each old folder (`event_images/`, `food/`, `menu/`, `venue/`, `venue_images/`)
   - If they're empty or only have test images → Safe to delete

2. **Check Firestore for old image URLs:**
   - Old image URLs might still be stored in Firestore
   - If venues/events reference old paths, those images are still needed

3. **What to delete:**
   - ✅ `event_images/` - Can delete if empty or not referenced
   - ✅ `food/` - Can delete (new structure uses `venues/{venueId}/food/`)
   - ✅ `menu/` - Can delete (new structure uses `venues/{venueId}/menu/`)
   - ✅ `venue/` - Can delete (new structure uses `venues/{venueId}/venue/`)
   - ✅ `venue_images/` - Can delete (redundant with new structure)
   - ❌ `venues/` - **KEEP THIS** (this is the new structure!)

### Option 3: Migrate First, Then Delete

If you have important images in old folders:

1. **Re-upload through admin portal:**
   - Download images from old folders
   - Re-upload through the admin portal
   - They'll automatically go to the new structure

2. **Then delete old folders:**
   - Once images are re-uploaded and working
   - Delete the old empty folders

## 🎯 Recommendation

**For now: Just leave them!**

- Old folders don't cause any problems
- New uploads automatically use the new structure
- Old images will continue to work
- You can clean up later when you have time

The new structure is already active - all new uploads will go to the correct organized folders. The old folders are just taking up space but won't interfere with anything.

## 📝 To Delete Later (When Ready)

1. Go to Firebase Console → Storage
2. Check each old folder is empty or not needed
3. Delete folders one by one:
   - `event_images/`
   - `food/`
   - `menu/`
   - `venue/`
   - `venue_images/`
4. **DO NOT delete `venues/`** - This is your new organized structure!
