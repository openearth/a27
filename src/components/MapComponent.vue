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
        position="top-right" 
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
  mapInstance.value = map

  // Create popup instance for hover
  hoverPopup.value = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'location-hover-popup',
  })

  // Listen for style changes (when basemap is changed)
  map.on('style.load', () => {
    // Increment counter to force MapLayer components to re-render with new keys
    styleChangeCounter.value++
    
    // Wait for style to be fully loaded before re-initializing layers
    // MapboxLayer components need the style to be ready before they can add layers
    const waitForStyleReady = () => {
      if (map.isStyleLoaded()) {
        // Clear existing layers from store to force re-render
        mapStore.mapboxLayers = []
        // Small delay to ensure MapboxLayer components have time to clean up
        setTimeout(() => {
          setupActiveLocationLayer()
          initializeMap()
        }, 50)
      } else {
        setTimeout(waitForStyleReady, 50)
      }
    }
    waitForStyleReady()
  })

  // Wait for initial style to load before adding sources/layers
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
  const locatienaamMaster = feature.properties?.locatienaam_master
  const locatieId = feature.properties?.locatie_id
  const peilfilterNaams = feature.properties?.peilfilternaams || ''

  // Parse peilfilter Naams (comma-separated string)
  const peilfilterList = peilfilterNaams
    ? peilfilterNaams.split(',').map((id) => id.trim())
    : []

  // Build HTML content for Locatie ID
  let locatieIdHtml = 'Locatie ID: '
  if (locatienaamMaster) {
    locatieIdHtml += `<strong>${locatienaamMaster}</strong>`
    if (locatieId) {
      locatieIdHtml += ` (${locatieId})`
    }
  } else if (locatieId) {
    locatieIdHtml += `<strong>${locatieId}</strong>`
  } else {
    locatieIdHtml += '<strong>Unknown</strong>'
  }
  let htmlContent = `<div>${locatieIdHtml}</div>`

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
  const mapObj = mapInstance.value
  if (!mapObj || !mapObj.getLayer('locations-layer')) {
    return
  }

  const layer = mapObj.getLayer('locations-layer')
  const sourceId = layer.source || 'locations-layer'
  const source = mapObj.getSource(sourceId)
  
  if (!source || source.type !== 'geojson') {
    return
  }

  const featureCollection = locationsStore.locationsFeatureCollection
  source.setData(featureCollection)
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
    // Only reset if layer state actually changed (not found → found)
    const wasFound = !!oldLocationsLayer
    const isFound = !!locationsLayer
    
    if (!wasFound && isFound) {
      // Layer just appeared, reset flags
      locationsLayerListenersAttached = false
      retryCount = 0
    } else if (wasFound && isFound) {
      // Layer already existed, don't reset - might be a duplicate trigger
      if (locationsLayerListenersAttached) {
        return
      }
    }

    if (locationsLayer && mapInstance.value && !setupInProgress) {
      setupInProgress = true // Prevent concurrent setups
      const checkAndSetup = () => {
        const mapObj = mapInstance.value
        const layerExists = mapObj?.getLayer('locations-layer')
        const styleLoaded = mapObj?.isStyleLoaded()
        
        if (layerExists && styleLoaded) {
          retryCount = 0 // Reset on success
          setupLocationsLayerListeners()
          updateLocationsSourceData()

          if (mapObj.getLayer('active-location-layer') && mapObj.getLayer('locations-layer')) {
            try {
              mapObj.moveLayer('active-location-layer')
            } catch (e) {
              // Layer movement failed, but not critical
            }
          }
          setupInProgress = false // Clear flag on success
        } else {
          retryCount++
          if (retryCount >= MAX_RETRIES) {
            retryCount = 0
            setupInProgress = false
            return
          }
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
  top: 80px;  
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
