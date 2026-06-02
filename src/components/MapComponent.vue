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
      <LayerPaintControl
        v-if="locationsStore.locationsLayerConfig"
        id="locations-layer"
        :paint="locationsStore.computedPaint"
      />
      <LayerPaintControl
        v-if="bomenLocationsStore.bomenLocationsLayerConfig"
        id="bomen-locations-layer"
        :paint="bomenLocationsStore.computedPaint"
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
  import { useBomenLocationsStore } from '@/stores/bomenLocations'
  import { useLocationsStore } from '@/stores/locations'
  import { useMapStore } from '@/stores/map'
  import { useAppStore } from '@/stores/app'
  import {
    MAP_BASELAYERS,
    MAP_BASELAYER_DEFAULT,
    TREE_COLOR,
    TREE_SELECTION_COLOR,
  } from '@/lib/constants'
  import { registerTreeSdfIcon, TREE_ICON_ID } from '@/lib/tree-sdf-icon'

  const accessToken = import.meta.env.VITE_MAPBOX_TOKEN
  const locationsStore = useLocationsStore()
  const bomenLocationsStore = useBomenLocationsStore()
  const mapStore = useMapStore()
  const appStore = useAppStore()
  const mapInstance = ref(null)
  const hoverPopup = ref(null)
  const mapboxLayers = computed(() => mapStore.mapboxLayers)
  const defaultMapStyle = computed(() => MAP_BASELAYER_DEFAULT.uri)
  const styleChangeCounter = ref(0)

  const TREE_ICON_SIZE = 1.15
  const TREE_SELECTION_OUTLINE_SIZE = 1.55

  const map = computed(() => mapInstance.value)
  provide('map', map)

  function ensureHoverPopup (mapObj) {
    if (!hoverPopup.value) {
      hoverPopup.value = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'location-hover-popup',
      })
    }
    return hoverPopup.value
  }

  function flyToFeature (mapObj, feature) {
    const coords = feature.geometry.coordinates
    const offsetY = mapObj.getCanvas().height * 0.25
    mapObj.flyTo({
      center: coords,
      zoom: 12.5,
      speed: 1.2,
      offset: [0, -offsetY],
    })
  }

  function cloneFeature (feature) {
    return JSON.parse(JSON.stringify(feature))
  }

  function setupMapAfterStyleLoad (map) {
    registerTreeSdfIcon(map)
    setupActiveLocationLayer()
    setupActiveTreeLayers()
    initializeMap()
  }

  function onMapCreated (map) {
    mapInstance.value = map
    registerTreeSdfIcon(map)
    ensureHoverPopup(map)

    map.on('style.load', () => {
      registerTreeSdfIcon(map)
      styleChangeCounter.value++

      const waitForStyleReady = () => {
        if (map.isStyleLoaded()) {
          mapStore.mapboxLayers = []
          setTimeout(() => setupMapAfterStyleLoad(map), 50)
        } else {
          setTimeout(waitForStyleReady, 50)
        }
      }
      waitForStyleReady()
    })

    if (map.isStyleLoaded()) {
      setupMapAfterStyleLoad(map)
    } else {
      map.once('style.load', () => setupMapAfterStyleLoad(map))
    }
  }

  function initializeMap() {
    mapStore.initializeMapboxLayers()
    Promise.all([
      locationsStore.fetchLocations(),
      bomenLocationsStore.fetchBomenLocations(),
    ]).then(() => {
      mapStore.refreshLayers()
    })
  }

  function setupActiveTreeLayers() {
    const mapObj = mapInstance.value
    if (!mapObj || mapObj.getSource('active-tree')) return

    mapObj.addSource('active-tree', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })

    mapObj.addLayer({
      id: 'active-tree-outline-layer',
      type: 'symbol',
      source: 'active-tree',
      layout: {
        'icon-image': TREE_ICON_ID,
        'icon-size': TREE_SELECTION_OUTLINE_SIZE,
        'icon-allow-overlap': true,
        'icon-padding': 0,
      },
      paint: {
        'icon-color': TREE_SELECTION_COLOR,
        'icon-opacity': 1,
      },
    })

    mapObj.addLayer({
      id: 'active-tree-layer',
      type: 'symbol',
      source: 'active-tree',
      layout: {
        'icon-image': TREE_ICON_ID,
        'icon-size': TREE_ICON_SIZE,
        'icon-allow-overlap': true,
        'icon-padding': 0,
      },
      paint: {
        'icon-color': TREE_COLOR,
        'icon-halo-color': '#ffffff',
        'icon-halo-width': 0.8,
        'icon-opacity': 1,
      },
    })
  }

  function updateActiveTreeSourceData () {
    const mapObj = mapInstance.value
    if (!mapObj?.getSource('active-tree')) return

    const activeTree = bomenLocationsStore.activeTree
    mapObj.getSource('active-tree').setData({
      type: 'FeatureCollection',
      features: activeTree ? [cloneFeature(activeTree)] : [],
    })
  }

  function moveSelectionLayersToTop() {
    const mapObj = mapInstance.value
    if (!mapObj) return

    try {
      if (mapObj.getLayer('active-tree-outline-layer')) {
        mapObj.moveLayer('active-tree-outline-layer')
      }
      if (mapObj.getLayer('active-tree-layer')) {
        mapObj.moveLayer('active-tree-layer')
      }
      if (mapObj.getLayer('active-location-layer')) {
        mapObj.moveLayer('active-location-layer')
      }
    } catch (e) {
      console.log('Layer movement failed', e)
    }
  }

  function setupActiveLocationLayer () {
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
        'circle-radius': 5.5,
        'circle-stroke-width': 5,
        'circle-stroke-color': TREE_SELECTION_COLOR,
      },
    })
  }

  function handleLayerClick (feature, layerId) {
    const mapObj = mapInstance.value
    if (!feature || !mapObj) return

    if (layerId === 'bomen-locations-layer') {
      if (appStore.disabledTrees) return
      bomenLocationsStore.setActiveTree(feature)
      locationsStore.setActiveLocation(null)
      appStore.expandPanel()
      flyToFeature(mapObj, feature)
      return
    }
    if (layerId !== 'locations-layer') return

    const bronId = feature.properties?.bron_id
    if (appStore.disabledCategories.has(bronId)) {
      return
    }

    bomenLocationsStore.setActiveTree(null)
    locationsStore.setActiveLocation(feature)
    appStore.expandPanel()
    flyToFeature(mapObj, feature)
  }

  function handleLayerMouseenter (e, layerId) {
    const mapObj = mapInstance.value
    if (!mapObj) return

    const feature = e?.features?.[0]
    if (!feature) return

    const popup = ensureHoverPopup(mapObj)

    if (layerId === 'bomen-locations-layer') {
      mapObj.getCanvas().style.cursor = appStore.disabledTrees ? 'grab' : 'pointer'
      if (appStore.disabledTrees) return

      const boomnaam = feature.properties?.boomnaam || 'Onbekend'
      popup
        .setLngLat(feature.geometry.coordinates.slice())
        .setHTML(`<div>Boom: <strong>${boomnaam}</strong></div>`)
        .addTo(mapObj)
      return
    }
    if (layerId !== 'locations-layer') return

    const hoverBronId = feature.properties?.bron_id
    if (appStore.disabledCategories.has(hoverBronId)) {
      mapObj.getCanvas().style.cursor = 'grab'
      return
    }

    mapObj.getCanvas().style.cursor = 'pointer'
    const coords = feature.geometry.coordinates.slice()
    const locatienaamMaster = feature.properties?.locatienaam_master
    const locatieId = feature.properties?.locatie_id
    const peilfilterIds = feature.properties?.peilfilter_ids || ''
    const peilfilterNaams = feature.properties?.peilfilternaams || ''
    const idList = peilfilterIds ? peilfilterIds.split(',').map((id) => id.trim()) : []
    const naamList = peilfilterNaams ? peilfilterNaams.split(',').map((naam) => naam.trim()) : []
    const peilfilterList = idList
      .map((id, index) => ({
        id,
        naam: naamList[index] || '',
      }))
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map((item) => item.naam || item.id)

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

    popup.setLngLat(coords).setHTML(htmlContent).addTo(mapObj)
  }

  function handleLayerMouseleave (layerId) {
    if (layerId !== 'locations-layer' && layerId !== 'bomen-locations-layer') return
  
    const mapObj = mapInstance.value
    if (mapObj) {
      mapObj.getCanvas().style.cursor = ''
    }
    if (hoverPopup.value) {
      hoverPopup.value.remove()
    }
  }

  function updateLocationsSourceData () {
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


  watch(
    () => locationsStore.locations,
    () => {
      mapStore.refreshLayers()
    }
  )

  watch(
    () => appStore.viewMode,
    () => {
      setTimeout(() => {
        updateLocationsSourceData()
      }, 100)
    }
  )

  let locationsLayerListenersAttached = false

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

    if (locationsLayerHandlers.click) {
      mapObj.off('click', 'locations-layer', locationsLayerHandlers.click)
    }
    if (locationsLayerHandlers.mouseenter) {
      mapObj.off('mouseenter', 'locations-layer', locationsLayerHandlers.mouseenter)
    }
    if (locationsLayerHandlers.mouseleave) {
      mapObj.off('mouseleave', 'locations-layer', locationsLayerHandlers.mouseleave)
    }

    locationsLayerHandlers.click = (e) => {
      const feature = e.features?.[0]
      if (feature) {
        handleLayerClick(feature, 'locations-layer')
      }
    }

    locationsLayerHandlers.mouseenter = (e) => {
      handleLayerMouseenter(e, 'locations-layer')
    }

    locationsLayerHandlers.mouseleave = () => {
      handleLayerMouseleave('locations-layer')
    }

    mapObj.on('click', 'locations-layer', locationsLayerHandlers.click)
    mapObj.on('mouseenter', 'locations-layer', locationsLayerHandlers.mouseenter)
    mapObj.on('mouseleave', 'locations-layer', locationsLayerHandlers.mouseleave)

    locationsLayerListenersAttached = true
    return true
  }

  let retryCount = 0
  const MAX_RETRIES = 50
  let setupInProgress = false

  watch(
    () => mapboxLayers.value.find(l => l.id === 'locations-layer'),
    (locationsLayer, oldLocationsLayer) => {
      const wasFound = !!oldLocationsLayer
      const isFound = !!locationsLayer

      if (!wasFound && isFound) {
        locationsLayerListenersAttached = false
        retryCount = 0
      } else if (wasFound && isFound && locationsLayerListenersAttached) {
        return
      }

      if (locationsLayer && mapInstance.value && !setupInProgress) {
        setupInProgress = true
        const checkAndSetup = () => {
          const mapObj = mapInstance.value
          const layerExists = mapObj?.getLayer('locations-layer')
          const styleLoaded = mapObj?.isStyleLoaded()
        
          if (layerExists && styleLoaded) {
            retryCount = 0
            setupLocationsLayerListeners()
            updateLocationsSourceData()
            moveSelectionLayersToTop()
            setupInProgress = false
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

  watch(
    () => bomenLocationsStore.activeTree,
    () => {
      updateActiveTreeSourceData()
      moveSelectionLayersToTop()
    },
    { immediate: true }
  )

  watch(
    () => locationsStore.activeLocation,
    (activeLocation) => {
      const mapObj = mapInstance.value
      if (!mapObj?.getSource('active-location')) return

      mapObj.getSource('active-location').setData({
        type: 'FeatureCollection',
        features: activeLocation ? [cloneFeature(activeLocation)] : [],
      })
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (hoverPopup.value) {
      hoverPopup.value.remove()
    }
  
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
