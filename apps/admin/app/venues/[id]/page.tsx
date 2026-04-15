'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc, deleteDoc, GeoPoint, collection, getDocs, addDoc, Timestamp, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadImagesToFolder, deleteImage, uploadImage } from '@/lib/storage';
import ImageUpload from '@/components/ImageUpload';
import OpeningHoursInputV2 from '@/components/OpeningHoursInputV2';
import { Venue, TimeRange, Experience, ExperienceInstance, VenueExperience, MenuItem, MenuSection } from '@loki/shared';
import { validateHandle } from '@loki/shared/handleUtils';
import { Flame } from 'lucide-react';
import {
  taxonomy,
  SECTION_LIMITS,
  SECTIONS_WITH_OTHER,
  getSectionLabel,
  formatTagForDisplay,
  parseVenueTagsIntoState,
  buildTagsFromState,
} from '@/lib/venueTags';

// Image focus position for 1:1 crop (saved to Firestore, used by app for object-position / alignment)
const IMAGE_FOCUS_OPTIONS = ['center', 'top', 'bottom', 'left', 'right'] as const;
const focusToObjectPosition = (focus: string): string => {
  const map: Record<string, string> = { center: 'center', top: 'center top', bottom: 'center bottom', left: 'left center', right: 'right center' };
  return map[focus] || 'center';
};

// Currency helper function
const getCurrencySymbol = (currencyCode: string): string => {
  const currencyMap: { [key: string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CZK: 'Kč',
    HUF: 'Ft',
  };
  return currencyMap[currencyCode] || currencyCode;
};

export default function VenueProfilePage() {
  const router = useRouter();
  const params = useParams();
  const venueId = params.id as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiCompleting, setAiCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'location' | 'about' | 'menu' | 'events' | 'specials' | 'tags' | 'images' | 'settings'>('location');
  
  // Experiences state
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [experienceInstances, setExperienceInstances] = useState<ExperienceInstance[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(false);
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [experienceType, setExperienceType] = useState<'event' | 'special'>('event');
  const [openEditExperienceId, setOpenEditExperienceId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [venueExperiences, setVenueExperiences] = useState<VenueExperience[]>([]); // Track venue's experiences array (visibility per experience)
  const [expandedSpecials, setExpandedSpecials] = useState<Set<string>>(new Set()); // Track which specials have expanded details
  const [activeImageTab, setActiveImageTab] = useState<'venue' | 'food' | 'menu'>('venue'); // Track which image tab is active
  const [activeLocationTab, setActiveLocationTab] = useState<'contact' | 'hours'>('contact'); // Track which location sub-tab is active

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    timezone: 'Europe/Dublin',
    description: '',
    introduction: '',
    offeringsAndMenu: '',
    designAndAtmosphere: '',
    publicOpinionHighlights: '',
    satisfactionScore: '',
    address: '',
    atmosphere: '',
    phone: '',
    latitude: '',
    longitude: '',
    establishmentType: '',
    currency: 'EUR',
    email: '',
    websiteUrl: '',
    instagramUrl: '',
    bookingUrl: '',
  });
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string | null>(null); // For unsaved changes
  const [handleError, setHandleError] = useState<string | null>(null);
  const [handleChecking, setHandleChecking] = useState(false);

  // Tags state (taxonomy-driven: cuisine 1, specialties 2, highlights_experiences 2, rest multiple; + other tag arrays)
  const [tagBySection, setTagBySection] = useState<Record<string, string[]>>({});
  const [cuisineOtherTags, setCuisineOtherTags] = useState<string[]>([]);
  const [specialtiesOtherTags, setSpecialtiesOtherTags] = useState<string[]>([]);
  const [highlightsOtherTags, setHighlightsOtherTags] = useState<string[]>([]);
  const [extraTags, setExtraTags] = useState<string[]>([]);
  const [tagSearchBySection, setTagSearchBySection] = useState<Record<string, string>>({});
  const [openTagDropdown, setOpenTagDropdown] = useState<string | null>(null);
  const [cuisineOtherInput, setCuisineOtherInput] = useState('');
  const [specialtiesOtherInput, setSpecialtiesOtherInput] = useState('');
  const [highlightsOtherInput, setHighlightsOtherInput] = useState('');

  const computedTags = useMemo(
    () => buildTagsFromState(tagBySection, cuisineOtherTags, specialtiesOtherTags, highlightsOtherTags, extraTags),
    [tagBySection, cuisineOtherTags, specialtiesOtherTags, highlightsOtherTags, extraTags]
  );

  const [openingHours, setOpeningHours] = useState<{
    monday: TimeRange[];
    tuesday: TimeRange[];
    wednesday: TimeRange[];
    thursday: TimeRange[];
    friday: TimeRange[];
    saturday: TimeRange[];
    sunday: TimeRange[];
  }>({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  });

  // Image states
  const [venueImages, setVenueImages] = useState<File[]>([]);
  const [foodImages, setFoodImages] = useState<File[]>([]);
  const [menuImages, setMenuImages] = useState<File[]>([]);
  const [existingVenueImages, setExistingVenueImages] = useState<string[]>([]);
  const [existingFoodImages, setExistingFoodImages] = useState<string[]>([]);
  const [existingMenuImages, setExistingMenuImages] = useState<string[]>([]);
  /** Focus for 1:1 crop per image: 'center' | 'top' | 'bottom' | 'left' | 'right'. Same length as image arrays. */
  const [existingVenueFocus, setExistingVenueFocus] = useState<string[]>([]);
  const [existingFoodFocus, setExistingFoodFocus] = useState<string[]>([]);
  const [existingMenuFocus, setExistingMenuFocus] = useState<string[]>([]);

  // Menu sections state
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);
  const [expandedMenuSections, setExpandedMenuSections] = useState<Set<string>>(new Set()); // Track which menu sections are expanded
  const [expandedMenuItemInfo, setExpandedMenuItemInfo] = useState<Set<string>>(new Set()); // Which menu item "Additional info" is expanded
  const [showSaveNotification, setShowSaveNotification] = useState(false); // Track save notification visibility
  // Menu item images: Map of itemId -> File
  const [menuItemImages, setMenuItemImages] = useState<Map<string, File>>(new Map());
  // Menu PDF: pending file or current URL (null = removed)
  const [menuPdfFile, setMenuPdfFile] = useState<File | null>(null);
  const [existingMenuPdfUrl, setExistingMenuPdfUrl] = useState<string | null>(null);

  const isNewVenue = venueId === 'new';

  // Unsaved changes: compare current state to snapshot, or pending image uploads
  const hasUnsavedChanges = useMemo(() => {
    if (isNewVenue) return true;
    const pendingImages = venueImages.length > 0 || foodImages.length > 0 || menuImages.length > 0 || menuItemImages.size > 0 || menuPdfFile != null;
    if (pendingImages) return true;
    if (!initialFormSnapshot) return false;
    const current = JSON.stringify({
      formData,
      openingHours,
      tagBySection,
      cuisineOtherTags,
      specialtiesOtherTags,
      highlightsOtherTags,
      extraTags,
      menuSections,
      existingVenueImages,
      existingFoodImages,
      existingMenuImages,
      existingVenueFocus,
      existingFoodFocus,
      existingMenuFocus,
    });
    return current !== initialFormSnapshot;
  }, [isNewVenue, initialFormSnapshot, formData, openingHours, tagBySection, cuisineOtherTags, specialtiesOtherTags, highlightsOtherTags, extraTags, menuSections, existingVenueImages, existingFoodImages, existingMenuImages, existingVenueFocus, existingFoodFocus, existingMenuFocus, venueImages.length, foodImages.length, menuImages.length, menuItemImages.size, menuPdfFile]);

  // Read URL params: ?tab=specials&edit=experienceId → open specials tab and edit form
  useEffect(() => {
    const tab = searchParams.get('tab');
    const edit = searchParams.get('edit');
    if (tab === 'specials') {
      setActiveTab('specials');
      setExperienceType('special');
    }
    if (edit) {
      setOpenEditExperienceId(edit);
    }
  }, [searchParams]);

  useEffect(() => {
    if (venueId && !isNewVenue) {
      loadVenue();
    } else if (isNewVenue) {
      // Initialize as new venue
      setLoading(false);
      setVenue({
        id: 'new',
        name: '',
        timezone: 'Europe/Dublin',
        location: { lat: 0, lng: 0 },
        openingHours: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        },
        hasActiveExperience: false,
        nextExperienceAt: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as Venue);
    }
  }, [venueId, isNewVenue]);

  useEffect(() => {
    if ((activeTab === 'events' || activeTab === 'specials') && venueId) {
      loadExperiences();
      loadExperienceInstances();
    }
  }, [activeTab, venueId]);

  // When experiences loaded and we have openEditExperienceId from URL, open edit form and clear URL
  useEffect(() => {
    if (!openEditExperienceId || !venueId || isNewVenue) return;
    const exp = experiences.find((e) => e.id === openEditExperienceId && e.type === 'special');
    if (exp) {
      setEditingExperience(exp);
      setShowExperienceForm(true);
      setExperienceType('special');
      setActiveTab('specials');
      setOpenEditExperienceId(null);
      router.replace(`/venues/${venueId}`, { scroll: false });
    }
  }, [experiences, openEditExperienceId, venueId, isNewVenue, router]);

  const loadVenue = async () => {
    try {
      const venueDoc = await getDoc(doc(db, 'venues', venueId));
      if (venueDoc.exists()) {
        const data = venueDoc.data();
        const location = data.location;
        
        // Convert location from GeoPoint (latitude/longitude) to lat/lng format
        const locationData = location
          ? {
              lat: location.latitude,
              lng: location.longitude,
            }
          : { lat: 0, lng: 0 };

        // Convert openingHours from old format to new array format
        let openingHoursData = {
          monday: [] as TimeRange[],
          tuesday: [] as TimeRange[],
          wednesday: [] as TimeRange[],
          thursday: [] as TimeRange[],
          friday: [] as TimeRange[],
          saturday: [] as TimeRange[],
          sunday: [] as TimeRange[],
        };

        if (data.openingHours) {
          // Check if it's old format (single time range per day) or new format (array)
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
          days.forEach(day => {
            const dayHours = data.openingHours[day];
            if (dayHours) {
              if (Array.isArray(dayHours)) {
                // New format - already an array
                openingHoursData[day] = dayHours;
              } else if (dayHours.open && dayHours.close && !dayHours.closed) {
                // Old format - single time range, convert to array
                openingHoursData[day] = [{ open: dayHours.open, close: dayHours.close }];
              }
            }
          });
        }

        const loadedVenue = {
          id: venueDoc.id,
          ...data,
          location: locationData,
          openingHours: openingHoursData,
          timezone: data.timezone || 'Europe/Dublin',
          hasActiveExperience: data.hasActiveExperience || false,
          nextExperienceAt: data.nextExperienceAt || null,
        } as Venue;

        setVenue(loadedVenue);
        const fd = {
          name: loadedVenue.name || '',
          handle: (loadedVenue as any).handle || '',
          timezone: loadedVenue.timezone || 'Europe/Dublin',
          description: loadedVenue.description || '',
          introduction: loadedVenue.introduction || '',
          offeringsAndMenu: loadedVenue.offeringsAndMenu || '',
          designAndAtmosphere: loadedVenue.designAndAtmosphere || '',
          publicOpinionHighlights: loadedVenue.publicOpinionHighlights || '',
          satisfactionScore: loadedVenue.satisfactionScore?.toString() || '',
          address: loadedVenue.address || '',
          atmosphere: loadedVenue.atmosphere || '',
          phone: loadedVenue.phone || '',
          latitude: locationData.lat.toString(),
          longitude: locationData.lng.toString(),
          establishmentType: loadedVenue.establishmentType || '',
          currency: loadedVenue.currency || 'EUR',
          email: (loadedVenue as any).email || '',
          websiteUrl: (loadedVenue as any).websiteUrl || '',
          instagramUrl: (loadedVenue as any).instagramUrl || '',
          bookingUrl: (loadedVenue as any).bookingUrl || '',
        };
        setFormData(fd);
        const venueUrls = loadedVenue.imageUrl || [];
        const foodUrls = loadedVenue.foodImageUrl || [];
        const menuUrls = loadedVenue.menuImageUrl || [];
        setExistingVenueImages(venueUrls);
        setExistingFoodImages(foodUrls);
        setExistingMenuImages(menuUrls);
        const defaultFocus = (focusArr: string[] | undefined, len: number) =>
          Array.from({ length: len }, (_, i) => focusArr?.[i] || 'center');
        setExistingVenueFocus(defaultFocus((loadedVenue as any).imageFocus, venueUrls.length));
        setExistingFoodFocus(defaultFocus((loadedVenue as any).foodImageFocus, foodUrls.length));
        setExistingMenuFocus(defaultFocus((loadedVenue as any).menuImageFocus, menuUrls.length));
        setExistingMenuPdfUrl((loadedVenue as any).menuPdfUrl ?? null);
        setOpeningHours(openingHoursData);
        setVenueExperiences(loadedVenue.experiences || []);
        const { tagBySection: parsed, extraTags: extras } = parseVenueTagsIntoState(loadedVenue.tags);
        setTagBySection(parsed);
        setCuisineOtherTags([]);
        setSpecialtiesOtherTags([]);
        setHighlightsOtherTags([]);
        setExtraTags(extras);
        
        // Load menu sections or initialize with defaults
        let sectionsToSet: MenuSection[];
        if (loadedVenue.menuSections && loadedVenue.menuSections.length > 0) {
          sectionsToSet = [...loadedVenue.menuSections].sort((a, b) => {
            const orderA = a.order ?? Infinity;
            const orderB = b.order ?? Infinity;
            return orderA - orderB;
          });
        } else {
          sectionsToSet = [
            { id: 'main-dishes', title: 'Main Dishes', items: [], order: 0 },
            { id: 'sides', title: 'Sides', items: [], order: 1 },
            { id: 'hot-drinks', title: 'Hot Drinks', items: [], order: 2 },
            { id: 'alcoholic', title: 'Alcoholic', items: [], order: 3 },
            { id: 'non-alcoholic', title: 'Non-Alcoholic', items: [], order: 4 },
          ];
        }
        setMenuSections(sectionsToSet);
        setInitialFormSnapshot(JSON.stringify({
          formData: fd,
          openingHours: openingHoursData,
          tagBySection: parsed,
          cuisineOtherTags: [],
          specialtiesOtherTags: [],
          highlightsOtherTags: [],
          extraTags: extras,
          menuSections: sectionsToSet,
          existingVenueImages: venueUrls,
          existingFoodImages: foodUrls,
          existingMenuImages: menuUrls,
          existingVenueFocus: defaultFocus((loadedVenue as any).imageFocus, venueUrls.length),
          existingFoodFocus: defaultFocus((loadedVenue as any).foodImageFocus, foodUrls.length),
          existingMenuFocus: defaultFocus((loadedVenue as any).menuImageFocus, menuUrls.length),
        }));
      } else {
        alert('Venue not found');
        router.push('/venues');
      }
    } catch (error) {
      console.error('Error loading venue:', error);
      alert('Error loading venue');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!venue && !isNewVenue) return;

    setSaving(true);
    try {
      // Validate coordinates
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        alert('Please enter valid latitude and longitude');
        setSaving(false);
        return;
      }

      let venueRef;
      if (isNewVenue) {
        // Create new venue
        const newVenueData: any = {
          name: formData.name,
          timezone: formData.timezone,
          description: formData.description || null,
          introduction: formData.introduction || null,
          offeringsAndMenu: formData.offeringsAndMenu || null,
          designAndAtmosphere: formData.designAndAtmosphere || null,
          publicOpinionHighlights: formData.publicOpinionHighlights || null,
          satisfactionScore: formData.satisfactionScore ? parseFloat(formData.satisfactionScore) : null,
          address: formData.address || null,
          location: new GeoPoint(lat, lng),
          atmosphere: formData.atmosphere || null,
          phone: formData.phone || null,
          email: formData.email || null,
          openingHours: {
            monday: openingHours.monday || [],
            tuesday: openingHours.tuesday || [],
            wednesday: openingHours.wednesday || [],
            thursday: openingHours.thursday || [],
            friday: openingHours.friday || [],
            saturday: openingHours.saturday || [],
            sunday: openingHours.sunday || [],
          },
          hasActiveExperience: false,
          nextExperienceAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          imageUrl: [],
          foodImageUrl: [],
          menuImageUrl: [],
          visibility: true,
          ownerId: null,
          claimed: false,
          menuSections: [...menuSections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((section, index) => ({
            ...section,
            order: section.order ?? index,
          })),
          tags: computedTags,
        };

        if (formData.establishmentType) {
          newVenueData.establishmentType = formData.establishmentType;
        }
        
        if (formData.currency) {
          newVenueData.currency = formData.currency;
        }

        venueRef = await addDoc(collection(db, 'venues'), newVenueData);
        
        // Upload images if any
        const venueIdForImages = venueRef.id;
        let allVenueImageUrls: string[] = [];
        let allFoodImageUrls: string[] = [];
        let allMenuImageUrls: string[] = [];

        if (venueImages.length > 0) {
          const urls = await uploadImagesToFolder(venueImages, 'venue', venueIdForImages);
          allVenueImageUrls = urls;
        }

        if (foodImages.length > 0) {
          const urls = await uploadImagesToFolder(foodImages, 'food', venueIdForImages);
          allFoodImageUrls = urls;
        }

        if (menuImages.length > 0) {
          const urls = await uploadImagesToFolder(menuImages, 'menu', venueIdForImages);
          allMenuImageUrls = urls;
        }

        let menuPdfUrlUploaded: string | null = null;
        if (menuPdfFile) {
          menuPdfUrlUploaded = await uploadImage(menuPdfFile, `venues/${venueIdForImages}/menu/menu.pdf`);
        }

        // Upload menu item images and update menuSections
        const updatedMenuSections = await Promise.all(
          menuSections.map(async (section) => {
            const updatedItems = await Promise.all(
              section.items.map(async (item) => {
                const imageFile = menuItemImages.get(item.id);
                if (imageFile) {
                  // For new venues, no old image to delete
                  const imagePath = `venues/${venueIdForImages}/menu-items/${item.id}/image.jpg`;
                  const imageUrl = await uploadImage(imageFile, imagePath);
                  return { ...item, imageUrl };
                }
                return item;
              })
            );
            return { ...section, items: updatedItems };
          })
        );

        if (allVenueImageUrls.length > 0 || allFoodImageUrls.length > 0 || allMenuImageUrls.length > 0 || menuItemImages.size > 0 || menuPdfUrlUploaded) {
          await updateDoc(venueRef, {
            imageUrl: allVenueImageUrls,
            foodImageUrl: allFoodImageUrls,
            menuImageUrl: allMenuImageUrls,
            imageFocus: allVenueImageUrls.map(() => 'center'),
            foodImageFocus: allFoodImageUrls.map(() => 'center'),
            menuImageFocus: allMenuImageUrls.map(() => 'center'),
            ...(menuPdfUrlUploaded && { menuPdfUrl: menuPdfUrlUploaded }),
            menuSections: updatedMenuSections,
            websiteUrl: formData.websiteUrl?.trim() || null,
            instagramUrl: formData.instagramUrl?.trim() || null,
            bookingUrl: formData.bookingUrl?.trim() || null,
          });
        }

        // Clear menu item images and menu PDF
        setMenuItemImages(new Map());
        setMenuPdfFile(null);

        // Redirect to the new venue's profile page
        router.push(`/venues/${venueRef.id}`);
        return;
      }

      venueRef = doc(db, 'venues', venueId);
      const updateData: any = {
        name: formData.name, // Stored in Firestore
        timezone: formData.timezone,
        description: formData.description || null,
        introduction: formData.introduction || null, // Stored in Firestore
        offeringsAndMenu: formData.offeringsAndMenu || null,
        designAndAtmosphere: formData.designAndAtmosphere || null, // Stored in Firestore
        publicOpinionHighlights: formData.publicOpinionHighlights || null, // Stored in Firestore
        satisfactionScore: formData.satisfactionScore ? parseFloat(formData.satisfactionScore) : null, // Stored in Firestore (as number)
        address: formData.address || null,
        location: new GeoPoint(lat, lng), // Firestore GeoPoint uses latitude/longitude
        atmosphere: formData.atmosphere || null,
        phone: formData.phone || null,
        email: formData.email || null,
        openingHours: {
          monday: openingHours.monday || [],
          tuesday: openingHours.tuesday || [],
          wednesday: openingHours.wednesday || [],
          thursday: openingHours.thursday || [],
          friday: openingHours.friday || [],
          saturday: openingHours.saturday || [],
          sunday: openingHours.sunday || [],
        }, // Now in array format - empty arrays for closed days
        updatedAt: serverTimestamp(),
      };

      // Set createdAt only if it doesn't exist (for new venues)
      if (!venue?.createdAt) {
        updateData.createdAt = serverTimestamp();
      }

      if (formData.establishmentType) {
        updateData.establishmentType = formData.establishmentType;
      }
      
      if (formData.currency) {
        updateData.currency = formData.currency;
      }

      if (formData.handle?.trim()) {
        const handleValidation = validateHandle(formData.handle.trim());
        if (!handleValidation.valid) {
          setHandleError(handleValidation.error ?? 'Invalid handle');
          setSaving(false);
          return;
        }
        updateData.handle = formData.handle.trim().toLowerCase();
      }
      updateData.websiteUrl = formData.websiteUrl?.trim() || null;
      updateData.instagramUrl = formData.instagramUrl?.trim() || null;
      updateData.bookingUrl = formData.bookingUrl?.trim() || null;

      // Upload new images and build focus arrays (new images get 'center')
      let allVenueImageUrls = [...existingVenueImages];
      let allFoodImageUrls = [...existingFoodImages];
      let allMenuImageUrls = [...existingMenuImages];
      let allVenueFocus = [...existingVenueFocus];
      let allFoodFocus = [...existingFoodFocus];
      let allMenuFocus = [...existingMenuFocus];

      if (venueImages.length > 0) {
        const urls = await uploadImagesToFolder(venueImages, 'venue', venueId);
        allVenueImageUrls = [...allVenueImageUrls, ...urls];
        allVenueFocus = [...allVenueFocus, ...urls.map(() => 'center')];
      }

      if (foodImages.length > 0) {
        const urls = await uploadImagesToFolder(foodImages, 'food', venueId);
        allFoodImageUrls = [...allFoodImageUrls, ...urls];
        allFoodFocus = [...allFoodFocus, ...urls.map(() => 'center')];
      }

      if (menuImages.length > 0) {
        const urls = await uploadImagesToFolder(menuImages, 'menu', venueId);
        allMenuImageUrls = [...allMenuImageUrls, ...urls];
        allMenuFocus = [...allMenuFocus, ...urls.map(() => 'center')];
      }

      // Upload menu item images and update menuSections
      // Sort sections by order before saving to ensure consistent order
      const sortedMenuSections = [...menuSections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const updatedMenuSections = await Promise.all(
        sortedMenuSections.map(async (section) => {
          const updatedItems = await Promise.all(
            section.items.map(async (item) => {
              const imageFile = menuItemImages.get(item.id);
              if (imageFile) {
                // Delete old image if it exists
                if (item.imageUrl) {
                  try {
                    await deleteImage(item.imageUrl);
                  } catch (error) {
                    console.error('Error deleting old menu item image:', error);
                    // Continue with upload even if deletion fails
                  }
                }
                const imagePath = `venues/${venueId}/menu-items/${item.id}/image.jpg`;
                const imageUrl = await uploadImage(imageFile, imagePath);
                return { ...item, imageUrl };
              }
              // Keep existing imageUrl if no new image is uploaded
              return item;
            })
          );
          // Preserve order field when saving
          return { ...section, items: updatedItems, order: section.order ?? 0 };
        })
      );

        updateData.imageUrl = allVenueImageUrls;
        updateData.foodImageUrl = allFoodImageUrls;
        updateData.menuImageUrl = allMenuImageUrls;
        updateData.imageFocus = allVenueFocus;
        updateData.foodImageFocus = allFoodFocus;
        updateData.menuImageFocus = allMenuFocus;
        updateData.menuSections = updatedMenuSections;
        updateData.tags = computedTags;

      if (menuPdfFile) {
        const pdfUrl = await uploadImage(menuPdfFile, `venues/${venueId}/menu/menu.pdf`);
        updateData.menuPdfUrl = pdfUrl;
      } else {
        updateData.menuPdfUrl = existingMenuPdfUrl ?? null;
      }

      await updateDoc(venueRef, updateData);

      // Clear menu item images and menu PDF after successful save
      setMenuItemImages(new Map());
      setMenuPdfFile(null);
      setExistingMenuPdfUrl(updateData.menuPdfUrl ?? null);

      // Clear new image arrays
      setVenueImages([]);
      setFoodImages([]);
      setMenuImages([]);
      setExistingVenueImages(allVenueImageUrls);
      setExistingFoodImages(allFoodImageUrls);
      setExistingMenuImages(allMenuImageUrls);
      setExistingVenueFocus(allVenueFocus);
      setExistingFoodFocus(allFoodFocus);
      setExistingMenuFocus(allMenuFocus);

      // Update snapshot so unsaved changes clears
      setInitialFormSnapshot(JSON.stringify({
        formData,
        openingHours,
        tagBySection,
        cuisineOtherTags,
        specialtiesOtherTags,
        highlightsOtherTags,
        extraTags,
        menuSections: sortedMenuSections,
        existingVenueImages: allVenueImageUrls,
        existingFoodImages: allFoodImageUrls,
        existingMenuImages: allMenuImageUrls,
        existingVenueFocus: allVenueFocus,
        existingFoodFocus: allFoodFocus,
        existingMenuFocus: allMenuFocus,
      }));

      // Show success notification
      setShowSaveNotification(true);
      setTimeout(() => {
        setShowSaveNotification(false);
      }, 3000); // Auto-dismiss after 3 seconds
      
      loadVenue(); // Reload to get latest data
    } catch (error) {
      console.error('Error saving venue:', error);
      alert('Error saving venue. Please check console for details.');
    } finally {
      setSaving(false);
    }
  };

  const handleAIComplete = async () => {
    // Validate required fields
    if (!formData.name.trim() || !formData.establishmentType.trim() || !formData.address.trim()) {
      alert('Please fill in Venue Name, Establishment Type, and Address before using AI completion');
      return;
    }

    setAiCompleting(true);
    setError(null);

    try {
      const userPrompt = `Generate a venue summary based on the following information. Return a JSON object with the fields: introduction, designAndAtmosphere, offeringsAndMenu, publicOpinionHighlights, and satisfactionScore.

Venue Name: ${formData.name}
Type of Establishment: ${formData.establishmentType}
Location: ${formData.address}

IMPORTANT: 
- Always provide publicOpinionHighlights based on typical feedback patterns for this type of venue in this location
- Always provide satisfactionScore as a number (estimate based on venue type and location, typically 6.5-8.5)
- Do NOT use null for publicOpinionHighlights or satisfactionScore`;

      const SYSTEM_PROMPT = `You are an expert local guide and a sophisticated AI assistant specializing in curating detailed, engaging, and informative summaries of venues. Your primary task is to synthesize provided information about a venue into a structured, concise, and appealing description, suitable for a discovery platform like LOKI.

**Writing Style:**
- Eliminate emojis completely
- Filter hype and marketing language
- Remove soft asks and conversational transitions
- Omit call-to-action appendixes
- Assume user retains high-perception despite blunt tone
- Be direct, factual, and informative

**Output Format Requirements:**
You MUST respond with a valid JSON object containing exactly these fields:
{
  "introduction": "A brief, engaging paragraph introducing the venue, its primary offering, and key characteristics. Mention location if provided.",
  "designAndAtmosphere": "Detail the interior design, overall ambiance, and notable features that contribute to the venue's vibe (e.g., dog-friendly, work-friendly, romantic, lively, intimate).",
  "offeringsAndMenu": "Describe the venue's primary offerings, including culinary or beverage focus, specialties, unique items, and any dietary considerations or special services.",
  "publicOpinionHighlights": "Summarize typical positive sentiments and potential concerns that venues of this type and location typically receive. Base this on common patterns for similar establishments, even if specific review data is not provided. Always provide this field - never use null.",
  "satisfactionScore": "A number between 0 and 10 representing a reasonable satisfaction score estimate based on the venue type, location, and typical standards for similar establishments. Always provide a number - never use null. Use a realistic score (typically 6.5-8.5 for average venues, 8.5-9.5 for exceptional ones)."
}

**Content Guidelines:**
1. **Introduction:** Brief paragraph introducing the venue, its primary offering, and key characteristics. Mention location if provided.
2. **Design and Atmosphere:** Detail interior design, overall ambiance, and notable features (e.g., dog-friendly, work-friendly, romantic, lively, intimate).
3. **Offerings and Menu:** Describe primary offerings, culinary/beverage focus, specialties, unique items, dietary considerations, or special services.
4. **Public Opinion Highlights:** Summarize typical positive sentiments and potential concerns that venues of this type and location typically receive. Base this on common patterns for similar establishments. ALWAYS provide this field - generate realistic highlights even without specific review data.
5. **Satisfaction Score:** Numerical score 0-10. Generate a reasonable estimate based on venue type, location, and typical standards for similar establishments. ALWAYS provide a number (typically 6.5-8.5 for average venues, 8.5-9.5 for exceptional ones).

**Constraints:**
*   Do NOT include external links or citations
*   Do NOT use bullet points - use paragraphs
*   Do NOT include emojis, hype language, or call-to-actions
*   ALWAYS provide publicOpinionHighlights and satisfactionScore - never use null for these fields
*   For publicOpinionHighlights: Generate realistic typical feedback patterns for this venue type
*   For satisfactionScore: Provide a reasonable estimate (6.5-8.5 typical, 8.5-9.5 exceptional)
*   Respond ONLY with valid JSON, no additional text`;

      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate description');
      }

      const data = await response.json();
      const content = data.content || '';

      // Parse JSON response
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        console.error('Failed to parse AI response as JSON:', e);
        throw new Error('AI returned invalid JSON format. Please try again.');
      }

      // Validate and extract fields from JSON
      const introduction = parsed.introduction || '';
      const designAndAtmosphere = parsed.designAndAtmosphere || '';
      const offeringsAndMenu = parsed.offeringsAndMenu || '';
      // Always provide publicOpinionHighlights - generate if missing
      const publicOpinionHighlights = parsed.publicOpinionHighlights || 
        (parsed.publicOpinionHighlights === null ? '' : 'Typical feedback patterns for this venue type would include positive aspects and common considerations.');
      // Always provide satisfactionScore - use reasonable default if missing
      const satisfactionScore = parsed.satisfactionScore !== null && parsed.satisfactionScore !== undefined 
        ? parsed.satisfactionScore.toString() 
        : '7.5'; // Default reasonable score if not provided

      // Update form data with parsed content
      setFormData(prev => ({
        ...prev,
        introduction: introduction || prev.introduction,
        offeringsAndMenu: offeringsAndMenu || prev.offeringsAndMenu,
        designAndAtmosphere: designAndAtmosphere || prev.designAndAtmosphere,
        publicOpinionHighlights: publicOpinionHighlights || prev.publicOpinionHighlights,
        satisfactionScore: satisfactionScore || prev.satisfactionScore,
      }));

      // Log parsed data for debugging
      console.log('AI Response (JSON):', parsed);

      alert('AI completion successful! Review and edit the generated content as needed.');
    } catch (err) {
      console.error('Error with AI completion:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during AI completion');
      alert('Error with AI completion. Please check console for details.');
    } finally {
      setAiCompleting(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string, imageType: 'venue' | 'food' | 'menu', index: number) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    if (!venue) return;

    const applyRemoval = async () => {
      if (imageType === 'venue') {
        const updated = existingVenueImages.filter((_, i) => i !== index);
        setExistingVenueImages(updated);
        await updateDoc(doc(db, 'venues', venueId), { imageUrl: updated });
        if (existingVenueFocus.length > index) {
          const focusUpdated = existingVenueFocus.filter((_, i) => i !== index);
          setExistingVenueFocus(focusUpdated);
          await updateDoc(doc(db, 'venues', venueId), { imageFocus: focusUpdated });
        }
      } else if (imageType === 'food') {
        const updated = existingFoodImages.filter((_, i) => i !== index);
        setExistingFoodImages(updated);
        await updateDoc(doc(db, 'venues', venueId), { foodImageUrl: updated });
        if (existingFoodFocus.length > index) {
          const focusUpdated = existingFoodFocus.filter((_, i) => i !== index);
          setExistingFoodFocus(focusUpdated);
          await updateDoc(doc(db, 'venues', venueId), { foodImageFocus: focusUpdated });
        }
      } else if (imageType === 'menu') {
        const updated = existingMenuImages.filter((_, i) => i !== index);
        setExistingMenuImages(updated);
        await updateDoc(doc(db, 'venues', venueId), { menuImageUrl: updated });
        if (existingMenuFocus.length > index) {
          const focusUpdated = existingMenuFocus.filter((_, i) => i !== index);
          setExistingMenuFocus(focusUpdated);
          await updateDoc(doc(db, 'venues', venueId), { menuImageFocus: focusUpdated });
        }
      }
    };

    try {
      await deleteImage(imageUrl);
      await applyRemoval();
      alert('Image deleted successfully!');
    } catch (error) {
      console.error('Error deleting image:', error);
      const isInvalidUrl = error instanceof Error && (
        error.message.includes('Invalid image URL') ||
        error.message.includes('invalid')
      );
      if (isInvalidUrl) {
        try {
          // Still remove from Firestore and UI (e.g. external or malformed URL)
          if (imageType === 'venue') {
            const updated = existingVenueImages.filter((_, i) => i !== index);
            setExistingVenueImages(updated);
            await updateDoc(doc(db, 'venues', venueId), { imageUrl: updated });
            if (existingVenueFocus.length > index) {
              const focusUpdated = existingVenueFocus.filter((_, i) => i !== index);
              setExistingVenueFocus(focusUpdated);
              await updateDoc(doc(db, 'venues', venueId), { imageFocus: focusUpdated });
            }
          } else if (imageType === 'food') {
            const updated = existingFoodImages.filter((_, i) => i !== index);
            setExistingFoodImages(updated);
            await updateDoc(doc(db, 'venues', venueId), { foodImageUrl: updated });
            if (existingFoodFocus.length > index) {
              const focusUpdated = existingFoodFocus.filter((_, i) => i !== index);
              setExistingFoodFocus(focusUpdated);
              await updateDoc(doc(db, 'venues', venueId), { foodImageFocus: focusUpdated });
            }
          } else if (imageType === 'menu') {
            const updated = existingMenuImages.filter((_, i) => i !== index);
            setExistingMenuImages(updated);
            await updateDoc(doc(db, 'venues', venueId), { menuImageUrl: updated });
            if (existingMenuFocus.length > index) {
              const focusUpdated = existingMenuFocus.filter((_, i) => i !== index);
              setExistingMenuFocus(focusUpdated);
              await updateDoc(doc(db, 'venues', venueId), { menuImageFocus: focusUpdated });
            }
          }
          alert('Image removed from venue. (It could not be deleted from storage—invalid or external URL.)');
        } catch (removeErr) {
          console.error('Error removing image from venue:', removeErr);
          alert('Error removing image from venue. Please check console.');
        }
      } else {
        alert('Error deleting image. Please check console for details.');
      }
    }
  };

  const loadExperiences = async () => {
    setLoadingExperiences(true);
    try {
      const q = query(collection(db, 'experiences'), where('venueId', '==', venueId));
      const querySnapshot = await getDocs(q);
      const experiencesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt, // Already a Timestamp
          updatedAt: data.updatedAt, // Already a Timestamp
        } as Experience;
      });
      setExperiences(experiencesData);
    } catch (error) {
      console.error('Error loading experiences:', error);
    } finally {
      setLoadingExperiences(false);
    }
  };

  const loadExperienceInstances = async () => {
    try {
      const q = query(collection(db, 'experienceInstances'), where('venueId', '==', venueId));
      const querySnapshot = await getDocs(q);
      const instancesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startAt: data.startAt, // Already a Timestamp
          endAt: data.endAt, // Already a Timestamp
          createdAt: data.createdAt,
        } as ExperienceInstance;
      });
      setExperienceInstances(instancesData);
    } catch (error) {
      console.error('Error loading experience instances:', error);
    }
  };

  const handleDeleteExperience = async (experienceId: string) => {
    if (!confirm('Are you sure you want to delete this experience? All instances will also be deleted.')) return;
    try {
      // Delete all instances first
      const instancesQuery = query(
        collection(db, 'experienceInstances'),
        where('experienceId', '==', experienceId)
      );
      const instancesSnapshot = await getDocs(instancesQuery);
      const deletePromises = instancesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Delete the experience
      await deleteDoc(doc(db, 'experiences', experienceId));
      
      // Remove experience ID from venue's experiences array
      const venueRef = doc(db, 'venues', venueId);
      const venueDoc = await getDoc(venueRef);
      if (venueDoc.exists()) {
        const venueData = venueDoc.data();
        const existingExperiences: VenueExperience[] = venueData.experiences || [];
        const updatedExperiences = existingExperiences.filter(e => e.experienceId !== experienceId);
        await updateDoc(venueRef, { experiences: updatedExperiences });
      }
      
      loadExperiences();
      loadExperienceInstances();
      if (!isNewVenue) {
        loadVenue(); // Reload venue to get updated experiences array
      }
    } catch (error) {
      console.error('Error deleting experience:', error);
      alert('Error deleting experience');
    }
  };

  const handleToggleExperienceStatus = async (experienceId: string, currentStatus: boolean, experienceType: 'event' | 'special') => {
    // Show confirmation only when deactivating
    if (currentStatus) {
      const confirmMessage = `Are you sure you want to deactivate this ${experienceType}?`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    try {
      const venueRef = doc(db, 'venues', venueId);
      const venueDoc = await getDoc(venueRef);
      if (venueDoc.exists()) {
        const venueData = venueDoc.data();
        const existingExperiences: VenueExperience[] = venueData.experiences || [];
        
        // Update visibility for this experience (we write visibility; read supports legacy isActive)
        const newVisibility = !currentStatus;
        const updatedExperiences: VenueExperience[] = existingExperiences.map(e =>
          e.experienceId === experienceId
            ? { experienceId: e.experienceId, visibility: newVisibility }
            : { experienceId: e.experienceId, visibility: e.visibility !== undefined ? e.visibility : e.isActive !== false }
        );

        const experienceExists = existingExperiences.some(e => e.experienceId === experienceId);
        if (!experienceExists) {
          updatedExperiences.push({ experienceId: experienceId, visibility: newVisibility });
        }

        await updateDoc(venueRef, { experiences: updatedExperiences });
        setVenueExperiences(updatedExperiences);
      }
    } catch (error) {
      console.error('Error toggling experience status:', error);
      alert('Error updating experience status');
    }
  };

  const getExperienceStatus = (experienceId: string): boolean => {
    const venueExp = venueExperiences.find(e => e.experienceId === experienceId);
    if (!venueExp) return true;
    if (venueExp.visibility !== undefined) return venueExp.visibility;
    return venueExp.isActive !== false; // backward compat: isActive
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this venue? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'venues', venueId));
      alert('Venue deleted successfully');
      router.push('/venues');
    } catch (error) {
      console.error('Error deleting venue:', error);
      alert('Error deleting venue');
    } finally {
      setDeleting(false);
    }
  };

  // Menu section management functions
  const addMenuSection = () => {
    const newSection: MenuSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      items: [],
      order: menuSections.length, // Set order to the end
    };
    setMenuSections([...menuSections, newSection]);
    // Automatically expand the new section
    setExpandedMenuSections(prev => new Set(prev).add(newSection.id));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
    
    if (dragIndex === dropIndex) return;

    const newSections = [...menuSections];
    const [draggedSection] = newSections.splice(dragIndex, 1);
    newSections.splice(dropIndex, 0, draggedSection);

    // Update order for all sections
    const reorderedSections = newSections.map((section, index) => ({
      ...section,
      order: index,
    }));

    setMenuSections(reorderedSections);
  };

  const deleteMenuSection = (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section? All items in it will be deleted.')) {
      return;
    }
    setMenuSections(menuSections.filter(section => section.id !== sectionId));
  };

  const updateMenuSectionTitle = (sectionId: string, title: string) => {
    setMenuSections(menuSections.map(section =>
      section.id === sectionId ? { ...section, title } : section
    ));
  };

  const addMenuItem = (sectionId: string) => {
    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      name: '',
      description: '',
      price: '',
    };
    setMenuSections(menuSections.map(section =>
      section.id === sectionId
        ? { ...section, items: [...section.items, newItem] }
        : section
    ));
  };

  const deleteMenuItem = (sectionId: string, itemId: string) => {
    setMenuSections(menuSections.map(section =>
      section.id === sectionId
        ? { ...section, items: section.items.filter(item => item.id !== itemId) }
        : section
    ));
  };

  const updateMenuItem = (sectionId: string, itemId: string, updates: Partial<MenuItem>) => {
    setMenuSections(menuSections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            items: section.items.map(item =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          }
        : section
    ));
  };

  if (loading && !isNewVenue) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-text-paragraph">Loading venue...</div>
        </div>
      </div>
    );
  }

  if (!venue && !isNewVenue) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-text-paragraph">Venue not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      {/* Save Success Notification */}
      {showSaveNotification && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]">
            <svg
              className="w-6 h-6 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div>
              <p className="font-semibold">Changes Saved</p>
              <p className="text-sm text-green-100">Your venue has been updated successfully.</p>
            </div>
            <button
              onClick={() => setShowSaveNotification(false)}
              className="ml-auto text-white hover:text-green-100 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Hero section - white */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <button
            onClick={() => router.push('/venues')}
            className="mb-4 text-primary hover:text-primary-dark flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Venues
          </button>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          {hasUnsavedChanges && !isNewVenue && (
            <p className="mb-4 text-sm text-amber-700 font-medium">You have unsaved changes.</p>
          )}
          <div className="flex gap-6 items-start">
            {/* Profile image on left - same upload as Images tab */}
            <div className="flex-shrink-0">
              <p className="text-xs text-text-paragraph mb-2">Profile image</p>
              {existingVenueImages.length > 0 ? (
                <img
                  src={existingVenueImages[0]}
                  alt={formData.name || 'Venue'}
                  className="w-32 h-32 object-cover rounded-xl border-2 border-neutral-light"
                />
              ) : (
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-neutral-light flex items-center justify-center bg-neutral-light/30">
                  <span className="text-text-paragraph text-sm">No image</span>
                </div>
              )}
              <p className="mt-1 text-xs text-text-paragraph">Change in Images tab</p>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-heading font-bold text-neutral">
                {formData.name || 'Venue Name'}
              </h1>
              {formData.handle && (
                <p className="text-sm text-text-paragraph mt-1">@{formData.handle}</p>
              )}
              <div className="mt-2">
                <span className="text-sm text-text-paragraph">{formData.establishmentType || '—'}</span>
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-2">
              {!isNewVenue && venueId && (
                <Link
                  href={`/venues/${venueId}/profile-preview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 border-2 border-primary text-primary rounded-lg hover:bg-primary/5 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Preview profile
                </Link>
              )}
              <button
                onClick={handleSave}
                disabled={saving || (!isNewVenue && !hasUnsavedChanges)}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {saving ? 'Saving...' : isNewVenue ? 'Create Venue' : 'Save Changes'}
              </button>
              {!isNewVenue && !hasUnsavedChanges && (
                <p className="mt-1 text-xs text-text-paragraph text-center">No changes to save</p>
              )}
            </div>
          </div>
        </div>

        {/* Profile detail section - pink hue */}
        <div className="py-8 px-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 mb-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-lg px-4 pb-4 pt-8 sticky top-6">
              <ul className="space-y-1">
                {/* Section: Location, About Us, Tags, Images */}
                {[
                  { id: 'location', label: 'Location', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>), incomplete: !formData.address?.trim() },
                  { id: 'about', label: 'About Us', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>), incomplete: !formData.introduction?.trim() },
                  { id: 'tags', label: 'Tags', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>), incomplete: computedTags.length === 0 },
                  { id: 'images', label: 'Images', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>), incomplete: existingVenueImages.length === 0 },
                  { id: 'menu', label: 'Menu', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>) },
                ].map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-body font-medium text-sm transition-all duration-200 ${
                        activeTab === tab.id ? 'bg-purple-100 text-purple-700' : 'text-neutral hover:bg-neutral-light'
                      }`}
                    >
                      <span className={activeTab === tab.id ? 'text-purple-700' : 'text-neutral'}>{tab.icon}</span>
                      <span>{tab.label}</span>
                      {'incomplete' in tab && tab.incomplete && <span className="ml-auto w-2 h-2 rounded-full bg-amber-500" title="Incomplete" />}
                    </button>
                  </li>
                ))}
                <li><hr className="my-2 border-t border-neutral-light" /></li>
                {/* Section: Events & Specials */}
                {[
                  { id: 'events', label: 'Events', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>) },
                  { id: 'specials', label: 'Specials', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
                ].map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-body font-medium text-sm transition-all duration-200 ${
                        activeTab === tab.id ? 'bg-purple-100 text-purple-700' : 'text-neutral hover:bg-neutral-light'
                      }`}
                    >
                      <span className={activeTab === tab.id ? 'text-purple-700' : 'text-neutral'}>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  </li>
                ))}
                <li><hr className="my-2 border-t border-neutral-light" /></li>
                {/* Section: Settings only */}
                {[
                  { id: 'settings', label: 'Settings', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>) },
                ].map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-body font-medium text-sm transition-all duration-200 ${
                        activeTab === tab.id ? 'bg-purple-100 text-purple-700' : 'text-neutral hover:bg-neutral-light'
                      }`}
                    >
                      <span className={activeTab === tab.id ? 'text-purple-700' : 'text-neutral'}>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
        {activeTab === 'about' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading font-bold text-black mb-3">About Us</h2>
              <hr className="border-neutral-light" />
            </div>
            <div className="bg-white p-6 md:p-8 rounded-xl">
              
              {/* Introduction */}
              <div className="mb-6">
                <label className="block text-sm font-body font-semibold text-neutral mb-2">Introduction</label>
                <textarea
                  value={formData.introduction}
                  onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                  placeholder="Enter introduction paragraph..."
                />
              </div>

              {/* Design and Atmosphere */}
              <div className="mb-6">
                <label className="block text-sm font-body font-semibold text-neutral mb-2">Design and Atmosphere</label>
                <textarea
                  value={formData.designAndAtmosphere}
                  onChange={(e) => setFormData({ ...formData, designAndAtmosphere: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                  placeholder="Detail the interior design, overall ambiance, and notable features..."
                />
              </div>

              {/* Offerings and Menu */}
              <div className="mb-6">
                <label className="block text-sm font-body font-semibold text-neutral mb-2">Offerings and Menu</label>
                <textarea
                  value={formData.offeringsAndMenu}
                  onChange={(e) => setFormData({ ...formData, offeringsAndMenu: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                  placeholder="Describe the venue's primary offerings, culinary or beverage focus, specialties, unique items..."
                />
              </div>

              {/* Public Opinion Highlights */}
              <div className="mb-6">
                <label className="block text-sm font-body font-semibold text-neutral mb-2">Public Opinion Highlights</label>
                <textarea
                  value={formData.publicOpinionHighlights}
                  onChange={(e) => setFormData({ ...formData, publicOpinionHighlights: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                  placeholder="Summarize common positive sentiments and frequent complaints..."
                />
              </div>

              {/* Satisfaction Score */}
              <div>
                <label className="block text-sm font-body font-semibold text-neutral mb-2">Satisfaction Score</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.satisfactionScore}
                  onChange={(e) => setFormData({ ...formData, satisfactionScore: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                  placeholder="Enter score out of 10 (e.g., 8.5)"
                />
                <p className="mt-1 text-xs text-text-paragraph">Enter a numerical satisfaction score out of 10</p>
              </div>

              {/* Complete with AI Button */}
              {formData.name.trim() && formData.establishmentType.trim() && formData.address.trim() && (
                <div className="flex justify-end mt-6 pt-6 border-t border-neutral-light">
                  <button
                    onClick={handleAIComplete}
                    disabled={aiCompleting}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    {aiCompleting ? 'AI Completing...' : '✨ Complete with AI'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'location' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading font-bold text-black mb-3">Location</h2>
              <hr className="border-neutral-light" />
            </div>

            {/* Location Tabs */}
            <div className="flex gap-2 border-b border-neutral-light">
              <button
                onClick={() => setActiveLocationTab('contact')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeLocationTab === 'contact'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-neutral hover:text-primary'
                }`}
              >
                Contact Info
              </button>
              <button
                onClick={() => setActiveLocationTab('hours')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeLocationTab === 'hours'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-neutral hover:text-primary'
                }`}
              >
                Opening Hours
              </button>
            </div>

            {/* Contact Information Tab */}
            {activeLocationTab === 'contact' && (
              <div className="bg-white p-6 md:p-8 rounded-xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-body font-semibold text-neutral mb-1">Address</label>
                  <input
                    type="text"
                    readOnly={!isNewVenue}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral disabled:bg-neutral-light/50 disabled:cursor-not-allowed"
                    placeholder="Enter address"
                  />
                  {!isNewVenue && <p className="mt-1 text-xs text-text-paragraph">Address cannot be edited here.</p>}
                </div>
                <div>
                  <label className="block text-sm font-body font-semibold text-neutral mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-body font-semibold text-neutral mb-1">Timezone *</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                  >
                    <option value="Europe/Dublin">Europe/Dublin (GMT)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Paris">Europe/Paris (CET)</option>
                    <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                    <option value="Europe/Rome">Europe/Rome (CET)</option>
                    <option value="Europe/Madrid">Europe/Madrid (CET)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-body font-semibold text-neutral mb-1">Currency *</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                  >
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="CZK">CZK (Kč) - Czech Koruna</option>
                    <option value="HUF">HUF (Ft) - Hungarian Forint</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-body font-semibold text-neutral mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      readOnly={!isNewVenue}
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral disabled:bg-neutral-light/50 disabled:cursor-not-allowed"
                      placeholder="e.g., 40.7128"
                    />
                    {!isNewVenue && <p className="mt-1 text-xs text-text-paragraph">Location cannot be edited.</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-body font-semibold text-neutral mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      readOnly={!isNewVenue}
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral disabled:bg-neutral-light/50 disabled:cursor-not-allowed"
                      placeholder="e.g., -74.0060"
                    />
                  </div>
                </div>
              </div>
              </div>
            )}

            {/* Opening Hours Tab */}
            {activeLocationTab === 'hours' && (
              <div className="bg-white p-6 md:p-8 rounded-xl">
                <OpeningHoursInputV2
                  value={openingHours}
                  onChange={setOpeningHours}
                />
              </div>
            )}
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading font-bold text-black mb-3">Menu</h2>
              <hr className="border-neutral-light" />
            </div>

            {/* Upload menu PDF */}
            <div className="bg-white p-6 md:p-8 rounded-xl">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Menu PDF</h3>
              <p className="text-sm text-gray-600 mb-3">Upload a PDF of your full menu (e.g. drinks list, food menu). Customers can view or download it.</p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  {menuPdfFile ? menuPdfFile.name : 'Choose PDF'}
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setMenuPdfFile(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                {(existingMenuPdfUrl || menuPdfFile) && (
                  <>
                    {existingMenuPdfUrl && !menuPdfFile && (
                      <a href={existingMenuPdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        View current PDF
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => { setMenuPdfFile(null); setExistingMenuPdfUrl(null); }}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove PDF
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Itemized Menu */}
            <div className="bg-white p-6 md:p-8 rounded-xl">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <button
                  onClick={addMenuSection}
                  className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-all duration-200"
                >
                  + Add Section
                </button>
                {venueId !== 'new' && (
                  <a
                    href={`/menu-preview/${venueId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-neutral-light text-neutral rounded-lg hover:bg-neutral-200 font-medium transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Preview menu
                  </a>
                )}
              </div>

              {menuSections.length === 0 ? (
                <p className="text-text-paragraph text-center py-8">No menu sections yet. Click "Add Section" to get started.</p>
              ) : (
                <div className="space-y-6">
                  {[...menuSections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((section, index) => {
                    const actualIndex = menuSections.findIndex(s => s.id === section.id);
                    return (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, actualIndex)}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, actualIndex)}
                      className="border border-gray-200 rounded-lg p-4 cursor-move hover:border-primary transition-colors"
                    >
                      {/* Section Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 flex-1">
                          {/* Drag Handle Icon */}
                          <svg
                            className="w-5 h-5 text-neutral-light hover:text-neutral cursor-move"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                          <button
                            onClick={() => {
                              setExpandedMenuSections(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(section.id)) {
                                  newSet.delete(section.id);
                                } else {
                                  newSet.add(section.id);
                                }
                                return newSet;
                              });
                            }}
                            className="text-primary hover:text-primary-dark transition-colors"
                          >
                            <svg
                              className={`w-5 h-5 transition-transform ${expandedMenuSections.has(section.id) ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => updateMenuSectionTitle(section.id, e.target.value)}
                            className="text-lg font-heading font-bold text-black bg-transparent border-b-2 border-transparent hover:border-neutral-light focus:border-primary focus:outline-none flex-1 transition-colors"
                            placeholder="Section Title"
                          />
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => deleteMenuSection(section.id)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete Section
                          </button>
                        </div>
                      </div>

                      {/* Menu Items - Collapsible */}
                      {expandedMenuSections.has(section.id) && (
                        <>
                          {section.items.length === 0 ? (
                        <div className="space-y-3">
                          <p className="text-gray-400 text-sm italic py-2">No items in this section yet.</p>
                          <button
                            onClick={() => addMenuItem(section.id)}
                            className="w-full px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-all duration-200"
                          >
                            + Add Item
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {section.items.map((item) => {
                            const itemImageFile = menuItemImages.get(item.id);
                            const hasImage = item.imageUrl || itemImageFile;
                            
                            return (
                              <div key={item.id} className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                <div className="flex gap-4">
                                  {/* Square Image Field on Left */}
                                  <div className="flex-shrink-0">
                                    {hasImage ? (
                                      <div className="relative group">
                                        <img
                                          src={item.imageUrl || (itemImageFile ? URL.createObjectURL(itemImageFile) : '')}
                                          alt={item.name || 'Menu item'}
                                          className="w-24 h-24 object-cover rounded-md border border-gray-300"
                                        />
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (item.imageUrl) {
                                              try {
                                                await deleteImage(item.imageUrl);
                                                updateMenuItem(section.id, item.id, { imageUrl: undefined });
                                              } catch (error) {
                                                console.error('Error deleting menu item image:', error);
                                                alert('Error deleting image');
                                              }
                                            }
                                            // Clear from state if it's a new upload
                                            const newMap = new Map(menuItemImages);
                                            newMap.delete(item.id);
                                            setMenuItemImages(newMap);
                                          }}
                                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        onDragOver={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        onDragLeave={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const files = Array.from(e.dataTransfer.files);
                                          if (files.length > 0 && files[0].type.startsWith('image/')) {
                                            const newMap = new Map(menuItemImages);
                                            newMap.set(item.id, files[0]);
                                            setMenuItemImages(newMap);
                                          }
                                        }}
                                        onClick={() => {
                                          const input = document.getElementById(`menu-item-image-input-${item.id}`) as HTMLInputElement;
                                          input?.click();
                                        }}
                                        className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
                                      >
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          id={`menu-item-image-input-${item.id}`}
                                          onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            if (files.length > 0) {
                                              const newMap = new Map(menuItemImages);
                                              newMap.set(item.id, files[0]);
                                              setMenuItemImages(newMap);
                                            }
                                            if (e.target) {
                                              e.target.value = '';
                                            }
                                          }}
                                        />
                                        <svg
                                          className="w-6 h-6 text-gray-400"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                          />
                                        </svg>
                                      </div>
                                    )}
                                  </div>

                                  {/* Content on Right */}
                                  <div className="flex-1 space-y-2">
                                    {/* Heading (Name) */}
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => updateMenuItem(section.id, item.id, { name: e.target.value })}
                                      className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg text-sm font-body text-neutral focus:outline-none focus:border-primary transition-colors"
                                      placeholder="Item name"
                                    />
                                    
                                    {/* Price */}
                                    <input
                                      type="text"
                                      value={item.price || ''}
                                      onChange={(e) => updateMenuItem(section.id, item.id, { price: e.target.value })}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder={`Price (e.g., ${getCurrencySymbol(formData.currency)}15)`}
                                    />
                                    
                                    {/* Description */}
                                    <textarea
                                      value={item.description || ''}
                                      onChange={(e) => updateMenuItem(section.id, item.id, { description: e.target.value })}
                                      rows={2}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="Description (optional)"
                                    />
                                    {/* Additional info (expandable) */}
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => setExpandedMenuItemInfo(prev => {
                                          const next = new Set(prev);
                                          if (next.has(item.id)) next.delete(item.id);
                                          else next.add(item.id);
                                          return next;
                                        })}
                                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                                      >
                                        <span>Additional info</span>
                                        <svg className={`w-4 h-4 transition-transform ${expandedMenuItemInfo.has(item.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>
                                      {expandedMenuItemInfo.has(item.id) && (
                                        <div className="p-3 space-y-4 bg-white border-t border-gray-200">
                                          {/* Vegan, Vegetarian, Gluten free */}
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2">Dietary</label>
                                            <div className="flex flex-wrap gap-4">
                                              <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={!!item.vegan}
                                                  onChange={(e) => updateMenuItem(section.id, item.id, { vegan: e.target.checked })}
                                                  className="rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm text-gray-700">Vegan</span>
                                              </label>
                                              <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={!!item.vegetarian}
                                                  onChange={(e) => updateMenuItem(section.id, item.id, { vegetarian: e.target.checked })}
                                                  className="rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm text-gray-700">Vegetarian</span>
                                              </label>
                                              <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={!!item.glutenFree}
                                                  onChange={(e) => updateMenuItem(section.id, item.id, { glutenFree: e.target.checked })}
                                                  className="rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm text-gray-700">Gluten free</span>
                                              </label>
                                            </div>
                                          </div>
                                          {/* Allergens – tag list, highlighted when added */}
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2">Allergens</label>
                                            <div className="flex flex-wrap gap-2">
                                              {['Gluten', 'Dairy', 'Eggs', 'Nuts', 'Peanuts', 'Tree Nuts', 'Soy', 'Shellfish', 'Fish', 'Sesame', 'Mustard', 'Celery', 'Lupin', 'Sulphites'].map(allergen => {
                                                const selected = (item.allergens || []).includes(allergen);
                                                return (
                                                  <button
                                                    key={allergen}
                                                    type="button"
                                                    onClick={() => {
                                                      const current = item.allergens || [];
                                                      const next = selected ? current.filter(a => a !== allergen) : [...current, allergen];
                                                      updateMenuItem(section.id, item.id, { allergens: next });
                                                    }}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selected ? 'bg-primary text-white ring-2 ring-primary ring-offset-1' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                                  >
                                                    {allergen}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                          {/* Calories & macros */}
                                          <div className="grid grid-cols-2 gap-3">
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-1">Calories</label>
                                              <input
                                                type="number"
                                                min={0}
                                                step={1}
                                                value={item.calories ?? ''}
                                                onChange={(e) => updateMenuItem(section.id, item.id, { calories: e.target.value === '' ? undefined : Number(e.target.value) })}
                                                placeholder="e.g. 450"
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                                              />
                                            </div>
                                            <div className="col-span-2 grid grid-cols-3 gap-2">
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Protein (g)</label>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  step={1}
                                                  value={item.macros?.protein ?? ''}
                                                  onChange={(e) => updateMenuItem(section.id, item.id, {
                                                    macros: {
                                                      ...(item.macros || {}),
                                                      protein: e.target.value === '' ? undefined : Number(e.target.value),
                                                    },
                                                  })}
                                                  placeholder="—"
                                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Carbs (g)</label>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  step={1}
                                                  value={item.macros?.carbs ?? ''}
                                                  onChange={(e) => updateMenuItem(section.id, item.id, {
                                                    macros: {
                                                      ...(item.macros || {}),
                                                      carbs: e.target.value === '' ? undefined : Number(e.target.value),
                                                    },
                                                  })}
                                                  placeholder="—"
                                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Fat (g)</label>
                                                <input
                                                  type="number"
                                                  min={0}
                                                  step={1}
                                                  value={item.macros?.fat ?? ''}
                                                  onChange={(e) => updateMenuItem(section.id, item.id, {
                                                    macros: {
                                                      ...(item.macros || {}),
                                                      fat: e.target.value === '' ? undefined : Number(e.target.value),
                                                    },
                                                  })}
                                                  placeholder="—"
                                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                          {/* Spice level – chilli icons (0–3) */}
                                          <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-2">Spice level</label>
                                            <div className="flex items-center gap-1 flex-wrap">
                                              {[0, 1, 2, 3].map(level => {
                                                const currentLevel = Math.min(Math.max(0, item.spiceLevel ?? 0), 3);
                                                const selected = currentLevel === level;
                                                return (
                                                  <button
                                                    key={level}
                                                    type="button"
                                                    onClick={() => updateMenuItem(section.id, item.id, { spiceLevel: level })}
                                                    title={level === 0 ? 'No spice' : `${level} chilli${level > 1 ? 's' : ''}`}
                                                    className={`inline-flex items-center gap-0.5 px-2 py-1.5 rounded border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary ${selected ? 'bg-amber-50 border-amber-300 text-red-600' : 'border-gray-200 text-gray-400 hover:border-amber-200 hover:text-red-500'}`}
                                                  >
                                                    {level === 0 ? (
                                                      <span>0</span>
                                                    ) : (
                                                      <>
                                                        {Array.from({ length: level }).map((_, i) => (
                                                          <Flame key={i} className="w-4 h-4 text-red-500" size={16} />
                                                        ))}
                                                      </>
                                                    )}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">0 = none, 3 = hottest</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    {/* Delete Item Button */}
                                    <button
                                      onClick={() => {
                                        // Clean up image state when deleting item
                                        const newMap = new Map(menuItemImages);
                                        newMap.delete(item.id);
                                        setMenuItemImages(newMap);
                                        deleteMenuItem(section.id, item.id);
                                      }}
                                      className="text-xs text-red-600 hover:text-red-800"
                                    >
                                      Delete Item
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {/* Add Item Button at Bottom */}
                          <button
                            onClick={() => addMenuItem(section.id)}
                            className="w-full px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-all duration-200"
                          >
                            + Add Item
                          </button>
                        </div>
                      )}
                        </> 
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading font-bold text-black mb-3">Events</h2>
              <hr className="border-neutral-light" />
            </div>
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setExperienceType('event');
                  setEditingExperience(null);
                  setShowExperienceForm(true);
                }}
                className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-all duration-200"
              >
                + Add Event
              </button>
            </div>

            {showExperienceForm && experienceType === 'event' && !editingExperience && (
              <div className="bg-white p-6 md:p-8 rounded-xl">
                <h3 className="text-lg font-semibold mb-4">Add New Event</h3>
                <ExperienceFormContent
                  venueId={venueId}
                  type="event"
                  currency={formData.currency}
                  openingHours={openingHours}
                  onSuccess={() => {
                    setShowExperienceForm(false);
                    loadExperiences();
                    loadExperienceInstances();
                    if (!isNewVenue) {
                      loadVenue(); // Reload venue to get updated experiences array
                    }
                  }}
                  onCancel={() => {
                    setShowExperienceForm(false);
                  }}
                />
              </div>
            )}

            {loadingExperiences ? (
              <div className="text-center py-8 text-text-paragraph">Loading events...</div>
            ) : experiences.filter(e => e.type === 'event').length === 0 && !showExperienceForm ? (
              <div className="bg-white p-6 md:p-8 rounded-xl text-center text-text-paragraph">
                No events found. Create your first event!
              </div>
            ) : (
              <div className="space-y-4">
                {experiences.filter(e => e.type === 'event').map((experience) => {
                  // If this experience is being edited or duplicated, show the form instead of the card
                  const isDuplicateMode = editingExperience?.id === 'duplicate-' + experience.id;
                  if (editingExperience?.id === experience.id || isDuplicateMode) {
                    const formExperience = isDuplicateMode ? { ...experience, id: 'duplicate-' + experience.id } : experience;
                    return (
                      <div key={experience.id} className="bg-white p-6 md:p-8 rounded-xl">
                        <h3 className="text-lg font-semibold mb-4">{isDuplicateMode ? 'Duplicate Event' : 'Edit Event'}</h3>
                        <ExperienceFormContent
                          experience={formExperience}
                          venueId={venueId}
                          type="event"
                          currency={formData.currency}
                          openingHours={openingHours}
                          instancePrefill={experienceInstances.filter((i) => i.experienceId === experience.id)}
                          isActive={isDuplicateMode ? undefined : getExperienceStatus(experience.id)}
                          onToggleStatus={isDuplicateMode ? undefined : handleToggleExperienceStatus}
                          onDelete={isDuplicateMode ? undefined : handleDeleteExperience}
                          onSuccess={() => {
                            setShowExperienceForm(false);
                            setEditingExperience(null);
                            loadExperiences();
                            loadExperienceInstances();
                            if (!isNewVenue) {
                              loadVenue(); // Reload venue to get updated experiences array
                            }
                          }}
                          onCancel={() => {
                            setShowExperienceForm(false);
                            setEditingExperience(null);
                          }}
                        />
                      </div>
                    );
                  }
                  
                  // Otherwise, show the normal event card
                  const instances = experienceInstances.filter(i => i.experienceId === experience.id);
                  const isActive = getExperienceStatus(experience.id);
                  return (
                    <div key={experience.id} className="bg-white p-4 md:p-6 rounded-xl border border-neutral-light">
                      <div className="flex gap-4">
                        {experience.imageUrl && (
                          <img
                            src={experience.imageUrl}
                            alt={experience.title}
                            className="w-32 h-32 object-cover rounded-md"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-gray-900">{experience.title}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {isActive ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{experience.description}</p>
                          {experience.tags && experience.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {experience.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {experience.genre && (
                            <p className="text-sm text-gray-700 mb-2">
                              <span className="font-medium">Genre:</span> {experience.genre}
                            </p>
                          )}
                          {experience.cost !== null && (
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Cost: {getCurrencySymbol(formData.currency || 'EUR')}{typeof experience.cost === 'number' ? experience.cost.toFixed(2) : experience.cost}{(experience as any)?.costPerPerson ? ' pp' : ''}
                            </p>
                          )}
                          {experience.isRecurring && experience.recurrenceRule && (
                            <div className="text-sm text-gray-600 mb-2">
                              <p className="font-medium">Recurring:</p>
                              {Object.entries(experience.recurrenceRule.daySchedules || {})
                                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                .map(([day, schedule]) => (
                                  <p key={day} className="ml-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(day)]}: {schedule.startTime} - {schedule.endTime}
                                  </p>
                                ))}
                              {experience.recurrenceRule.startDate && (
                                <p className="ml-2 text-xs text-gray-500">
                                  From: {new Date(experience.recurrenceRule.startDate.toMillis()).toLocaleDateString()}
                                </p>
                              )}
                              {experience.recurrenceRule.endDate && (
                                <p className="ml-2 text-xs text-gray-500">
                                  Until: {new Date(experience.recurrenceRule.endDate.toMillis()).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                          {instances.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-500 mb-1">Upcoming Instances:</p>
                              {instances.slice(0, 3).map(instance => (
                                <p key={instance.id} className="text-xs text-gray-600">
                                  {instance.startAt?.toDate?.()?.toLocaleString() || 'Date TBD'}
                                </p>
                              ))}
                              {instances.length > 3 && (
                                <p className="text-xs text-gray-500">+{instances.length - 3} more</p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setEditingExperience(experience);
                              setExperienceType('event');
                              setShowExperienceForm(true);
                            }}
                            className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-all duration-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setEditingExperience({ ...experience, id: 'duplicate-' + experience.id });
                              setExperienceType('event');
                              setShowExperienceForm(true);
                            }}
                            className="px-3 py-1 text-sm border border-neutral-light rounded-lg hover:border-primary hover:text-primary font-medium transition-all duration-200"
                          >
                            Duplicate
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Specials Tab */}
        {activeTab === 'specials' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading font-bold text-black mb-3">Specials</h2>
              <hr className="border-neutral-light" />
            </div>
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  setExperienceType('special');
                  setEditingExperience(null);
                  setShowExperienceForm(true);
                }}
                className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-all duration-200"
              >
                + Add Special
              </button>
            </div>

            {showExperienceForm && experienceType === 'special' && !editingExperience && (
              <div className="bg-white p-6 md:p-8 rounded-xl">
                <h3 className="text-lg font-semibold mb-4">Add New Special</h3>
                <ExperienceFormContent
                  venueId={venueId}
                  type="special"
                  currency={formData.currency}
                  openingHours={openingHours}
                  foodGalleryUrls={existingFoodImages}
                  onSuccess={() => {
                    setShowExperienceForm(false);
                    loadExperiences();
                    loadExperienceInstances();
                    if (!isNewVenue) {
                      loadVenue(); // Reload venue to get updated experiences array
                    }
                  }}
                  onCancel={() => {
                    setShowExperienceForm(false);
                  }}
                />
              </div>
            )}

            {loadingExperiences ? (
              <div className="text-center py-8 text-gray-500">Loading specials...</div>
            ) : experiences.filter(e => e.type === 'special').length === 0 && !showExperienceForm ? (
              <div className="bg-white p-6 md:p-8 rounded-xl text-center text-text-paragraph">
                No specials found. Create your first special!
              </div>
            ) : (
              <div className="space-y-4">
                {experiences.filter(e => e.type === 'special').map((experience) => {
                  // If this experience is being edited, show the edit form instead of the card
                  const isDuplicateModeSpecial = editingExperience?.id === 'duplicate-' + experience.id;
                  if (editingExperience?.id === experience.id || isDuplicateModeSpecial) {
                    const formExperienceSpecial = isDuplicateModeSpecial ? { ...experience, id: 'duplicate-' + experience.id } : experience;
                    return (
                      <div key={experience.id} className="bg-white p-6 md:p-8 rounded-xl">
                        <h3 className="text-lg font-semibold mb-4">{isDuplicateModeSpecial ? 'Duplicate Special' : 'Edit Special'}</h3>
                        <ExperienceFormContent
                          experience={formExperienceSpecial}
                          venueId={venueId}
                          type="special"
                          currency={formData.currency}
                          openingHours={openingHours}
                          foodGalleryUrls={existingFoodImages}
                          instancePrefill={experienceInstances.filter((i) => i.experienceId === experience.id)}
                          isActive={isDuplicateModeSpecial ? undefined : getExperienceStatus(experience.id)}
                          onToggleStatus={isDuplicateModeSpecial ? undefined : handleToggleExperienceStatus}
                          onDelete={isDuplicateModeSpecial ? undefined : handleDeleteExperience}
                          onSuccess={() => {
                            setShowExperienceForm(false);
                            setEditingExperience(null);
                            loadExperiences();
                            loadExperienceInstances();
                            if (!isNewVenue) {
                              loadVenue(); // Reload venue to get updated experiences array
                            }
                          }}
                          onCancel={() => {
                            setShowExperienceForm(false);
                            setEditingExperience(null);
                          }}
                        />
                      </div>
                    );
                  }
                  
                  // Otherwise, show the normal special card
                  const instances = experienceInstances.filter(i => i.experienceId === experience.id);
                  const isActive = getExperienceStatus(experience.id);
                  return (
                    <div key={experience.id} className="bg-white p-4 md:p-6 rounded-xl border border-neutral-light">
                      <div className="flex gap-4">
                        {experience.imageUrl && (
                          <img
                            src={experience.imageUrl}
                            alt={experience.title}
                            className="w-32 h-32 object-cover rounded-md"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-gray-900">{experience.title}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {isActive ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{experience.description}</p>
                          {experience.tags && experience.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {experience.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {experience.genre && (
                            <p className="text-sm text-gray-700 mb-2">
                              <span className="font-medium">Genre:</span> {experience.genre}
                            </p>
                          )}
                          {experience.cost !== null && (
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Cost: {getCurrencySymbol(formData.currency || 'EUR')}{typeof experience.cost === 'number' ? experience.cost.toFixed(2) : experience.cost}{(experience as any)?.costPerPerson ? ' pp' : ''}
                            </p>
                          )}

                          {/* Details Toggle Button */}
                          <button
                            onClick={() => {
                              setExpandedSpecials(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(experience.id)) {
                                  newSet.delete(experience.id);
                                } else {
                                  newSet.add(experience.id);
                                }
                                return newSet;
                              });
                            }}
                            className="mt-2 text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1 transition-colors"
                          >
                            <span>Details</span>
                            <svg
                              className={`w-4 h-4 transition-transform ${expandedSpecials.has(experience.id) ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Collapsible Details Section */}
                          {expandedSpecials.has(experience.id) && (
                            <div className="mt-3 pt-3 border-t border-neutral-light">
                              {experience.isRecurring && experience.recurrenceRule && (
                                <div className="text-sm text-gray-600 mb-2">
                                  <p className="font-medium">Recurring:</p>
                                  {Object.entries(experience.recurrenceRule.daySchedules || {})
                                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                    .map(([day, schedule]) => (
                                      <p key={day} className="ml-2">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(day)]}: {schedule.startTime} - {schedule.endTime}
                                      </p>
                                    ))}
                                  {experience.recurrenceRule.startDate && (
                                    <p className="ml-2 text-xs text-gray-500">
                                      From: {new Date(experience.recurrenceRule.startDate.toMillis()).toLocaleDateString()}
                                    </p>
                                  )}
                                  {experience.recurrenceRule.endDate && (
                                    <p className="ml-2 text-xs text-gray-500">
                                      Until: {new Date(experience.recurrenceRule.endDate.toMillis()).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              )}
                              {instances.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-500 mb-1">Upcoming Instances:</p>
                                  {instances.slice(0, 3).map(instance => (
                                    <p key={instance.id} className="text-xs text-gray-600">
                                      {instance.startAt?.toDate?.()?.toLocaleString() || 'Date TBD'}
                                    </p>
                                  ))}
                                  {instances.length > 3 && (
                                    <p className="text-xs text-gray-500">+{instances.length - 3} more</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setEditingExperience(experience);
                              setExperienceType('special');
                              setShowExperienceForm(true);
                            }}
                            className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-all duration-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setEditingExperience({ ...experience, id: 'duplicate-' + experience.id });
                              setExperienceType('special');
                              setShowExperienceForm(true);
                            }}
                            className="px-3 py-1 text-sm border border-neutral-light rounded-lg hover:border-primary hover:text-primary font-medium transition-all duration-200"
                          >
                            Duplicate
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading font-bold text-black mb-3">Images</h2>
              <hr className="border-neutral-light" />
            </div>

            {/* Image Tabs */}
            <div className="flex gap-2 border-b border-neutral-light">
              <button
                onClick={() => setActiveImageTab('venue')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeImageTab === 'venue'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-neutral hover:text-primary'
                }`}
              >
                Venue
              </button>
              <button
                onClick={() => setActiveImageTab('food')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeImageTab === 'food'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-neutral hover:text-primary'
                }`}
              >
                Food
              </button>
              <button
                onClick={() => setActiveImageTab('menu')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeImageTab === 'menu'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-neutral hover:text-primary'
                }`}
              >
                Menu
              </button>
            </div>

            {/* Venue Images Tab */}
            {activeImageTab === 'venue' && (
              <div className="bg-white p-6 md:p-8 rounded-xl">
                <p className="text-sm text-text-paragraph mb-4">
                  Upload images of your venue's interior, exterior, and atmosphere. These images help customers get a sense of your space before visiting.
                </p>
                <div className="mb-4">
                  <ImageUpload
                    images={venueImages}
                    onImagesChange={setVenueImages}
                    multiple={true}
                    maxImages={10 - existingVenueImages.length}
                    id="venue-images-upload"
                  />
                </div>
                {existingVenueImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    {existingVenueImages.map((url, idx) => (
                      <div key={idx} className="relative group space-y-1">
                        <div className="relative aspect-square max-h-48 w-full overflow-hidden rounded-md border border-gray-300 bg-gray-100">
                          <img
                            src={url}
                            alt={`${venue?.name || 'Venue'} ${idx + 1}`}
                            className="h-full w-full object-cover rounded-md"
                            style={{ objectPosition: focusToObjectPosition(existingVenueFocus[idx] ?? 'center') }}
                          />
                          <button
                            onClick={() => handleDeleteImage(url, 'venue', idx)}
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
                        <label className="block text-xs font-medium text-gray-600">1:1 crop focus</label>
                        <select
                          value={existingVenueFocus[idx] ?? 'center'}
                          onChange={(e) => {
                            const v = e.target.value as typeof IMAGE_FOCUS_OPTIONS[number];
                            setExistingVenueFocus(prev => {
                              const next = [...prev];
                              next[idx] = v;
                              return next;
                            });
                          }}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          {IMAGE_FOCUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Food Images Tab */}
            {activeImageTab === 'food' && (
              <div className="bg-white p-6 md:p-8 rounded-xl">
                <p className="text-sm text-text-paragraph mb-4">
                  Upload high-quality images of your food and dishes. Showcase your culinary offerings to entice customers and highlight your menu items.
                </p>
                <div className="mb-4">
                  <ImageUpload
                    images={foodImages}
                    onImagesChange={setFoodImages}
                    multiple={true}
                    maxImages={10}
                    id="food-images-upload"
                  />
                </div>
                {existingFoodImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    {existingFoodImages.map((url, idx) => (
                      <div key={idx} className="relative group space-y-1">
                        <div className="relative aspect-square max-h-48 w-full overflow-hidden rounded-md border border-gray-300 bg-gray-100">
                          <img
                            src={url}
                            alt={`Food ${idx + 1}`}
                            className="h-full w-full object-cover rounded-md"
                            style={{ objectPosition: focusToObjectPosition(existingFoodFocus[idx] ?? 'center') }}
                          />
                          <button
                            onClick={() => handleDeleteImage(url, 'food', idx)}
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
                        <label className="block text-xs font-medium text-gray-600">1:1 crop focus</label>
                        <select
                          value={existingFoodFocus[idx] ?? 'center'}
                          onChange={(e) => {
                            const v = e.target.value as typeof IMAGE_FOCUS_OPTIONS[number];
                            setExistingFoodFocus(prev => { const next = [...prev]; next[idx] = v; return next; });
                          }}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          {IMAGE_FOCUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Menu Images Tab */}
            {activeImageTab === 'menu' && (
              <div className="bg-white p-6 md:p-8 rounded-xl">
                <p className="text-sm text-text-paragraph mb-4">
                  Upload images of your physical menu or menu boards. These help customers preview your offerings and pricing before they visit.
                </p>
                <div className="mb-4">
                  <ImageUpload
                    images={menuImages}
                    onImagesChange={setMenuImages}
                    multiple={true}
                    maxImages={10}
                    id="menu-images-upload"
                  />
                </div>
                {existingMenuImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    {existingMenuImages.map((url, idx) => (
                      <div key={idx} className="relative group space-y-1">
                        <div className="relative aspect-square max-h-48 w-full overflow-hidden rounded-md border border-gray-300 bg-gray-100">
                          <img
                            src={url}
                            alt={`Menu ${idx + 1}`}
                            className="h-full w-full object-cover rounded-md"
                            style={{ objectPosition: focusToObjectPosition(existingMenuFocus[idx] ?? 'center') }}
                          />
                          <button
                            onClick={() => handleDeleteImage(url, 'menu', idx)}
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
                        <label className="block text-xs font-medium text-gray-600">1:1 crop focus</label>
                        <select
                          value={existingMenuFocus[idx] ?? 'center'}
                          onChange={(e) => {
                            const v = e.target.value as typeof IMAGE_FOCUS_OPTIONS[number];
                            setExistingMenuFocus(prev => { const next = [...prev]; next[idx] = v; return next; });
                          }}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          {IMAGE_FOCUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(venueImages.length > 0 || foodImages.length > 0 || menuImages.length > 0) && (
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  {saving ? 'Saving...' : 'Save Images'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tags Tab — taxonomy from apps/admin/lib/taxonomy.json */}
        {activeTab === 'tags' && (
          <div className="space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-xl">
              <h2 className="text-xl font-heading font-bold text-black mb-4">Tags & Filters</h2>
              <p className="text-sm text-gray-600 mb-4">Type to search and select tags. Cuisine: 1; Specialties and Highlights: up to 2 each; other sections: multiple. Add your own in &quot;Other&quot; where shown.</p>

              <div className="space-y-8">
                {Object.keys(taxonomy).map((sectionKey) => {
                  const options = taxonomy[sectionKey];
                  const selected = tagBySection[sectionKey] ?? [];
                  const limit = SECTION_LIMITS[sectionKey];
                  const hasOther = SECTIONS_WITH_OTHER.includes(sectionKey as any);
                  const otherLabel =
                    sectionKey === 'cuisine'
                      ? 'Other cuisine (optional)'
                      : sectionKey === 'specialties'
                        ? 'Other specialties (optional, comma-separated)'
                        : 'Other highlights (optional, comma-separated)';
                  const atLimit = limit != null && selected.length >= limit;
                  const search = (tagSearchBySection[sectionKey] ?? '').trim().toLowerCase();
                  const sortedOptions = [...options].sort((a, b) =>
                    formatTagForDisplay(a).localeCompare(formatTagForDisplay(b), undefined, { sensitivity: 'base' })
                  );
                  const dropdownOptions = sortedOptions.filter(
                    (tag) =>
                      !selected.includes(tag) &&
                      (limit == null || selected.length < limit) &&
                      (!search || formatTagForDisplay(tag).toLowerCase().includes(search))
                  );
                  const showDropdown = openTagDropdown === sectionKey && (search.length > 0 || dropdownOptions.length > 0);

                  return (
                    <div key={sectionKey} className="relative">
                      <h3 className="text-lg font-medium text-gray-800 mb-2">
                        {getSectionLabel(sectionKey)}
                        {limit != null && (
                          <span className="text-sm font-normal text-gray-500 ml-2">
                            (max {limit})
                          </span>
                        )}
                      </h3>
                      {/* Selected tags as removable chips below heading */}
                      {selected.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {selected.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                setTagBySection((prev) => ({
                                  ...prev,
                                  [sectionKey]: (prev[sectionKey] ?? []).filter((t) => t !== tag),
                                }));
                              }}
                              className="px-3 py-1 text-sm rounded-full bg-primary text-white border border-primary hover:bg-primary-dark transition-colors"
                            >
                              {formatTagForDisplay(tag)}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Text input + autocomplete dropdown */}
                      {!atLimit && (
                        <div className="relative max-w-md">
                          <input
                            type="text"
                            value={tagSearchBySection[sectionKey] ?? ''}
                            onChange={(e) => {
                              setTagSearchBySection((prev) => ({ ...prev, [sectionKey]: e.target.value }));
                              setOpenTagDropdown(sectionKey);
                            }}
                            onFocus={() => setOpenTagDropdown(sectionKey)}
                            onBlur={() => setTimeout(() => setOpenTagDropdown(null), 150)}
                            placeholder={`Search ${getSectionLabel(sectionKey).toLowerCase()}...`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900"
                          />
                          {showDropdown && dropdownOptions.length > 0 && (
                            <ul
                              className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg py-1"
                              role="listbox"
                            >
                              {dropdownOptions.map((tag) => (
                                <li
                                  key={tag}
                                  role="option"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setTagBySection((prev) => {
                                      const current = prev[sectionKey] ?? [];
                                      if (limit != null && current.length >= limit) return prev;
                                      if (current.includes(tag)) return prev;
                                      return { ...prev, [sectionKey]: [...current, tag] };
                                    });
                                    setTagSearchBySection((prev) => ({ ...prev, [sectionKey]: '' }));
                                    setOpenTagDropdown(null);
                                  }}
                                  className="px-3 py-2 text-sm text-gray-900 hover:bg-primary/10 cursor-pointer"
                                >
                                  {formatTagForDisplay(tag)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      {hasOther && (
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">{otherLabel}</label>
                          {(sectionKey === 'cuisine' ? cuisineOtherTags : sectionKey === 'specialties' ? specialtiesOtherTags : highlightsOtherTags).length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {(sectionKey === 'cuisine' ? cuisineOtherTags : sectionKey === 'specialties' ? specialtiesOtherTags : highlightsOtherTags).map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => {
                                    if (sectionKey === 'cuisine') setCuisineOtherTags((prev) => prev.filter((t) => t !== tag));
                                    else if (sectionKey === 'specialties') setSpecialtiesOtherTags((prev) => prev.filter((t) => t !== tag));
                                    else setHighlightsOtherTags((prev) => prev.filter((t) => t !== tag));
                                  }}
                                  className="px-3 py-1 text-sm rounded-full bg-primary text-white border border-primary hover:bg-primary-dark"
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 max-w-md">
                            <input
                              type="text"
                              value={
                                sectionKey === 'cuisine'
                                  ? cuisineOtherInput
                                  : sectionKey === 'specialties'
                                    ? specialtiesOtherInput
                                    : highlightsOtherInput
                              }
                              onChange={(e) => {
                                const v = e.target.value;
                                if (sectionKey === 'cuisine') setCuisineOtherInput(v);
                                else if (sectionKey === 'specialties') setSpecialtiesOtherInput(v);
                                else setHighlightsOtherInput(v);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const v = (sectionKey === 'cuisine' ? cuisineOtherInput : sectionKey === 'specialties' ? specialtiesOtherInput : highlightsOtherInput).trim();
                                  if (v) {
                                    if (sectionKey === 'cuisine') {
                                      setCuisineOtherTags((prev) => (prev.includes(v) ? prev : [...prev, v]));
                                      setCuisineOtherInput('');
                                    } else if (sectionKey === 'specialties') {
                                      setSpecialtiesOtherTags((prev) => (prev.includes(v) ? prev : [...prev, v]));
                                      setSpecialtiesOtherInput('');
                                    } else {
                                      setHighlightsOtherTags((prev) => (prev.includes(v) ? prev : [...prev, v]));
                                      setHighlightsOtherInput('');
                                    }
                                  }
                                }
                              }}
                              placeholder={sectionKey === 'cuisine' ? 'e.g. Basque (Enter to add)' : 'e.g. wine tastings (Enter to add)'}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const v = (sectionKey === 'cuisine' ? cuisineOtherInput : sectionKey === 'specialties' ? specialtiesOtherInput : highlightsOtherInput).trim();
                                if (v) {
                                  if (sectionKey === 'cuisine') {
                                    setCuisineOtherTags((prev) => (prev.includes(v) ? prev : [...prev, v]));
                                    setCuisineOtherInput('');
                                  } else if (sectionKey === 'specialties') {
                                    setSpecialtiesOtherTags((prev) => (prev.includes(v) ? prev : [...prev, v]));
                                    setSpecialtiesOtherInput('');
                                  } else {
                                    setHighlightsOtherTags((prev) => (prev.includes(v) ? prev : [...prev, v]));
                                    setHighlightsOtherInput('');
                                  }
                                }
                              }}
                              className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {extraTags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Additional tags (not in list)</h3>
                    <p className="text-sm text-gray-600 mb-2">These tags were saved earlier and are not in the current taxonomy. Remove if no longer needed.</p>
                    <div className="flex flex-wrap gap-2">
                      {extraTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => setExtraTags((prev) => prev.filter((t) => t !== tag))}
                            className="text-gray-500 hover:text-red-600 rounded p-0.5"
                            aria-label={`Remove ${tag}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {computedTags.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected tags ({computedTags.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {computedTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-full"
                      >
                        {formatTagForDisplay(tag)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-heading font-bold text-black mb-3">Settings</h2>
              <hr className="border-neutral-light" />
            </div>

            {/* Handle, website, Instagram */}
            <div className="bg-white p-6 md:p-8 rounded-xl">
              <h3 className="text-lg font-heading font-semibold text-black mb-4">Venue identity</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-body font-semibold text-neutral mb-1">Handle</label>
                  <input
                    type="text"
                    value={formData.handle}
                    onChange={(e) => {
                      setFormData({ ...formData, handle: e.target.value });
                      setHandleError(null);
                    }}
                    onBlur={async () => {
                      const h = formData.handle.trim();
                      if (!h) { setHandleError(null); return; }
                      const validation = validateHandle(h);
                      if (!validation.valid) {
                        setHandleError(validation.error ?? 'Invalid handle');
                        return;
                      }
                      setHandleChecking(true);
                      setHandleError(null);
                      try {
                        const q = query(collection(db, 'venues'), where('handle', '==', h.toLowerCase()));
                        const snapshot = await getDocs(q);
                        const taken = snapshot.docs.some(d => d.id !== venueId);
                        if (taken) setHandleError('This handle is already in use');
                      } catch {
                        setHandleError('Could not check handle availability');
                      } finally {
                        setHandleChecking(false);
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral lowercase"
                    placeholder="e.g. the-green-cafe"
                  />
                  {handleError && <p className="mt-1 text-xs text-red-600">{handleError}</p>}
                  {handleChecking && <p className="mt-1 text-xs text-text-paragraph">Checking...</p>}
                  <p className="mt-1 text-xs text-text-paragraph">Lowercase letters, numbers, hyphens only. 3–40 characters. Must be unique.</p>
                </div>
                <div>
                  <label className="block text-sm font-body font-semibold text-neutral mb-1">Website URL</label>
                  <input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                    placeholder="https://example.com"
                  />
                  <p className="mt-1 text-xs text-text-paragraph">Your venue&apos;s website (optional).</p>
                </div>
                <div>
                  <label className="block text-sm font-body font-semibold text-neutral mb-1">Instagram link</label>
                  <input
                    type="url"
                    value={formData.instagramUrl}
                    onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                    placeholder="https://instagram.com/yourvenue"
                  />
                  <p className="mt-1 text-xs text-text-paragraph">Your venue&apos;s Instagram profile (optional).</p>
                </div>
                <div>
                  <label className="block text-sm font-body font-semibold text-neutral mb-1">Booking link</label>
                  <input
                    type="url"
                    value={formData.bookingUrl}
                    onChange={(e) => setFormData({ ...formData, bookingUrl: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                    placeholder="https://resy.com/... or https://opentable.com/..."
                  />
                  <p className="mt-1 text-xs text-text-paragraph">Link to your current booking or reservation page (e.g. Resy, OpenTable, or your own).</p>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-white p-6 md:p-8 rounded-xl">
              <h3 className="text-lg font-heading font-semibold text-black mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-body font-semibold text-neutral mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                    placeholder="venue@example.com"
                  />
                  <p className="mt-1 text-xs text-text-paragraph">Email address associated with this venue account (optional).</p>
                </div>
              </div>
            </div>

            {!isNewVenue && (
              <div className="bg-white p-6 md:p-8 rounded-xl">
                <h3 className="text-lg font-heading font-semibold text-black mb-4">Delete Venue</h3>
                <p className="text-sm text-text-paragraph mb-6">
                  Permanently delete this venue and all associated data. This action cannot be undone. 
                  All events, specials, menu items, images, and other venue information will be permanently removed from the system.
                </p>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  {deleting ? 'Deleting...' : 'Delete Venue'}
                </button>
              </div>
            )}
          </div>
        )}
          </div>
        </div>
        </div>

        {/* Contact support - white */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-xl font-heading font-bold text-neutral mb-2">Contact support</h2>
          <p className="text-sm text-text-paragraph mb-4">
            Need help with your venue? Contact the LOKI team for support with listings, events, or technical issues.
          </p>
          <p className="text-sm text-text-paragraph">Email: support@loki.app (or your support contact)</p>
        </div>
      </div>
    </div>
  );
}

/** Firestore Timestamp → value for `<input type="datetime-local" />` (local timezone). */
function timestampToDatetimeLocalValue(ts: Timestamp | undefined | null): string {
  if (ts == null) return '';
  const d = ts.toDate();
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Experience Form Component
function ExperienceFormContent({ experience, venueId, type, currency = 'EUR', openingHours, isActive, onToggleStatus, onDelete, onSuccess, onCancel, foodGalleryUrls = [], instancePrefill }: { experience?: Experience; venueId: string; type: 'event' | 'special'; currency?: string; openingHours?: { monday: TimeRange[]; tuesday: TimeRange[]; wednesday: TimeRange[]; thursday: TimeRange[]; friday: TimeRange[]; saturday: TimeRange[]; sunday: TimeRange[] }; isActive?: boolean; onToggleStatus?: (experienceId: string, currentStatus: boolean, experienceType: 'event' | 'special') => void; onDelete?: (experienceId: string) => void; onSuccess: () => void; onCancel: () => void; foodGalleryUrls?: string[]; /** Upcoming instance docs for this experience; used to prefill start/end when editing a one-off event/special. */ instancePrefill?: ExperienceInstance[] }) {
  const [formData, setFormData] = useState({
    title: experience?.title || '',
    description: experience?.description || '',
    cost: experience?.cost ? experience.cost.toString() : '', // Cost is stored as number in euros
    costPerPerson: (experience as any)?.costPerPerson ?? false,
    isRecurring: experience?.isRecurring || false,
    daySchedules: experience?.recurrenceRule?.daySchedules || {} as { [day: number]: { startTime: string; endTime: string } },
    recurrenceStartDate: experience?.recurrenceRule?.startDate ? new Date(experience.recurrenceRule.startDate.toMillis()).toISOString().split('T')[0] : '',
    recurrenceEndDate: experience?.recurrenceRule?.endDate ? new Date(experience.recurrenceRule.endDate.toMillis()).toISOString().split('T')[0] : '',
    // For non-recurring: single instance date/time
    instanceStartAt: '',
    instanceEndAt: '',
    bookingRequired: type === 'event' ? (experience?.bookingRequired ?? false) : false,
    bookingLink:
      type === 'event' && typeof experience?.bookingLink === 'string' ? experience.bookingLink : '',
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(() => (experience?.tags || []).filter(t => t !== 'YRW2026'));
  const [otherTagInput, setOtherTagInput] = useState('');
  const [isYrwSpecial, setIsYrwSpecial] = useState<boolean>(() => type === 'special' && (experience?.tags || []).includes('YRW2026'));
  const [genre, setGenre] = useState<string>(experience?.genre || '');
  const [images, setImages] = useState<File[]>([]);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(experience?.imageUrl || null);
  const [loading, setLoading] = useState(false);

  const instancePrefillKey = useMemo(
    () =>
      (instancePrefill ?? [])
        .map((i) => `${i.id}:${i.startAt.toMillis()}:${i.endAt.toMillis()}`)
        .sort()
        .join('|'),
    [instancePrefill]
  );

  useEffect(() => {
    if (experience) {
      setExistingImageUrl(experience.imageUrl || null);
      const daySchedules = experience.recurrenceRule?.daySchedules || {};
      const startDate = experience.recurrenceRule?.startDate 
        ? new Date(experience.recurrenceRule.startDate.toMillis()).toISOString().split('T')[0] 
        : '';
      const endDate = experience.recurrenceRule?.endDate 
        ? new Date(experience.recurrenceRule.endDate.toMillis()).toISOString().split('T')[0] 
        : '';
      const sortedPrefill = (instancePrefill ?? [])
        .slice()
        .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
      const firstInst = sortedPrefill[0];
      const instanceStartAt =
        experience.isRecurring || !firstInst ? '' : timestampToDatetimeLocalValue(firstInst.startAt);
      const instanceEndAt =
        experience.isRecurring || !firstInst ? '' : timestampToDatetimeLocalValue(firstInst.endAt);
      setFormData({
        title: experience.title || '',
        description: experience.description || '',
        cost: experience.cost ? experience.cost.toString() : '',
        costPerPerson: (experience as any)?.costPerPerson ?? false,
        isRecurring: experience.isRecurring || false,
        daySchedules: daySchedules,
        recurrenceStartDate: startDate,
        recurrenceEndDate: endDate,
        instanceStartAt,
        instanceEndAt,
        bookingRequired: type === 'event' ? (experience.bookingRequired ?? false) : false,
        bookingLink:
          type === 'event' && typeof experience.bookingLink === 'string' ? experience.bookingLink : '',
      });
      const tags = experience.tags || [];
      setIsYrwSpecial(type === 'special' && tags.includes('YRW2026'));
      setSelectedTags(tags.filter(t => t !== 'YRW2026'));
    }
  }, [experience, type, instancePrefillKey]);

  const toggleDay = (day: number) => {
    setFormData(prev => {
      const newDaySchedules = { ...prev.daySchedules };
      if (newDaySchedules[day]) {
        // Remove day
        delete newDaySchedules[day];
      } else {
        // Add day with default times from opening hours
        let defaultStartTime = '';
        let defaultEndTime = '';
        
        if (openingHours && type === 'special') {
          // Map day number to day name: 0=Sunday, 1=Monday, ..., 6=Saturday
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = dayNames[day] as keyof typeof openingHours;
          const dayHours = openingHours[dayName];
          
          // Use the first time range if available
          if (dayHours && dayHours.length > 0 && dayHours[0]) {
            defaultStartTime = dayHours[0].open;
            defaultEndTime = dayHours[0].close;
          }
        }
        
        newDaySchedules[day] = { 
          startTime: defaultStartTime, 
          endTime: defaultEndTime 
        };
      }
      return {
        ...prev,
        daySchedules: newDaySchedules
      };
    });
  };

  const updateDayTime = (day: number, field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => ({
      ...prev,
      daySchedules: {
        ...prev.daySchedules,
        [day]: {
          ...prev.daySchedules[day],
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert cost from string to number (store as euros, not cents)
      const cost = formData.cost ? parseFloat(formData.cost) : null;

      // Build recurrence rule if recurring
      let recurrenceRule = null;
      if (formData.isRecurring && Object.keys(formData.daySchedules).length > 0) {
        // Validate that all selected days have times
        const validDaySchedules: { [day: number]: { startTime: string; endTime: string } } = {};
        for (const [day, schedule] of Object.entries(formData.daySchedules)) {
          if (schedule.startTime && schedule.endTime) {
            validDaySchedules[parseInt(day)] = schedule;
          }
        }
        
        if (Object.keys(validDaySchedules).length > 0) {
          recurrenceRule = {
            daySchedules: validDaySchedules,
          } as {
            daySchedules: { [day: number]: { startTime: string; endTime: string } };
            startDate?: Timestamp;
            endDate?: Timestamp;
          };
          
          // Add date range if provided
          if (formData.recurrenceStartDate) {
            const startDate = new Date(formData.recurrenceStartDate);
            startDate.setHours(0, 0, 0, 0);
            recurrenceRule.startDate = Timestamp.fromDate(startDate);
          }
          if (formData.recurrenceEndDate) {
            const endDate = new Date(formData.recurrenceEndDate);
            endDate.setHours(23, 59, 59, 999);
            recurrenceRule.endDate = Timestamp.fromDate(endDate);
          }
        }
      }

      const experienceData: any = {
        venueId: venueId,
        type: type,
        title: formData.title,
        description: formData.description,
        cost: cost,
        ...(type === 'special' && { costPerPerson: !!formData.costPerPerson }),
        isRecurring: formData.isRecurring,
        recurrenceRule: recurrenceRule,
        tags: (() => {
          const tags = type === 'special' && isYrwSpecial ? [...selectedTags, 'YRW2026'] : selectedTags;
          return tags.length > 0 ? tags : null;
        })(),
        genre: (selectedTags.includes('Live Music') || selectedTags.includes('DJ Night')) && genre ? genre : null,
        ...(type === 'event'
          ? {
              bookingRequired: !!formData.bookingRequired,
              bookingLink: formData.bookingLink.trim() || null,
            }
          : {
              bookingRequired: false,
              bookingLink: null,
            }),
        updatedAt: serverTimestamp(),
      };

      let experienceRef: any;
      const isDuplicateMode = experience?.id?.startsWith?.('duplicate-');
      const isCreate = !experience || isDuplicateMode;

      if (experience && !isDuplicateMode) {
        experienceRef = doc(db, 'experiences', experience.id);
        await updateDoc(experienceRef, experienceData);
      } else {
        // Create new (or from duplicate): block absolute duplicate
        const existingQuery = query(
          collection(db, 'experiences'),
          where('venueId', '==', venueId),
          where('type', '==', type)
        );
        const snapshot = await getDocs(existingQuery);
        const daySchedulesStr = JSON.stringify(formData.daySchedules);
        const finalTags = type === 'special' && isYrwSpecial ? [...selectedTags, 'YRW2026'] : selectedTags;
        const tagsStr = JSON.stringify([...finalTags].sort());
        const isAbsoluteDuplicate = snapshot.docs.some((d) => {
          const data = d.data();
          const sameTitle = (data.title || '') === (formData.title || '');
          const sameDesc = (data.description || '') === (formData.description || '');
          const sameCost = (data.cost ?? null) === cost;
          const sameCostPerPerson = (data.costPerPerson ?? false) === !!formData.costPerPerson;
          const sameRecurring = (data.isRecurring ?? false) === formData.isRecurring;
          const sameSchedules = JSON.stringify(data.recurrenceRule?.daySchedules || {}) === daySchedulesStr;
          const sameTags = JSON.stringify([...(data.tags || [])].sort()) === tagsStr;
          return sameTitle && sameDesc && sameCost && sameCostPerPerson && sameRecurring && sameSchedules && sameTags;
        });
        if (isAbsoluteDuplicate) {
          alert('An event/special with the same details already exists. Please change at least one field.');
          setLoading(false);
          return;
        }

        experienceData.createdAt = serverTimestamp();
        experienceRef = await addDoc(collection(db, 'experiences'), experienceData);

        const venueRef = doc(db, 'venues', venueId);
        const venueDoc = await getDoc(venueRef);
        if (venueDoc.exists()) {
          const venueData = venueDoc.data();
          const existingExperiences: VenueExperience[] = venueData.experiences || [];
          const experienceExists = existingExperiences.some(e => e.experienceId === experienceRef.id);
          if (!experienceExists) {
            const updatedExperiences = [
              ...existingExperiences,
              { experienceId: experienceRef.id, visibility: true }
            ];
            await updateDoc(venueRef, { experiences: updatedExperiences });
          }
        }
      }

      if (images.length > 0) {
        const imagePath = `experiences/${experienceRef.id}/image.jpg`;
        const imageUrl = await uploadImage(images[0], imagePath);
        await updateDoc(experienceRef, { imageUrl });
        setExistingImageUrl(imageUrl);
      } else if (existingImageUrl) {
        await updateDoc(experienceRef, { imageUrl: existingImageUrl });
      }

      // Handle instance generation - ONLY for non-recurring experiences
      if (!formData.isRecurring && formData.instanceStartAt && formData.instanceEndAt) {
        if (experience && !isDuplicateMode) {
          // Update: delete existing instances
          const existingInstancesQuery = query(
            collection(db, 'experienceInstances'),
            where('experienceId', '==', experienceRef.id)
          );
          const existingInstancesSnapshot = await getDocs(existingInstancesQuery);
          const deletePromises = existingInstancesSnapshot.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
        }

        const startDate = new Date(formData.instanceStartAt);
        const endDate = new Date(formData.instanceEndAt);
        
        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          alert('Please enter valid start and end dates');
          setLoading(false);
          return;
        }

        if (endDate <= startDate) {
          alert('End date must be after start date');
          setLoading(false);
          return;
        }
        
        // Convert to UTC Timestamp (Firestore Timestamp stores in UTC)
        const startAtUTC = Timestamp.fromDate(startDate);
        const endAtUTC = Timestamp.fromDate(endDate);

        await addDoc(collection(db, 'experienceInstances'), {
          experienceId: experienceRef.id,
          venueId: venueId,
          type: type,
          title: formData.title,
          startAt: startAtUTC,
          endAt: endAtUTC,
          createdAt: serverTimestamp(),
        });
      } else if (experience && !isDuplicateMode) {
        // If updating an experience, delete old instances
        const existingInstancesQuery = query(
          collection(db, 'experienceInstances'),
          where('experienceId', '==', experienceRef.id)
        );
        const existingInstancesSnapshot = await getDocs(existingInstancesQuery);
        const deletePromises = existingInstancesSnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving experience:', error);
      alert('Error saving experience');
    } finally {
      setLoading(false);
    }
  };

  const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
          placeholder="Experience title"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
          placeholder="Describe the experience"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cost ({getCurrencySymbol(currency)})</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.cost}
          onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          placeholder={`e.g., 20.00 (leave empty for free)`}
          className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
        />
        <p className="mt-1 text-xs text-text-paragraph">Enter cost (e.g., 20.00 for {getCurrencySymbol(currency)}20). Scroll is disabled so the value won&apos;t change when scrolling.</p>
      </div>

      {/* Price is per person (specials only): shows "£10 pp" on cards */}
      {type === 'special' && (
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!formData.costPerPerson}
              onChange={(e) => setFormData({ ...formData, costPerPerson: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-gray-700">Price is per person</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">When checked, the special will display e.g. &quot;£10 pp&quot; on the app and preview.</p>
        </div>
      )}

      {/* YRW toggle (specials only): adds YRW2026 tag and does not count toward 3-tag cap */}
      {type === 'special' && (
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isYrwSpecial}
              onChange={(e) => setIsYrwSpecial(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-gray-700">Is this a York Restaurant Week special?</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">Adds the YRW2026 tag and shows a YRW banner on the app. This does not count toward the 3-tag limit.</p>
        </div>
      )}

      {/* Tags (for events and specials); YRW2026 is via checkbox above for specials and does not count to cap */}
      <div>
        <label className="block text-sm font-body font-semibold text-neutral mb-2">Tags</label>
        <p className="text-xs text-text-paragraph mb-3">Select up to 3 tags. Selected tags appear below; click to remove.</p>
        {/* Selected tags as removable chips */}
        {(selectedTags.length > 0 || (type === 'special' && isYrwSpecial)) && (
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-1.5">
              Selected ({selectedTags.length}/3{type === 'special' && isYrwSpecial ? ' + YRW' : ''})
            </p>
            <div className="flex flex-wrap gap-2">
              {type === 'special' && isYrwSpecial && (
                <span className="px-3 py-1 text-sm rounded-full bg-primary/20 text-primary border border-primary">YRW2026</span>
              )}
              {selectedTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                  className="px-3 py-1 text-sm rounded-full bg-blue-600 text-white border border-blue-600 hover:bg-blue-700"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-3">
          {(type === 'special'
            ? ['2 course', '3 course', 'Meal Special', 'Meal & Drink Deal', 'Fine Dining', 'Tapas', 'Happy Hour', 'Drinks Special', 'Brunch Special', 'Lunch Special', 'Dinner Special', 'Bottomless', 'All You Can Eat', 'Weekend Special', 'Early Bird', 'Group Deal']
            : ['Live Music', 'DJ Night', 'Trivia Night', 'Karaoke', 'Comedy Night', 'Open Mic', 'Quiz Night', 'Sports Viewing', 'Game Night', 'Themed Night', 'Workshop', 'Tasting Event', 'Launch Event', 'Private Event', 'Networking', 'Fundraiser', 'Birthday Party', 'Anniversary', 'Holiday Event', 'Festival', 'Concert', 'Performance', 'Exhibition']
          ).map(tag => {
            const isSelected = selectedTags.includes(tag);
            const isDisabled = !isSelected && selectedTags.length >= 3;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedTags(prev => prev.filter(t => t !== tag));
                  } else if (selectedTags.length < 3) {
                    setSelectedTags(prev => [...prev, tag]);
                  }
                }}
                disabled={isDisabled}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isDisabled
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        {/* Other tag: type and Enter or Add produces removable tag, clears input */}
        {selectedTags.length < 3 && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={otherTagInput}
              onChange={(e) => setOtherTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const v = otherTagInput.trim();
                  if (v && selectedTags.length < 3 && !selectedTags.includes(v)) {
                    setSelectedTags(prev => [...prev, v]);
                    setOtherTagInput('');
                  }
                }
              }}
              placeholder="Other tag (type and press Enter)"
              className="flex-1 max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-gray-900"
            />
            <button
              type="button"
              onClick={() => {
                const v = otherTagInput.trim();
                if (v && selectedTags.length < 3 && !selectedTags.includes(v)) {
                  setSelectedTags(prev => [...prev, v]);
                  setOtherTagInput('');
                }
              }}
              className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Genre field (shown when Live Music or DJ Night is selected) */}
      {(selectedTags.includes('Live Music') || selectedTags.includes('DJ Night')) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="e.g., Rock, Jazz, Electronic, Hip-Hop, Pop"
            className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
          />
          <p className="mt-1 text-xs text-gray-500">Enter the music genre for this event</p>
        </div>
      )}

      {type === 'event' && (
        <div className="border-t pt-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.bookingRequired}
              onChange={(e) => setFormData({ ...formData, bookingRequired: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Booking required</span>
          </label>
          <p className="text-xs text-gray-500 ml-7 -mt-1">Attendees must complete booking or RSVP outside LOKI.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking link</label>
            <input
              type="url"
              value={formData.bookingLink}
              onChange={(e) => setFormData({ ...formData, bookingLink: e.target.value })}
              placeholder="https://…"
              className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
            />
            <p className="mt-1 text-xs text-gray-500">
              Ticket or RSVP URL shown in the consumer app as &quot;Book or RSVP&quot;.
            </p>
          </div>
        </div>
      )}

      {/* Instance Date/Time (for non-recurring) */}
      {!formData.isRecurring && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Instance Date & Time</h3>
          <p className="text-xs text-gray-500 mb-3">Set when this experience occurs (creates an instance)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time *</label>
              <input
                type="datetime-local"
                required={!formData.isRecurring}
                value={formData.instanceStartAt}
                onChange={(e) => setFormData({ ...formData, instanceStartAt: e.target.value })}
                className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time *</label>
              <input
                type="datetime-local"
                required={!formData.isRecurring}
                value={formData.instanceEndAt}
                onChange={(e) => setFormData({ ...formData, instanceEndAt: e.target.value })}
                className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
              />
            </div>
          </div>
        </div>
      )}

      {/* Recurrence Options */}
      <div className="border-t pt-4">
        <div className="mb-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Recurring Experience</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            If checked, this experience repeats on specified days. Instances will be auto-generated.
          </p>
        </div>
        
        {formData.isRecurring && (
          <div className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-body font-semibold text-neutral mb-1">Start Date (Optional)</label>
                <input
                  type="date"
                  value={formData.recurrenceStartDate}
                  onChange={(e) => setFormData({ ...formData, recurrenceStartDate: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                  placeholder="Leave empty for no start date"
                />
                <p className="text-xs text-gray-500 mt-1">When the recurring special starts</p>
              </div>
              <div>
                <label className="block text-sm font-body font-semibold text-neutral mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={formData.recurrenceEndDate}
                  onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary transition-colors font-body text-neutral"
                  placeholder="Leave empty for no end date"
                />
                <p className="text-xs text-gray-500 mt-1">When the recurring special ends</p>
              </div>
            </div>

            {/* Days of Week Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
              <div className="grid grid-cols-4 gap-2">
                {dayLabels.map((day, index) => (
                  <label key={index} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!!formData.daySchedules[index]}
                      onChange={() => toggleDay(index)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Time Inputs for Each Selected Day */}
            {Object.keys(formData.daySchedules).length > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-body font-semibold text-neutral mb-2">Times for Each Day</label>
                {Object.entries(formData.daySchedules)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([day, schedule]) => (
                    <div key={day} className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {dayLabels[parseInt(day)]}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={schedule.startTime}
                            onChange={(e) => updateDayTime(parseInt(day), 'startTime', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">End Time</label>
                          <input
                            type="time"
                            value={schedule.endTime}
                            onChange={(e) => updateDayTime(parseInt(day), 'endTime', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        {existingImageUrl && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Image</label>
            <img
              src={existingImageUrl}
              alt="Current experience"
              className="w-48 h-48 object-cover rounded-md border border-gray-300"
            />
          </div>
        )}
        {type === 'special' && foodGalleryUrls.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Or choose from venue food gallery</label>
            <p className="text-xs text-gray-500 mb-2">Click an image to use it as this special&apos;s image.</p>
            <div className="flex flex-wrap gap-2">
              {foodGalleryUrls.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => {
                    setExistingImageUrl(url);
                    setImages([]);
                  }}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary ${
                    existingImageUrl === url ? 'border-primary ring-2 ring-primary' : 'border-gray-300 hover:border-primary/50'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
        <ImageUpload images={images} onImagesChange={setImages} multiple={false} />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border-2 border-neutral-light rounded-lg text-neutral hover:border-primary transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
        
        {/* Deactivate and Delete buttons - only show when editing existing experience */}
        {experience && experience.id && onToggleStatus && onDelete && (
          <div className="flex gap-2 pt-3 border-t border-neutral-light">
            <button
              type="button"
              onClick={() => {
                if (onToggleStatus && experience.id) {
                  onToggleStatus(experience.id, isActive ?? true, type);
                }
              }}
              className={`px-6 py-3 text-sm rounded-lg font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-secondary text-white hover:bg-secondary-dark'
                  : 'bg-accent text-white hover:bg-accent-dark'
              }`}
            >
              {isActive ? 'Hide' : 'Show'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (onDelete && experience.id) {
                  onDelete(experience.id);
                }
              }}
              className="px-6 py-3 text-sm bg-secondary text-white rounded-lg hover:bg-secondary-dark font-semibold transition-all duration-200"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

// Special Form Component
