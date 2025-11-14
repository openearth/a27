// stores/locations.js
import { defineStore } from 'pinia'
import getLocationsData from '@/lib/get-locations-data'
import { useAppStore } from '@/stores/app'

export const useLocationsStore = defineStore('locations', {
  state: () => ({
    locations: [],
    activeLocation: null,
  }),
  
  getters: {
    // Filter locations based on view mode
    filteredLocations () {
      const appStore = useAppStore()
      
      if (appStore.viewMode === 'focus') {
        // Only return locations where focus is true
        return this.locations.filter(location => location.properties?.focus === true)
      }
      
      // Return all locations
      return this.locations
    },
    
    // Convert filtered locations array to FeatureCollection for layer config
    locationsFeatureCollection () {
      const filtered = this.filteredLocations
      
      if (!filtered || filtered.length === 0) {
        return { type: 'FeatureCollection', features: [] }
      }
      
      return {
        type: 'FeatureCollection',
        features: filtered,
      }
    },
    
    // Enhanced layer config with paint, id, and everything needed for buildGeojsonLayer
    locationsLayerConfig () {
      const featureCollection = this.locationsFeatureCollection
      
      if (!featureCollection.features || featureCollection.features.length === 0) {
        return null
      }
      
      return {
        id: 'locations-layer',
        type: 'circle', // Mapbox layer type
        source: {
          type: 'geojson',
          data: featureCollection,
        },
        paint: {
          'circle-color': '#fff',
          'circle-radius': 5,
          'circle-stroke-width': 5,
          'circle-stroke-color': [
            'case',
            [ '==', [ 'get', 'bron_id' ], 1 ],
            '#008fc5',
            [ '==', [ 'get', 'bron_id' ], 2 ],
            '#28a745',
            [ '==', [ 'get', 'bron_id' ], 3 ],
            '#ffc107',
            [ '==', [ 'get', 'bron_id' ], 4 ],
            '#895129',
            '#6c757d',
          ],
          'circle-opacity': [
            'case',
            [ '==', [ 'get', 'bron_id' ], 1 ],
            1,
            [ '==', [ 'get', 'bron_id' ], 2 ],
            1,
            [ '==', [ 'get', 'bron_id' ], 3 ],
            1,
            [ '==', [ 'get', 'bron_id' ], 4 ],
            1,
            1,
          ],
        },
        layout: {},
      }
    },
  },
  
  actions: {
    async fetchLocations () {
      try {
        const data = await getLocationsData()
        
        // Handle both FeatureCollection and array of features
        if (data.type === 'FeatureCollection' && data.features) {
          // If FeatureCollection, extract features array for easier access
          this.locations = data.features
        } else if (Array.isArray(data)) {
          // If already an array
          this.locations = data
        } else if (data.features && Array.isArray(data.features)) {
          // If object with features property
          this.locations = data.features
        } else {
          console.warn('Unexpected locations data format:', data)
          this.locations = []
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error)
        this.locations = []
      }
    },
    
    setActiveLocation (feature) {
      this.activeLocation = feature
    },
  },
})
