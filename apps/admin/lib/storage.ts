import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export type ImageFolderType = 'venue' | 'food' | 'menu' | 'events' | 'specials' | 'menu-item';

/**
 * Clean Storage Structure:
 * 
 * venues/
 *   {venueId}/
 *     venue/     (venue/exterior/interior images)
 *     food/      (food/dish images)
 *     menu/      (menu page images)
 * events/
 *   {eventId}/
 *     image.jpg
 * specials/
 *   {specialId}/
 *     image.jpg
 * users/
 *   {userId}/
 *     profile.jpg
 */

/**
 * Upload a single image file to Firebase Storage
 * @param file - The image file to upload
 * @param path - Storage path (e.g., 'venues/venueId/venue/0.jpg')
 * @returns Promise<string> - Download URL of the uploaded image
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  try {
    // Create a reference to the file location
    const storageRef = ref(storage, path);
    
    // Upload the file
    await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Upload multiple images to Firebase Storage
 * @param files - Array of image files to upload
 * @param basePath - Base storage path (e.g., 'venues/venueId/venue')
 * @returns Promise<string[]> - Array of download URLs
 */
export async function uploadMultipleImages(
  files: File[],
  basePath: string
): Promise<string[]> {
  const uploadPromises = files.map((file, index) => {
    const fileName = `${index}.jpg`;
    const path = `${basePath}/${fileName}`;
    console.log(`[Storage] Uploading file ${index + 1}/${files.length} to: ${path}`);
    return uploadImage(file, path);
  });

  const urls = await Promise.all(uploadPromises);
  console.log(`[Storage] Successfully uploaded ${urls.length} image(s) to: ${basePath}`);
  return urls;
}

/**
 * Upload images to organized folders using the clean structure
 * @param files - Array of image files to upload
 * @param folderType - Type of folder (venue, food, menu, events, specials)
 * @param entityId - ID of the entity (venueId, eventId, etc.)
 * @returns Promise<string[]> - Array of download URLs
 */
export async function uploadImagesToFolder(
  files: File[],
  folderType: ImageFolderType,
  entityId: string
): Promise<string[]> {
  let basePath: string;

  switch (folderType) {
    case 'venue':
      // venues/{venueId}/venue/
      basePath = `venues/${entityId}/venue`;
      break;
    case 'food':
      // venues/{venueId}/food/
      basePath = `venues/${entityId}/food`;
      break;
    case 'menu':
      // venues/{venueId}/menu/
      basePath = `venues/${entityId}/menu`;
      break;
    case 'events':
      // events/{eventId}/
      basePath = `events/${entityId}`;
      break;
    case 'specials':
      // specials/{specialId}/
      basePath = `specials/${entityId}`;
      break;
    case 'menu-item':
      // venues/{venueId}/menu-items/{itemId}/
      // Note: entityId should be in format "venueId/itemId"
      basePath = `venues/${entityId}`;
      break;
    default:
      throw new Error(`Invalid folder type: ${folderType}`);
  }

  console.log(`[Storage] Uploading ${files.length} image(s) to: ${basePath} (folderType: ${folderType})`);
  return uploadMultipleImages(files, basePath);
}

/**
 * Delete an image from Firebase Storage by its download URL
 * @param imageUrl - The download URL of the image to delete
 * @returns Promise<void>
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    // Extract the path from the download URL
    // Firebase Storage URLs: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token=...
    // Note: url.pathname does NOT include the query string, so we match everything after /o/
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+)/);
    
    if (!pathMatch) {
      throw new Error('Invalid image URL format');
    }
    
    // Decode the path (Firebase encodes special characters like / as %2F)
    const encodedPath = pathMatch[1];
    const decodedPath = decodeURIComponent(encodedPath);
    
    console.log(`[Storage] Deleting image from path: ${decodedPath}`);
    
    // Create a reference to the file
    const storageRef = ref(storage, decodedPath);
    
    // Delete the file
    await deleteObject(storageRef);
    
    console.log(`[Storage] Successfully deleted image: ${decodedPath}`);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

/**
 * Delete multiple images from Firebase Storage
 * @param imageUrls - Array of download URLs to delete
 * @returns Promise<void>
 */
export async function deleteImages(imageUrls: string[]): Promise<void> {
  const deletePromises = imageUrls.map(url => deleteImage(url));
  await Promise.all(deletePromises);
  console.log(`[Storage] Successfully deleted ${imageUrls.length} image(s)`);
}
