# OSM POI Provider

The OpenStreetMap (OSM) POI Provider allows users to search for cycling-relevant amenities along their routes using data from OpenStreetMap via the Postpass API (a PostGIS-based OSM query service).

## Features

- **Preset Amenity Types**: 22 carefully selected amenity types relevant to cycling
- **Multi-selection**: Search for multiple amenity types simultaneously
- **OpenStreetMap Data**: Free, community-maintained, worldwide coverage
- **Real-time Search**: Queries live OSM data via Postpass API

## Preset Amenity Types

The OSM provider includes the following preset amenity types optimized for cycling:

### Essential Facilities
- **Toilets**: Essential for breaks during long rides
- **Drinking Water**: Refill water bottles / hydration station
- **Water Point**: Large volume water source
- **Shelter**: Protection from rain, wind, or sun
- **Bench**: Somewhere to sit and rest

### Bike-Specific
- **Bicycle Parking**: Secure/marked bike parking
- **Bicycle Repair Station**: Basic tools (pump, wrench)
- **Compressed Air**: For pumping up tires

### Food & Drink
- **Restaurant**: Places to eat and recharge
- **Cafe**: Coffee and light meals
- **Fast Food**: Quick meals on the go
- **Fuel Station**: Often sells snacks, water, sometimes bike items

### Services
- **Shower**: Useful for overnight stops
- **Pharmacy**: First-aid supplies, painkillers, etc.
- **Hospital**: In case of injury or health emergency
- **Clinic**: Medical care facility
- **Doctor**: Medical professional
- **Parking**: Rest area with space for pulling off road
- **Post Office**: For sending or receiving items
- **Vending Machine**: Quick snacks/drinks on the go

### Transport
- **Bus Station**: Backup transport option
- **Ferry Terminal**: Alternate transport option

## Usage

1. **Load a Route**: Select a route from your RideWithGPS account
2. **Open POI Search**: Expand the "Search for POIs" section
3. **Select OSM Provider**: Click on "OpenStreetMap" in the accordion
4. **Choose Amenities**: 
   - Check boxes for desired amenity types
   - Use "Select All" to choose all amenities
   - Use "Clear" to deselect all
5. **Search**: Click "Search OSM POIs"
6. **Review Results**: POIs will appear as markers on the map
7. **Add to Route**: Click on markers and use "Add to Selected" to save them

## Technical Details

### Backend

The OSM provider queries the Postpass API at `https://postpass.geofabrik.de/api/0.2/interpreter` using SQL/PostGIS queries:

```sql
-- Example Postpass SQL query for route-based search
SELECT osm_type, osm_id, tags, ST_Centroid(geom) as geom
FROM postpass_pointpolygon
WHERE (tags->>'amenity' IN ('drinking_water'))
AND ST_DWithin(
  geom,
  ST_SetSRID(ST_GeomFromText('LINESTRING(lon1 lat1, lon2 lat2, ...)'), 4326),
  0.005
)
```

The query searches within 0.005 degrees of the route (approximately 555m north/south and ~360m east/west at mid-latitudes) using `ST_DWithin` with geometry type, creating an approximate corridor along the route path. This provides more relevant results than a bounding box search.

Postpass is based on PostGIS and provides faster, more reliable queries than the Overpass API, which was prone to timeouts.

### Amenity Mapping

OSM amenity tags are mapped to RideWithGPS POI types:

| OSM Amenity | RideWithGPS Type |
|-------------|------------------|
| toilets | restroom |
| drinking_water | water |
| water_point | water |
| cafe | coffee |
| restaurant | food |
| bicycle_parking | bike_parking |
| bicycle_repair_station | bike_shop |
| hospital | hospital |
| pharmacy | first_aid |
| ... | ... |

See `poi-type-mapping.js` for the complete mapping.

### API Endpoint

**POST** `/api/poi-search/osm`

Request body:
```json
{
  "tags": "amenity=drinking_water,amenity=toilets,amenity=cafe",
  "encodedPolyline": "route_polyline_here"
}
```

Or fallback to bounding box if route is not available:
```json
{
  "tags": "amenity=drinking_water,amenity=toilets,amenity=cafe",
  "mapBounds": {
    "south": 37.7,
    "west": -122.5,
    "north": 37.8,
    "east": -122.4
  }
}
```

Response: Standard POI format with `places` array.

**Search Strategy**:
- **Route-based (preferred)**: Searches within 0.005 degrees (~500m) of the route using `ST_DWithin`
  - Routes under 100 points use all coordinates; longer routes are sampled to ~25% of points
  - Creates a corridor approximately 1km wide along the route
  - More relevant results for cyclists
- **Bounding box (fallback)**: Searches within the entire map viewport using `ST_MakeEnvelope`
  - Used when route data is not available
  - May return POIs far from the actual route

## Configuration

The OSM provider is enabled by default. To configure providers, set the environment variable:

```bash
ENABLED_POI_PROVIDERS=google,osm,mock
```

## Advantages

- **Free**: No API key or authentication required
- **Community Data**: Rich, community-maintained dataset
- **Global Coverage**: Works worldwide wherever OSM has data
- **Open Source**: Fully transparent data and queries
- **Cycling-Friendly**: Many bike-specific amenities
- **Route-Focused**: Searches along your route, not just map bounds, providing more relevant results
- **Fast & Reliable**: Postpass is PostGIS-based, avoiding the timeout issues of Overpass

## Limitations

- **Rate Limits**: Postpass API has usage limits (be reasonable with requests)
- **Data Quality**: Varies by region based on OSM contributor activity
- **No Reviews**: Unlike commercial providers, no user reviews/ratings
- **Route Sampling**: Routes over 100 points are sampled to ~25% of points to keep queries manageable

## Best Practices

1. **Be Selective**: Choose only the amenity types you need to reduce query complexity
2. **Route-Based Search**: The provider automatically uses route-based search when available for better results
3. **Verify Data**: OSM data quality varies; verify critical amenities if possible
4. **Contribute Back**: If you find missing data, consider contributing to OSM!

## Related Links

- [OpenStreetMap Wiki - Amenity](https://wiki.openstreetmap.org/wiki/Key:amenity)
- [Postpass API](https://postpass.geofabrik.de/)
- [Postpass Schema Documentation](https://github.com/woodpeck/postpass-ops/blob/main/SCHEMA.md)
- [Postpass Examples](https://wiki.openstreetmap.org/wiki/Postpass/Examples)
- [RideWithGPS POI Types](https://github.com/ridewithgps/developers/blob/master/reference/points_of_interest.md)
