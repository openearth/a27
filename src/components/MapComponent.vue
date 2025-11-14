<script setup>
import { MapboxMap } from '@studiometa/vue-mapbox-gl'
import { computed, onBeforeUnmount, provide, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import MapLayer from '@/components/MapLayer.vue'
import { useLocationsStore } from '@/stores/locations'
import { useMapStore } from '@/stores/map'
import { useAppStore } from '@/stores/app'

const accessToken = import.meta.env.VITE_MAPBOX_TOKEN
const locationsStore = useLocationsStore()
const mapStore = useMapStore()
const appStore = useAppStore()
const mapInstance = ref(null)
const hoverPopup = ref(null)
const mapboxLayers = computed(() => mapStore.mapboxLayers)

// Provide map instance for child components
const map = computed(() => mapInstance.value)
provide('map', map)

function onMapCreated(map) {
  mapInstance.value = map

  // Create popup instance for hover
  hoverPopup.value = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'location-hover-popup',
  })

  // Wait for style to load before adding sources/layers
  if (map.isStyleLoaded()) {
    setupActiveLocationLayer()
    initializeMap()
  } else {
    map.once('style.load', () => {
      setupActiveLocationLayer()
      initializeMap()
    })
  }
}

function initializeMap() {
  mapStore.initializeMapboxLayers()
  locationsStore.fetchLocations().then(() => {
    mapStore.refreshLayers()
  })
}

// Setup active-location layer for highlighting selected location
function setupActiveLocationLayer() {
  const mapObj = mapInstance.value
  if (!mapObj || mapObj.getSource('active-location')) return

  mapObj.addSource('active-location', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  mapObj.addLayer({
    id: 'active-location-layer',
    type: 'circle',
    source: 'active-location',
    paint: {
      'circle-color': '#fff',
      'circle-radius': 5.5, // Slightly larger than normal points (which are 5)
      'circle-stroke-width': 5, // Thick stroke to make red clearly visible
      'circle-stroke-color': '#ff0000',
    },
  })
}

// Handle click on location layer
function handleLayerClick(feature, layerId) {
  // Only handle clicks on locations-layer
  const mapObj = mapInstance.value
  if (layerId !== 'locations-layer' || !feature || !mapObj) return

  const bronId = feature.properties?.bron_id
  // Don't allow interaction if category is disabled
  if (appStore.disabledCategories.has(bronId)) {
    return
  }

  locationsStore.setActiveLocation(feature)
  appStore.expandPanel()

  const coords = feature.geometry.coordinates
  const canvas = mapObj.getCanvas()
  const offsetY = canvas.height * 0.25

  mapObj.flyTo({
    center: coords,
    zoom: 12.5,
    speed: 1.2,
    offset: [0, -offsetY],
  })
}

// Handle mouseenter on location layer
function handleLayerMouseenter(e, layerId) {
  // Only handle hover on locations-layer
  const mapObj = mapInstance.value
  if (layerId !== 'locations-layer' || !mapObj) return
  
  // Ensure popup is initialized
  if (!hoverPopup.value) {
    hoverPopup.value = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'location-hover-popup',
    })
  }

  const feature = e?.features?.[0]
  if (!feature) return

  const hoverBronId = feature.properties?.bron_id
  // Don't show hover if category is disabled
  if (appStore.disabledCategories.has(hoverBronId)) {
    mapObj.getCanvas().style.cursor = 'grab'
    return
  }

  mapObj.getCanvas().style.cursor = 'pointer'
  const coords = feature.geometry.coordinates.slice()
  const locatieId = feature.properties?.locatie_id || 'Unknown'
  const peilfilterIds = feature.properties?.peilfilter_ids || ''

  // Parse peilfilter IDs (comma-separated string)
  const peilfilterList = peilfilterIds
    ? peilfilterIds.split(',').map((id) => id.trim())
    : []

  // Build HTML content
  let htmlContent = `<div>Locatie ID: <strong>${locatieId}</strong></div>`

  if (peilfilterList.length > 0) {
    const label =
      peilfilterList.length === 1 ? 'Peilfilter' : 'Peilfilters'
    const ids = peilfilterList
      .map((id) => `<strong>${id}</strong>`)
      .join(', ')
    htmlContent += `<div>${label}: ${ids}</div>`
  }

  hoverPopup.value.setLngLat(coords).setHTML(htmlContent).addTo(mapObj)
}

// Handle mouseleave on location layer
function handleLayerMouseleave(layerId) {
  if (layerId !== 'locations-layer') return
  
  const mapObj = mapInstance.value
  if (mapObj) {
    mapObj.getCanvas().style.cursor = ''
  }
  if (hoverPopup.value) {
    hoverPopup.value.remove()
  }
}

// Function to update paint properties based on disabled categories
function updatePaintProperties() {
  const mapObj = mapInstance.value
  if (!mapObj) {
    return
  }
  
  if (!mapObj.getLayer('locations-layer')) {
    return
  }

  const disabledCategories = appStore.disabledCategories

  // Update circle opacity based on disabled categories
  const opacityExpression = [
    'case',
    ['==', ['get', 'bron_id'], 1],
    disabledCategories.has(1) ? 0.3 : 1,
    ['==', ['get', 'bron_id'], 2],
    disabledCategories.has(2) ? 0.3 : 1,
    ['==', ['get', 'bron_id'], 3],
    disabledCategories.has(3) ? 0.3 : 1,
    ['==', ['get', 'bron_id'], 4],
    disabledCategories.has(4) ? 0.3 : 1,
    1,
  ]

  // Update stroke color to gray with transparency when disabled
  const strokeColorExpression = [
    'case',
    ['==', ['get', 'bron_id'], 1],
    disabledCategories.has(1) ? 'rgba(153, 153, 153, 0.3)' : '#008fc5',
    ['==', ['get', 'bron_id'], 2],
    disabledCategories.has(2) ? 'rgba(153, 153, 153, 0.3)' : '#28a745',
    ['==', ['get', 'bron_id'], 3],
    disabledCategories.has(3) ? 'rgba(153, 153, 153, 0.3)' : '#ffc107',
    ['==', ['get', 'bron_id'], 4],
    disabledCategories.has(4) ? 'rgba(153, 153, 153, 0.3)' : '#895129',
    '#6c757d',
  ]

  mapObj.setPaintProperty(
    'locations-layer',
    'circle-opacity',
    opacityExpression
  )

  mapObj.setPaintProperty(
    'locations-layer',
    'circle-stroke-color',
    strokeColorExpression
  )
}

// Watch for locations changes and refresh layers
watch(
  () => locationsStore.locations,
  () => {
    mapStore.refreshLayers()
  }
)

// Watch for disabled categories changes and update paint properties
const watchDisabledCategories = computed(() => {
  return Array.from(appStore.disabledCategories).sort().join(',')
})

watch(
  watchDisabledCategories,
  () => {
    setTimeout(() => {
      updatePaintProperties()
    }, 50)
  }
)

watch(
  () => appStore.disabledCategories.size,
  () => {
    setTimeout(() => {
      updatePaintProperties()
    }, 50)
  }
)

// Setup direct map event listeners for locations-layer
let locationsLayerListenersAttached = false

// Store handler references for cleanup
const locationsLayerHandlers = {
  click: null,
  mouseenter: null,
  mouseleave: null,
}

function setupLocationsLayerListeners() {
  const mapObj = mapInstance.value
  if (!mapObj || !mapObj.getLayer('locations-layer') || locationsLayerListenersAttached) {
    return false
  }

  // Remove any existing listeners first
  if (locationsLayerHandlers.click) {
    mapObj.off('click', 'locations-layer', locationsLayerHandlers.click)
  }
  if (locationsLayerHandlers.mouseenter) {
    mapObj.off('mouseenter', 'locations-layer', locationsLayerHandlers.mouseenter)
  }
  if (locationsLayerHandlers.mouseleave) {
    mapObj.off('mouseleave', 'locations-layer', locationsLayerHandlers.mouseleave)
  }

  // Click handler
  locationsLayerHandlers.click = (e) => {
    const feature = e.features?.[0]
    if (feature) {
      handleLayerClick(feature, 'locations-layer')
    }
  }

  // Mouseenter handler
  locationsLayerHandlers.mouseenter = (e) => {
    handleLayerMouseenter(e, 'locations-layer')
  }

  // Mouseleave handler
  locationsLayerHandlers.mouseleave = () => {
    handleLayerMouseleave('locations-layer')
  }

  // Attach listeners
  mapObj.on('click', 'locations-layer', locationsLayerHandlers.click)
  mapObj.on('mouseenter', 'locations-layer', locationsLayerHandlers.mouseenter)
  mapObj.on('mouseleave', 'locations-layer', locationsLayerHandlers.mouseleave)

  locationsLayerListenersAttached = true
  return true
}

// Watch for layer to be created and apply initial disabled categories state + setup listeners
watch(
  () => mapboxLayers.value.find(l => l.id === 'locations-layer'),
  (locationsLayer) => {
    locationsLayerListenersAttached = false

    if (locationsLayer && mapInstance.value) {
      const checkAndSetup = () => {
        if (mapInstance.value?.getLayer('locations-layer')) {
          updatePaintProperties()
          setupLocationsLayerListeners()

          const mapObj = mapInstance.value
          if (mapObj.getLayer('active-location-layer') && mapObj.getLayer('locations-layer')) {
            try {
              mapObj.moveLayer('active-location-layer')
            } catch (e) {
              // Layer movement failed, but not critical
            }
          }
        } else {
          setTimeout(checkAndSetup, 100)
        }
      }
      setTimeout(checkAndSetup, 200)
    }
  }
)

// Watch for active location changes (handles active-location layer)
watch(
  () => locationsStore.activeLocation,
  (activeLocation) => {
    const mapObj = mapInstance.value
    if (!mapObj || !mapObj.getSource('active-location')) return

    if (activeLocation) {
      const plainFeature = JSON.parse(JSON.stringify(activeLocation))
      mapObj.getSource('active-location').setData({
        type: 'FeatureCollection',
        features: [plainFeature],
      })
    } else {
      mapObj.getSource('active-location').setData({
        type: 'FeatureCollection',
        features: [],
      })
    }
  },
  { immediate: true }
)

// Cleanup
onBeforeUnmount(() => {
  if (hoverPopup.value) {
    hoverPopup.value.remove()
  }
  
  // Remove direct map listeners
  const mapObj = mapInstance.value
  if (mapObj && locationsLayerListenersAttached && mapObj.getLayer('locations-layer')) {
    if (locationsLayerHandlers.click) {
      mapObj.off('click', 'locations-layer', locationsLayerHandlers.click)
    }
    if (locationsLayerHandlers.mouseenter) {
      mapObj.off('mouseenter', 'locations-layer', locationsLayerHandlers.mouseenter)
    }
    if (locationsLayerHandlers.mouseleave) {
      mapObj.off('mouseleave', 'locations-layer', locationsLayerHandlers.mouseleave)
    }
    locationsLayerListenersAttached = false
  }
})
</script>

<template>
  <div class="map-wrapper">
    <mapbox-map
      v-model:map="mapInstance"
      :access-token="accessToken"
      :center="[5.1, 52.07]"
      map-style="mapbox://styles/mapbox/light-v11"
      :zoom="10.5"
      @mb-created="onMapCreated"
    >
      <MapLayer
        v-for="layer in mapboxLayers"
        :key="layer.id"
        :layer="layer"
        @click="(feature) => handleLayerClick(feature, layer.id)"
        @mouseenter="(e) => handleLayerMouseenter(e, layer.id)"
        @mouseleave="() => handleLayerMouseleave(layer.id)"
      />
      <!-- LayerPaintControl :id=layer.id, :newPaint -->
    </mapbox-map>
  </div>
</template>
<!-- Every time you need to change the color, you are calling an action from the store that is setting the current paint of the layer. and it is  setting the new Paint in the store-->
<style>
.map-wrapper,
.map-wrapper .mapboxgl-map {
  width: 100%;
  height: 100%;
}

.location-hover-popup .mapboxgl-popup-content {
  padding: 8px 12px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.location-hover-popup .mapboxgl-popup-content div {
  line-height: 1.5;
}

.location-hover-popup .mapboxgl-popup-tip {
  border-top-color: white;
}
</style>
