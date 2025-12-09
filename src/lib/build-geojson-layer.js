export default function buildGeojsonLayer (layerConfig) {
  const { id, type, source, paint, layout } = layerConfig
  
  return {
    id,
    type, // 'circle', 'fill', 'line', etc.
    source: source || {
      type: 'geojson',
      data: layerConfig.data || { type: 'FeatureCollection', features: [] },
    },
    paint: paint || {},
    layout: layout || {},
  }
}