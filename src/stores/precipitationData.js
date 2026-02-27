// stores/precipitationData.js
import { defineStore } from 'pinia'
import getPrecipitationData from '@/lib/get-precipitation-data'

export const usePrecipitationDataStore = defineStore('precipitationData', {
  state: () => ({
    data: null,
    loading: false,
    error: null,
  }),

  getters: {
    timeseries (state) {
      if (!state.data) return null
      return state.data.timeseries ?? state.data
    },
  },

  actions: {
    async fetchPrecipitationData (x, y, startDate = '', endDate = '') {
      if (x == null || y == null) {
        this.data = null
        this.error = null
        return
      }

      this.loading = true
      this.error = null

      try {
        const response = await getPrecipitationData(x, y, startDate, endDate)
        this.data = response
      } catch (error) {
        console.error('Failed to fetch precipitation data:', error)
        this.error = error
        this.data = null
      } finally {
        this.loading = false
      }
    },

    clearData () {
      this.data = null
      this.error = null
      this.loading = false
    },
  },
})
