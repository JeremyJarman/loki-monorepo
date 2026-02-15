'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, GeoPoint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadImagesToFolder, deleteImage, ImageFolderType } from '@/lib/storage';
import ImageUpload from './ImageUpload';
import OpeningHoursInput from './OpeningHoursInput';

interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  atmosphere?: string;
  phone?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  imageUrl?: string[];
  foodImageUrl?: string[];
  menuImageUrl?: string[];
  openingHours?: Record<string, any>;
  publicHolidayRule?: string;
}

interface VenueFormProps {
  venue?: Venue;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function VenueForm({ venue, onSuccess, onCancel }: VenueFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Separate image states for different folders
  const [venueImages, setVenueImages] = useState<File[]>([]);
  const [foodImages, setFoodImages] = useState<File[]>([]);
  const [menuImages, setMenuImages] = useState<File[]>([]);
  
  const [existingVenueImages, setExistingVenueImages] = useState<string[]>([]);
  const [existingFoodImages, setExistingFoodImages] = useState<string[]>([]);
  const [existingMenuImages, setExistingMenuImages] = useState<string[]>([]);
  
  const [openingHours, setOpeningHours] = useState<Record<string, any>>({});
  const [publicHolidayRule, setPublicHolidayRule] = useState<string>('closed');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    atmosphere: '',
    phone: '',
    latitude: '',
    longitude: '',
  });

  const isEditMode = !!venue;

  useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name || '',
        description: venue.description || '',
        address: venue.address || '',
        atmosphere: venue.atmosphere || '',
        phone: venue.phone || '',
        latitude: venue.location?.latitude?.toString() || '',
        longitude: venue.location?.longitude?.toString() || '',
      });
      // Set existing images from Firestore
      setExistingVenueImages(venue.imageUrl || []);
      setExistingFoodImages(venue.foodImageUrl || []);
      setExistingMenuImages(venue.menuImageUrl || []);
      setOpeningHours(venue.openingHours || {});
      setPublicHolidayRule(venue.publicHolidayRule || 'closed');
    }
  }, [venue]);

  const handleDeleteImage = async (imageUrl: string, index: number) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    if (!venue || !isEditMode) {
      return;
    }

    try {
      // Delete from Firebase Storage
      await deleteImage(imageUrl);

      // Remove from state
      const updatedImages = existingVenueImages.filter((_, i) => i !== index);
      setExistingVenueImages(updatedImages);

      // Update Firestore
      const venueRef = doc(db, 'venues', venue.id);
      await updateDoc(venueRef, { imageUrl: updatedImages });

      alert('Image deleted successfully!');
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Error deleting image. Please check console for details.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.description || !formData.address) {
        alert('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Validate coordinates
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        alert('Please enter valid latitude and longitude');
        setLoading(false);
        return;
      }

      let venueRef;
      let allVenueImageUrls = existingVenueImages;

      // Opening hours are already clean (no metadata)
      const cleanOpeningHours = openingHours;

      if (isEditMode && venue) {
        // Update existing venue
        venueRef = doc(db, 'venues', venue.id);
        await updateDoc(venueRef, {
          name: formData.name,
          description: formData.description,
          address: formData.address,
          location: new GeoPoint(lat, lng),
          atmosphere: formData.atmosphere || null,
          phone: formData.phone || null,
          openingHours: cleanOpeningHours,
          publicHolidayRule: publicHolidayRule,
        });
      } else {
        // Create new venue
        venueRef = await addDoc(collection(db, 'venues'), {
          name: formData.name,
          description: formData.description,
          address: formData.address,
          location: new GeoPoint(lat, lng),
          atmosphere: formData.atmosphere || null,
          phone: formData.phone || null,
          openingHours: cleanOpeningHours,
          publicHolidayRule: publicHolidayRule,
          imageUrl: [],
          foodImageUrl: [],
          menuImageUrl: [],
        });
      }

      // Upload images to organized folders
      setUploadingImages(true);
      try {
        const venueId = venueRef.id;
        const uploadPromises: Promise<string[]>[] = [];
        let foodImageUrls: string[] = [];
        let menuImageUrls: string[] = [];

        // Upload venue images
        if (venueImages.length > 0) {
          console.log(`[VenueForm] Uploading ${venueImages.length} venue image(s) to folder: venue/${venueId}`);
          uploadPromises.push(
            uploadImagesToFolder(venueImages, 'venue', venueId).then(urls => {
              console.log(`[VenueForm] Successfully uploaded ${urls.length} venue image(s)`);
              allVenueImageUrls = [...allVenueImageUrls, ...urls];
              return urls;
            })
          );
        }

        // Upload food images
        if (foodImages.length > 0) {
          console.log(`[VenueForm] Uploading ${foodImages.length} food image(s) to folder: food/${venueId}`);
          uploadPromises.push(
            uploadImagesToFolder(foodImages, 'food', venueId).then(urls => {
              console.log(`[VenueForm] Successfully uploaded ${urls.length} food image(s)`);
              foodImageUrls = urls;
              return urls;
            })
          );
        }

        // Upload menu images
        if (menuImages.length > 0) {
          console.log(`[VenueForm] Uploading ${menuImages.length} menu image(s) to folder: menu/${venueId}`);
          uploadPromises.push(
            uploadImagesToFolder(menuImages, 'menu', venueId).then(urls => {
              console.log(`[VenueForm] Successfully uploaded ${urls.length} menu image(s)`);
              menuImageUrls = urls;
              return urls;
            })
          );
        }

        await Promise.all(uploadPromises);

        // Update venue with all image URLs
        const updateData: any = { imageUrl: allVenueImageUrls };
        if (foodImageUrls.length > 0) {
          // Get existing food images if in edit mode
          const existingFoodUrls = isEditMode && venue ? (venue as any).foodImageUrl || [] : [];
          updateData.foodImageUrl = [...existingFoodUrls, ...foodImageUrls];
        }
        if (menuImageUrls.length > 0) {
          // Get existing menu images if in edit mode
          const existingMenuUrls = isEditMode && venue ? (venue as any).menuImageUrl || [] : [];
          updateData.menuImageUrl = [...existingMenuUrls, ...menuImageUrls];
        }
        
        await updateDoc(venueRef, updateData);
      } catch (uploadError) {
        console.error('Error uploading images:', uploadError);
        alert(isEditMode ? 'Venue updated but some images failed to upload.' : 'Venue created but some images failed to upload. You can add images later.');
      } finally {
        setUploadingImages(false);
      }

      alert(isEditMode ? 'Venue updated successfully!' : 'Venue created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        address: '',
        atmosphere: '',
        phone: '',
        latitude: '',
        longitude: '',
      });
      setVenueImages([]);
      setFoodImages([]);
      setMenuImages([]);
      setOpeningHours({});
      setPublicHolidayRule('closed');
      
      onSuccess();
    } catch (error) {
      console.error('Error creating venue:', error);
      alert('Error creating venue. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        {isEditMode ? 'Edit Venue' : 'Add New Venue'}
      </h2>
      
      {/* Show existing venue images */}
      {isEditMode && existingVenueImages.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Existing Venue Images ({existingVenueImages.length})
          </label>
          <div className="grid grid-cols-4 gap-2">
            {existingVenueImages.map((url, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={url}
                  alt={`Existing ${idx + 1}`}
                  className="w-full h-24 object-cover rounded-md border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteImage(url, idx)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  title="Delete image"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latitude <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              required
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              placeholder="e.g., 40.7128"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitude <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              required
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              placeholder="e.g., -74.0060"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Atmosphere (optional)
          </label>
          <input
            type="text"
            value={formData.atmosphere}
            onChange={(e) => setFormData({ ...formData, atmosphere: e.target.value })}
            placeholder="e.g., Casual, Upscale, Cozy"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone (optional)
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        {/* Opening Hours */}
        <div>
          <OpeningHoursInput
            value={openingHours}
            onChange={setOpeningHours}
            publicHolidayRule={publicHolidayRule}
            onPublicHolidayRuleChange={setPublicHolidayRule}
          />
        </div>

        {/* Image Upload Sections */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium text-gray-700">Images</h3>
          
          {/* Venue Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Venue Images (exterior, interior, ambiance)
            </label>
            <ImageUpload
              id="venue-images-upload"
              images={venueImages}
              onImagesChange={setVenueImages}
              multiple={true}
              maxImages={10 - existingVenueImages.length}
            />
            {isEditMode && (
              <p className="mt-1 text-sm text-gray-500">
                Add more venue images (currently {existingVenueImages.length} images)
              </p>
            )}
          </div>

          {/* Food Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Food Images (dishes, meals, food presentation)
            </label>
            <ImageUpload
              id="food-images-upload"
              images={foodImages}
              onImagesChange={setFoodImages}
              multiple={true}
              maxImages={10}
            />
            {isEditMode && existingFoodImages.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                Currently {existingFoodImages.length} food images
              </p>
            )}
          </div>

          {/* Menu Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Menu Images (menu pages, drink lists, etc.)
            </label>
            <ImageUpload
              id="menu-images-upload"
              images={menuImages}
              onImagesChange={setMenuImages}
              multiple={true}
              maxImages={10}
            />
            {isEditMode && existingMenuImages.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                Currently {existingMenuImages.length} menu images
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploadingImages}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploadingImages ? 'Uploading images...' : loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Venue' : 'Create Venue')}
          </button>
        </div>
      </form>
    </div>
  );
}
