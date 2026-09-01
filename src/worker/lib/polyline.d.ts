declare module '@mapbox/polyline' {
  const polyline: {
    encode(coordinates: [number, number][], precision?: number): string
    decode(str: string, precision?: number): [number, number][]
    fromGeoJSON(geojson: object, precision?: number): string
    toGeoJSON(str: string, precision?: number): object
  }
  export = polyline
}
