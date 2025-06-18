export default async function getLocationsData () {
  const url = import.meta.env.VITE_GEOSERVER_BASE_URL

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch locations data')
  }

  const data = await response.json() // Direct GeoJSON
  console.log('data', data)

  return data // Already a FeatureCollection
}
