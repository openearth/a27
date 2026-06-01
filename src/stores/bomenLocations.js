import { defineStore } from 'pinia'
import getBomenLocationsData from '@/lib/get-bomen-locations-data'
import { useAppStore } from '@/stores/app'

export const useBomenLocationsStore = defineStore('bomenLocations', {
  state: () => ({
    bomenLocations: [],
    activeTree: null,
  }),

  getters: {
    activeTreeId () {
      return this.activeTree?.properties?.boom_id ?? null
    },

    bomenLocationsFeatureCollection () {
      if (!this.bomenLocations?.length) {
        return { type: 'FeatureCollection', features: [] }
      }

      return {
        type: 'FeatureCollection',
        features: this.bomenLocations,
      }
    },

    bomenLocationsLayerConfig () {
      const appStore = useAppStore()
      const featureCollection = this.bomenLocationsFeatureCollection
      const activeTreeId = this.activeTreeId ?? -1
      if (!featureCollection.features?.length) return null

      return {
        id: 'bomen-locations-layer',
        type: 'symbol',
        source: {
          type: 'geojson',
          data: featureCollection,
        },
        layout: {
          'icon-image': 'tree-sdf-icon',
          'icon-size': 1.15,
          'icon-allow-overlap': true,
          'icon-padding': 0,
        },
        paint: {
          'icon-color': appStore.disabledTrees ? '#9e9e9e' : '#00a651',
          'icon-halo-color': '#ffffff',
          'icon-halo-width': 0.8,
          'icon-opacity': [
            'case',
            [ '==', [ 'get', 'boom_id' ], activeTreeId ],
            0,
            appStore.disabledTrees,
            0.5,
            1,
          ],
        },
      }
    },

    computedPaint () {
      const appStore = useAppStore()
      const activeTreeId = this.activeTreeId ?? -1

      return {
        'icon-color': appStore.disabledTrees ? '#9e9e9e' : '#00a651',
        'icon-color-transition': { duration: 0, delay: 0 },
        'icon-halo-color': '#ffffff',
        'icon-halo-width': 0.8,
        'icon-opacity': [
          'case',
          [ '==', [ 'get', 'boom_id' ], activeTreeId ],
          0,
          appStore.disabledTrees,
          0.5,
          1,
        ],
        'icon-opacity-transition': { duration: 0, delay: 0 },
      }
    },
  },

  actions: {
    async fetchBomenLocations () {
      try {
        const data = await getBomenLocationsData()

        if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) {
          this.bomenLocations = data.features
        } else if (Array.isArray(data)) {
          this.bomenLocations = data
        } else if (Array.isArray(data?.features)) {
          this.bomenLocations = data.features
        } else {
          console.warn('Unexpected tree locations data format:', data)
          this.bomenLocations = []
        }
      } catch (error) {
        console.error('Failed to fetch tree locations:', error)
        this.bomenLocations = []
      }
    },
    setActiveTree (feature) {
      this.activeTree = feature ?? null
    },
  },
})
