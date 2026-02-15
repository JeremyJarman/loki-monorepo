# Firebase Storage Structure

## 📁 Clean, Organized Structure

All images are now organized in a clean, hierarchical structure:

```
venues/
  {venueId}/
    venue/          # Venue/exterior/interior images
      0.jpg
      1.jpg
      ...
    food/           # Food/dish images
      0.jpg
      1.jpg
      ...
    menu/           # Menu page images
      0.jpg
      1.jpg
      ...

events/
  {eventId}/
    image.jpg       # Single event image

specials/
  {specialId}/
    image.jpg       # Single special image

users/
  {userId}/
    profile.jpg     # User profile image
```

## 🎯 Benefits

1. **Organized by Entity**: Each entity type has its own top-level folder
2. **Nested by ID**: All images for a specific venue/event are grouped together
3. **Clear Separation**: Venue, food, and menu images are clearly separated
4. **Scalable**: Easy to add new image types or entities
5. **No Redundancy**: Single source of truth for each image type

## 📝 Path Examples

- **Venue Image**: `venues/abc123/venue/0.jpg`
- **Food Image**: `venues/abc123/food/0.jpg`
- **Menu Image**: `venues/abc123/menu/0.jpg`
- **Event Image**: `events/xyz789/image.jpg`
- **Special Image**: `specials/def456/image.jpg`
- **User Profile**: `users/user123/profile.jpg`

## 🔄 Migration from Old Structure

If you have existing images in the old structure (`venue/`, `food/`, `menu/`, `venue_images/`, `venues/`, `event_images/`), you can:

1. **Keep both structures temporarily** - The code now uses the new structure, but old images will still work
2. **Manually migrate** - Move images from old folders to new structure in Firebase Console
3. **Re-upload** - Upload images again through the admin portal (they'll go to the new structure)

## ✅ Current Implementation

The admin portal now automatically uses this structure:
- **VenueForm**: Uploads to `venues/{venueId}/venue/`, `venues/{venueId}/food/`, `venues/{venueId}/menu/`
- **EventForm**: Uploads to `events/{eventId}/image.jpg`
- **Future**: Specials and user profiles will use `specials/{specialId}/` and `users/{userId}/`
