// stores/locations.js
import { defineStore } from 'pinia'
import getLocationsData from '@/lib/get-locations-data'

export const useLocationsStore = defineStore('locations', {
  state: () => ({
    locations: [],
    activeLocation: null,
  }),
  
  getters: {
    // Enhanced layer config with paint, id, and everything needed for buildGeojsonLayer
    locationsLayerConfig () {
      if (!this.locations || !this.locations.features || this.locations.features.length === 0) {
        return null
      }
      
      return {
        id: 'locations-layer',
        type: 'circle', // Mapbox layer type
        source: {
          type: 'geojson',
          data: this.locations, // Already a FeatureCollection
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
        // Optional: layout properties
        layout: {},
        // Store interaction handlers info here if needed
        interactions: {
          clickable: true,
          hoverable: true,
        },
      }
    },
  },
  
  actions: {
    async fetchLocations () {
      try {
        // API returns FeatureCollection directly
        const featureCollection = await getLocationsData()
        // Store the whole FeatureCollection
        this.locations = featureCollection
      } catch (error) {
        console.error('Failed to fetch locations:', error)
      }
    },
    
    setActiveLocation (feature) {
      this.activeLocation = feature
    },
  },
})
