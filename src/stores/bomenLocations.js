import { defineStore } from 'pinia'
import getBomenLocationsData from '@/lib/get-bomen-locations-data'
import { normalizeFeatureCollection } from '@/lib/normalize-feature-collection'
import { TREE_COLOR, TREE_DISABLED_COLOR } from '@/lib/constants'
import { TREE_ICON_ID } from '@/lib/tree-sdf-icon'
import { useAppStore } from '@/stores/app'
import { useBoomDataStore } from '@/stores/boomData'

function buildTreeIconPaint (activeTreeId, disabledTrees) {
  return {
    'icon-color': disabledTrees ? TREE_DISABLED_COLOR : TREE_COLOR,
    'icon-halo-color': '#ffffff',
    'icon-halo-width': 0.8,
    'icon-opacity': [
      'case',
      [ '==', [ 'get', 'boom_id' ], activeTreeId ],
      0,
      disabledTrees,
      0.5,
      1,
    ],
  }
}

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
          'icon-image': TREE_ICON_ID,
          'icon-size': 1.15,
          'icon-allow-overlap': true,
          'icon-padding': 0,
        },
        paint: buildTreeIconPaint(activeTreeId, appStore.disabledTrees),
      }
    },

    computedPaint () {
      const appStore = useAppStore()
      const activeTreeId = this.activeTreeId ?? -1

      return {
        ...buildTreeIconPaint(activeTreeId, appStore.disabledTrees),
        'icon-color-transition': { duration: 0, delay: 0 },
        'icon-opacity-transition': { duration: 0, delay: 0 },
      }
    },
  },

  actions: {
    async fetchBomenLocations () {
      try {
        const data = await getBomenLocationsData()
        const features = normalizeFeatureCollection(data)

        if (features) {
          this.bomenLocations = features
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

      const boomDataStore = useBoomDataStore()
      const boomcode = this.activeTree?.properties?.boomcode

      if (boomcode) {
        boomDataStore.fetchBoomData(boomcode)
      } else {
        boomDataStore.clearData()
      }
    },
  },
})
