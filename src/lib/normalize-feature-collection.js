/**
 * Extracts a features array from WPS GeoJSON responses with varying shapes.
 * @returns {Array|null} features array, or null if format is unrecognized
 */
export function normalizeFeatureCollection (data) {
  if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) {
    return data.features
  }
  if (Array.isArray(data)) {
    return data
  }
  if (Array.isArray(data?.features)) {
    return data.features
  }
  return null
}
