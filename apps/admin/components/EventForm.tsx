'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadImage } from '@/lib/storage';
import ImageUpload from './ImageUpload';
import EventImageGenerator from './EventImageGenerator';

interface Event {
  id: string;
  name: string;
  description: string;
  venueId: string;
  dateTime: Timestamp;
  cost?: string;
  imageUrl?: string;
}

interface EventFormProps {
  event?: Event;
  onSuccess: () => void;
  onCancel: () => void;
}

interface Venue {
  id: string;
  name: string;
}

export default function EventForm({ event, onSuccess, onCancel }: EventFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    venueId: '',
    dateTime: '',
    cost: '',
  });

  const isEditMode = !!event;

  useEffect(() => {
    if (event) {
      const date = event.dateTime.toDate();
      const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      
      setFormData({
        name: event.name || '',
        description: event.description || '',
        venueId: event.venueId || '',
        dateTime: localDateTime,
        cost: event.cost || '',
      });
      setExistingImageUrl(event.imageUrl || null);
    }
  }, [event]);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'venues'));
      const venuesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unnamed Venue',
      }));
      setVenues(venuesData);
    } catch (error) {
      console.error('Error loading venues:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.description || !formData.venueId || !formData.dateTime) {
        alert('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Parse date
      const dateTime = new Date(formData.dateTime);
      if (isNaN(dateTime.getTime())) {
        alert('Please enter a valid date and time');
        setLoading(false);
        return;
      }

      let eventRef;
      let finalImageUrl = existingImageUrl;

      if (isEditMode && event) {
        // Update existing event
        eventRef = doc(db, 'events', event.id);
        await updateDoc(eventRef, {
          name: formData.name,
          description: formData.description,
          venueId: formData.venueId,
          dateTime: Timestamp.fromDate(dateTime),
          cost: formData.cost || null,
        });
      } else {
        // Create new event
        eventRef = await addDoc(collection(db, 'events'), {
          name: formData.name,
          description: formData.description,
          venueId: formData.venueId,
          dateTime: Timestamp.fromDate(dateTime),
          cost: formData.cost || null,
          imageUrl: null,
        });
      }

      // Upload new image if provided
      if (images.length > 0) {
        setUploadingImage(true);
        try {
          // Events use single image: events/{eventId}/image.jpg
          const imagePath = `events/${eventRef.id}/image.jpg`;
          finalImageUrl = await uploadImage(images[0], imagePath);
          
          // Update event with image URL
          await updateDoc(eventRef, { imageUrl: finalImageUrl });
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          alert(isEditMode ? 'Event updated but image failed to upload.' : 'Event created but image failed to upload. You can add image later.');
        } finally {
          setUploadingImage(false);
        }
      }

      alert(isEditMode ? 'Event updated successfully!' : 'Event created successfully!');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        venueId: '',
        dateTime: '',
        cost: '',
      });
      setImages([]);
      
      onSuccess();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        {isEditMode ? 'Edit Event' : 'Add New Event'}
      </h2>
      
      {/* Show existing image */}
      {isEditMode && existingImageUrl && (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Existing Image
          </label>
          <img
            src={existingImageUrl}
            alt="Existing event"
            className="w-48 h-48 object-cover rounded-md border border-gray-300"
          />
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Venue <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.venueId}
            onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a venue</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            required
            value={formData.dateTime}
            onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cost (optional)
          </label>
          <input
            type="text"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            placeholder="e.g., €20, Free, €10-15"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Event Image
            </label>
            <button
              type="button"
              onClick={() => setShowImageGenerator(!showImageGenerator)}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              {showImageGenerator ? 'Hide Generator' : 'Generate Image'}
            </button>
          </div>
          
          {showImageGenerator && (
            <div className="mb-4">
              <EventImageGenerator
                onImageGenerated={(imageFile) => {
                  setImages([imageFile]);
                  setShowImageGenerator(false);
                  alert('Image generated! It will be uploaded when you save the event.');
                }}
              />
            </div>
          )}

          <ImageUpload
            images={images}
            onImagesChange={setImages}
            multiple={false}
          />
          {isEditMode && existingImageUrl && (
            <p className="mt-1 text-sm text-gray-500">
              Upload a new image to replace the existing one
            </p>
          )}
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
            disabled={loading || uploadingImage}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploadingImage ? 'Uploading image...' : loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Event' : 'Create Event')}
          </button>
        </div>
      </form>
    </div>
  );
}
