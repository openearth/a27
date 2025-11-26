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
      console.log('[MapStore] initializeMapboxLayers called')
      const locationsStore = useLocationsStore()
      
      // Collect all layer configs
      const allLayerConfigs = []
      
      // 1. Add locations layer from locations store
      const locationsLayerConfig = locationsStore.locationsLayerConfig
      console.log('[MapStore] locationsLayerConfig:', !!locationsLayerConfig)
      if (locationsLayerConfig) {
        allLayerConfigs.push(locationsLayerConfig)
        console.log('[MapStore] Added locationsLayerConfig to allLayerConfigs')
      }
      
      // 2. Add static layers (WMS/WMTS from config files if needed in future)
      allLayerConfigs.push(...this.staticLayerConfigs)
      console.log('[MapStore] Total layer configs before transform:', allLayerConfigs.length)
      
      // Transform all configs to Mapbox format
      this.mapboxLayers = allLayerConfigs
        .map(layerConfig => buildMapboxLayer(layerConfig))
        .filter(layer => layer != null)
      
      console.log('[MapStore] mapboxLayers after transform:', this.mapboxLayers.map(l => l.id))
    },
    
    // Method to update layers when locations change
    refreshLayers () {
      console.log('[MapStore] refreshLayers called')
      this.initializeMapboxLayers()
    },
  },
})

