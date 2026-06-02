import { defineStore } from 'pinia'
import getBoomData from '@/lib/get-boom-data'

export const useBoomDataStore = defineStore('boomData', {
  state: () => ({
    data: null,
    activeBoomcode: null,
    loading: false,
    error: null,
  }),

  getters: {
    selectedTreeEntry (state) {
      const trees = state.data?.trees
      if (!Array.isArray(trees) || trees.length === 0) {
        return null
      }

      const code = state.activeBoomcode
      if (code == null || code === '') {
        return trees[0]
      }

      return (
        trees.find(
          (entry) => entry.tree === code || entry.tree_name === code,
        ) ?? trees[0]
      )
    },

    treeName (state) {
      return this.selectedTreeEntry?.tree_name ?? null
    },

    groupThatBelongs (state) {
      return this.selectedTreeEntry?.group_that_belongs ?? null
    },

    yAxisLabels (state) {
      return state.data?.y_axis?.labels ?? []
    },

    yAxisMin (state) {
      return state.data?.y_axis?.min ?? 0
    },

    yAxisMax (state) {
      return state.data?.y_axis?.max ?? 8
    },

    treeTimeseries (state) {
      return this.selectedTreeEntry?.timeseries ?? []
    },

    groupAverageEntry (state) {
      const group = this.groupThatBelongs
      const averages = state.data?.group_averages
      if (!group || !Array.isArray(averages)) {
        return null
      }

      return averages.find((entry) => entry.group === group) ?? null
    },

    groupAverageTimeseries (state) {
      return this.groupAverageEntry?.timeseries ?? []
    },
  },

  actions: {
    async fetchBoomData (boomcode) {
      if (boomcode == null || boomcode === '') {
        this.clearData()
        return
      }

      this.activeBoomcode = String(boomcode)
      this.loading = true
      this.error = null

      try {
        this.data = await getBoomData(this.activeBoomcode)
      } catch (error) {
        console.error('Failed to fetch boom data:', error)
        this.error = error
        this.data = null
      } finally {
        this.loading = false
      }
    },

    clearData () {
      this.data = null
      this.activeBoomcode = null
      this.error = null
      this.loading = false
    },
  },
})
