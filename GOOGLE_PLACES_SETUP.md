# Google Places API Setup Guide

This guide explains how to set up and use the Google Places API to fetch location images for the site.

## Getting Your API Key

### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click "Select a project" at the top, then "NEW PROJECT"
4. Name your project (e.g., "siteprep-images") and click "CREATE"

### Step 2: Enable the Places API

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Places API (New)"
3. Click on it and press "ENABLE"
4. Also enable "Places API" (the legacy version for broader compatibility)

### Step 3: Create API Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "CREATE CREDENTIALS" > "API key"
3. Copy the API key that's generated
4. Click "Edit API key" (or the key name) to set restrictions:
   - **Application restrictions**: Choose "HTTP referrers (web sites)"
   - Add your website domains (e.g., `*.yourdomain.com/*`, `localhost/*` for local testing)
   - **API restrictions**: Choose "Restrict key" and select only "Places API"
5. Click "SAVE"

## Adding the API Key to Your Repository

### Step 4: Configure the API Key

1. Copy `config.example.js` to `config.js`:
   ```bash
   cp config.example.js config.js
   ```

2. Open `config.js` and replace `YOUR_API_KEY_HERE` with your actual API key:
   ```javascript
   const config = {
     GOOGLE_PLACES_API_KEY: 'your-actual-api-key-here'
   };
   ```

3. **IMPORTANT**: Never commit `config.js` to git! It's already in `.gitignore` to protect your API key.

## Using Google Places Images in Your Pages

### Example: Abu Dhabi Page

The Abu Dhabi page now uses the Google Places API to fetch images. Here's how it works:

1. **Load the config and API module**:
   ```html
   <script src="../../../../config.js"></script>
   <script defer src="../../assets/google-places.js"></script>
   ```

2. **Initialize the gallery**:
   ```javascript
   const places = [
     {
       name: 'Sheikh Zayed Grand Mosque',
       placeId: 'ChIJlfdNlLlqXz4RBYaqNZRierU'
     }
   ];

   loadGooglePlacesImages('abu-dhabi-gallery', places);
   ```

## Getting Photo References

Due to browser CORS restrictions, you need to fetch photo references using a server-side script or curl.

### Method 1: Using the Helper Script (Recommended)

1. Run the helper script with your API key and Place ID:
   ```bash
   ./scripts/get-photo-references.sh YOUR_API_KEY PLACE_ID
   ```

2. Example for Sheikh Zayed Grand Mosque:
   ```bash
   ./scripts/get-photo-references.sh AIza... ChIJlfdNlLlqXz4RBYaqNZRierU
   ```

3. Copy the photo references from the output

### Method 2: Using curl Directly

```bash
curl "https://maps.googleapis.com/maps/api/place/details/json?place_id=PLACE_ID&fields=name,photos&key=YOUR_API_KEY"
```

Example:
```bash
curl "https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJlfdNlLlqXz4RBYaqNZRierU&fields=name,photos&key=YOUR_API_KEY" | python3 -m json.tool
```

### Method 3: Using the Places API Playground

1. Go to the [Places API Details](https://developers.google.com/maps/documentation/places/web-service/details) page
2. Try the API in the interactive tool
3. Copy the photo_reference values from the response

## Finding Place IDs

To get a Place ID for a location:

1. Go to [Google Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)
2. Search for your location
3. Copy the Place ID

### Common Abu Dhabi Place IDs

- **Sheikh Zayed Grand Mosque**: `ChIJlfdNlLlqXz4RBYaqNZRierU`
- **Louvre Abu Dhabi**: `ChIJLfGM4BhqXz4RdoXrCKH3_QU`
- **Emirates Palace**: `ChIJx6u2_91qXz4R0QoLCKH3_QU`
- **Ferrari World Abu Dhabi**: `ChIJ8fPPLK9rXz4R0QoLCKH3_QU`

## Pricing

- **Free tier**: 0-100,000 requests per month
- **Place Photos**: $7 per 1,000 requests after free tier
- **Basic Data**: Free for most operations

For the free tier to work properly, ensure you set up billing alerts in Google Cloud Console.

## Troubleshooting

- **Images not loading**: Check browser console for errors
- **403 errors**: Your API key may need to allow your domain
- **Missing images**: The place may not have photos, or the Place ID is incorrect
- **Quota exceeded**: Check your Google Cloud Console usage dashboard
