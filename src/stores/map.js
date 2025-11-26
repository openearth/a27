// stores/map.js
import { defineStore } from 'pinia'
import buildMapboxLayer from '@/lib/build-mapbox-layer'
import { useLocationsStore } from '@/stores/locations'

export const useMapStore = defineStore('map', {
  state: () => ({
    staticLayerConfigs: [], // For WMS/WMTS layers from config files
    mapboxLayers: [],
  }),
  
  actions: {
    initializeMapboxLayers () {
      const locationsStore = useLocationsStore()
      
      // Collect all layer configs
      const allLayerConfigs = []
      
      // 1. Add locations layer from locations store
      const locationsLayerConfig = locationsStore.locationsLayerConfig
      if (locationsLayerConfig) {
        allLayerConfigs.push(locationsLayerConfig)
      }
      
      // 2. Add static layers (WMS/WMTS from config files if needed in future)
      allLayerConfigs.push(...this.staticLayerConfigs)
      
      // Transform all configs to Mapbox format
      this.mapboxLayers = allLayerConfigs
        .map(layerConfig => buildMapboxLayer(layerConfig))
        .filter(layer => layer != null)
    },
    
    // Method to update layers when locations change
    refreshLayers () {
      this.initializeMapboxLayers()
    },
  },
})

