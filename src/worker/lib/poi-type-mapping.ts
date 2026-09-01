// TypeScript port of poi-type-mapping.js — no runtime changes

const GOOGLE_TO_RIDEWITHGPS_MAPPING: Record<string, string> = {
  restaurant: 'food', meal_takeaway: 'food', meal_delivery: 'food', food: 'food', bakery: 'food',
  bar: 'bar', night_club: 'bar', cafe: 'coffee', coffee_shop: 'coffee', winery: 'winery', brewery: 'bar',
  lodging: 'lodging', hotel: 'lodging', motel: 'lodging', guest_house: 'lodging', hostel: 'lodging',
  bed_and_breakfast: 'lodging', campground: 'camping', rv_park: 'camping',
  parking: 'parking', gas_station: 'gas', petrol_station: 'gas', ferry_terminal: 'ferry',
  airport: 'transit', train_station: 'transit', subway_station: 'transit', bus_station: 'transit',
  transit_station: 'transit', taxi_stand: 'transit',
  hospital: 'hospital', pharmacy: 'first_aid', doctor: 'first_aid', dentist: 'first_aid', veterinary_care: 'first_aid',
  convenience_store: 'convenience_store', supermarket: 'convenience_store', grocery_store: 'convenience_store',
  shopping_mall: 'shopping', department_store: 'shopping', clothing_store: 'shopping', store: 'shopping',
  atm: 'atm', bank: 'atm', library: 'library',
  tourist_attraction: 'viewpoint', amusement_park: 'viewpoint', zoo: 'viewpoint', aquarium: 'viewpoint',
  museum: 'viewpoint', art_gallery: 'viewpoint', park: 'park', national_park: 'park',
  hiking_area: 'trailhead', mountain_peak: 'summit', natural_feature: 'viewpoint', scenic_lookout: 'viewpoint',
  bicycle_store: 'bike_shop',
  gym: 'rest_stop', spa: 'shower', swimming_pool: 'swimming', water_park: 'swimming',
  restroom: 'restroom', public_restroom: 'restroom',
  church: 'monument', mosque: 'monument', synagogue: 'monument', temple: 'monument',
  cemetery: 'monument', landmark: 'monument', memorial: 'monument',
  fire_station: 'first_aid', police: 'first_aid',
  furniture_store: 'shopping', hardware_store: 'shopping', home_goods_store: 'shopping', florist: 'shopping',
  electronics_store: 'shopping', computer_store: 'shopping', cell_phone_store: 'shopping',
}

const TYPE_NAME_TO_ID: Record<string, number> = {
  camping: 3, lodging: 10, parking: 12, food: 13, viewpoint: 14, restroom: 15, generic: 17,
  aid_station: 20, bar: 21, bike_shop: 22, bike_parking: 23, convenience_store: 24, first_aid: 25,
  hospital: 26, rest_stop: 27, trailhead: 28, geocache: 29, water: 30, control: 31, winery: 32,
  start: 33, stop: 34, finish: 35, atm: 36, caution: 37, coffee: 38, ferry: 39, gas: 40,
  library: 41, monument: 42, park: 43, segment_start: 44, segment_end: 45, shopping: 46,
  shower: 47, summit: 48, swimming: 49, transit: 50, bikeshare: 51,
}

const OSM_TO_RIDEWITHGPS_MAPPING: Record<string, string> = {
  'amenity=toilets': 'restroom', 'amenity=drinking_water': 'water', 'amenity=water_point': 'water',
  'amenity=shelter': 'rest_stop', 'amenity=bench': 'rest_stop', 'amenity=shower': 'shower',
  'amenity=bicycle_parking': 'bike_parking', 'amenity=bicycle_repair_station': 'bike_shop',
  'amenity=compressed_air': 'bike_shop', 'amenity=restaurant': 'food', 'amenity=cafe': 'coffee',
  'amenity=fast_food': 'food', 'amenity=bar': 'bar', 'amenity=pub': 'bar',
  'amenity=biergarten': 'bar', 'amenity=food_court': 'food', 'amenity=ice_cream': 'food',
  'amenity=fuel': 'gas', 'amenity=pharmacy': 'first_aid', 'amenity=hospital': 'hospital',
  'amenity=clinic': 'hospital', 'amenity=doctors': 'first_aid', 'amenity=dentist': 'first_aid',
  'amenity=veterinary': 'first_aid', 'amenity=parking': 'parking', 'amenity=parking_space': 'parking',
  'amenity=post_office': 'generic', 'amenity=post_box': 'generic', 'amenity=parcel_locker': 'generic',
  'amenity=vending_machine': 'convenience_store', 'amenity=bus_station': 'transit',
  'amenity=ferry_terminal': 'ferry', 'amenity=taxi': 'transit', 'railway=station': 'transit',
  'public_transport=station': 'transit', 'amenity=marketplace': 'convenience_store',
  'amenity=bicycle_rental': 'bikeshare', 'amenity=telephone': 'generic',
  'amenity=waste_basket': 'generic', 'amenity=recycling': 'generic',
  'amenity=charging_station': 'generic', 'amenity=atm': 'atm', 'amenity=bank': 'atm',
  'amenity=bureau_de_change': 'atm', 'amenity=public_bookcase': 'library',
  'amenity=library': 'library', 'amenity=community_centre': 'rest_stop',
  'amenity=social_facility': 'rest_stop', 'amenity=townhall': 'generic',
  'amenity=police': 'first_aid', 'amenity=fire_station': 'first_aid',
  'amenity=ranger_station': 'first_aid', 'amenity=emergency_phone': 'first_aid',
  'amenity=place_of_worship': 'monument', 'amenity=fountain': 'water',
  'amenity=watering_place': 'water', 'amenity=bbq': 'rest_stop', 'amenity=picnic_table': 'rest_stop',
}

export function mapGoogleTypeToRideWithGPS(googleType: string): string {
  if (!googleType) return 'generic'
  return GOOGLE_TO_RIDEWITHGPS_MAPPING[googleType.toLowerCase()] || 'generic'
}

export function getRideWithGPSTypeId(typeName: string): number {
  return TYPE_NAME_TO_ID[typeName] ?? TYPE_NAME_TO_ID['generic']
}

export function mapOSMAmenityToRideWithGPS(osmAmenity: string): string {
  if (!osmAmenity) return 'generic'
  return OSM_TO_RIDEWITHGPS_MAPPING[osmAmenity.toLowerCase()] || 'generic'
}
