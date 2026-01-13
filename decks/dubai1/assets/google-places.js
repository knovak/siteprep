/**
 * Google Places API Integration
 * Uses Google Places Photo API to display location images
 *
 * NOTE: Due to CORS restrictions, this uses pre-configured photo references.
 * To get photo references for new locations:
 * 1. Use the Places API Playground: https://developers.google.com/maps/documentation/places/web-service/details
 * 2. Or use a server-side script to fetch place details
 * 3. Add the photo_reference values to the places configuration below
 */

/**
 * Get the API key from config
 */
function getApiKey() {
  if (typeof window.CONFIG !== 'undefined' && window.CONFIG.GOOGLE_PLACES_API_KEY) {
    return window.CONFIG.GOOGLE_PLACES_API_KEY;
  }
  console.error('Google Places API key not found. Make sure config.js is loaded.');
  return null;
}

/**
 * Get photo URL from photo reference
 * @param {string} photoReference - The photo reference from Places API
 * @param {number} maxWidth - Maximum width of the photo (default: 800)
 * @returns {string} Photo URL
 */
function getPhotoUrl(photoReference, maxWidth = 800) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.error('Please configure your Google Places API key in config.js');
    return '';
  }

  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

/**
 * Load images from Google Places API into a gallery
 * @param {string} galleryId - The ID of the gallery element
 * @param {Array<Object>} places - Array of place objects with {name, photoReference, caption}
 */
function loadGooglePlacesImages(galleryId, places) {
  const gallery = document.getElementById(galleryId);
  if (!gallery) {
    console.error(`Gallery element with id "${galleryId}" not found`);
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.error('Please configure your Google Places API key in config.js');
    // Show a helpful message in the gallery
    gallery.innerHTML = `
      <div class="gallery-item">
        <div style="padding: 2rem; background: #f0f0f0; text-align: center; border-radius: 8px;">
          <p><strong>Google Places API Key Required</strong></p>
          <p>Please configure your API key in <code>config.js</code></p>
          <p>See <code>GOOGLE_PLACES_SETUP.md</code> for instructions</p>
        </div>
      </div>
    `;
    return;
  }

  // Build gallery items from places with photo references
  const galleryItems = [];

  for (const place of places) {
    if (place.photoReference) {
      const photoUrl = getPhotoUrl(place.photoReference);
      galleryItems.push({
        url: photoUrl,
        alt: place.name,
        caption: place.caption || place.name
      });
    } else {
      console.warn(`No photo reference provided for: ${place.name}`);
    }
  }

  // Render gallery items
  if (galleryItems.length > 0) {
    gallery.innerHTML = galleryItems.map(item => `
      <div class="gallery-item">
        <img src="${item.url}" alt="${item.alt}" loading="lazy">
        <div class="gallery-caption">${item.caption}</div>
      </div>
    `).join('');

    // Re-initialize the photo gallery lightbox
    if (typeof initPhotoGallery === 'function') {
      initPhotoGallery(galleryId);
    }
  } else {
    gallery.innerHTML = `
      <div class="gallery-item">
        <div style="padding: 2rem; background: #f0f0f0; text-align: center; border-radius: 8px;">
          <p>No photos found for the specified locations</p>
          <p>Check that photo references are configured correctly</p>
        </div>
      </div>
    `;
  }
}

/**
 * Predefined photo references for Abu Dhabi attractions
 *
 * To get photo references for your locations:
 * 1. Use curl or Postman to call the Places API Details endpoint:
 *    https://maps.googleapis.com/maps/api/place/details/json?place_id=PLACE_ID&fields=name,photo&key=YOUR_API_KEY
 * 2. Extract the photo_reference values from the response
 * 3. Add them to the configuration below
 *
 * Place IDs can be found at: https://developers.google.com/maps/documentation/places/web-service/place-id
 */
const abuDhabiPlaces = [
  {
    name: 'Sheikh Zayed Grand Mosque',
    placeId: 'ChIJlfdNlLlqXz4RBYaqNZRierU',
    // Example photo references - replace with real ones after API setup
    photoReference: 'REPLACE_WITH_REAL_PHOTO_REFERENCE_1',
    caption: 'Sheikh Zayed Grand Mosque - The stunning white marble architecture and domes'
  },
  {
    name: 'Louvre Abu Dhabi',
    placeId: 'ChIJLfGM4BhqXz4RdoXrCKH3_QU',
    // Example photo references - replace with real ones after API setup
    photoReference: 'REPLACE_WITH_REAL_PHOTO_REFERENCE_2',
    caption: 'Louvre Abu Dhabi - Modern architectural masterpiece on Saadiyat Island'
  }
];

/**
 * Helper function to get photo references for a place
 * Run this in browser console after setting up your API key:
 *
 * getPhotoReferences('ChIJlfdNlLlqXz4RBYaqNZRierU').then(refs => console.log(refs))
 */
async function getPhotoReferences(placeId) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.error('Please configure your Google Places API key in config.js');
    return null;
  }

  try {
    // This will fail due to CORS in browser - use from Node.js or server
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,photos&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.result && data.result.photos) {
      return data.result.photos.map(photo => photo.photo_reference);
    }
    return null;
  } catch (error) {
    console.error('Error fetching photo references:', error);
    console.log('This function needs to run server-side or through a proxy due to CORS.');
    return null;
  }
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.getPhotoUrl = getPhotoUrl;
  window.loadGooglePlacesImages = loadGooglePlacesImages;
  window.getPhotoReferences = getPhotoReferences;
  window.abuDhabiPlaces = abuDhabiPlaces;
}
