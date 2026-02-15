'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EventForm from '@/components/EventForm';

interface Event {
  id: string;
  name: string;
  description: string;
  venueId: string;
  dateTime: Timestamp;
  cost?: string;
  imageUrl?: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'events'));
      const eventsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Event[];
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await deleteDoc(doc(db, 'events', id));
      setEvents(events.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event');
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  if (loading) {
    return <div className="p-4">Loading events...</div>;
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Event'}
        </button>
      </div>

      {(showForm || editingEvent) && (
        <div className="mb-6">
          <EventForm
            event={editingEvent || undefined}
            onSuccess={() => {
              setShowForm(false);
              setEditingEvent(null);
              loadEvents();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingEvent(null);
            }}
          />
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {events.length === 0 ? (
            <li className="p-4 text-gray-500">No events found. Create your first event!</li>
          ) : (
            events.map((event) => (
              <li key={event.id} className="p-4 hover:bg-gray-50">
                <div className="flex gap-4">
                  {/* Image */}
                  {event.imageUrl && (
                    <div className="flex-shrink-0">
                      <img
                        src={event.imageUrl}
                        alt={event.name}
                        className="w-32 h-32 object-cover rounded-md border border-gray-300"
                      />
                    </div>
                  )}
                  
                  {/* Event Info */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Date: {formatDate(event.dateTime)}
                    </p>
                    <p className="text-sm text-gray-500">Venue ID: {event.venueId}</p>
                    {event.cost && (
                      <p className="text-sm text-gray-500">Cost: {event.cost}</p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setEditingEvent(event)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
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
