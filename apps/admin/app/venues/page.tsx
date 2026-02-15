'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import VenueForm from '@/components/VenueForm';

interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
  atmosphere?: string;
  phone?: string;
  imageUrl?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
}

export default function VenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'venues'));
      const venuesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Extract location from GeoPoint
        const location = data.location;
        return {
          id: doc.id,
          ...data,
          location: location ? {
            latitude: location.latitude,
            longitude: location.longitude,
          } : undefined,
        };
      }) as Venue[];
      setVenues(venuesData);
    } catch (error) {
      console.error('Error loading venues:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <div className="p-4">Loading venues...</div>;
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
        <button
          onClick={() => router.push('/venues/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add Venue
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {venues.length === 0 ? (
            <li className="p-4 text-gray-500">No venues found. Create your first venue!</li>
          ) : (
            venues.map((venue) => (
              <li
                key={venue.id}
                onClick={() => router.push(`/venues/${venue.id}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex gap-4 items-center">
                  {/* Single Image */}
                  {venue.imageUrl && venue.imageUrl.length > 0 ? (
                    <div className="flex-shrink-0">
                      <img
                        src={venue.imageUrl[0]}
                        alt={venue.name}
                        className="w-24 h-24 object-cover rounded-md border border-gray-300"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-200 rounded-md border border-gray-300 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No Image</span>
                    </div>
                  )}
                  
                  {/* Venue Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{venue.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 truncate">{venue.address}</p>
                  </div>
                  
                  <div className="flex items-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
