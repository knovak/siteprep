/* Regional orientation points, not promised observing positions. */
(() => {
  const locations = [
  {
    "name": "Cádiz viewing region",
    "country": "Spain",
    "lat": 36.53,
    "lng": -6.29,
    "description": "Approximate city / Balmoral stay",
    "countryMarker": true
  },
  {
    "name": "Vejer / Tugasa Convento San Francisco",
    "country": "Spain",
    "lat": 36.25,
    "lng": -5.97,
    "description": "Approximate town / hotel orientation"
  },
  {
    "name": "Málaga",
    "country": "Spain",
    "lat": 36.72,
    "lng": -4.42,
    "description": "Airport and route hub"
  },
  {
    "name": "Granada",
    "country": "Spain",
    "lat": 37.18,
    "lng": -3.6,
    "description": "Itinerary city"
  },
  {
    "name": "Córdoba",
    "country": "Spain",
    "lat": 37.89,
    "lng": -4.78,
    "description": "Itinerary city"
  },
  {
    "name": "Seville",
    "country": "Spain",
    "lat": 37.39,
    "lng": -5.98,
    "description": "Itinerary city"
  },
  {
    "name": "Algeciras",
    "country": "Spain",
    "lat": 36.13,
    "lng": -5.45,
    "description": "Itinerary city"
  },
  {
    "name": "Strait of Gibraltar",
    "country": "Spain",
    "lat": 35.99,
    "lng": -5.57,
    "description": "Broad viewing region, exact site unpublished",
    "zoom": 7
  },
  {
    "name": "Tangier viewing region",
    "country": "Morocco",
    "lat": 35.76,
    "lng": -5.83,
    "description": "Approximate city / regional viewing hub",
    "countryMarker": true
  },
  {
    "name": "Chefchaouen / Rif trek region",
    "country": "Morocco",
    "lat": 35.17,
    "lng": -5.27,
    "description": "City and regional trek orientation"
  },
  {
    "name": "Oued Laou",
    "country": "Morocco",
    "lat": 35.45,
    "lng": -5.09,
    "description": "Coastal trek endpoint, not exact observing site"
  },
  {
    "name": "Marrakesh",
    "country": "Morocco",
    "lat": 31.63,
    "lng": -7.98,
    "description": "Itinerary city"
  },
  {
    "name": "Casablanca",
    "country": "Morocco",
    "lat": 33.57,
    "lng": -7.59,
    "description": "Airport and route hub"
  },
  {
    "name": "Fes",
    "country": "Morocco",
    "lat": 34.03,
    "lng": -5.0,
    "description": "Itinerary city"
  },
  {
    "name": "Oran viewing region",
    "country": "Algeria",
    "lat": 35.7,
    "lng": -0.64,
    "description": "City orientation; observing site planned south of city",
    "countryMarker": true
  },
  {
    "name": "Algiers",
    "country": "Algeria",
    "lat": 36.75,
    "lng": 3.06,
    "description": "Airport and route hub"
  },
  {
    "name": "Timgad",
    "country": "Algeria",
    "lat": 35.48,
    "lng": 6.47,
    "description": "Published Dragoman viewing locality"
  },
  {
    "name": "Algerian Sahara",
    "country": "Algeria",
    "lat": 27.2,
    "lng": 2.8,
    "description": "Broad expedition region; not the eclipse site",
    "zoom": 5
  },
  {
    "name": "Sfax viewing region",
    "country": "Tunisia",
    "lat": 34.74,
    "lng": 10.76,
    "description": "Approximate city / regional viewing hub",
    "countryMarker": true
  },
  {
    "name": "Chaffar Beach",
    "country": "Tunisia",
    "lat": 34.5347,
    "lng": 10.5822,
    "description": "Beach orientation from Wikidata; exact tour site unpublished"
  },
  {
    "name": "Tunis",
    "country": "Tunisia",
    "lat": 36.81,
    "lng": 10.18,
    "description": "Airport and route hub"
  },
  {
    "name": "Tozeur",
    "country": "Tunisia",
    "lat": 33.92,
    "lng": 8.13,
    "description": "Itinerary town"
  },
  {
    "name": "Douz",
    "country": "Tunisia",
    "lat": 33.46,
    "lng": 9.02,
    "description": "Desert excursion town"
  },
  {
    "name": "Offshore Tunisia",
    "country": "Tunisia",
    "lat": 34.5,
    "lng": 11.3,
    "description": "Broad marine viewing region; not a promised ship position",
    "zoom": 6,
    "icon": "🚢"
  },
  {
    "name": "Luxor viewing region",
    "country": "Egypt",
    "lat": 25.69,
    "lng": 32.64,
    "description": "Approximate city / regional viewing hub",
    "countryMarker": true
  },
  {
    "name": "Winter Palace / Hamees area",
    "country": "Egypt",
    "lat": 25.696,
    "lng": 32.639,
    "description": "Approximate mooring-neighbourhood orientation"
  },
  {
    "name": "Jolie Ville / Nile Plaza area",
    "country": "Egypt",
    "lat": 25.65,
    "lng": 32.62,
    "description": "Approximate mooring-neighbourhood orientation"
  },
  {
    "name": "Luxor West Bank / Al Wadi / Villa Kamose",
    "country": "Egypt",
    "lat": 25.73,
    "lng": 32.61,
    "description": "Broad stay region; not exact property/rooftop coordinates"
  },
  {
    "name": "Cairo",
    "country": "Egypt",
    "lat": 30.04,
    "lng": 31.24,
    "description": "Airport and route hub"
  },
  {
    "name": "6th of October City / proposed Novotel",
    "country": "Egypt",
    "lat": 30.01,
    "lng": 30.97,
    "description": "Approximate city / proposed-hotel orientation"
  },
  {
    "name": "Maadi / proposed Hilton Cairo Nile",
    "country": "Egypt",
    "lat": 29.97,
    "lng": 31.25,
    "description": "Approximate neighbourhood / proposed-hotel orientation"
  },
  {
    "name": "Alexandria",
    "country": "Egypt",
    "lat": 31.2,
    "lng": 29.92,
    "description": "Itinerary city"
  },
  {
    "name": "Minya / MG Nefertiti Hotel area",
    "country": "Egypt",
    "lat": 28.11,
    "lng": 30.75,
    "description": "Approximate city / hotel / viewing region"
  },
  {
    "name": "Assiut viewing region",
    "country": "Egypt",
    "lat": 27.18,
    "lng": 31.19,
    "description": "City orientation; camps need separate coordinates"
  },
  {
    "name": "Sohag",
    "country": "Egypt",
    "lat": 26.56,
    "lng": 31.7,
    "description": "Itinerary city"
  },
  {
    "name": "Abydos",
    "country": "Egypt",
    "lat": 26.18,
    "lng": 31.92,
    "description": "Temple area / published viewing locality"
  },
  {
    "name": "Dendera",
    "country": "Egypt",
    "lat": 26.14,
    "lng": 32.67,
    "description": "Itinerary temple area"
  },
  {
    "name": "Esna",
    "country": "Egypt",
    "lat": 25.29,
    "lng": 32.55,
    "description": "Nile itinerary town"
  },
  {
    "name": "Edfu",
    "country": "Egypt",
    "lat": 24.98,
    "lng": 32.87,
    "description": "Nile itinerary town"
  },
  {
    "name": "Aswan",
    "country": "Egypt",
    "lat": 24.09,
    "lng": 32.9,
    "description": "Route hub; a Nile stay is not itself proof of eclipse viewing"
  },
  {
    "name": "Lake Nasser / Nubia",
    "country": "Egypt",
    "lat": 23.25,
    "lng": 32.65,
    "description": "Broad boat-travel region, separate from published viewing sites",
    "zoom": 6,
    "icon": "🚢"
  },
  {
    "name": "Abu Simbel",
    "country": "Egypt",
    "lat": 22.34,
    "lng": 31.63,
    "description": "Itinerary temple area"
  },
  {
    "name": "Hurghada / Steigenberger Aqua Magic",
    "country": "Egypt",
    "lat": 27.2,
    "lng": 33.83,
    "description": "Approximate resort-city orientation; viewing excursion is to Luxor"
  },
  {
    "name": "El Quseir / Mövenpick resort area",
    "country": "Egypt",
    "lat": 26.1,
    "lng": 34.28,
    "description": "Approximate resort-city orientation; viewing trip is to Assiut"
  },
  {
    "name": "Kharga / Western Desert",
    "country": "Egypt",
    "lat": 25.45,
    "lng": 30.55,
    "description": "Oasis / broad expedition region"
  },
  {
    "name": "Bahariya",
    "country": "Egypt",
    "lat": 28.35,
    "lng": 28.86,
    "description": "Oasis / broad viewing region"
  },
  {
    "name": "Black Desert",
    "country": "Egypt",
    "lat": 28.05,
    "lng": 28.75,
    "description": "Broad camp/viewing region; exact site unpublished",
    "zoom": 7
  },
  {
    "name": "White Desert / Star Camp region",
    "country": "Egypt",
    "lat": 27.3,
    "lng": 28.2,
    "description": "Broad desert/camp region; not a precise camp pin",
    "zoom": 7
  },
  {
    "name": "Abu Mohareq dunes",
    "country": "Egypt",
    "lat": 27.4,
    "lng": 29.6,
    "description": "Broad dune system; not final viewing coordinates",
    "zoom": 6
  },
  {
    "name": "Marsa Alam",
    "country": "Egypt",
    "lat": 25.07,
    "lng": 34.9,
    "description": "Airport / coastal transfer hub"
  },
  {
    "name": "Hamata / Wadi Lahmy Azur Resort",
    "country": "Egypt",
    "lat": 24.23709,
    "lng": 35.4143,
    "description": "Resort reference; obtain exact observing position"
  },
  {
    "name": "Southampton",
    "country": "Transit",
    "lat": 50.91,
    "lng": -1.4,
    "description": "Balmoral embarkation / disembarkation"
  },
  {
    "name": "Athens",
    "country": "Transit",
    "lat": 37.98,
    "lng": 23.73,
    "description": "Oosterdam embarkation / disembarkation"
  }
];
  const colors = { Spain:'#db7c19', Morocco:'#b63f66', Algeria:'#168268', Tunisia:'#774fc4', Egypt:'#2467bc', Transit:'#607080' };
  const selected = document.querySelector('meta[name="eclipse-map-scope"]')?.content === 'countries'
    ? locations.filter(location => location.countryMarker)
    : locations;
  StandardMap.render({
    locations: selected.map(location => ({
      ...location,
      color: colors[location.country], icon: location.icon || '📍', zoom: location.zoom || 9,
      type: `${location.country} · ${location.description} · <a href="https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=10/${location.lat}/${location.lng}">Map reference</a>`
    })),
    osmMapId:'eclipse-map-osm', osmLegendId:'eclipse-legend-osm',
    topoMapId:'eclipse-map-topo', topoLegendId:'eclipse-legend-topo'
  });
})();
