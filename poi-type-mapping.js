// Mapping from Google Places API primaryType to RideWithGPS POI types
// Google Places types: https://developers.google.com/maps/documentation/places/web-service/place-types
// RideWithGPS POI types: see table in project documentation

const GOOGLE_TO_RIDEWITHGPS_MAPPING = {
  // Food & Drink
  'restaurant': 'food',
  'meal_takeaway': 'food',
  'meal_delivery': 'food',
  'food': 'food',
  'bakery': 'food',
  'bar': 'bar',
  'night_club': 'bar',
  'cafe': 'coffee',
  'coffee_shop': 'coffee',
  'winery': 'winery',
  'brewery': 'bar',
  
  // Lodging & Camping
  'lodging': 'lodging',
  'hotel': 'lodging',
  'motel': 'lodging',
  'guest_house': 'lodging',
  'hostel': 'lodging',
  'bed_and_breakfast': 'lodging',
  'campground': 'camping',
  'rv_park': 'camping',
  
  // Transportation & Parking
  'parking': 'parking',
  'gas_station': 'gas',
  'petrol_station': 'gas',
  'ferry_terminal': 'ferry',
  'airport': 'transit',
  'train_station': 'transit',
  'subway_station': 'transit',
  'bus_station': 'transit',
  'transit_station': 'transit',
  'taxi_stand': 'transit',
  
  // Healthcare & Safety
  'hospital': 'hospital',
  'pharmacy': 'first_aid',
  'doctor': 'first_aid',
  'dentist': 'first_aid',
  'veterinary_care': 'first_aid',
  
  // Shopping & Services
  'convenience_store': 'convenience_store',
  'supermarket': 'convenience_store',
  'grocery_store': 'convenience_store',
  'shopping_mall': 'shopping',
  'department_store': 'shopping',
  'clothing_store': 'shopping',
  'store': 'shopping',
  'atm': 'atm',
  'bank': 'atm',
  'library': 'library',
  
  // Recreation & Tourism
  'tourist_attraction': 'viewpoint',
  'amusement_park': 'viewpoint',
  'zoo': 'viewpoint',
  'aquarium': 'viewpoint',
  'museum': 'viewpoint',
  'art_gallery': 'viewpoint',
  'park': 'park',
  'national_park': 'park',
  'campground': 'camping',
  'hiking_area': 'trailhead',
  'mountain_peak': 'summit',
  'natural_feature': 'viewpoint',
  'scenic_lookout': 'viewpoint',
  
  // Bike-specific
  'bicycle_store': 'bike_shop',
  
  // Sports & Recreation
  'gym': 'rest_stop',
  'spa': 'shower',
  'swimming_pool': 'swimming',
  'water_park': 'swimming',
  
  // Public facilities
  'restroom': 'restroom',
  'public_restroom': 'restroom',
  
  // Religious & Cultural
  'church': 'monument',
  'mosque': 'monument',
  'synagogue': 'monument',
  'temple': 'monument',
  'cemetery': 'monument',
  'landmark': 'monument',
  'memorial': 'monument',
  
  // Government & Public Services
  'city_hall': 'generic',
  'courthouse': 'generic',
  'embassy': 'generic',
  'fire_station': 'first_aid',
  'police': 'first_aid',
  'post_office': 'generic',
  
  // Education
  'school': 'generic',
  'university': 'generic',
  'primary_school': 'generic',
  'secondary_school': 'generic',
  
  // Business & Professional
  'accounting': 'generic',
  'lawyer': 'generic',
  'insurance_agency': 'generic',
  'real_estate_agency': 'generic',
  
  // Automotive
  'car_dealer': 'generic',
  'car_rental': 'generic',
  'car_repair': 'generic',
  'car_wash': 'generic',
  'electric_vehicle_charging_station': 'generic',
  
  // Beauty & Personal Care
  'beauty_salon': 'generic',
  'hair_care': 'generic',
  'spa': 'shower',
  
  // Finance
  'accounting': 'generic',
  'insurance_agency': 'generic',
  
  // Home & Garden
  'furniture_store': 'shopping',
  'hardware_store': 'shopping',
  'home_goods_store': 'shopping',
  'florist': 'shopping',
  
  // Electronics & Technology
  'electronics_store': 'shopping',
  'computer_store': 'shopping',
  'cell_phone_store': 'shopping',
  
  // Entertainment
  'movie_theater': 'generic',
  'bowling_alley': 'generic',
  'casino': 'generic',
  
  // Storage
  'storage': 'generic',
  
  // Miscellaneous
  'funeral_home': 'generic',
  'moving_company': 'generic',
  'laundry': 'generic',
  'dry_cleaning': 'generic',
  'tailor': 'generic',
  'locksmith': 'generic',
  'plumber': 'generic',
  'electrician': 'generic',
  'roofing_contractor': 'generic',
  'painter': 'generic',
  'cleaning_service': 'generic'
};

/**
 * Maps a Google Places primaryType to a RideWithGPS POI type
 * @param {string} googleType - The primaryType from Google Places API
 * @returns {string} - The corresponding RideWithGPS POI type name (defaults to 'generic')
 */
function mapGoogleTypeToRideWithGPS(googleType) {
  if (!googleType) return 'generic';
  
  // Convert to lowercase for case-insensitive matching
  const normalizedType = googleType.toLowerCase();
  
  // Return mapped type or default to generic
  return GOOGLE_TO_RIDEWITHGPS_MAPPING[normalizedType] || 'generic';
}

/**
 * Gets the RideWithGPS POI type ID for a given type name
 * @param {string} typeName - The RideWithGPS POI type name
 * @returns {number} - The corresponding type ID
 */
function getRideWithGPSTypeId(typeName) {
  const TYPE_NAME_TO_ID = {
    'camping': 3,
    'lodging': 10,
    'parking': 12,
    'food': 13,
    'viewpoint': 14,
    'restroom': 15,
    'generic': 17,
    'aid_station': 20,
    'bar': 21,
    'bike_shop': 22,
    'bike_parking': 23,
    'convenience_store': 24,
    'first_aid': 25,
    'hospital': 26,
    'rest_stop': 27,
    'trailhead': 28,
    'geocache': 29,
    'water': 30,
    'control': 31,
    'winery': 32,
    'start': 33,
    'stop': 34,
    'finish': 35,
    'atm': 36,
    'caution': 37,
    'coffee': 38,
    'ferry': 39,
    'gas': 40,
    'library': 41,
    'monument': 42,
    'park': 43,
    'segment_start': 44,
    'segment_end': 45,
    'shopping': 46,
    'shower': 47,
    'summit': 48,
    'swimming': 49,
    'transit': 50,
    'bikeshare': 51
  };
  
  return TYPE_NAME_TO_ID[typeName] || TYPE_NAME_TO_ID['generic'];
}

// Mapping from OpenStreetMap tags to RideWithGPS POI types
// All keys are in key=value format for consistency
const OSM_TO_RIDEWITHGPS_MAPPING = {
  // Essential cycling amenities
  'amenity=toilets': 'restroom',
  'amenity=drinking_water': 'water',
  'amenity=water_point': 'water',
  'amenity=shelter': 'rest_stop',
  'amenity=bench': 'rest_stop',
  'amenity=shower': 'shower',
  'amenity=bicycle_parking': 'bike_parking',
  'amenity=bicycle_repair_station': 'bike_shop',
  'amenity=compressed_air': 'bike_shop',

  // Food & Drink
  'amenity=restaurant': 'food',
  'amenity=cafe': 'coffee',
  'amenity=fast_food': 'food',
  'amenity=bar': 'bar',
  'amenity=pub': 'bar',
  'amenity=biergarten': 'bar',
  'amenity=food_court': 'food',
  'amenity=ice_cream': 'food',

  // Fuel & Vehicle Services
  'amenity=fuel': 'gas',

  // Healthcare & Safety
  'amenity=pharmacy': 'first_aid',
  'amenity=hospital': 'hospital',
  'amenity=clinic': 'hospital',
  'amenity=doctors': 'first_aid',
  'amenity=dentist': 'first_aid',
  'amenity=veterinary': 'first_aid',

  // General parking & rest areas
  'amenity=parking': 'parking',
  'amenity=parking_space': 'parking',

  // Postal services
  'amenity=post_office': 'generic',
  'amenity=post_box': 'generic',
  'amenity=parcel_locker': 'generic',

  // Vending & quick services
  'amenity=vending_machine': 'convenience_store',

  // Public transport (key=value tags)
  'amenity=bus_station': 'transit',
  'amenity=ferry_terminal': 'ferry',
  'amenity=taxi': 'transit',
  'railway=station': 'transit',
  'public_transport=station': 'transit',

  // Shopping
  'amenity=marketplace': 'convenience_store',
  'amenity=bicycle_rental': 'bikeshare',

  // Other common amenities
  'amenity=telephone': 'generic',
  'amenity=waste_basket': 'generic',
  'amenity=recycling': 'generic',
  'amenity=charging_station': 'generic',
  'amenity=atm': 'atm',
  'amenity=bank': 'atm',
  'amenity=bureau_de_change': 'atm',
  'amenity=public_bookcase': 'library',
  'amenity=library': 'library',
  'amenity=community_centre': 'rest_stop',
  'amenity=social_facility': 'rest_stop',
  'amenity=townhall': 'generic',
  'amenity=police': 'first_aid',
  'amenity=fire_station': 'first_aid',
  'amenity=ranger_station': 'first_aid',
  'amenity=emergency_phone': 'first_aid',
  'amenity=place_of_worship': 'monument',
  'amenity=fountain': 'water',
  'amenity=watering_place': 'water',
  'amenity=bbq': 'rest_stop',
  'amenity=picnic_table': 'rest_stop',
};

/**
 * Maps an OpenStreetMap amenity tag to a RideWithGPS POI type
 * @param {string} osmAmenity - The amenity tag from OpenStreetMap
 * @returns {string} - The corresponding RideWithGPS POI type name (defaults to 'generic')
 */
function mapOSMAmenityToRideWithGPS(osmAmenity) {
  if (!osmAmenity) return 'generic';
  
  // Convert to lowercase for case-insensitive matching
  const normalizedAmenity = osmAmenity.toLowerCase();
  
  // Return mapped type or default to generic
  return OSM_TO_RIDEWITHGPS_MAPPING[normalizedAmenity] || 'generic';
}

module.exports = {
  mapGoogleTypeToRideWithGPS,
  getRideWithGPSTypeId,
  mapOSMAmenityToRideWithGPS,
  GOOGLE_TO_RIDEWITHGPS_MAPPING,
  OSM_TO_RIDEWITHGPS_MAPPING
};