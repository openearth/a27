<template>
  <div class="map-wrapper">
    <mapbox-map
      v-model:map="mapInstance"
      :access-token="accessToken"
      :center="[5.1, 52.07]"
      :map-style="defaultMapStyle"
      :zoom="10.5"
      @mb-created="onMapCreated"
    >
      <MapLayer
        v-for="layer in mapboxLayers"
        :key="`${layer.id}-${styleChangeCounter}`"
        :layer="layer"
        @click="(feature) => handleLayerClick(feature, layer.id)"
        @mouseenter="(e) => handleLayerMouseenter(e, layer.id)"
        @mouseleave="() => handleLayerMouseleave(layer.id)"
      />
      <!-- LayerPaintControl for locations-layer: reactively applies paint based on disabled categories -->
      <LayerPaintControl
        v-if="locationsStore.locationsLayerConfig"
        :id="'locations-layer'"
        :paint="locationsStore.computedPaint"
      />
      
      <MapboxNavigationControl 
        :show-compass="false" 
        position="bottom-right" 
      />
      
      <div class="map-controls">
        <BasemapControl 
          v-if="mapInstance" 
          :map="mapInstance" 
          :styles="MAP_BASELAYERS"
        />
      </div>
    </mapbox-map>
  </div>
</template>

<script setup>
import { MapboxMap, MapboxNavigationControl } from '@studiometa/vue-mapbox-gl'
import { computed, onBeforeUnmount, provide, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import MapLayer from '@/components/MapLayer.vue'
import LayerPaintControl from '@/components/LayerPaintControl.vue'
import BasemapControl from '@/components/BasemapControl.vue'
import { useLocationsStore } from '@/stores/locations'
import { useMapStore } from '@/stores/map'
import { useAppStore } from '@/stores/app'
import { MAP_BASELAYERS, MAP_BASELAYER_DEFAULT } from '@/lib/constants'

const accessToken = import.meta.env.VITE_MAPBOX_TOKEN
const locationsStore = useLocationsStore()
const mapStore = useMapStore()
const appStore = useAppStore()
const mapInstance = ref(null)
const hoverPopup = ref(null)
const mapboxLayers = computed(() => mapStore.mapboxLayers)
const defaultMapStyle = computed(() => MAP_BASELAYER_DEFAULT.uri)
const styleChangeCounter = ref(0) // Counter to force MapLayer re-render after style changes

// Provide map instance for child components
const map = computed(() => mapInstance.value)
provide('map', map)

function onMapCreated(map) {
    console.log('[MapComponent] onMapCreated called')
    mapInstance.value = map

  // Create popup instance for hover
  hoverPopup.value = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'location-hover-popup',
  })

  // Listen for style changes (when basemap is changed)
  map.on('style.load', () => {
    console.log('[MapComponent] style.load event fired')
    console.log('[MapComponent] Current layers on map:', map.getStyle().layers?.map(l => l.id) || [])
    console.log('[MapComponent] Current sources on map:', Object.keys(map.getStyle().sources || {}))
    
    // Increment counter to force MapLayer components to re-render with new keys
    styleChangeCounter.value++
    console.log('[MapComponent] Style change counter incremented to:', styleChangeCounter.value)
    
    // Wait for style to be fully loaded before re-initializing layers
    // MapboxLayer components need the style to be ready before they can add layers
    const waitForStyleReady = () => {
      if (map.isStyleLoaded()) {
        console.log('[MapComponent] Style is ready, re-initializing layers')
        // Clear existing layers from store to force re-render
        mapStore.mapboxLayers = []
        // Small delay to ensure MapboxLayer components have time to clean up
        setTimeout(() => {
          setupActiveLocationLayer()
          initializeMap()
        }, 50)
      } else {
        console.log('[MapComponent] Style not ready yet, waiting...')
        setTimeout(waitForStyleReady, 50)
      }
    }
    waitForStyleReady()
  })

  // Wait for initial style to load before adding sources/layers
  if (map.isStyleLoaded()) {
    console.log('[MapComponent] Style already loaded, initializing immediately')
    setupActiveLocationLayer()
    initializeMap()
  } else {
    console.log('[MapComponent] Style not loaded yet, waiting for style.load event')
    map.once('style.load', () => {
      console.log('[MapComponent] Initial style.load event fired')
      setupActiveLocationLayer()
      initializeMap()
    })
  }
}

function initializeMap() {
  console.log('[MapComponent] initializeMap called')
  const mapObj = mapInstance.value
  console.log('[MapComponent] Map instance available:', !!mapObj)
  console.log('[MapComponent] Map style loaded:', mapObj?.isStyleLoaded())
  
  mapStore.initializeMapboxLayers()
  console.log('[MapComponent] mapboxLayers after initializeMapboxLayers:', mapStore.mapboxLayers.map(l => l.id))
  
  locationsStore.fetchLocations().then(() => {
    console.log('[MapComponent] Locations fetched, refreshing layers')
    console.log('[MapComponent] Locations count:', locationsStore.locations.length)
    mapStore.refreshLayers()
    console.log('[MapComponent] Layers refreshed, mapboxLayers:', mapStore.mapboxLayers.map(l => l.id))
  })
}

// Setup active-location layer for highlighting selected location
function setupActiveLocationLayer() {
  const mapObj = mapInstance.value
  console.log('[MapComponent] setupActiveLocationLayer called')
  console.log('[MapComponent] Map object available:', !!mapObj)
  console.log('[MapComponent] active-location source exists:', !!mapObj?.getSource('active-location'))
  
  if (!mapObj || mapObj.getSource('active-location')) {
    console.log('[MapComponent] Skipping setupActiveLocationLayer - map not available or source already exists')
    return
  }

  console.log('[MapComponent] Adding active-location source and layer')
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
  console.log('[MapComponent] active-location layer added successfully')
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

// Function to update locations layer source data with filtered locations
function updateLocationsSourceData() {
  console.log('[MapComponent] updateLocationsSourceData called')
  const mapObj = mapInstance.value
  console.log('[MapComponent] Map object available:', !!mapObj)
  console.log('[MapComponent] locations-layer exists:', !!mapObj?.getLayer('locations-layer'))
  
  if (!mapObj || !mapObj.getLayer('locations-layer')) {
    console.log('[MapComponent] Cannot update source data - map or layer not available')
    return
  }

  const layer = mapObj.getLayer('locations-layer')
  const sourceId = layer.source || 'locations-layer'
  const source = mapObj.getSource(sourceId)
  
  console.log('[MapComponent] Source ID:', sourceId)
  console.log('[MapComponent] Source exists:', !!source)
  console.log('[MapComponent] Source type:', source?.type)
  
  if (!source || source.type !== 'geojson') {
    console.log('[MapComponent] Cannot update source data - source not available or wrong type')
    return
  }

  const featureCollection = locationsStore.locationsFeatureCollection
  console.log('[MapComponent] Setting source data with', featureCollection.features?.length || 0, 'features')
  source.setData(featureCollection)
  console.log('[MapComponent] Source data updated successfully')
}


// Watch for locations changes and refresh layers
watch(
  () => locationsStore.locations,
  () => {
    mapStore.refreshLayers()
  }
)

// Watch for view mode changes and update layer source data
watch(
  () => appStore.viewMode,
  () => {
    setTimeout(() => {
      updateLocationsSourceData()
    }, 100)
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
let retryCount = 0
const MAX_RETRIES = 50 // Maximum 5 seconds (50 * 100ms)
let setupInProgress = false // Flag to prevent concurrent setups

watch(
  () => mapboxLayers.value.find(l => l.id === 'locations-layer'),
  (locationsLayer, oldLocationsLayer) => {
    console.log('[MapComponent] Watcher triggered for locations-layer')
    console.log('[MapComponent] locationsLayer found:', !!locationsLayer)
    console.log('[MapComponent] mapInstance available:', !!mapInstance.value)
    
    // Only reset if layer state actually changed (not found → found)
    const wasFound = !!oldLocationsLayer
    const isFound = !!locationsLayer
    
    if (!wasFound && isFound) {
      // Layer just appeared, reset flags
      console.log('[MapComponent] Layer state changed: not found → found, resetting flags')
      locationsLayerListenersAttached = false
      retryCount = 0
    } else if (wasFound && isFound) {
      // Layer already existed, don't reset - might be a duplicate trigger
      if (locationsLayerListenersAttached) {
        console.log('[MapComponent] Layer already set up, skipping duplicate setup')
        return
      }
    }

    if (locationsLayer && mapInstance.value && !setupInProgress) {
      setupInProgress = true // Prevent concurrent setups
      const checkAndSetup = () => {
        const mapObj = mapInstance.value
        const layerExists = mapObj?.getLayer('locations-layer')
        const styleLoaded = mapObj?.isStyleLoaded()
        console.log('[MapComponent] checkAndSetup - locations-layer exists:', !!layerExists)
        console.log('[MapComponent] checkAndSetup - map style loaded:', styleLoaded)
        
        if (layerExists && styleLoaded) {
          console.log('[MapComponent] Setting up locations layer listeners and data')
          retryCount = 0 // Reset on success
          setupLocationsLayerListeners()
          updateLocationsSourceData()

          if (mapObj.getLayer('active-location-layer') && mapObj.getLayer('locations-layer')) {
            try {
              mapObj.moveLayer('active-location-layer')
              console.log('[MapComponent] Moved active-location-layer to top')
            } catch (e) {
              console.warn('[MapComponent] Layer movement failed:', e)
            }
          }
          setupInProgress = false // Clear flag on success
        } else {
          retryCount++
          if (retryCount >= MAX_RETRIES) {
            console.error('[MapComponent] Max retries reached, giving up on locations-layer setup')
            retryCount = 0
            setupInProgress = false
            return
          }
          console.log(`[MapComponent] Layer not ready yet (retry ${retryCount}/${MAX_RETRIES}), retrying in 100ms`)
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

<style>
.map-wrapper,
.map-wrapper .mapboxgl-map {
  width: 100%;
  height: 100%;
  position: relative;
}

.map-controls {
  position: absolute;
  bottom: 90px;  
  right: 10px;  
  z-index: 1000;
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
