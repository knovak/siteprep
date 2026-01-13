#!/bin/bash

# Helper script to get photo references from Google Places API
# Usage: ./scripts/get-photo-references.sh YOUR_API_KEY PLACE_ID

if [ $# -lt 2 ]; then
  echo "Usage: $0 API_KEY PLACE_ID"
  echo ""
  echo "Example:"
  echo "  $0 YOUR_API_KEY ChIJlfdNlLlqXz4RBYaqNZRierU"
  echo ""
  echo "To find Place IDs, visit:"
  echo "  https://developers.google.com/maps/documentation/places/web-service/place-id"
  exit 1
fi

API_KEY="$1"
PLACE_ID="$2"

echo "Fetching place details for: $PLACE_ID"
echo ""

# Fetch place details with photos
URL="https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=name,formatted_address,photos&key=${API_KEY}"

RESPONSE=$(curl -s "$URL")

# Check if the request was successful
STATUS=$(echo "$RESPONSE" | grep -o '"status" : "[^"]*"' | cut -d'"' -f4)

if [ "$STATUS" != "OK" ]; then
  echo "Error: API request failed with status: $STATUS"
  echo ""
  echo "Response:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

echo "Place Name:"
echo "$RESPONSE" | grep -o '"name" : "[^"]*"' | cut -d'"' -f4
echo ""

echo "Address:"
echo "$RESPONSE" | grep -o '"formatted_address" : "[^"]*"' | cut -d'"' -f4
echo ""

echo "Photo References:"
echo "$RESPONSE" | grep -o '"photo_reference" : "[^"]*"' | cut -d'"' -f4

echo ""
echo "Done! Copy these photo references to your google-places.js configuration."
