import buildWmsLayer from './build-wms-layer'
import buildWmtsLayer from './build-wmts-layer'
import buildGeojsonLayer from './build-geojson-layer'
import checkMapServiceType from './check-map-service-type'

export default function buildMapboxLayer (layerConfig) {
  // If layer has a URL, check if it's WMS or WMTS
  if (layerConfig.url) {
    try {
      const mapServiceType = checkMapServiceType(layerConfig.url)
      if (mapServiceType === 'wms') {
        return buildWmsLayer(layerConfig)
      } else if (mapServiceType === 'wmts') {
        return buildWmtsLayer(layerConfig)
      }
    } catch (error) {
      // If URL parsing fails, treat as GeoJSON
      console.warn('Failed to parse layer URL, treating as GeoJSON:', error)
      return buildGeojsonLayer(layerConfig)
    }
  }
  
  // No URL or URL check failed - treat as GeoJSON layer
  // GeoJSON layers have source.type === 'geojson' or have data property
  if (layerConfig.source?.type === 'geojson' || layerConfig.data || layerConfig.type) {
    return buildGeojsonLayer(layerConfig)
  }
  
  // Unknown layer type
  console.warn('Unknown layer type:', layerConfig)
  return null
}

